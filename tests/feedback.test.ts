// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isMuted, setMuted, toggleMuted, beep } from '../src/ui/feedback';

describe('feedback mute', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());
  it('defaults to unmuted', () => {
    expect(isMuted()).toBe(false);
  });
  it('toggles and persists', () => {
    expect(toggleMuted()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(toggleMuted()).toBe(false);
    expect(isMuted()).toBe(false);
  });
  it('beep does not throw when muted', () => {
    setMuted(true);
    expect(() => beep('hit')).not.toThrow();
  });
});
