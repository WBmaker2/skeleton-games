// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { saveScore, topScores } from '../src/game/storage';

describe('storage quota', () => {
  beforeEach(() => localStorage.clear());
  it('does not throw when localStorage.setItem fails', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try {
      expect(() => saveScore('fruit', { name: '나', score: 10 })).not.toThrow();
      expect(topScores('fruit')).toEqual([]);
    } finally {
      Storage.prototype.setItem = orig;
    }
  });
  it('does not throw when localStorage.getItem fails', () => {
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('denied'); };
    try {
      expect(topScores('fruit')).toEqual([]);
    } finally {
      Storage.prototype.getItem = orig;
    }
  });
});
