import { describe, expect, it } from 'vitest';
import { createGame, defaultCalibration, selectEngineKind } from '../src/ui/app';

describe('app factory', () => {
  it('creates four games with right ids', () => {
    expect(createGame('fruit').id).toBe('fruit');
    expect(createGame('squat').id).toBe('squat');
    expect(createGame('math').id).toBe('math');
    expect(createGame('abc').id).toBe('abc');
  });
  it('selects fallback without camera', () => {
    expect(selectEngineKind(false)).toBe('fallback');
    expect(selectEngineKind(true)).toBe('camera');
  });
  it('default calibration is seated instant-start', () => {
    expect(defaultCalibration()).toMatchObject({ mode: 'seated', scale: 1 });
  });
});
