import type { PoseFrame } from '../../pose/types';
import { bodyCenterX } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawBar, drawLabel } from '../../ui/renderer';

export type RecycleKind = 'plastic' | 'can';

export interface RecycleItem {
  kind: RecycleKind;
  y: number;
  alive: boolean;
}

// 성공까지 버티는 시간(ms). 화면 안내·진행바와 같은 값을 쓴다.
export const RECYCLE_HOLD_MS = 500;
// 하늘에서 떨어지는 물건 한 변(px). 기존 64에서 키워 멀리서도 잘 보이게 한다.
export const RECYCLE_ITEM_SIZE = 92;
// 결과 문구를 화면에 남기는 시간(ms).
export const RECYCLE_RESULT_MS = 1200;
// 물건이 처음 나오는 높이. 상단 안내 글자와 겹치지 않게 아래에서 시작한다.
export const RECYCLE_SPAWN_Y = 200;

// 분리수거 스트레칭: 몸을 기울여 왼쪽 플라스틱·오른쪽 캔으로 분류. 환경교육.
export class RecycleSort implements Game {
  id = 'recycle';
  // 상단 안내 글자·떨어지는 물건 시인성을 위해 얼굴 마스크를 그리지 않는다 (수학·ABC와 동일).
  hideFace = true;
  item: RecycleItem = { kind: 'plastic', y: RECYCLE_SPAWN_Y, alive: true };
  board = new ScoreBoard();
  sorted = 0;
  failed = 0;
  // 화면 그리기용 실시간 상태: 내가 서 있는 구역·성공까지 진행률·마지막 결과.
  playerZone: 0 | 1 | 2 = 1;
  holdMs = 0;
  lastResult: 'sorted' | 'mixed' | null = null;
  lastLabel = '';
  private lastAgeMs = 0;
  private running = false;
  private qi = 0;

  // 목표 통 구역: 플라스틱은 왼쪽(0), 캔은 오른쪽(2).
  get targetZone(): 0 | 2 {
    return this.item.kind === 'plastic' ? 0 : 2;
  }

  get targetColor(): string {
    return this.item.kind === 'plastic' ? '#3d9e57' : '#3b82c4';
  }

  get holdProgress(): number {
    return Math.min(1, this.holdMs / RECYCLE_HOLD_MS);
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.sorted = 0;
    this.failed = 0;
    this.qi = 0;
    this.item = { kind: 'plastic', y: RECYCLE_SPAWN_Y, alive: true };
    this.holdMs = 0;
    this.playerZone = 1;
    this.lastResult = null;
    this.lastLabel = '';
    this.lastAgeMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const binW = 160;
    const binH = 112;
    const target = this.targetZone;
    const isPlastic = this.item.kind === 'plastic';

    // 1) 구역 밑바탕: 목표 통이 있는 쪽을 초록·파랑 빛으로 비춘다.
    ctx.save();
    ctx.fillStyle = isPlastic ? 'rgba(61, 158, 87, 0.20)' : 'rgba(59, 130, 196, 0.20)';
    ctx.fillRect(target === 0 ? 0 : (width * 2) / 3, 0, width / 3, height);
    // 내가 서 있는 구역은 노랑(성공이면 초록, 실패면 빨강)으로 덧씌운다.
    const standing =
      this.playerZone === target
        ? 'rgba(61, 158, 87, 0.22)'
        : this.playerZone === 1
          ? 'rgba(223, 255, 0, 0.10)'
          : 'rgba(255, 59, 48, 0.18)';
    ctx.fillStyle = standing;
    ctx.fillRect(this.playerZone * (width / 3), 0, width / 3, height);
    ctx.restore();

    // 2) 3등분 세로 구분선: 영상 위에서도 잘 보이게 어두운 밑선+흰 점선.
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(10, 16, 22, 0.55)';
    for (const lx of [width / 3, (width * 2) / 3]) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.setLineDash([12, 10]);
    for (const lx of [width / 3, (width * 2) / 3]) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
      ctx.stroke();
    }
    ctx.restore();

    // 3) 상단 안내: 결과 개수·목표 통·성공 기준을 화면에 직접 보여준다.
    drawLabel(ctx, `${this.sorted}개 분류 · 실수 ${this.failed}회`, width / 2, 34, 30);
    drawLabel(
      ctx,
      isPlastic ? '플라스틱은 왼쪽 통!' : '캔은 오른쪽 통!',
      width / 2,
      78,
      38
    );
    drawLabel(ctx, '통 자리에서 0.5초 버티면 성공 · 반대쪽은 실패', width / 2, 116, 22);
    // 성공까지 진행바: 목표 자리에 서 있을 때만 차오른다.
    const inSide = this.playerZone !== 1;
    drawBar(
      ctx,
      width / 2 - 110,
      134,
      220,
      12,
      inSide ? this.holdProgress : 0,
      this.playerZone === target ? this.targetColor : '#ff3b30'
    );

    const bins: { x: number; color: string; label: string; zone: 0 | 2 }[] = [
      { x: width / 6 - binW / 2, color: '#3d9e57', label: '플라스틱', zone: 0 },
      { x: (width * 5) / 6 - binW / 2, color: '#3b82c4', label: '캔', zone: 2 }
    ];
    for (const b of bins) {
      const isTarget = b.zone === target;
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.globalAlpha = isTarget ? 1 : 0.55;
      ctx.beginPath();
      ctx.roundRect(b.x, height - binH - 12, binW, binH, 12);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 목표 통은 굵은 흰 테두리, 다른 통은 얇은 테두리로 구별한다.
      ctx.strokeStyle = isTarget ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = isTarget ? 5 : 2;
      ctx.beginPath();
      ctx.roundRect(b.x, height - binH - 12, binW, binH, 12);
      ctx.stroke();
      ctx.restore();
      drawLabel(ctx, b.label, b.x + binW / 2, height - binH - 44, 28);
      if (isTarget) {
        drawLabel(ctx, '▼ 여기!', b.x + binW / 2, height - binH - 76, 26);
      }
    }
    if (this.item.alive) {
      const half = RECYCLE_ITEM_SIZE / 2;
      ctx.save();
      ctx.fillStyle = this.targetColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(width / 2 - half, this.item.y - half, RECYCLE_ITEM_SIZE, RECYCLE_ITEM_SIZE, 16);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawLabel(ctx, isPlastic ? '플' : '캔', width / 2, this.item.y, 42);
    }
    // 4) 마지막 결과 알림: 통 위쪽에 성공(초록)·실패(빨강) 띠로 잠시 남긴다.
    if (this.lastResult && this.lastAgeMs < RECYCLE_RESULT_MS) {
      const ok = this.lastResult === 'sorted';
      const pillW = 300;
      const pillH = 44;
      const px = width / 2 - pillW / 2;
      const py = height - binH - 140;
      ctx.save();
      ctx.fillStyle = ok ? 'rgba(61, 158, 87, 0.92)' : 'rgba(255, 59, 48, 0.92)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pillW, pillH, 22);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawLabel(ctx, this.lastLabel, width / 2, py + pillH / 2, 26);
    }
  }
  zoneOf(x: number, width: number): 0 | 1 | 2 {
    if (x < width / 3) return 0;
    if (x < (width * 2) / 3) return 1;
    return 2;
  }
  private next(): void {
    this.qi += 1;
    this.item = { kind: this.qi % 2 === 0 ? 'plastic' : 'can', y: RECYCLE_SPAWN_Y, alive: true };
    this.holdMs = 0;
  }
  private remember(result: 'sorted' | 'mixed', label: string): void {
    this.lastResult = result;
    this.lastLabel = label;
    this.lastAgeMs = 0;
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (this.lastResult) {
      this.lastAgeMs += dtMs;
      if (this.lastAgeMs >= RECYCLE_RESULT_MS) {
        this.lastResult = null;
        this.lastLabel = '';
      }
    }
    if (!this.running || !this.item.alive) return [];
    this.item.y += 140 * (dtMs / 1000);
    const zone = this.zoneOf(bodyCenterX(frame), frame.width);
    this.playerZone = zone;
    const want: 0 | 2 = this.item.kind === 'plastic' ? 0 : 2;
    const wrong: 0 | 2 = this.item.kind === 'plastic' ? 2 : 0;
    if (zone !== want && zone !== wrong) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= RECYCLE_HOLD_MS) return [];
    this.item.alive = false;
    if (zone === want) {
      this.sorted += 1;
      this.board.comboHit();
      this.board.add(10);
      const n = this.sorted;
      const label = `분리수거 ${n}개!`;
      this.remember('sorted', `성공! ${label}`);
      this.next();
      return [{ type: 'sorted', points: 10, label }];
    }
    this.failed += 1;
    this.board.comboMiss();
    this.remember('mixed', '실패! 엉뚱한 통이에요');
    this.next();
    return [{ type: 'mixed', points: 0, label: '엉뚱한 통이에요' }];
  }
}
