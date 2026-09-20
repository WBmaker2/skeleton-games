export type GameId =
  | 'fruit' | 'squat' | 'math' | 'abc'
  | 'star' | 'balloon' | 'zombie' | 'dance'
  | 'simon' | 'yoga' | 'duo' | 'recycle'
  | 'home';

const ROUTES: GameId[] = [
  'fruit', 'squat', 'math', 'abc',
  'star', 'balloon', 'zombie', 'dance',
  'simon', 'yoga', 'duo', 'recycle'
];

export function parseHash(hash: string): GameId {
  const id = hash.replace(/^#\//, '') as GameId;
  return (ROUTES as string[]).includes(id) ? id : 'home';
}
