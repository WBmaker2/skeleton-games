import { describe, expect, it } from 'vitest';
import { YogaMirror } from './yoga-mirror';
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

function armsDown(): Keypoint[] {
  return [
    ...torso(320),
    kp('left_wrist', 220, 200),
    kp('right_wrist', 420, 200)
  ];
}

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
