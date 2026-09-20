// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createGame, type PlayableId } from '../src/ui/app';
import { drawParticles, spawnBurst, tickParticles, type Particle } from '../src/ui/renderer';

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

describe('celebration particles', () => {
  it('spawns and fades bursts', () => {
    const ps: Particle[] = [];
    spawnBurst(ps, 320, 240);
    expect(ps.length).toBe(14);
    const after = tickParticles(ps, 200);
    expect(after.length).toBe(14);
    expect(after[0].life).toBeLessThan(after[0].maxLife);
    expect(tickParticles(after, 1000)).toEqual([]);
  });
  it('draws one circle per live particle', () => {
    const ps: Particle[] = [];
    spawnBurst(ps, 320, 240, 5);
    let arcs = 0;
    const ctx = stubCtx();
    (ctx as unknown as Record<string, unknown>).arc = () => {
      arcs += 1;
    };
    drawParticles(ctx, ps);
    expect(arcs).toBe(5);
  });
});
