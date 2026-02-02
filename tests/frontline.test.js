import { describe, it, expect } from 'vitest';
import { FrontlineDetector, Faction } from '../game.js';
import { buildState } from './helpers.js';

describe('FrontlineDetector', () => {
  it('identifies nodes adjacent to enemy factions', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 3, connections: [1, 2] },
      { id: 1, faction: Faction.RED, strength: 2, connections: [0, 3] },
      { id: 2, faction: Faction.RED, strength: 1, connections: [0] },
      { id: 3, faction: Faction.BLUE, strength: 2, connections: [1] },
    ]);
    const clusterIds = [0, 1, 2];
    const frontline = FrontlineDetector.getFrontlineNodes(Faction.RED, state, clusterIds);
    // Only node 1 is adjacent to Blue
    expect(frontline).toEqual([1]);
  });

  it('does not count UNOWNED neighbors as frontline triggers', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 3, connections: [1] },
      { id: 1, faction: Faction.UNOWNED, strength: 0, connections: [0] },
    ]);
    const frontline = FrontlineDetector.getFrontlineNodes(Faction.RED, state, [0]);
    expect(frontline).toEqual([]);
  });

  it('returns multiple frontline nodes when applicable', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 3, connections: [1, 3] },
      { id: 1, faction: Faction.RED, strength: 2, connections: [0, 2] },
      { id: 2, faction: Faction.BLUE, strength: 2, connections: [1] },
      { id: 3, faction: Faction.GREEN, strength: 2, connections: [0] },
    ]);
    const frontline = FrontlineDetector.getFrontlineNodes(Faction.RED, state, [0, 1]);
    // Both node 0 (adj to green) and node 1 (adj to blue) are frontline
    expect(frontline.sort()).toEqual([0, 1]);
  });
});
