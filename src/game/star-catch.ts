import type { PoseFrame } from '../pose/types';
import { getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';

export interface Star {
  x: number;
  y: number;
  alive: boolean;
}

// 별잡기 스트레칭: 손을 별에 0.3초 대면 잡힌다. 좌우·위아래 유연성.
export class StarCatch implements Game {
  id = 'star';
  star: Star = { x: 320, y: 120, alive: true };
  board = new ScoreBoard();
  caught = 0;
  private running = false;
  private holdMs = 0;
  private seed = 1;

  start(): void {
    this.running = true;
    this.board.reset();
    this.caught = 0;
    this.respawn();
  }
  stop(): void {
    this.running = false;
  }
  respawn(): void {
    this.star = { x: 80 + this.rnd() * 480, y: 80 + this.rnd() * 240, alive: true };
    this.holdMs = 0;
  }
  private rnd(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running || !this.star.alive) return [];
    const wrists = [getByName(frame, 'left_wrist'), getByName(frame, 'right_wrist')].filter(
      (w) => w && (w.score ?? 0) > 0.3
    );
    const near = wrists.some((w) => w && Math.hypot(w.x - this.star.x, w.y - this.star.y) < 56);
    if (!near) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= 300) return [];
    this.star.alive = false;
    this.caught += 1;
    this.board.comboHit();
    this.board.add(10);
    const n = this.caught;
    this.respawn();
    return [{ type: 'catch', points: 10, label: `별 ${n}개!` }];
  }
}
