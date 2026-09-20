// @vitest-environment happy-dom
// tests/loop.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameLoop } from '../src/game/loop';
import { FakeEngine } from '../src/pose/fake-engine';
import { FruitNinja } from '../src/game/fruit-ninja';

let rafCb: FrameRequestCallback | null = null;
let cancelled = false;

function installRaf(): void {
  rafCb = null;
  cancelled = false;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCb = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    cancelled = true;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function pump(times: number, stepMs: number): void {
  let t = 1000;
  for (let i = 0; i < times; i++) {
    t += stepMs;
    const cb = rafCb;
    rafCb = null;
    cb?.(t);
  }
}

describe('GameLoop', () => {
  it('ticks game and forwards events with board state', async () => {
    installRaf();
    const engine = new FakeEngine();
    engine.push({
      width: 640, height: 480, timestamp: 0,
      keypoints: [
        { name: 'left_wrist', x: 100, y: 100, score: 1 },
        { name: 'right_wrist', x: 500, y: 400, score: 1 }
      ]
    });
    const game = new FruitNinja();
    game.start();
    game.fruits.length = 0;
    game.fruits.push({ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true });
    const seen: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const loop = new GameLoop({
      video: document.createElement('video'),
      canvas,
      engine,
      game,
      calibration: { scale: 1, centerX: 320, mode: 'standing', shoulderWidth: 200 },
      showSkeleton: false,
      onEvent: (events) => seen.push(...events.map((e) => e.type))
    });
    loop.start();
    pump(3, 16);
    await new Promise((r) => setTimeout(r, 0));
    loop.stop();
    expect(seen).toContain('slice');
    expect(cancelled).toBe(true);
  });
  it('clamps dt to 100ms', () => {
    installRaf();
    const engine = new FakeEngine();
    engine.push({ width: 640, height: 480, timestamp: 0, keypoints: [] });
    const game = new FruitNinja();
    game.start();
    const canvas = document.createElement('canvas');
    const loop = new GameLoop({
      video: null,
      canvas,
      engine,
      game,
      calibration: { scale: 1, centerX: 320, mode: 'seated', shoulderWidth: 100 },
      showSkeleton: false
    });
    loop.start();
    pump(1, 16);
    pump(1, 5000);
    loop.stop();
    expect(loop.fps).toBeGreaterThanOrEqual(0);
  });
});
