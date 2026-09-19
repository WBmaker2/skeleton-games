// @vitest-environment happy-dom
// tests/storage.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { saveScore, topScores, shareLink } from '../src/game/storage';

describe('storage', () => {
  beforeEach(() => localStorage.clear());
  it('keeps top 5 sorted desc', () => {
    saveScore('fruit', { name: 'a', score: 10 });
    saveScore('fruit', { name: 'b', score: 50 });
    saveScore('fruit', { name: 'c', score: 30 });
    expect(topScores('fruit')[0]).toMatchObject({ name: 'b', score: 50 });
  });
  it('builds share link with hash', () => {
    expect(shareLink('fruit')).toContain('#/fruit');
  });
  it('returns [] on corrupted JSON', () => {
    localStorage.setItem('skelplay:fruit', 'not-json{{{');
    expect(topScores('fruit')).toEqual([]);
    saveScore('fruit', { name: 'recovered', score: 7 });
    expect(topScores('fruit')).toMatchObject([{ name: 'recovered', score: 7 }]);
  });
});
