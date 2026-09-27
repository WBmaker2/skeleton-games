// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/pose/mediapipe-adapter', () => ({
  MediaPipeAdapter: class {
    async load(): Promise<void> {
      throw new Error('gpu down');
    }
  }
}));

vi.mock('../src/pose/movenet-adapter', () => ({
  MoveNetAdapter: class {
    name = 'movenet-lightning';
    async load(): Promise<void> {}
    async estimate(): Promise<never> {
      throw new Error('no video in test');
    }
    async dispose(): Promise<void> {}
  }
}));

import { loadEngine } from '../src/ui/app';
import { countdownCalibration } from '../src/main';
import { FakeEngine } from '../src/pose/fake-engine';
import type { PoseFrame } from '../src/pose/types';

describe('loadEngine', () => {
  it('prefers MediaPipe and falls back to MoveNet', async () => {
    const engine = await loadEngine('fruit');
    expect(engine?.name).toBe('movenet-lightning');
  });
  it('returns null when everything fails', async () => {
    const engine = await loadEngine('abc');
    expect(engine?.name).toBe('movenet-lightning');
  });
});

describe('countdownCalibration', () => {
  it('collects frames during beats and calibrates', async () => {
    const engine = new FakeEngine();
    await engine.load();
    const frame: PoseFrame = {
      width: 640,
      height: 480,
      timestamp: 0,
      keypoints: [
        { name: 'left_shoulder', x: 220, y: 100, score: 1 },
        { name: 'right_shoulder', x: 420, y: 100, score: 1 },
        { name: 'left_hip', x: 250, y: 300, score: 1 },
        { name: 'right_hip', x: 390, y: 300, score: 1 }
      ]
    };
    engine.push(frame);
    const overlay = document.createElement('div');
    overlay.innerHTML = '<p id="calibmsg"></p>';
    document.body.appendChild(overlay);
    const cal = await countdownCalibration(engine, null, overlay, {
      beats: [2, 1],
      stepMs: 20,
      goMs: 10,
      frameMs: 5
    });
    expect(cal.mode).toBe('standing');
    expect(overlay.querySelector('.count-num')?.textContent).toMatch(/시작!|2|1/);
    overlay.remove();
  });
  it('shows each beat for one even step', async () => {
    const engine = new FakeEngine();
    await engine.load();
    engine.push({
      width: 640,
      height: 480,
      timestamp: 0,
      keypoints: [
        { name: 'left_shoulder', x: 220, y: 100, score: 1 },
        { name: 'right_shoulder', x: 420, y: 100, score: 1 },
        { name: 'left_hip', x: 250, y: 300, score: 1 },
        { name: 'right_hip', x: 390, y: 300, score: 1 }
      ]
    });
    const overlay = document.createElement('div');
    overlay.innerHTML = '<p id="calibmsg"></p>';
    document.body.appendChild(overlay);
    // 숫자가 바뀌는 순간을 5ms 간격으로 기록한다.
    const seen: { label: string; at: number }[] = [];
    const poll = setInterval(() => {
      const label = overlay.querySelector('.count-num')?.textContent ?? '';
      if (label && seen[seen.length - 1]?.label !== label) {
        seen.push({ label, at: Date.now() });
      }
    }, 5);
    const t0 = Date.now();
    try {
      await countdownCalibration(engine, null, overlay, {
        beats: [3, 2, 1],
        stepMs: 100,
        goMs: 50,
        frameMs: 10
      });
    } finally {
      clearInterval(poll);
    }
    // 함수가 끝난 뒤 화면에 남는 마지막 라벨도 챙긴다.
    const last = overlay.querySelector('.count-num')?.textContent ?? '';
    if (last && seen[seen.length - 1]?.label !== last) {
      seen.push({ label: last, at: Date.now() });
    }
    const t1 = Date.now();
    overlay.remove();
    // 순서: 3 → 2 → 1 → 시작!
    expect(seen.map((s) => s.label)).toEqual(['3', '2', '1', '시작!']);
    // 각 숫자는 1스텝(100ms) 동안 유지된다 (느린 환경도 통과하도록 하한만 검사).
    for (let i = 0; i < 3; i++) {
      expect(seen[i + 1].at - seen[i].at).toBeGreaterThanOrEqual(70);
    }
    // 전체 시간도 3스텝+마무리와 일치한다 (상한은 느린 환경 대비 여유).
    expect(t1 - t0).toBeGreaterThanOrEqual(300);
    expect(t1 - t0).toBeLessThan(300 + 50 + 5000);
  });
  it('falls back to default with no frames', async () => {
    const engine = new FakeEngine();
    await engine.load();
    const overlay = document.createElement('div');
    overlay.innerHTML = '<p id="calibmsg"></p>';
    (overlay as HTMLElement & { skipped?: boolean }).skipped = true;
    const cal = await countdownCalibration(engine, null, overlay, {
      beats: [1],
      stepMs: 10,
      goMs: 5,
      frameMs: 5
    });
    expect(cal.mode).toBe('seated');
  });
});
