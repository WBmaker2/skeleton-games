import { describe, expect, it } from 'vitest';
import {
  BoxingShadow,
  BOXING_DOUBLE_AT_MS,
  BOXING_HIT_R,
  BOXING_MIN_SPEED,
  BOXING_SLOTS,
  BOXING_VISIBLE_END_MS,
  BOXING_VISIBLE_START_MS
} from './boxing-shadow';
import type { Keypoint, PoseFrame } from '../../pose/types';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[], width = 640, height = 480): PoseFrame {
  return { width, height, timestamp: 0, keypoints: kps };
}

// 양손 위치 지정. 팔꿈치는 생략하면 손바닥=손목 위치가 된다.
function handsFrame(lx: number, ly: number, rx: number, ry: number): PoseFrame {
  return frame([
    kp('left_wrist', lx, ly),
    kp('right_wrist', rx, ry)
  ]);
}

describe('BoxingShadow', () => {
  it('hides face mask for readability', () => {
    expect(new BoxingShadow().hideFace).toBe(true);
  });
  it('punches a mitt with a fast hand', () => {
    const g = new BoxingShadow();
    g.start();
    g.mitts.forEach((m) => { m.phase = 'hidden'; });
    g.forceSpawn(1);
    const pos = g.mittPos(1, 640, 480);
    // 먼저 멀리 있다가 빠르게 뻗어야 펀치 인정.
    g.tick(handsFrame(0, 0, 639, 479), 16);
    const events = g.tick(handsFrame(pos.x, pos.y, 639, 479), 16);
    expect(events.some((e) => e.type === 'punch')).toBe(true);
    expect(g.punches).toBe(1);
    expect(g.board.score).toBeGreaterThan(0);
  });
  it('does not punch when the hand just rests on the mitt', () => {
    const g = new BoxingShadow();
    g.start();
    g.mitts.forEach((m) => { m.phase = 'hidden'; });
    g.forceSpawn(0);
    const pos = g.mittPos(0, 640, 480);
    g.tick(handsFrame(pos.x, pos.y, 639, 479), 16);
    const events = g.tick(handsFrame(pos.x, pos.y, 639, 479), 16);
    expect(events.some((e) => e.type === 'punch')).toBe(false);
    expect(g.punches).toBe(0);
  });
  it('misses an untouched mitt after its time', () => {
    const g = new BoxingShadow();
    g.start();
    g.mitts.forEach((m) => { m.phase = 'hidden'; });
    g.forceSpawn(2);
    const seen: string[] = [];
    for (let i = 0; i < 100; i++) {
      seen.push(...g.tick(handsFrame(0, 0, 639, 479), 16).map((e) => e.type));
    }
    expect(seen).toContain('miss');
    expect(g.missed).toBe(1);
  });
  it('spawns and ramps difficulty', () => {
    const g = new BoxingShadow();
    g.start();
    expect(g.mitts).toHaveLength(BOXING_SLOTS);
    expect(g.visibleMsAt(0)).toBe(BOXING_VISIBLE_START_MS);
    expect(g.visibleMsAt(60000)).toBe(BOXING_VISIBLE_END_MS);
    expect(g.maxAliveAt(0)).toBe(1);
    expect(g.maxAliveAt(BOXING_DOUBLE_AT_MS)).toBe(2);
    expect(BOXING_MIN_SPEED).toBeGreaterThanOrEqual(150);
    expect(BOXING_HIT_R).toBeGreaterThanOrEqual(48);
  });
});
