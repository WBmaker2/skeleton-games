// src/game/difficulty.ts — 시간에 따른 난이도 보간.
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// elapsed가 duration에 이를 때까지 start→end로 선형 이동. 범위를 벗어나면 고정.
export function ramp(start: number, end: number, elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return end;
  const p = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return lerp(start, end, p);
}
