// tests/math-jump.test.ts
import { describe, expect, it } from 'vitest';
import { MathJump } from './math-jump';
import type { PoseFrame } from '../../pose/types';

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
  it('waits think time before confirming answer', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    // 생각 시간(3.5초) 안에는 같은 자리에 있어도 확정되면 안 됨
    const early: string[] = [];
    for (let i = 0; i < 40; i++) early.push(...g.tick(centerFrame(550), 16).map((e) => e.type));
    expect(early.some((t) => t === 'correct' || t === 'wrong')).toBe(false);
    expect(g.isThinking).toBe(true);
    // 생각 시간 + dwell이 지나면 확정됨
    const late: string[] = [];
    for (let i = 0; i < 300; i++) late.push(...g.tick(centerFrame(550), 16).map((e) => e.type));
    expect(late.some((t) => t === 'correct' || t === 'wrong')).toBe(true);
  });
  it('gives think time again after next quiz', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    for (let i = 0; i < 300; i++) g.tick(centerFrame(550), 16);
    // 문제가 바뀌면 다시 생각 중 상태여야 함
    expect(g.isThinking).toBe(true);
    expect(g.thinkRemainingMs).toBeGreaterThan(0);
  });
});
