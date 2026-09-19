// @vitest-environment happy-dom
// tests/fallback-engine.test.ts
import { describe, expect, it } from 'vitest';
import { FallbackEngine } from '../src/pose/fallback-engine';

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
});
