// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openCamera } from '../src/main';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('openCamera fallback chain', () => {
  it('falls back to 640x480 when 720p fails', async () => {
    const stream480 = new MediaStream();
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new Error('overconstrained'))
      .mockResolvedValueOnce(stream480);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const video = document.createElement('video');
    video.id = 'cam';
    video.play = vi.fn().mockResolvedValue(undefined);
    document.body.appendChild(video);
    const out = await openCamera();
    expect(out).toBe(video);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(video.srcObject).toBe(stream480);
  });
  it('returns null when all fail', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const video = document.createElement('video');
    video.id = 'cam';
    video.play = vi.fn().mockResolvedValue(undefined);
    document.body.appendChild(video);
    await expect(openCamera()).resolves.toBe(null);
  });
});
