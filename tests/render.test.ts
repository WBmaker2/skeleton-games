// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createGame, type PlayableId } from '../src/ui/app';

function stubCtx(): CanvasRenderingContext2D {
  const fn = (..._args: unknown[]): undefined => undefined;
  const backing: Record<string | symbol, unknown> = {};
  return new Proxy(backing as object, {
    get: (t, p) => (p in t ? (t as Record<string | symbol, unknown>)[p] : fn),
    set: (t, p, v) => {
      (t as Record<string | symbol, unknown>)[p] = v;
      return true;
    }
  }) as unknown as CanvasRenderingContext2D;
}

const IDS: PlayableId[] = [
  'fruit', 'squat', 'math', 'abc', 'star', 'balloon',
  'zombie', 'dance', 'simon', 'yoga', 'duo', 'recycle'
];

describe('game draw methods', () => {
  it.each(IDS)('%s draws without throwing', (id) => {
    const game = createGame(id);
    game.start();
    expect(() => game.draw?.(stubCtx(), 640, 480)).not.toThrow();
  });
  it('fruit draws one circle per live fruit', () => {
    const calls: string[] = [];
    const ctx = stubCtx();
    const origArc = (..._a: unknown[]): undefined => {
      calls.push('arc');
      return undefined;
    };
    (ctx as unknown as Record<string, unknown>).arc = origArc;
    const game = createGame('fruit');
    game.start();
    if (game.id !== 'fruit' || !('fruits' in game)) throw new Error('factory');
    game.fruits.push(
      { x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true },
      { x: 200, y: 200, vx: 0, vy: 0, kind: 'bomb', alive: true }
    );
    game.draw?.(ctx, 640, 480);
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});
