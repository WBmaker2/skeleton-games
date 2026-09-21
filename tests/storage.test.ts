// @vitest-environment happy-dom
// tests/storage.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { saveScore, topScores, shareLink, updateScore, removeScore } from '../src/game/storage';

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

describe('admin storage ops', () => {
  beforeEach(() => localStorage.clear());
  it('updates a score and re-sorts', () => {
    saveScore('math', { name: 'a', score: 10 });
    saveScore('math', { name: 'b', score: 50 });
    updateScore('math', 1, { name: 'a+', score: 80 });
    expect(topScores('math').map((s) => s.name)).toEqual(['a+', 'b']);
  });
  it('ignores out-of-range update and remove', () => {
    saveScore('math', { name: 'a', score: 10 });
    updateScore('math', 5, { name: 'x', score: 99 });
    removeScore('math', -1);
    expect(topScores('math')).toHaveLength(1);
  });
  it('removes a score', () => {
    saveScore('math', { name: 'a', score: 10 });
    saveScore('math', { name: 'b', score: 50 });
    removeScore('math', 0);
    expect(topScores('math').map((s) => s.name)).toEqual(['a']);
  });
});
