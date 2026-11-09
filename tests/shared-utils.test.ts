// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../src/game/rng';
import { lerp, ramp } from '../src/game/difficulty';

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createSeededRng(1);
    const b = createSeededRng(1);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
  it('stays in [0, 1)', () => {
    const rnd = createSeededRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rnd();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('difficulty', () => {
  it('lerps', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
  it('ramps from start to end', () => {
    expect(ramp(1100, 450, 0, 60000)).toBe(1100);
    expect(ramp(1100, 450, 60000, 60000)).toBe(450);
    expect(ramp(1100, 450, 30000, 60000)).toBe(775);
  });
  it('clamps outside range', () => {
    expect(ramp(0, 10, -5, 100)).toBe(0);
    expect(ramp(0, 10, 999, 100)).toBe(10);
  });
});
