import type { PoseFrame } from '../../pose/types';
import { bodyCenterX } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawLabel } from '../../ui/renderer';

export type RecycleKind = 'plastic' | 'can';

export interface RecycleItem {
  kind: RecycleKind;
  y: number;
  alive: boolean;
}

// 분리수거 스트레칭: 몸을 기울여 왼쪽 플라스틱·오른쪽 캔으로 분류. 환경교육.
export class RecycleSort implements Game {
  id = 'recycle';
  item: RecycleItem = { kind: 'plastic', y: 60, alive: true };
  board = new ScoreBoard();
  sorted = 0;
  private running = false;
  private holdMs = 0;
  private qi = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.sorted = 0;
    this.qi = 0;
    this.item = { kind: 'plastic', y: 60, alive: true };
    this.holdMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const binW = 140;
    const binH = 100;
    const bins: { x: number; color: string; label: string }[] = [
      { x: width / 6 - binW / 2, color: '#3d9e57', label: '플라스틱' },
      { x: (width * 5) / 6 - binW / 2, color: '#3b82c4', label: '캔' }
    ];
    for (const b of bins) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, height - binH - 12, binW, binH, 10);
      ctx.fill();
      ctx.restore();
      drawLabel(ctx, b.label, b.x + binW / 2, height - binH - 38, 22);
    }
    if (this.item.alive) {
      const isPlastic = this.item.kind === 'plastic';
      ctx.save();
      ctx.fillStyle = isPlastic ? '#3d9e57' : '#3b82c4';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 32, this.item.y - 32, 64, 64, 12);
      ctx.fill();
      ctx.restore();
      drawLabel(ctx, isPlastic ? '플' : '캔', width / 2, this.item.y, 30);
    }
    drawLabel(ctx, `${this.sorted}개 분류`, width / 2, 48, 30);
  }
  zoneOf(x: number, width: number): 0 | 1 | 2 {
    if (x < width / 3) return 0;
    if (x < (width * 2) / 3) return 1;
    return 2;
  }
  private next(): void {
    this.qi += 1;
    this.item = { kind: this.qi % 2 === 0 ? 'plastic' : 'can', y: 60, alive: true };
    this.holdMs = 0;
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running || !this.item.alive) return [];
    this.item.y += 140 * (dtMs / 1000);
    const zone = this.zoneOf(bodyCenterX(frame), frame.width);
    const want: 0 | 2 = this.item.kind === 'plastic' ? 0 : 2;
    const wrong: 0 | 2 = this.item.kind === 'plastic' ? 2 : 0;
    if (zone !== want && zone !== wrong) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= 500) return [];
    this.item.alive = false;
    if (zone === want) {
      this.sorted += 1;
      this.board.comboHit();
      this.board.add(10);
      const n = this.sorted;
      this.next();
      return [{ type: 'sorted', points: 10, label: `분리수거 ${n}개!` }];
    }
    this.board.comboMiss();
    this.next();
    return [{ type: 'mixed', points: 0, label: '엉뚱한 통이에요' }];
  }
}
