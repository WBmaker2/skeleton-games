export type GameId = 'fruit' | 'squat' | 'math' | 'abc' | 'home';

export function parseHash(hash: string): GameId {
  if (hash === '#/fruit') return 'fruit';
  if (hash === '#/squat') return 'squat';
  if (hash === '#/math') return 'math';
  if (hash === '#/abc') return 'abc';
  return 'home';
}
