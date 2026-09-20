import { describe, expect, it } from 'vitest';
import { StarCatch } from '../src/game/star-catch';
import { BalloonHead } from '../src/game/balloon-head';
import { ZombieSteps } from '../src/game/zombie-steps';
import { RhythmDance } from '../src/game/rhythm-dance';
import type { Keypoint, PoseFrame } from '../src/pose/types';

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

function wrists(lx: number, ly: number, rx: number, ry: number): Keypoint[] {
  return [
    ...torso(320),
    kp('left_wrist', lx, ly),
    kp('right_wrist', rx, ry)
  ];
}

describe('StarCatch', () => {
  it('catches star on 300ms hold', () => {
    const g = new StarCatch();
    g.start();
    g.star = { x: 100, y: 100, alive: true };
    const seen: string[] = [];
    for (let i = 0; i < 20; i++) seen.push(...g.tick(frame(wrists(100, 100, 500, 400)), 16).map((e) => e.type));
    expect(seen).toContain('catch');
    expect(g.caught).toBe(1);
  });
  it('ignores far wrist', () => {
    const g = new StarCatch();
    g.start();
    g.star = { x: 100, y: 100, alive: true };
    expect(g.tick(frame(wrists(500, 400, 550, 420)), 16)).toEqual([]);
  });
});

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

describe('ZombieSteps', () => {
  it('dodges ghoul in another zone', () => {
    const g = new ZombieSteps();
    g.start();
    g.ghouls.length = 0;
    g.ghouls.push({ zone: 0, y: 460, alive: true });
    const events = g.tick(frame(torso(550)), 16);
    expect(events.some((e) => e.type === 'dodge')).toBe(true);
  });
  it('gets caught in same zone', () => {
    const g = new ZombieSteps();
    g.start();
    g.ghouls.length = 0;
    g.ghouls.push({ zone: 0, y: 460, alive: true });
    const events = g.tick(frame(torso(100)), 16);
    expect(events.some((e) => e.type === 'caught')).toBe(true);
  });
});

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
