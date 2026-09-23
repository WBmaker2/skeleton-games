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

function shoulders(): Keypoint[] {
  return [
    kp('left_shoulder', 220, 120),
    kp('right_shoulder', 420, 120)
  ];
}

function leftFrame(): PoseFrame {
  return frame([
    ...shoulders(),
    kp('left_wrist', 220, 60), kp('right_wrist', 420, 200)
  ]);
}

function rightFrame(): PoseFrame {
  return frame([
    ...shoulders(),
    kp('left_wrist', 220, 200), kp('right_wrist', 420, 60)
  ]);
}

// 지시 순서 left→right→both이므로 두 번 맞혀 양손 차례로 이동한다.
function toBoth(g: SimonSays): void {
  g.tick(leftFrame(), 16);
  g.tick(rightFrame(), 16);
  expect(g.command).toBe('both');
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
  it('accepts both hands 10px above shoulders (relaxed margin)', () => {
    // 어깨 y=120, 손목 y=105: 기존 20px 기준(100)에는 못 미치지만 완화 기준(110)은 넘는다.
    // 공유 판정은 'down'이지만 사이먼 양손 완화 판정으로 성공해야 한다.
    const g = new SimonSays();
    g.start();
    toBoth(g);
    const events = g.tick(frame([
      ...shoulders(),
      kp('left_wrist', 220, 105), kp('right_wrist', 420, 105)
    ]), 16);
    expect(events.some((e) => e.type === 'correct')).toBe(true);
  });
  it('accepts narrow-gap (circle shape) wrists as both', () => {
    // 공유 판정은 'circle'이지만 사이먼에서는 양손 성공으로 인정한다.
    const g = new SimonSays();
    g.start();
    toBoth(g);
    const events = g.tick(frame([
      ...shoulders(),
      kp('nose', 320, 60),
      kp('left_wrist', 290, 0), kp('right_wrist', 350, 0)
    ]), 16);
    expect(events.some((e) => e.type === 'correct')).toBe(true);
  });
  it('accepts wide-gap (Y shape) wrists as both', () => {
    // 공유 판정은 'y'이지만 사이먼에서는 양손 성공으로 인정한다.
    const g = new SimonSays();
    g.start();
    toBoth(g);
    const events = g.tick(frame([
      ...shoulders(),
      kp('nose', 320, 60),
      kp('left_wrist', 140, 10), kp('right_wrist', 500, 10)
    ]), 16);
    expect(events.some((e) => e.type === 'correct')).toBe(true);
  });
  it('still rejects both when hands stay below shoulders', () => {
    const g = new SimonSays();
    g.start();
    toBoth(g);
    const events = g.tick(frame([
      ...shoulders(),
      kp('left_wrist', 220, 200), kp('right_wrist', 420, 200)
    ]), 16);
    expect(events.some((e) => e.type === 'correct')).toBe(false);
  });
});
