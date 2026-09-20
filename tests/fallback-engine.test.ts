// @vitest-environment happy-dom
// tests/fallback-engine.test.ts
import { describe, expect, it } from 'vitest';
import { FallbackEngine } from '../src/pose/fallback-engine';
import { bodyCenterX } from '../src/pose/geometry';
import { kneeAngle, SquatRunner } from '../src/game/squat-runner';
import { BodyABC } from '../src/game/body-abc';
import type { GameEvent } from '../src/game/types';

describe('FallbackEngine', () => {
  it('exposes cursor as right_wrist', async () => {
    const eng = new FallbackEngine();
    await eng.load();
    eng.moveTo(100, 80);
    const video = document.createElement('video');
    const frame = await eng.estimate(video);
    const rw = frame.keypoints.find((k) => k.name === 'right_wrist');
    expect(rw?.x).toBe(100);
    expect(rw?.y).toBe(80);
  });
  it('moves cursor with arrow keys at 240px/s bounds', async () => {
    const eng = new FallbackEngine();
    const el = document.createElement('div');
    document.body.appendChild(el);
    eng.attach(el);
    eng.moveTo(320, 240);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const video = document.createElement('video');
    const frame = await eng.estimate(video);
    expect(frame.keypoints.find((k) => k.name === 'right_wrist')?.x).toBeGreaterThan(320);
    eng.detach();
    el.remove();
  });
  it('has all canonical names with score 1', async () => {
    const eng = new FallbackEngine();
    const frame = await eng.estimate(document.createElement('video'));
    for (const n of ['nose', 'left_shoulder', 'right_shoulder', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip']) {
      expect(frame.keypoints.find((k) => k.name === n)?.score).toBe(1);
    }
  });
  it('focuses attached element', () => {
    const eng = new FallbackEngine();
    const el = document.createElement('div');
    document.body.appendChild(el);
    eng.attach(el);
    expect(document.activeElement).toBe(el);
    eng.detach();
    el.remove();
  });
  it('prevents default on handled keys', () => {
    const eng = new FallbackEngine();
    const el = document.createElement('div');
    document.body.appendChild(el);
    eng.attach(el);
    const e = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    const notCancelled = el.dispatchEvent(e);
    expect(e.defaultPrevented || !notCancelled).toBe(true);
    eng.detach();
    el.remove();
  });
  it('cursor-coupled torso puts bodyCenterX in zone 2 at x=550', async () => {
    const eng = new FallbackEngine();
    eng.moveTo(550, 240);
    const frame = await eng.estimate(document.createElement('video'));
    expect(bodyCenterX(frame)).toBeGreaterThan((frame.width * 2) / 3);
  });
  it('crouch yields duck, standing yields straight knees', async () => {
    const eng = new FallbackEngine();
    const game = new SquatRunner();
    game.start();
    eng.setCrouch(true);
    const video = document.createElement('video');
    let events: GameEvent[] = [];
    for (let i = 0; i < 20; i++) events.push(...game.tick(await eng.estimate(video), 16));
    expect(events.some((e) => e.type === 'duck')).toBe(true);
    eng.setCrouch(false);
    const frame = await eng.estimate(video);
    expect(kneeAngle(frame, 'left')).toBeGreaterThan(150);
    expect(kneeAngle(frame, 'right')).toBeGreaterThan(150);
  });
  it('high cursor completes ABC T pose', async () => {
    const eng = new FallbackEngine();
    eng.moveTo(320, 40);
    const game = new BodyABC();
    game.start();
    const video = document.createElement('video');
    let events: GameEvent[] = [];
    for (let i = 0; i < 70; i++) events.push(...game.tick(await eng.estimate(video), 16));
    expect(events.some((e) => e.type === 'pose-ok')).toBe(true);
  });
});
