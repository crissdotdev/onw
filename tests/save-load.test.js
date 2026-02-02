import { describe, it, expect } from 'vitest';
import { NetworkGenerator, SeedManager, GameState, NodeData, C } from '../game.js';

// Replicate the save/load serialization logic from GameManager
function serializeState(state) {
  const nodes = [];
  for (const [id, node] of state.nodes) {
    nodes.push({
      id: node.id, gridX: node.gridX, gridY: node.gridY,
      faction: node.faction, strength: node.strength,
      connections: node.connections,
    });
  }
  return {
    nodes,
    gameNumber: state.gameNumber,
    isGameOver: state.isGameOver,
    eliminatedFactions: [...state.eliminatedFactions],
    fractions: state.fractions,
  };
}

function deserializeState(data) {
  const state = new GameState();
  state.gameNumber = data.gameNumber;
  state.isGameOver = data.isGameOver;
  state.eliminatedFactions = new Set(data.eliminatedFactions);
  state.fractions = data.fractions;
  for (const n of data.nodes) {
    const node = new NodeData(n.id, n.gridX, n.gridY);
    node.faction = n.faction;
    node.strength = n.strength;
    node.connections = n.connections;
    state.nodes.set(n.id, node);
  }
  return state;
}

describe('Save/Load roundtrip', () => {
  it('serialize then deserialize preserves all fields', () => {
    const rng = SeedManager.createRNG(42);
    const original = NetworkGenerator.generate(rng);
    original.gameNumber = 42;
    original.eliminatedFactions.add(2);
    original.fractions[0] = 3;

    const data = serializeState(original);
    const json = JSON.stringify(data);
    const restored = deserializeState(JSON.parse(json));

    expect(restored.gameNumber).toBe(original.gameNumber);
    expect(restored.isGameOver).toBe(original.isGameOver);
    expect(restored.fractions).toEqual(original.fractions);
  });

  it('Map reconstructed correctly (node count and ids)', () => {
    const rng = SeedManager.createRNG(7);
    const original = NetworkGenerator.generate(rng);
    const data = serializeState(original);
    const restored = deserializeState(JSON.parse(JSON.stringify(data)));

    expect(restored.nodes.size).toBe(original.nodes.size);
    for (const [id, node] of original.nodes) {
      expect(restored.nodes.has(id)).toBe(true);
    }
  });

  it('Set reconstructed correctly (eliminated factions)', () => {
    const rng = SeedManager.createRNG(1);
    const original = NetworkGenerator.generate(rng);
    original.eliminatedFactions.add(1);
    original.eliminatedFactions.add(3);

    const data = serializeState(original);
    const restored = deserializeState(JSON.parse(JSON.stringify(data)));

    expect(restored.eliminatedFactions.size).toBe(2);
    expect(restored.eliminatedFactions.has(1)).toBe(true);
    expect(restored.eliminatedFactions.has(3)).toBe(true);
  });

  it('NodeData instances have correct properties', () => {
    const rng = SeedManager.createRNG(5);
    const original = NetworkGenerator.generate(rng);
    const data = serializeState(original);
    const restored = deserializeState(JSON.parse(JSON.stringify(data)));

    for (const [id, origNode] of original.nodes) {
      const restoredNode = restored.nodes.get(id);
      expect(restoredNode.id).toBe(origNode.id);
      expect(restoredNode.gridX).toBe(origNode.gridX);
      expect(restoredNode.gridY).toBe(origNode.gridY);
      expect(restoredNode.faction).toBe(origNode.faction);
      expect(restoredNode.strength).toBe(origNode.strength);
      expect(restoredNode.connections.sort()).toEqual(origNode.connections.sort());
    }
  });

  it('handles empty eliminatedFactions', () => {
    const rng = SeedManager.createRNG(99);
    const original = NetworkGenerator.generate(rng);
    // No eliminations
    const data = serializeState(original);
    const restored = deserializeState(JSON.parse(JSON.stringify(data)));
    expect(restored.eliminatedFactions.size).toBe(0);
  });
});
