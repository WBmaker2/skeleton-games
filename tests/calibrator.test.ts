// tests/calibrator.test.ts
import { describe, expect, it } from 'vitest';
import { calibrate } from '../src/calibration/calibrator';
import type { PoseFrame } from '../src/pose/types';

function frame(shoulderY: number, hipY: number, width = 200): PoseFrame {
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_shoulder', x: 220, y: shoulderY, score: 1 },
      { name: 'right_shoulder', x: 420, y: shoulderY, score: 1 },
      { name: 'left_hip', x: 250, y: hipY, score: 1 },
      { name: 'right_hip', x: 390, y: hipY, score: 1 }
    ]
  };
}

describe('calibrate', () => {
  it('detects standing when torso tall', () => {
    const c = calibrate([frame(100, 300), frame(102, 302)]);
    expect(c.mode).toBe('standing');
    expect(c.shoulderWidth).toBeGreaterThan(50);
  });
  it('detects seated when torso short', () => {
    const c = calibrate([frame(200, 260), frame(202, 262)]);
    expect(c.mode).toBe('seated');
  });
});
