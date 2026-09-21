import { describe, expect, it } from 'vitest';
import { DuoStars } from './duo-stars';
import type { Keypoint, PoseFrame } from '../../pose/types';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[]): PoseFrame {
  return { width: 640, height: 480, timestamp: 0, keypoints: kps };
}

describe('DuoStars', () => {
  it('completes pair on dual hold', () => {
    const g = new DuoStars();
    g.start();
    const f = frame([kp('left_wrist', 160, 140), kp('right_wrist', 480, 140)]);
    const seen: string[] = [];
    for (let i = 0; i < 60; i++) seen.push(...g.tick(f, 16).map((e) => e.type));
    expect(seen).toContain('pair');
    expect(g.pairs).toBe(1);
  });
  it('ignores single-hand hold', () => {
    const g = new DuoStars();
    g.start();
    const f = frame([kp('left_wrist', 160, 140), kp('right_wrist', 100, 400)]);
    for (let i = 0; i < 60; i++) g.tick(f, 16);
    expect(g.pairs).toBe(0);
  });
});

describe('DuoStars wide stage', () => {
  it('places stars at quarter points of wide frames', async () => {
    const { DuoStars } = await import('./duo-stars');
    const g = new DuoStars();
    g.start();
    const wide = {
      width: 1280, height: 720, timestamp: 0,
      keypoints: [
        { name: 'left_wrist', x: 0, y: 0, score: 1 },
        { name: 'right_wrist', x: 1279, y: 0, score: 1 }
      ]
    };
    g.tick(wide, 16);
    expect(g.starA.x).toBeCloseTo(320, 0);
    expect(g.starB.x).toBeCloseTo(960, 0);
  });
});
