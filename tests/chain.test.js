import { describe, it, expect } from 'vitest';
import { ChainCalculator, Faction } from '../game.js';
import { buildState } from './helpers.js';

describe('ChainCalculator', () => {
  it('finds single connected cluster', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 3, connections: [1] },
      { id: 1, faction: Faction.RED, strength: 2, connections: [0, 2] },
      { id: 2, faction: Faction.RED, strength: 1, connections: [1] },
    ]);
    const cluster = ChainCalculator.findLargestCluster(Faction.RED, state);
    expect(cluster.sort()).toEqual([0, 1, 2]);
  });

  it('returns largest of multiple clusters', () => {
    const state = buildState([
      // Cluster A: 2 nodes
      { id: 0, faction: Faction.RED, strength: 1, connections: [1] },
      { id: 1, faction: Faction.RED, strength: 1, connections: [0] },
      // Cluster B: 3 nodes (largest)
      { id: 2, faction: Faction.RED, strength: 1, connections: [3, 4] },
      { id: 3, faction: Faction.RED, strength: 1, connections: [2] },
      { id: 4, faction: Faction.RED, strength: 1, connections: [2] },
      // Enemy node separating them
      { id: 5, faction: Faction.BLUE, strength: 1, connections: [1, 2] },
    ]);
    const cluster = ChainCalculator.findLargestCluster(Faction.RED, state);
    expect(cluster.length).toBe(3);
    expect(cluster.sort()).toEqual([2, 3, 4]);
  });

  it('returns empty for faction with no nodes', () => {
    const state = buildState([
      { id: 0, faction: Faction.BLUE, strength: 1, connections: [1] },
      { id: 1, faction: Faction.BLUE, strength: 1, connections: [0] },
    ]);
    const cluster = ChainCalculator.findLargestCluster(Faction.RED, state);
    expect(cluster).toEqual([]);
  });

  it('does not cross faction boundaries', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 1, connections: [1] },
      { id: 1, faction: Faction.BLUE, strength: 1, connections: [0, 2] },
      { id: 2, faction: Faction.RED, strength: 1, connections: [1] },
    ]);
    const cluster = ChainCalculator.findLargestCluster(Faction.RED, state);
    // Red nodes are separated by Blue, so largest cluster = 1
    expect(cluster.length).toBe(1);
  });
});
