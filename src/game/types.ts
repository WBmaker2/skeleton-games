// src/game/types.ts
import type { PoseFrame } from '../pose/types';

export interface GameEvent { type: string; points: number; label: string }
export interface Game {
  id: string;
  // true면 얼굴 마스크를 그리지·불러오지 않는다 (상단 텍스트와 겹칠 때).
  hideFace?: boolean;
  start(): void;
  stop(): void;
  tick(frame: PoseFrame, dtMs: number): GameEvent[];
}
