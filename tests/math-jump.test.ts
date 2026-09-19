// tests/math-jump.test.ts
import { describe, expect, it } from 'vitest';
import { MathJump } from '../src/game/math-jump';
import type { PoseFrame } from '../src/pose/types';

function centerFrame(x: number): PoseFrame {
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_shoulder', x: x - 50, y: 100, score: 1 },
      { name: 'right_shoulder', x: x + 50, y: 100, score: 1 },
      { name: 'left_hip', x: x - 40, y: 200, score: 1 },
      { name: 'right_hip', x: x + 40, y: 200, score: 1 },
      { name: 'left_wrist', x, y: 90, score: 1 },
      { name: 'right_wrist', x, y: 90, score: 1 }
    ]
  };
}

describe('MathJump', () => {
  it('zones split width into thirds', () => {
    const g = new MathJump();
    expect(g.zoneOf(100, 600)).toBe(0);
    expect(g.zoneOf(300, 600)).toBe(1);
    expect(g.zoneOf(500, 600)).toBe(2);
  });
  it('confirms answer after dwell', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    let events = [];
    for (let i = 0; i < 40; i++) events.push(...g.tick(centerFrame(550), 16));
    expect(events.some((e) => e.type === 'correct' || e.type === 'wrong')).toBe(true);
  });
});
