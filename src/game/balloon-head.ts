import type { PoseFrame } from '../pose/types';
import { getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';
import { drawLabel } from '../ui/renderer';

export interface Balloon {
  x: number;
  y: number;
  vy: number;
  alive: boolean;
}

// 풍선 헤딩: 머리로 풍선을 떨어뜨리지 않기. 목·코어.
export class BalloonHead implements Game {
  id = 'balloon';
  balloon: Balloon = { x: 320, y: 80, vy: 60, alive: true };
  board = new ScoreBoard();
  hits = 0;
  private running = false;

  start(): void {
    this.running = true;
    this.board.reset();
    this.hits = 0;
    this.balloon = { x: 320, y: 80, vy: 60, alive: true };
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number): void {
    const b = this.balloon;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y + 42);
    ctx.lineTo(b.x, b.y + 88);
    ctx.stroke();
    ctx.fillStyle = '#ff71ce';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, 38, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawLabel(ctx, `${this.hits}번`, width - 70, 50, 30);
  }
  private headOf(frame: PoseFrame): { x: number; y: number } | null {
    const nose = getByName(frame, 'nose');
    if (nose && (nose.score ?? 0) > 0.3) return nose;
    const ls = getByName(frame, 'left_shoulder');
    const rs = getByName(frame, 'right_shoulder');
    if (ls && rs) return { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 - 40 };
    return null;
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const dt = dtMs / 1000;
    const b = this.balloon;
    b.vy += 140 * dt;
    b.y += b.vy * dt;
    const head = this.headOf(frame);
    if (head && Math.hypot(head.x - b.x, head.y - b.y) < 54) {
      b.vy = -330;
      this.hits += 1;
      this.board.comboHit();
      this.board.add(5);
      return [{ type: 'bump', points: 5, label: `${this.hits}번 받았어요!` }];
    }
    if (b.y > frame.height + 40) {
      this.balloon = {
        x: frame.width * 0.12 + Math.random() * frame.width * 0.76,
        y: -20,
        vy: 60,
        alive: true
      };
      this.board.comboMiss();
      return [{ type: 'drop', points: 0, label: '풍선이 떨어졌어요' }];
    }
    return [];
  }
}
