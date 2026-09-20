import type { PoseFrame } from '../pose/types';
import { getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';
import { drawStar } from '../ui/renderer';

// 2인 별자리: 양손으로 두 별을 동시에 0.8초 잡기. 협동 (혼자서도 가능).
export class DuoStars implements Game {
  id = 'duo';
  starA = { x: 160, y: 140 };
  starB = { x: 480, y: 140 };
  board = new ScoreBoard();
  pairs = 0;
  private running = false;
  private holdMs = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.pairs = 0;
    this.holdMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(this.starA.x, this.starA.y);
    ctx.lineTo(this.starB.x, this.starB.y);
    ctx.stroke();
    ctx.restore();
    drawStar(ctx, this.starA.x, this.starA.y, 24, '#dfff00');
    drawStar(ctx, this.starB.x, this.starB.y, 24, '#dfff00');
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const lw = getByName(frame, 'left_wrist');
    const rw = getByName(frame, 'right_wrist');
    const ok = (w: typeof lw, s: { x: number; y: number }): boolean =>
      !!w && (w.score ?? 0) > 0.3 && Math.hypot(w.x - s.x, w.y - s.y) < 64;
    if (!ok(lw, this.starA) || !ok(rw, this.starB)) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= 800) return [];
    this.holdMs = 0;
    this.pairs += 1;
    this.board.comboHit();
    this.board.add(20);
    return [{ type: 'pair', points: 20, label: `별자리 ${this.pairs}개 완성!` }];
  }
}
