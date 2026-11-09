// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameLoop } from '../src/game/loop';
import { FakeEngine } from '../src/pose/fake-engine';
import { FruitNinja } from '../src/games/fruit';

let rafCb: FrameRequestCallback | null = null;

function installRaf(): void {
  rafCb = null;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCb = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
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

describe('GameLoop robustness', () => {
  it('skips overlapping estimates (single-flight)', async () => {
    installRaf();
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const engine = new FakeEngine();
    const orig = engine.estimate.bind(engine);
    engine.estimate = (async (v: HTMLVideoElement) => {
      calls += 1;
      if (calls === 1) await gate;
      return orig(v);
    }) as typeof engine.estimate;
    const game = new FruitNinja();
    game.start();
    const canvas = document.createElement('canvas');
    const loop = new GameLoop({
      video: null, canvas, engine, game,
      calibration: { scale: 1, centerX: 320, mode: 'seated', shoulderWidth: 100 },
      showSkeleton: false
    });
    loop.start();
    pump(1, 16);
    pump(1, 16);
    // 두 번째 프레임은 첫 추론이 끝나지 않아 건너뛰어야 함
    expect(calls).toBe(1);
    release();
    await new Promise((r) => setTimeout(r, 0));
    loop.stop();
  });

  it('notifies onPoseError after 30 consecutive failures', async () => {
    installRaf();
    const engine = new FakeEngine();
    engine.estimate = (async () => { throw new Error('no person'); }) as typeof engine.estimate;
    const game = new FruitNinja();
    game.start();
    const canvas = document.createElement('canvas');
    const seen: number[] = [];
    const loop = new GameLoop({
      video: null, canvas, engine, game,
      calibration: { scale: 1, centerX: 320, mode: 'seated', shoulderWidth: 100 },
      showSkeleton: false,
      onPoseError: (n) => seen.push(n)
    });
    loop.start();
    for (let i = 0; i < 30; i++) {
      pump(1, 16);
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(seen).toEqual([30]);
    expect(loop.errorCount).toBe(30);
    loop.stop();
  });

  it('pause freezes elapsedSec and resume continues', async () => {
    installRaf();
    const engine = new FakeEngine();
    engine.push({ width: 640, height: 480, timestamp: 0, keypoints: [] });
    const game = new FruitNinja();
    game.start();
    const canvas = document.createElement('canvas');
    const loop = new GameLoop({
      video: null, canvas, engine, game,
      calibration: { scale: 1, centerX: 320, mode: 'seated', shoulderWidth: 100 },
      showSkeleton: false
    });
    loop.start();
    expect(loop.isPaused).toBe(false);
    loop.pause();
    expect(loop.isPaused).toBe(true);
    const frozen = loop.elapsedSec;
    await new Promise((r) => setTimeout(r, 30));
    expect(loop.elapsedSec).toBe(frozen);
    loop.resume();
    expect(loop.isPaused).toBe(false);
    loop.stop();
  });

  it('practice mode never times up', async () => {
    installRaf();
    const engine = new FakeEngine();
    engine.push({ width: 640, height: 480, timestamp: 0, keypoints: [] });
    const game = new FruitNinja();
    game.start();
    const canvas = document.createElement('canvas');
    let ups = 0;
    const loop = new GameLoop({
      video: null, canvas, engine, game,
      calibration: { scale: 1, centerX: 320, mode: 'seated', shoulderWidth: 100 },
      showSkeleton: false,
      timeLimitSec: 60,
      practice: true,
      onTimeUp: () => { ups += 1; }
    });
    loop.start();
    pump(1, 16);
    pump(1, 200000);
    await new Promise((r) => setTimeout(r, 0));
    expect(ups).toBe(0);
    loop.stop();
  });
});
