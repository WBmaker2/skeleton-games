import type { PoseFrame } from '../../pose/types';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawLabel } from '../../ui/renderer';
import { createSeededRng } from '../../game/rng';
import { ramp } from '../../game/difficulty';
import { SwipeTracker } from '../../game/swipe';

export const BOXING_SLOTS = 3;
// 미트를 맞혔다고 인정하는 반경(px).
export const BOXING_HIT_R = 64;
// 주먹으로 인정하는 최소 손 속도(px/s). 가볍게 뻗으면 300 이상 나온다.
export const BOXING_MIN_SPEED = 200;
// 미트가 떠 있는 시간: 시작 → 종료 (선형 단축).
export const BOXING_VISIBLE_START_MS = 1200;
export const BOXING_VISIBLE_END_MS = 600;
// 스폰 간격: 시작 → 종료 (선형 단축).
export const BOXING_SPAWN_START_MS = 900;
export const BOXING_SPAWN_END_MS = 450;
// 이 시간이 지나면 최대 2개까지 동시 출현.
export const BOXING_DOUBLE_AT_MS = 30000;
// 60초 챌린지 기준 경과 시간 상한(ms).
export const BOXING_GAME_MS = 60000;

export type BoxingPhase = 'hidden' | 'visible' | 'hit';

export interface Mitt {
  slot: number;
  phase: BoxingPhase;
  tMs: number;
  visibleMs: number;
  // 미트 세로 위치 비율 (0.3~0.55). 키에 맞게 랜덤.
  yFrac: number;
}

// 쉐도우 복싱: 화면에 뜨는 미트를 향해 주먹을 휙 뻗어 친다.
// 손을 가만히 대면 맞지 않고, 일정 속도 이상으로 뻗어야 펀치로 인정된다.
export class BoxingShadow implements Game {
  id = 'boxing';
  // 상단 안내·미트 시인성을 위해 얼굴 마스크를 그리지 않는다.
  hideFace = true;
  mitts: Mitt[] = [];
  board = new ScoreBoard();
  punches = 0;
  missed = 0;
  elapsedMs = 0;
  private running = false;
  private spawnMs = 0;
  private lastSlot = -1;
  private rngFn = createSeededRng(14);
  private swipe = new SwipeTracker();

  start(): void {
    this.running = true;
    this.board.reset();
    this.punches = 0;
    this.missed = 0;
    this.elapsedMs = 0;
    this.spawnMs = 0;
    this.lastSlot = -1;
    this.rngFn = createSeededRng(14);
    this.swipe.reset();
    this.mitts = Array.from({ length: BOXING_SLOTS }, (_, slot) => ({
      slot,
      phase: 'hidden' as BoxingPhase,
      tMs: 0,
      visibleMs: BOXING_VISIBLE_START_MS,
      yFrac: 0.42
    }));
  }
  stop(): void {
    this.running = false;
  }

  private rnd(): number {
    return this.rngFn();
  }

  visibleMsAt(elapsedMs: number): number {
    return ramp(BOXING_VISIBLE_START_MS, BOXING_VISIBLE_END_MS, elapsedMs, BOXING_GAME_MS);
  }

  spawnMsAt(elapsedMs: number): number {
    return ramp(BOXING_SPAWN_START_MS, BOXING_SPAWN_END_MS, elapsedMs, BOXING_GAME_MS);
  }

  maxAliveAt(elapsedMs: number): number {
    return elapsedMs < BOXING_DOUBLE_AT_MS ? 1 : 2;
  }

  aliveCount(): number {
    return this.mitts.filter((m) => m.phase !== 'hidden').length;
  }

  slotX(slot: number, width: number): number {
    return (width * (slot * 2 + 1)) / (BOXING_SLOTS * 2);
  }

  mittY(m: Mitt, height: number): number {
    return height * m.yFrac;
  }

  mittPos(slot: number, width: number, height: number): { x: number; y: number } {
    const m = this.mitts[slot];
    if (m && m.phase !== 'hidden') return { x: this.slotX(slot, width), y: this.mittY(m, height) };
    return { x: this.slotX(slot, width), y: height * 0.42 };
  }

  // 테스트·디버그용: 빈 자리에 미트를 즉시 내놓는다.
  forceSpawn(slot: number): void {
    const m = this.mitts[slot];
    if (!m || m.phase !== 'hidden') return;
    m.visibleMs = this.visibleMsAt(this.elapsedMs);
    m.phase = 'visible';
    m.tMs = 0;
    this.lastSlot = slot;
  }

  private spawnRandom(height: number): void {
    const hidden = this.mitts.filter((m) => m.phase === 'hidden' && m.slot !== this.lastSlot);
    const pool = hidden.length > 0 ? hidden : this.mitts.filter((m) => m.phase === 'hidden');
    if (pool.length === 0) return;
    const pick = pool[Math.floor(this.rnd() * pool.length)];
    pick.visibleMs = this.visibleMsAt(this.elapsedMs);
    pick.yFrac = 0.32 + this.rnd() * 0.2;
    void height;
    pick.phase = 'visible';
    pick.tMs = 0;
    this.lastSlot = pick.slot;
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const events: GameEvent[] = [];
    this.elapsedMs += dtMs;

    // 1) 미트 시간 전진: 시간 안에 못 맞히면 놓침.
    for (const m of this.mitts) {
      if (m.phase === 'hidden') continue;
      m.tMs += dtMs;
      if (m.phase === 'visible' && m.tMs >= m.visibleMs) {
        m.phase = 'hidden';
        m.tMs = 0;
        this.missed += 1;
        this.board.comboMiss();
        events.push({ type: 'miss', points: 0, label: '미트를 놓쳤어요' });
      } else if (m.phase === 'hit' && m.tMs >= 200) {
        m.phase = 'hidden';
        m.tMs = 0;
      }
    }

    // 2) 스폰.
    this.spawnMs -= dtMs;
    if (this.spawnMs <= 0) {
      this.spawnMs = this.spawnMsAt(this.elapsedMs);
      if (this.aliveCount() < this.maxAliveAt(this.elapsedMs)) this.spawnRandom(frame.height);
    }

    // 3) 손 추적 + 펀치 판정: 일정 속도 이상으로 뻗은 손만 인정.
    const hands: { side: 'left' | 'right'; x: number; y: number; speed: number }[] = [];
    for (const side of ['left', 'right'] as const) {
      const p = this.swipe.track(frame, side, dtMs);
      if (p) hands.push({ side, x: p.x, y: p.y, speed: p.speed });
    }
    for (const h of hands) {
      if (h.speed < BOXING_MIN_SPEED) continue;
      let best: Mitt | null = null;
      let bestDist = BOXING_HIT_R;
      for (const m of this.mitts) {
        if (m.phase !== 'visible') continue;
        const pos = { x: this.slotX(m.slot, frame.width), y: this.mittY(m, frame.height) };
        const d = Math.hypot(h.x - pos.x, h.y - pos.y);
        if (d <= bestDist) {
          bestDist = d;
          best = m;
        }
      }
      if (!best) continue;
      best.phase = 'hit';
      best.tMs = 0;
      this.punches += 1;
      this.board.comboHit();
      this.board.add(10);
      events.push({ type: 'punch', points: 10, label: `펀치 ${this.punches}발!` });
    }
    return events;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    drawLabel(ctx, `${this.punches}발 성공 · 놓침 ${this.missed}`, width / 2, 34, 28);
    drawLabel(ctx, '주먹을 휙 뻗어 미트를 쳐라! (가만히 대면 안 맞음)', width / 2, 74, 26);
    for (let slot = 0; slot < BOXING_SLOTS; slot++) {
      const m = this.mitts[slot];
      if (!m || m.phase === 'hidden') continue;
      const x = this.slotX(slot, width);
      const y = this.mittY(m, height);
      const frac = m.phase === 'visible' ? Math.max(0, 1 - m.tMs / Math.max(1, m.visibleMs)) : 0;
      drawMitt(ctx, x, y, m.phase === 'hit', frac);
    }
    // 손 속도 표시: 빠르게 뻗은 손은 노랑 링.
    for (const side of ['left', 'right'] as const) {
      const fast = this.swipe.speed(side) >= BOXING_MIN_SPEED;
      if (!fast) continue;
      ctx.save();
      ctx.strokeStyle = '#dfff00';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(width / 2 + (side === 'left' ? -60 : 60), height - 40, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    drawLabel(ctx, this.swipe.speed('left') >= BOXING_MIN_SPEED ? '왼 펀치!' : '왼', width / 2 - 60, height - 40, 22);
    drawLabel(ctx, this.swipe.speed('right') >= BOXING_MIN_SPEED ? '오른 펀치!' : '오른', width / 2 + 60, height - 40, 22);
  }
}

// 빨간 미트: 동심원 + 남은 시간 링. 셀카 미러에서도 대칭이라 방향 혼동 없음.
export function drawMitt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hit: boolean,
  frac: number
): void {
  const r = 40;
  ctx.save();
  ctx.fillStyle = hit ? '#dfff00' : '#ff5d5d';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hit ? '#22303c' : '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  if (!hit && frac > 0) {
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, r + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
