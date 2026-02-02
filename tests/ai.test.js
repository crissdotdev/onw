import { describe, it, expect, vi } from 'vitest';
import { AIController, Faction, C } from '../game.js';
import { buildState } from './helpers.js';

describe('AIController', () => {
  it('AI attacks weaker adjacent enemies', async () => {
    // Force attacker to always win
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const state = buildState([
      { id: 0, faction: Faction.BLUE, strength: 5, connections: [1] },
      { id: 1, faction: Faction.RED, strength: 2, connections: [0] },
    ]);

    const attacks = [];
    await AIController.executeTurn(Faction.BLUE, state, async (atkId, defId, result) => {
      attacks.push({ atkId, defId });
    });

    expect(attacks.length).toBeGreaterThanOrEqual(1);
    expect(attacks[0].atkId).toBe(0);
    expect(attacks[0].defId).toBe(1);

    vi.restoreAllMocks();
  });

  it('AI skips nodes with strength < MIN_ATTACK_STRENGTH', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const state = buildState([
      { id: 0, faction: Faction.BLUE, strength: 1, connections: [1] }, // too weak
      { id: 1, faction: Faction.RED, strength: 1, connections: [0] },
    ]);

    const attacks = [];
    await AIController.executeTurn(Faction.BLUE, state, async (atkId, defId, result) => {
      attacks.push({ atkId, defId });
    });

    expect(attacks.length).toBe(0);

    vi.restoreAllMocks();
  });

  it('AI does not attack UNOWNED nodes', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const state = buildState([
      { id: 0, faction: Faction.BLUE, strength: 5, connections: [1] },
      { id: 1, faction: Faction.UNOWNED, strength: 1, connections: [0] },
    ]);

    const attacks = [];
    await AIController.executeTurn(Faction.BLUE, state, async (atkId, defId, result) => {
      attacks.push({ atkId, defId });
    });

    expect(attacks.length).toBe(0);

    vi.restoreAllMocks();
  });
});
