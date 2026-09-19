// src/game/types.ts
import type { PoseFrame } from '../pose/types';

export interface GameEvent { type: string; points: number; label: string }
export interface Game {
  id: string;
  start(): void;
  stop(): void;
  tick(frame: PoseFrame, dtMs: number): GameEvent[];
}
