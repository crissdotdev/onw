import { GameState, NodeData, Faction, C } from '../game.js';

/**
 * Build a GameState from an array of node specifications.
 * @param {Array<{id: number, faction: number, strength: number, connections: number[]}>} nodeSpecs
 * @returns {GameState}
 */
export function buildState(nodeSpecs) {
  const state = new GameState();
  for (const spec of nodeSpecs) {
    const node = new NodeData(spec.id, spec.gridX ?? 0, spec.gridY ?? 0);
    node.faction = spec.faction ?? Faction.UNOWNED;
    node.strength = spec.strength ?? 1;
    node.connections = spec.connections ?? [];
    state.nodes.set(spec.id, node);
  }
  return state;
}
