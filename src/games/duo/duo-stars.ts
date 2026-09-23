import type { PoseFrame } from '../../pose/types';
import { palmOf } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawStar } from '../../ui/renderer';

// 2인 별자리: 양손으로 두 별을 동시에 0.8초 잡기. 협동 (혼자서도 가능).
export class DuoStars implements Game {
  id = 'duo';
  // 상단 별·점선 시인성을 위해 얼굴 마스크를 그리지 않는다 (별잡기·요가와 동일).
  hideFace = true;
  starA = { x: 160, y: 140 };
  starB = { x: 480, y: 140 };
  board = new ScoreBoard();
  pairs = 0;
  private running = false;
  private holdMs = 0;
  private placedWidth = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.pairs = 0;
    this.holdMs = 0;
    this.placedWidth = 0;
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
    drawStar(ctx, this.starA.x, this.starA.y, 32, '#dfff00');
    drawStar(ctx, this.starB.x, this.starB.y, 32, '#dfff00');
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    // 별 위치를 화면 너비에 맞춤 (넓은 화면에서도 1/4·3/4 지점).
    if (this.placedWidth !== frame.width) {
      this.placedWidth = frame.width;
      this.starA = { x: frame.width * 0.25, y: 140 };
      this.starB = { x: frame.width * 0.75, y: 140 };
    }
    const lw = palmOf(frame, 'left');
    const rw = palmOf(frame, 'right');
    // 판정 반경: 화면 너비의 10% (640px 기준 64px, 1280px 기준 128px).
    // 고정 64px이면 넓은 화면에서 상대적으로 까다로워져 겹쳐 보여도 실패한다.
    const radius = frame.width * 0.1;
    const near = (w: typeof lw, s: { x: number; y: number }): boolean =>
      !!w && Math.hypot(w.x - s.x, w.y - s.y) < radius;
    // 화면은 셀카 미러(CSS scaleX(-1))로 보이므로 비트맵 왼쪽 별이 화면 오른쪽에 보인다.
    // 사용자가 화면에서 왼쪽 별에 왼손을 올리면 비트맵에서는 반대쪽이 된다.
    // 그래서 왼손→왼쪽별·오른손→오른쪽별 고정 대신, 어느 손이 어느 별이어도
    // 두 별이 각각 다른 손으로 동시에 덮이면 성공으로 인정한다.
    const straight = near(lw, this.starA) && near(rw, this.starB);
    const swapped = near(lw, this.starB) && near(rw, this.starA);
    if (!straight && !swapped) {
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
