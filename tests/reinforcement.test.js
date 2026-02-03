import { describe, it, expect, vi } from 'vitest';
import { ReinforcementManager, AIController, Faction } from '../game.js';
import { buildState } from './helpers.js';

describe('ReinforcementManager', () => {
  it('reinforcements go to frontline nodes only', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 3, connections: [1] },
      { id: 1, faction: Faction.RED, strength: 2, connections: [0, 2] },
      { id: 2, faction: Faction.BLUE, strength: 2, connections: [1] },
    ]);
    const before0 = state.nodes.get(0).strength;
    const result = ReinforcementManager.apply(Faction.RED, state);
    // Node 1 is frontline (adjacent to blue), node 0 is interior
    expect(result.reinforced.length).toBe(1);
    expect(result.reinforced[0].id).toBe(1);
    // Node 0 should not have changed
    expect(state.nodes.get(0).strength).toBe(before0);
  });

  it('amount equals cluster size / frontline count', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 1, connections: [1] },
      { id: 1, faction: Faction.RED, strength: 1, connections: [0, 2, 3] },
      { id: 2, faction: Faction.RED, strength: 1, connections: [1, 4] },
      { id: 3, faction: Faction.RED, strength: 1, connections: [1, 5] },
      { id: 4, faction: Faction.BLUE, strength: 2, connections: [2] },
      { id: 5, faction: Faction.GREEN, strength: 2, connections: [3] },
    ]);
    // Cluster: [0,1,2,3] = size 4, frontline: [2,3] (adj to enemies) = 2 frontline nodes
    // perNode = floor(4 / 2) = 2
    const result = ReinforcementManager.apply(Faction.RED, state);
    expect(result.reinforced.length).toBe(2);
    for (const r of result.reinforced) {
      expect(r.amount).toBe(2);
    }
  });

  it('fractional remainder stored in state.fractions', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 1, connections: [1] },
      { id: 1, faction: Faction.RED, strength: 1, connections: [0, 2, 3] },
      { id: 2, faction: Faction.RED, strength: 1, connections: [1, 4] },
      { id: 3, faction: Faction.BLUE, strength: 2, connections: [1] },
      { id: 4, faction: Faction.GREEN, strength: 2, connections: [2] },
    ]);
    // Cluster: [0,1,2] = size 3, frontline: [1,2] = 2 frontline nodes
    // perNode = floor(3 / 2) = 1, remainder = 3 - (1*2) = 1
    const result = ReinforcementManager.apply(Faction.RED, state);
    expect(state.fractions[Faction.RED]).toBe(1);
  });

  it('no reinforcements if no frontline', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 3, connections: [1] },
      { id: 1, faction: Faction.RED, strength: 2, connections: [0] },
    ]);
    const result = ReinforcementManager.apply(Faction.RED, state);
    expect(result.reinforced).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('per-faction reinforcements use post-combat state of that faction', async () => {
    // Rule: each faction reinforces immediately after its own attacks,
    // based on the board state AFTER those attacks (not before).
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // attacker always wins

    const state = buildState([
      // Blue cluster: 3 nodes in a line
      { id: 0, faction: Faction.BLUE, strength: 2, connections: [1] },
      { id: 1, faction: Faction.BLUE, strength: 2, connections: [0, 2] },
      { id: 2, faction: Faction.BLUE, strength: 2, connections: [1, 3] },
      // Green with strong attacker adjacent to Blue
      { id: 3, faction: Faction.GREEN, strength: 10, connections: [2, 4] },
      { id: 4, faction: Faction.GREEN, strength: 1, connections: [3] },
    ]);

    // Green attacks — captures some Blue nodes
    await AIController.executeTurn(Faction.GREEN, state, async () => {});

    const greenNodesAfter = state.countNodes(Faction.GREEN);
    expect(greenNodesAfter).toBeGreaterThan(2); // Green gained nodes

    // Green reinforces immediately after its attacks (post-combat state)
    const greenReinf = ReinforcementManager.apply(Faction.GREEN, state);
    // Green's reinforcement should be based on its expanded territory
    expect(greenReinf.total).toBeLessThanOrEqual(greenNodesAfter);
    expect(greenReinf.total).toBeGreaterThan(0);

    // Blue reinforces after its own turn (which may be no attacks)
    const blueNodesAfter = state.countNodes(Faction.BLUE);
    const blueReinf = ReinforcementManager.apply(Faction.BLUE, state);
    // Blue reinforcement is based on its diminished territory
    expect(blueReinf.total).toBeLessThanOrEqual(blueNodesAfter);

    vi.restoreAllMocks();
  });

  it('faction reinforces after its own attacks, not after all factions', async () => {
    // Simulates the per-faction flow: Faction A attacks then reinforces,
    // then Faction B attacks then reinforces.
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // attacker always wins

    const state = buildState([
      // Red (player) has 3 nodes
      { id: 0, faction: Faction.RED, strength: 2, connections: [1] },
      { id: 1, faction: Faction.RED, strength: 2, connections: [0, 2] },
      { id: 2, faction: Faction.RED, strength: 2, connections: [1, 3] },
      // Blue with 2 nodes, adjacent to Red
      { id: 3, faction: Faction.BLUE, strength: 8, connections: [2, 4] },
      { id: 4, faction: Faction.BLUE, strength: 1, connections: [3, 5] },
      // Green with 2 nodes, adjacent to Blue
      { id: 5, faction: Faction.GREEN, strength: 8, connections: [4, 6] },
      { id: 6, faction: Faction.GREEN, strength: 1, connections: [5] },
    ]);

    // Step 1: Red (player) ends turn — Red reinforces first
    const redReinfBefore = ReinforcementManager.apply(Faction.RED, state);
    const redStr1 = state.nodes.get(2).strength; // frontline node got reinforced
    expect(redReinfBefore.total).toBe(3); // cluster=3, frontline=[2], perNode=3

    // Step 2: Blue attacks (captures Red node 2)
    await AIController.executeTurn(Faction.BLUE, state, async () => {});
    const blueNodesAfterAttack = state.countNodes(Faction.BLUE);

    // Step 3: Blue reinforces immediately after its attacks
    const blueReinf = ReinforcementManager.apply(Faction.BLUE, state);
    expect(blueReinf.total).toBeLessThanOrEqual(blueNodesAfterAttack);

    // Step 4: Green attacks
    await AIController.executeTurn(Faction.GREEN, state, async () => {});
    const greenNodesAfterAttack = state.countNodes(Faction.GREEN);

    // Step 5: Green reinforces immediately after its attacks
    const greenReinf = ReinforcementManager.apply(Faction.GREEN, state);
    expect(greenReinf.total).toBeLessThanOrEqual(greenNodesAfterAttack);

    vi.restoreAllMocks();
  });
});
