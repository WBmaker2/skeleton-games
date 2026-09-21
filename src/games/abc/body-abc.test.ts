// tests/body-abc.test.ts
import { describe, expect, it } from 'vitest';
import { anglesFromFrame, BodyABC, poseSimilarity, TEMPLATES } from './body-abc';
import type { PoseFrame } from '../../pose/types';

function frameOf(
  ls: [number, number],
  rs: [number, number],
  lw: [number, number],
  rw: [number, number]
): PoseFrame {
  return {
    width: 640,
    height: 480,
    timestamp: 0,
    keypoints: [
      { name: 'left_shoulder', x: ls[0], y: ls[1], score: 1 },
      { name: 'right_shoulder', x: rs[0], y: rs[1], score: 1 },
      { name: 'left_wrist', x: lw[0], y: lw[1], score: 1 },
      { name: 'right_wrist', x: rw[0], y: rw[1], score: 1 }
    ]
  };
}

describe('poseSimilarity', () => {
  it('returns 1 for identical pose', () => {
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.T)).toBeCloseTo(1, 3);
  });
  it('returns low for different pose', () => {
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.O)).toBeLessThan(0.7);
  });
  it('separates T and Y below the accept threshold', () => {
    // T(수평)와 Y(대각선 위)의 교차 유사도는 0.5로, 임계값 0.6에 미달해야 한다.
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.Y)).toBeLessThan(0.6);
    expect(poseSimilarity(TEMPLATES.Y, TEMPLATES.T)).toBeLessThan(0.6);
  });
});

describe('anglesFromFrame', () => {
  it('maps horizontal arms to ~90 (true T)', () => {
    const a = anglesFromFrame(frameOf([270, 120], [370, 120], [170, 120], [470, 120]));
    expect(a.leftArm).toBeCloseTo(90, 0);
    expect(a.rightArm).toBeCloseTo(90, 0);
  });
  it('maps diagonal-up arms to ~135 (true Y)', () => {
    const a = anglesFromFrame(frameOf([270, 120], [370, 120], [200, 50], [440, 50]));
    expect(a.leftArm).toBeCloseTo(135, 0);
    expect(a.rightArm).toBeCloseTo(135, 0);
  });
  it('fails safe (arms down) when keypoints are missing', () => {
    const a = anglesFromFrame({ width: 640, height: 480, timestamp: 0, keypoints: [] });
    expect(a.leftArm).toBe(0);
    expect(a.rightArm).toBe(0);
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
  it('does not complete Y with an exact T pose (and vice versa)', () => {
    const forY = new BodyABC();
    forY.start();
    forY.target = 'Y';
    const yEvents: { type: string }[] = [];
    for (let i = 0; i < 80; i++) yEvents.push(...forY.tickAngles({ ...TEMPLATES.T }, 16));
    expect(yEvents.some((e) => e.type === 'pose-ok')).toBe(false);
    const forT = new BodyABC();
    forT.start();
    forT.target = 'T';
    const tEvents: { type: string }[] = [];
    for (let i = 0; i < 80; i++) tEvents.push(...forT.tickAngles({ ...TEMPLATES.Y }, 16));
    expect(tEvents.some((e) => e.type === 'pose-ok')).toBe(false);
  });
  it('accepts sloppy poses within tolerance (relaxed judging)', () => {
    // 양팔 합쳐 ±30° 어긋나도 성공: 예전 임계값(0.8)에서는 탈락하던 케이스.
    const g = new BodyABC();
    g.start();
    g.target = 'T';
    const all: { type: string }[] = [];
    for (let i = 0; i < 70; i++) all.push(...g.tickAngles({ leftArm: 120, rightArm: 60, torso: 90 }, 16));
    expect(all.some((e) => e.type === 'pose-ok')).toBe(true);
  });
  it('completes T from a real horizontal-arms frame', () => {
    const g = new BodyABC();
    g.start();
    g.target = 'T';
    const f = frameOf([270, 120], [370, 120], [170, 120], [470, 120]);
    const all: { type: string }[] = [];
    for (let i = 0; i < 70; i++) all.push(...g.tick(f, 16));
    expect(all.some((e) => e.type === 'pose-ok')).toBe(true);
  });
  it('presents random targets with no immediate repeat', () => {
    const g = new BodyABC();
    g.start();
    const done: string[] = [];
    for (let i = 0; i < 2000 && done.length < 10; i++) {
      for (const e of g.tickAngles({ ...TEMPLATES[g.target] }, 16)) {
        if (e.type === 'pose-ok') done.push(e.label);
      }
    }
    expect(done).toHaveLength(10);
    for (let i = 1; i < done.length; i++) expect(done[i]).not.toBe(done[i - 1]);
    expect(new Set(done).size).toBeGreaterThanOrEqual(2);
  });
});
