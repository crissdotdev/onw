import { describe, it, expect } from 'vitest';
import { NetworkGenerator, SeedManager, C, Faction, STRENGTH_DISTRIBUTIONS } from '../game.js';

describe('NetworkGenerator', () => {
  it('same game number produces identical board', () => {
    const rng1 = SeedManager.createRNG(1);
    const rng2 = SeedManager.createRNG(1);
    const state1 = NetworkGenerator.generate(rng1);
    const state2 = NetworkGenerator.generate(rng2);

    expect(state1.nodes.size).toBe(state2.nodes.size);
    for (const [id, node1] of state1.nodes) {
      const node2 = state2.nodes.get(id);
      expect(node1.gridX).toBe(node2.gridX);
      expect(node1.gridY).toBe(node2.gridY);
      expect(node1.faction).toBe(node2.faction);
      expect(node1.strength).toBe(node2.strength);
      expect(node1.connections.sort()).toEqual(node2.connections.sort());
    }
  });

  it('generates exactly TOTAL_NODES nodes', () => {
    const rng = SeedManager.createRNG(5);
    const state = NetworkGenerator.generate(rng);
    expect(state.nodes.size).toBe(C.TOTAL_NODES);
  });

  it('each faction owns exactly NODES_PER_FACTION nodes', () => {
    const rng = SeedManager.createRNG(10);
    const state = NetworkGenerator.generate(rng);
    for (let f = 0; f < C.FACTION_COUNT; f++) {
      expect(state.countNodes(f)).toBe(C.NODES_PER_FACTION);
    }
  });

  it('each faction has total strength of STRENGTH_PER_FACTION', () => {
    const rng = SeedManager.createRNG(10);
    const state = NetworkGenerator.generate(rng);
    for (let f = 0; f < C.FACTION_COUNT; f++) {
      expect(state.totalStrength(f)).toBe(C.STRENGTH_PER_FACTION);
    }
  });

  it('every node has at least one connection', () => {
    // Test across multiple game numbers
    for (let g = 1; g <= 10; g++) {
      const rng = SeedManager.createRNG(g);
      const state = NetworkGenerator.generate(rng);
      for (const [id, node] of state.nodes) {
        expect(node.connections.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('connections are bidirectional', () => {
    const rng = SeedManager.createRNG(3);
    const state = NetworkGenerator.generate(rng);
    for (const [id, node] of state.nodes) {
      for (const connId of node.connections) {
        const other = state.nodes.get(connId);
        expect(other.connections).toContain(id);
      }
    }
  });

  it('grid positions are within bounds', () => {
    const rng = SeedManager.createRNG(7);
    const state = NetworkGenerator.generate(rng);
    for (const [id, node] of state.nodes) {
      expect(node.gridX).toBeGreaterThanOrEqual(0);
      expect(node.gridX).toBeLessThan(C.GRID_COLS);
      expect(node.gridY).toBeGreaterThanOrEqual(0);
      expect(node.gridY).toBeLessThan(C.GRID_ROWS);
    }
  });

  it('STRENGTH_DISTRIBUTIONS all sum to STRENGTH_PER_FACTION', () => {
    for (const dist of STRENGTH_DISTRIBUTIONS) {
      const sum = dist.reduce((a, b) => a + b, 0);
      expect(sum).toBe(C.STRENGTH_PER_FACTION);
    }
  });
});
