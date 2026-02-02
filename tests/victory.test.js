import { describe, it, expect } from 'vitest';
import { VictoryChecker, Faction, C } from '../game.js';
import { buildState } from './helpers.js';

describe('VictoryChecker', () => {
  it('faction with >= VICTORY_THRESHOLD nodes wins', () => {
    const nodes = [];
    for (let i = 0; i < C.TOTAL_NODES; i++) {
      nodes.push({
        id: i,
        faction: i < C.VICTORY_THRESHOLD ? Faction.RED : Faction.BLUE,
        strength: 1,
        connections: i > 0 ? [i - 1] : [1],
      });
    }
    const state = buildState(nodes);
    const result = VictoryChecker.check(state);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe(Faction.RED);
  });

  it('player with 0 nodes loses', () => {
    const state = buildState([
      { id: 0, faction: Faction.BLUE, strength: 5, connections: [1] },
      { id: 1, faction: Faction.BLUE, strength: 5, connections: [0] },
    ]);
    const result = VictoryChecker.check(state);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe(-1);
  });

  it('game not over when no faction has threshold', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 3, connections: [1] },
      { id: 1, faction: Faction.BLUE, strength: 3, connections: [0] },
    ]);
    const result = VictoryChecker.check(state);
    expect(result.gameOver).toBe(false);
    expect(result.winner).toBeNull();
  });

  it('updateEliminations marks factions with 0 nodes', () => {
    const state = buildState([
      { id: 0, faction: Faction.RED, strength: 5, connections: [1] },
      { id: 1, faction: Faction.BLUE, strength: 5, connections: [0] },
    ]);
    VictoryChecker.updateEliminations(state);
    // GREEN, YELLOW, PURPLE have 0 nodes
    expect(state.eliminatedFactions.has(Faction.GREEN)).toBe(true);
    expect(state.eliminatedFactions.has(Faction.YELLOW)).toBe(true);
    expect(state.eliminatedFactions.has(Faction.PURPLE)).toBe(true);
    // RED, BLUE have nodes
    expect(state.eliminatedFactions.has(Faction.RED)).toBe(false);
    expect(state.eliminatedFactions.has(Faction.BLUE)).toBe(false);
  });
});
