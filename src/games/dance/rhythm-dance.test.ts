import { describe, expect, it } from 'vitest';
import { RhythmDance } from './rhythm-dance';
import type { Keypoint, PoseFrame } from '../../pose/types';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[]): PoseFrame {
  return { width: 640, height: 480, timestamp: 0, keypoints: kps };
}

describe('RhythmDance', () => {
  it('hits left beat with left wrist up', () => {
    const g = new RhythmDance();
    g.start();
    expect(g.move).toBe('left');
    const leftFrame = frame([
      kp('left_shoulder', 220, 120), kp('right_shoulder', 420, 120),
      kp('left_wrist', 220, 60), kp('right_wrist', 420, 200)
    ]);
    const events = g.tick(leftFrame, 16);
    expect(events.some((e) => e.type === 'beat')).toBe(true);
    expect(g.move).toBe('right');
  });
  it('misses after 1.8s without match', () => {
    const g = new RhythmDance();
    g.start();
    const downFrame = frame([
      kp('left_shoulder', 220, 120), kp('right_shoulder', 420, 120),
      kp('left_wrist', 220, 200), kp('right_wrist', 420, 200)
    ]);
    const seen: string[] = [];
    for (let i = 0; i < 120; i++) seen.push(...g.tick(downFrame, 16).map((e) => e.type));
    expect(seen).toContain('miss');
  });
});
