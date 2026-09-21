import { describe, expect, it } from 'vitest';
import { RecycleSort } from './recycle-sort';
import type { Keypoint, PoseFrame } from '../../pose/types';

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
