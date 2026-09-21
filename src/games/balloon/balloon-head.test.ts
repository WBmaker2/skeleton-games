import { describe, expect, it } from 'vitest';
import { BalloonHead } from './balloon-head';
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

describe('BalloonHead', () => {
  it('bumps balloon with head', () => {
    const g = new BalloonHead();
    g.start();
    g.balloon = { x: 320, y: 100, vy: 60, alive: true };
    const events = g.tick(frame([kp('nose', 320, 100), ...torso(320)]), 16);
    expect(events.some((e) => e.type === 'bump')).toBe(true);
    expect(g.hits).toBe(1);
  });
  it('resets dropped balloon', () => {
    const g = new BalloonHead();
    g.start();
    g.balloon = { x: 320, y: 600, vy: 60, alive: true };
    const events = g.tick(frame(torso(320)), 16);
    expect(events.some((e) => e.type === 'drop')).toBe(true);
    expect(g.balloon.y).toBeLessThan(0);
  });
});
