import { describe, expect, it } from 'vitest';
import { SimonSays } from '../src/game/simon-says';
import { YogaMirror } from '../src/game/yoga-mirror';
import { DuoStars } from '../src/game/duo-stars';
import { RecycleSort } from '../src/game/recycle-sort';
import type { Keypoint, PoseFrame } from '../src/pose/types';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[]): PoseFrame {
  return { width: 640, height: 480, timestamp: 0, keypoints: kps };
}

function torso(x: number): Keypoint[] {
  return [
    kp('left_shoulder', x - 50, 100),
    kp('right_shoulder', x + 50, 100),
    kp('left_hip', x - 40, 200),
    kp('right_hip', x + 40, 200)
  ];
}

function armsDown(): Keypoint[] {
  return [
    ...torso(320),
    kp('left_wrist', 220, 200),
    kp('right_wrist', 420, 200)
  ];
}

describe('SimonSays', () => {
  it('accepts matching pose for first command', () => {
    const g = new SimonSays();
    g.start();
    expect(g.command).toBe('left');
    const leftFrame = frame([
      kp('left_shoulder', 220, 120), kp('right_shoulder', 420, 120),
      kp('left_wrist', 220, 60), kp('right_wrist', 420, 200)
    ]);
    const events = g.tick(leftFrame, 16);
    expect(events.some((e) => e.type === 'correct')).toBe(true);
    expect(g.command).toBe('right');
  });
  it('times out on sustained mismatch', () => {
    const g = new SimonSays();
    g.start();
    const seen: string[] = [];
    for (let i = 0; i < 160; i++) seen.push(...g.tick(frame(armsDown()), 16).map((e) => e.type));
    expect(seen).toContain('timeout');
  });
});

describe('YogaMirror', () => {
  it('completes tree pose on 3s hold', () => {
    const g = new YogaMirror();
    g.start();
    expect(g.pose.name).toBe('나무');
    const treeFrame = frame([
      kp('left_shoulder', 270, 120), kp('right_shoulder', 370, 120),
      kp('left_wrist', 270, 60), kp('right_wrist', 370, 200)
    ]);
    const seen: string[] = [];
    for (let i = 0; i < 200; i++) seen.push(...g.tick(treeFrame, 16).map((e) => e.type));
    expect(seen).toContain('pose-done');
    expect(g.pose.name).toBe('전사');
  });
  it('resets hold when pose breaks', () => {
    const g = new YogaMirror();
    g.start();
    const treeFrame = frame([
      kp('left_shoulder', 270, 120), kp('right_shoulder', 370, 120),
      kp('left_wrist', 270, 60), kp('right_wrist', 370, 200)
    ]);
    for (let i = 0; i < 50; i++) g.tick(treeFrame, 16);
    expect(g.progress).toBeGreaterThan(0);
    g.tick(frame(armsDown()), 16);
    expect(g.progress).toBe(0);
  });
});

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

describe('RecycleSort', () => {
  it('sorts plastic to the left', () => {
    const g = new RecycleSort();
    g.start();
    expect(g.item.kind).toBe('plastic');
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) seen.push(...g.tick(frame(torso(100)), 16).map((e) => e.type));
    expect(seen).toContain('sorted');
    expect(g.item.kind).toBe('can');
  });
  it('flags wrong bin', () => {
    const g = new RecycleSort();
    g.start();
    g.item = { kind: 'can', y: 60, alive: true };
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) seen.push(...g.tick(frame(torso(100)), 16).map((e) => e.type));
    expect(seen).toContain('mixed');
  });
});


describe('DuoStars wide stage', () => {
  it('places stars at quarter points of wide frames', async () => {
    const { DuoStars } = await import('../src/game/duo-stars');
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
