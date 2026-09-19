// src/game/squat-runner.ts
import type { PoseFrame } from '../pose/types';
import { angleDeg, getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';

export function kneeAngle(frame: PoseFrame, side: 'left' | 'right' = 'left'): number {
  const hip = getByName(frame, `${side}_hip`);
  const knee = getByName(frame, `${side}_knee`);
  const ankle = getByName(frame, `${side}_ankle`);
  if (!hip || !knee || !ankle) return 180;
  return angleDeg(hip, knee, ankle);
}

export class SquatRunner implements Game {
  id = 'squat';
  board = new ScoreBoard();
  isDown = false;
  reps = 0;
  private running = false;
  private holdMs = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.isDown = false;
    this.reps = 0;
    this.holdMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  tick(frame: PoseFrame, _dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const angle = Math.min(kneeAngle(frame, 'left'), kneeAngle(frame, 'right'));
    if (angle < 100) {
      this.holdMs += _dtMs;
      if (!this.isDown && this.holdMs > 300) {
        this.isDown = true;
        this.reps += 1;
        this.board.comboHit();
        this.board.add(10);
        if (this.reps % 10 === 0) return [{ type: 'rest', points: 0, label: '10회! 잠시 쉬세요' }];
        return [{ type: 'duck', points: 10, label: `${this.reps}회!` }];
      }
      return [];
    }
    this.holdMs = 0;
    this.isDown = false;
    return [];
  }
}
