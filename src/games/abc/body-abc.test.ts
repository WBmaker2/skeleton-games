// tests/body-abc.test.ts
import { describe, expect, it } from 'vitest';
import { BodyABC, poseSimilarity, TEMPLATES } from './body-abc';

describe('poseSimilarity', () => {
  it('returns 1 for identical pose', () => {
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.T)).toBeCloseTo(1, 3);
  });
  it('returns low for different pose', () => {
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.O)).toBeLessThan(0.7);
  });
});

describe('BodyABC', () => {
  it('hides face mask for readability of the top text and guide', () => {
    expect(new BodyABC().hideFace).toBe(true);
  });
  it('draws target letter and skeleton guide without throwing', () => {
    const fn = (..._args: unknown[]): undefined => undefined;
    const texts: unknown[][] = [];
    let arcs = 0;
    const ctx = new Proxy(
      {},
      {
        get: (_t, p) => {
          if (p === 'arc') return (...a: unknown[]): undefined => {
            arcs += 1;
            return undefined;
          };
          if (p === 'fillText') return (...a: unknown[]): undefined => {
            texts.push(a);
            return undefined;
          };
          return fn;
        },
        set: () => true
      }
    ) as unknown as CanvasRenderingContext2D;
    const g = new BodyABC();
    g.start();
    for (const t of ['T', 'Y', 'O', 'L'] as const) {
      g.target = t;
      arcs = 0;
      texts.length = 0;
      expect(() => g.draw(ctx, 640, 480)).not.toThrow();
      // 막대인간 머리(arc 1회 이상) + 목표 글자(상단 큰 글자·가이드 하단 글자)가 그려져야 함
      expect(arcs).toBeGreaterThanOrEqual(1);
      expect(texts.some((a) => a[0] === t)).toBe(true);
    }
  });
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
