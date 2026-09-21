import { describe, expect, it } from 'vitest';
import { SimonSays } from './simon-says';
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
