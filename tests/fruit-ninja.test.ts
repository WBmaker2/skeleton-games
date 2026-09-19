// tests/fruit-ninja.test.ts
import { describe, expect, it } from 'vitest';
import { FruitNinja } from '../src/game/fruit-ninja';
import type { PoseFrame } from '../src/pose/types';

function wristFrame(x: number, y: number): PoseFrame {
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_wrist', x, y, score: 1 },
      { name: 'right_wrist', x: 500, y: 400, score: 1 }
    ]
  };
}

describe('FruitNinja', () => {
  it('slices fruit when wrist passes through', () => {
    const g = new FruitNinja();
    g.start();
    g.fruits.length = 0;
    g.fruits.push({ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true });
    const events = g.tick(wristFrame(100, 100), 16);
    expect(events.some((e) => e.type === 'slice')).toBe(true);
  });
  it('does not slice when far away', () => {
    const g = new FruitNinja();
    g.start();
    g.fruits.length = 0;
    g.fruits.push({ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true });
    const events = g.tick(wristFrame(500, 400), 16);
    expect(events.length).toBe(0);
  });
});
