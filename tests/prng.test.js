import { describe, it, expect } from 'vitest';
import { PRNG, SeedManager } from '../game.js';

describe('PRNG', () => {
  it('same seed produces same sequence (100 values)', () => {
    const a = new PRNG(12345);
    const b = new PRNG(12345);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('values are in [0, 1)', () => {
    const rng = new PRNG(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt returns values within bounds', () => {
    const rng = new PRNG(99);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('shuffle preserves elements and does not mutate original', () => {
    const rng = new PRNG(77);
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const copy = [...original];
    const shuffled = rng.shuffle(original);
    // Original unchanged
    expect(original).toEqual(copy);
    // Same elements
    expect([...shuffled].sort((a, b) => a - b)).toEqual([...original].sort((a, b) => a - b));
    expect(shuffled.length).toBe(original.length);
  });

  it('different seeds produce different sequences', () => {
    const a = new PRNG(1);
    const b = new PRNG(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });
});

describe('SeedManager', () => {
  it('hashSeed is deterministic', () => {
    expect(SeedManager.hashSeed(1)).toBe(SeedManager.hashSeed(1));
    expect(SeedManager.hashSeed(42)).toBe(SeedManager.hashSeed(42));
  });

  it('hashSeed returns unsigned 32-bit integer', () => {
    for (let i = 0; i < 100; i++) {
      const h = SeedManager.hashSeed(i);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xFFFFFFFF);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it('different game numbers produce different hashes', () => {
    expect(SeedManager.hashSeed(1)).not.toBe(SeedManager.hashSeed(2));
  });
});
