// src/game/rng.ts — 게임 내 난수 생성기 (테스트 재현 가능).
// 기존 mole/star/recycle의 LCG와 동일한 수열을 낸다.
export function createSeededRng(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}
