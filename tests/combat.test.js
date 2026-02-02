import { describe, it, expect, vi } from 'vitest';
import { CombatResolver, C } from '../game.js';

describe('CombatResolver', () => {
  it('attacker wins when all rolls are low', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // always below 0.52
    const result = CombatResolver.resolve(5, 3);
    expect(result.attackerWon).toBe(true);
    expect(result.defenderRemaining).toBe(0);
    expect(result.attackerRemaining).toBe(4); // 4 attacking units, none lost
    vi.restoreAllMocks();
  });

  it('defender wins when all rolls are high', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // always above 0.52
    const result = CombatResolver.resolve(5, 3);
    expect(result.attackerWon).toBe(false);
    expect(result.attackerRemaining).toBe(0);
    expect(result.defenderRemaining).toBe(3 - 0); // defender loses 0
    vi.restoreAllMocks();
  });

  it('leaves UNITS_LEFT_BEHIND behind (attacker commits strength - 1)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = CombatResolver.resolve(4, 1);
    // Attacker has 3 attacking units (4 - 1 left behind), defender has 1
    expect(result.attackerWon).toBe(true);
    expect(result.rounds.length).toBe(1); // 1 round to defeat 1 defender
    expect(result.attackerRemaining).toBe(3 - 0); // didn't lose any
    vi.restoreAllMocks();
  });

  it('attacker wins >40% over 10k trials with real random (statistical)', () => {
    // With 52% attacker chance, attacker advantage = strength - 1 vs defender
    // Using 8 vs 3, attacker should win majority
    let wins = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      const result = CombatResolver.resolve(8, 3);
      if (result.attackerWon) wins++;
    }
    // Should win well over 40% with 7 attacking vs 3 defending
    expect(wins / trials).toBeGreaterThan(0.4);
  });
});
