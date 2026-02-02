import { describe, it, expect } from 'vitest';
import { ReinforcementManager, Faction } from '../game.js';
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
});
