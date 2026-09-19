// tests/geometry.test.ts
import { describe, expect, it } from 'vitest';
import { angleDeg, bodyCenterX } from '../src/pose/geometry';
import type { PoseFrame } from '../src/pose/types';

describe('angleDeg', () => {
  it('computes right angle at b', () => {
    expect(angleDeg({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(90, 0);
  });
});

describe('bodyCenterX', () => {
  it('averages shoulders and hips', () => {
    const f: PoseFrame = {
      width: 640, height: 480, timestamp: 0,
      keypoints: [
        { name: 'left_shoulder', x: 100, y: 100, score: 1 },
        { name: 'right_shoulder', x: 200, y: 100, score: 1 },
        { name: 'left_hip', x: 110, y: 200, score: 1 },
        { name: 'right_hip', x: 190, y: 200, score: 1 }
      ]
    };
    expect(bodyCenterX(f)).toBeCloseTo(150, 5);
  });
});
