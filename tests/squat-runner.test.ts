// tests/squat-runner.test.ts
import { describe, expect, it } from 'vitest';
import { SquatRunner, kneeAngle } from '../src/game/squat-runner';
import type { PoseFrame } from '../src/pose/types';

function squatFrame(standing: boolean): PoseFrame {
  // standing: hip(300,200) knee(300,300) ankle(300,400) = 180도
  // squat: hip(200,200) knee(300,300) ankle(200,400) = 90도 근처
  const hip = standing ? { x: 300, y: 200 } : { x: 200, y: 200 };
  const ankle = standing ? { x: 300, y: 400 } : { x: 200, y: 400 };
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_hip', x: hip.x, y: hip.y, score: 1 },
      { name: 'left_knee', x: 300, y: 300, score: 1 },
      { name: 'left_ankle', x: ankle.x, y: ankle.y, score: 1 }
    ]
  };
}

describe('kneeAngle', () => {
  it('is straight when standing', () => {
    expect(kneeAngle(squatFrame(true))).toBeGreaterThan(150);
  });
  it('is bent when squatting', () => {
    expect(kneeAngle(squatFrame(false))).toBeLessThan(120);
  });
});

describe('SquatRunner', () => {
  it('emits duck event on squat hold', () => {
    const g = new SquatRunner();
    g.start();
    let events = [];
    for (let i = 0; i < 20; i++) events.push(...g.tick(squatFrame(false), 16));
    expect(events.some((e) => e.type === 'duck')).toBe(true);
  });

  it('catches player standing into a barrier', () => {
    const g = new SquatRunner();
    g.start();
    g.spawnObstacle(640 * 0.22);
    const events = g.tick(squatFrame(true), 16);
    expect(events.some((e) => e.type === 'caught')).toBe(true);
  });

  it('dodges a barrier while squatting', () => {
    const g = new SquatRunner();
    g.start();
    for (let i = 0; i < 25; i++) g.tick(squatFrame(false), 16);
    expect(g.isDown).toBe(true);
    g.spawnObstacle(640 * 0.22);
    const events = g.tick(squatFrame(false), 16);
    expect(events.some((e) => e.type === 'dodge')).toBe(true);
  });

  it('collects a high coin while standing', () => {
    const g = new SquatRunner();
    g.start();
    g.spawnCoin('high', 640 * 0.22);
    const events = g.tick(squatFrame(true), 16);
    expect(events.some((e) => e.type === 'catch')).toBe(true);
  });

  it('collects a low coin while squatting', () => {
    const g = new SquatRunner();
    g.start();
    for (let i = 0; i < 25; i++) g.tick(squatFrame(false), 16);
    g.spawnCoin('low', 640 * 0.22);
    const events = g.tick(squatFrame(false), 16);
    expect(events.some((e) => e.type === 'catch')).toBe(true);
  });

  it('misses a high coin while squatting', () => {
    const g = new SquatRunner();
    g.start();
    for (let i = 0; i < 25; i++) g.tick(squatFrame(false), 16);
    g.spawnCoin('high', 640 * 0.22);
    const events = g.tick(squatFrame(false), 16);
    expect(events.some((e) => e.type === 'catch')).toBe(false);
  });

  it('accumulates running distance over time', () => {
    const g = new SquatRunner();
    g.start();
    for (let i = 0; i < 30; i++) g.tick(squatFrame(true), 16);
    expect(g.distanceM).toBeGreaterThan(0);
  });

  it('rewards perfect timing on the beat', () => {
    const g = new SquatRunner();
    g.start();
    g.tick(squatFrame(true), 1600);
    let events = [];
    for (let i = 0; i < 25; i++) events.push(...g.tick(squatFrame(false), 16));
    const duck = events.find((e) => e.type === 'duck');
    expect(duck?.points).toBe(15);
  });

  it('gives fewer points off the beat', () => {
    const g = new SquatRunner();
    g.start();
    g.tick(squatFrame(true), 800);
    let events = [];
    for (let i = 0; i < 25; i++) events.push(...g.tick(squatFrame(false), 16));
    const duck = events.find((e) => e.type === 'duck');
    expect(duck?.points).toBe(5);
  });

  it('counts one beat per interval', () => {
    const g = new SquatRunner();
    g.start();
    for (let i = 0; i < 125; i++) g.tick(squatFrame(true), 16);
    expect(g.beatCount).toBe(1);
    expect(g.obstacles.length).toBe(1);
  });

  it('counts beats and spawns a low coin on the second beat', () => {
    const g = new SquatRunner();
    g.start();
    for (let i = 0; i < 250; i++) g.tick(squatFrame(true), 16);
    expect(g.beatCount).toBe(2);
    expect(g.coins.some((c) => c.lane === 'low')).toBe(true);
  });

  it('previews seconds until the next sit', () => {
    const g = new SquatRunner();
    g.start();
    expect(g.cueText()).toBe('앉기까지 2초');
  });

  it('says sit now inside the timing window', () => {
    const g = new SquatRunner();
    g.start();
    g.tick(squatFrame(true), 1800);
    expect(g.cueText()).toBe('지금 앉아!');
  });

  it('says stand up while squatting', () => {
    const g = new SquatRunner();
    g.start();
    for (let i = 0; i < 25; i++) g.tick(squatFrame(false), 16);
    expect(g.isDown).toBe(true);
    expect(g.cueText()).toBe('일어서세요!');
  });
});
