// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { HandTracker } from '../src/game/hand-tracker';
import type { PoseFrame } from '../src/pose/types';

function frameWithHands(lx: number, ly: number, rx: number, ry: number): PoseFrame {
  return {
    width: 640,
    height: 480,
    timestamp: 0,
    keypoints: [
      { name: 'left_shoulder', x: 270, y: 200, score: 1 },
      { name: 'right_shoulder', x: 370, y: 200, score: 1 },
      { name: 'left_wrist', x: lx, y: ly, score: 1 },
      { name: 'right_wrist', x: rx, y: ry, score: 1 }
    ]
  };
}

describe('HandTracker', () => {
  it('arms when wrist goes above shoulder', () => {
    const t = new HandTracker({ armDy: 20 });
    // 아래에 있으면 무장 안 됨
    t.track(frameWithHands(270, 300, 370, 300), 'right', 16);
    expect(t.armed.right).toBe(false);
    // 어깨 위로 올리면 무장
    t.track(frameWithHands(270, 300, 370, 100), 'right', 16);
    expect(t.armed.right).toBe(true);
  });
  it('keeps armed after hand moves down, consumes on hit', () => {
    const t = new HandTracker({ armDy: 20 });
    t.track(frameWithHands(270, 300, 370, 100), 'right', 16);
    expect(t.armed.right).toBe(true);
    t.track(frameWithHands(270, 300, 370, 300), 'right', 16);
    // 내려가도 무장 유지 (래치)
    expect(t.armed.right).toBe(true);
    t.consume('right');
    expect(t.armed.right).toBe(false);
  });
  it('measures downward velocity', () => {
    const t = new HandTracker({ armDy: 20 });
    t.track(frameWithHands(270, 300, 370, 100), 'right', 0);
    t.track(frameWithHands(270, 300, 370, 200), 'right', 100);
    // 100px을 0.1초에 내려옴 = 1000px/s
    expect(t.velocity('right')).toBeCloseTo(1000, 0);
  });
  it('returns null and resets velocity when hand is missing', () => {
    const t = new HandTracker({ armDy: 20 });
    t.track(frameWithHands(270, 300, 370, 100), 'right', 16);
    const empty: PoseFrame = { width: 640, height: 480, timestamp: 0, keypoints: [] };
    expect(t.track(empty, 'right', 16)).toBeNull();
    expect(t.velocity('right')).toBe(0);
    // 무장은 유지 (깜빡임에 관대)
    expect(t.armed.right).toBe(true);
  });
});
