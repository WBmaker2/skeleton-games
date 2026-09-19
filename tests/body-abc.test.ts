// tests/body-abc.test.ts
import { describe, expect, it } from 'vitest';
import { BodyABC, poseSimilarity, TEMPLATES } from '../src/game/body-abc';

describe('poseSimilarity', () => {
  it('returns 1 for identical pose', () => {
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.T)).toBeCloseTo(1, 3);
  });
  it('returns low for different pose', () => {
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.O)).toBeLessThan(0.7);
  });
});

describe('BodyABC', () => {
  it('accepts held T pose', () => {
    const g = new BodyABC();
    g.start();
    g.target = 'T';
    // NOTE: deviation from brief verbatim (binding Tasks 7-8 ruling):
    // pose-ok is single-fire at tick ~63 (holdMs>1000) then holdMs resets,
    // so last-tick-only `events = ...` assignment misses it. Accumulate instead; impl stays verbatim.
    const all: { type: string }[] = [];
    for (let i = 0; i < 70; i++) all.push(...g.tickAngles({ ...TEMPLATES.T }, 16));
    expect(all.some((e) => e.type === 'pose-ok')).toBe(true);
  });
});
