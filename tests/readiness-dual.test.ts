// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { checkReadiness, POSE_TASK_URL, MODEL_URL } from '../src/ui/readiness';

describe('readiness dual-model', () => {
  it('is ready when pose task is reachable (movenet fails)', async () => {
    const fetchFn = (async (url: string) => ({ ok: String(url).includes('pose_landmarker') }) as Response) as unknown as typeof fetch;
    const r = await checkReadiness(fetchFn, 2000);
    expect(r.modelOk).toBe(true);
  });
  it('is ready when only movenet is reachable', async () => {
    const fetchFn = (async (url: string) => ({ ok: String(url).includes('movenet') }) as Response) as unknown as typeof fetch;
    const r = await checkReadiness(fetchFn, 2000);
    expect(r.modelOk).toBe(true);
  });
  it('fails when neither is reachable', async () => {
    const fetchFn = (async () => ({ ok: false }) as Response) as unknown as typeof fetch;
    const r = await checkReadiness(fetchFn, 2000);
    expect(r.modelOk).toBe(false);
  });
  it('exports both model urls', () => {
    expect(POSE_TASK_URL).toContain('pose_landmarker');
    expect(MODEL_URL).toContain('movenet');
  });
});
