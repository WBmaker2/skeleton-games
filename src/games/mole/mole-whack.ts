import type { PoseFrame } from '../../pose/types';
import { getByName, palmOf } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawLabel, drawStar } from '../../ui/renderer';

export const MOLE_SLOTS = 6;
// 손이 두더지 머리에 닿았다고 인정하는 반경(px). 별잡기·분리수거(56px)보다
// 너그럽게 잡았다. 두더지가 커서 얼굴 근처면 맞은 것으로 인정한다.
export const MOLE_HIT_R = 72;
// 손을 올렸다고 인정하는 기준: 손목이 어깨보다 이만큼(px) 위에 있어야 무장. 수학 퀴즈와 동일.
export const MOLE_ARM_DY = 20;
// 내려치기로 인정하는 최소 하강 속도(px/s). 천천히 내려도 맞도록 여유 있게 잡았다.
export const MOLE_DOWN_VY = 60;
// 맞은 두더지가 깜짝 표정으로 내려가는 시간(ms).
export const MOLE_HIT_MS = 350;
// 올라와 있는 시간: 시작 → 종료 (선형 단축).
export const MOLE_VISIBLE_START_MS = 1100;
export const MOLE_VISIBLE_END_MS = 450;
// 올라오기·내려가기 시간: 시작 → 종료 (선형 단축).
export const MOLE_RISE_START_MS = 350;
export const MOLE_RISE_END_MS = 150;
// 스폰 간격: 시작 → 종료 (선형 단축).
export const MOLE_SPAWN_START_MS = 1100;
export const MOLE_SPAWN_END_MS = 500;
// 이 시간이 지나면 최대 2마리까지 동시에 출현.
export const MOLE_DOUBLE_AT_MS = 30000;
// 60초 챌린지 기준 경과 시간 상한(ms). 루프의 timeLimitSec과 같은 값.
export const MOLE_GAME_MS = 60000;

export type MolePhase = 'hidden' | 'rising' | 'visible' | 'falling' | 'hit';

export interface Mole {
  slot: number;
  phase: MolePhase;
  tMs: number;
  riseMs: number;
  visibleMs: number;
  fallMs: number;
}

interface HandState {
  armed: boolean;
  prevX: number | null;
  prevY: number | null;
  vy: number;
}

// 두더지 팡팡: 바닥 6개 구멍에서 랜덤으로 올라오는 두더지를
// 손을 어깨 위로 올렸다가(무장) 내려쳐서 잡는다. 아래에서만 움직이면 타격 불가.
export class MoleWhack implements Game {
  id = 'mole';
  // 하단 구멍·두더지 시인성을 위해 얼굴 마스크를 그리지 않는다 (별·좀비·분리수거와 동일).
  hideFace = true;
  moles: Mole[] = [];
  board = new ScoreBoard();
  caught = 0;
  missed = 0;
  elapsedMs = 0;
  hands: Record<'left' | 'right', HandState> = {
    left: { armed: false, prevX: null, prevY: null, vy: 0 },
    right: { armed: false, prevX: null, prevY: null, vy: 0 }
  };
  private running = false;
  private spawnMs = 0;
  private lastSlot = -1;
  private seed = 1;

  start(): void {
    this.running = true;
    this.board.reset();
    this.caught = 0;
    this.missed = 0;
    this.elapsedMs = 0;
    this.spawnMs = 0;
    this.lastSlot = -1;
    this.seed = 1;
    this.moles = Array.from({ length: MOLE_SLOTS }, (_, slot) => ({
      slot,
      phase: 'hidden' as MolePhase,
      tMs: 0,
      riseMs: MOLE_RISE_START_MS,
      visibleMs: MOLE_VISIBLE_START_MS,
      fallMs: MOLE_RISE_START_MS
    }));
    this.hands = {
      left: { armed: false, prevX: null, prevY: null, vy: 0 },
      right: { armed: false, prevX: null, prevY: null, vy: 0 }
    };
  }
  stop(): void {
    this.running = false;
  }

  // 게임 내 난수 생성기 (별잡기·분리수거와 같은 LCG, 테스트 재현 가능).
  private rnd(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  private frac(): number {
    return Math.min(1, this.elapsedMs / MOLE_GAME_MS);
  }

  visibleMsAt(elapsedMs: number): number {
    const p = Math.min(1, elapsedMs / MOLE_GAME_MS);
    return MOLE_VISIBLE_START_MS - (MOLE_VISIBLE_START_MS - MOLE_VISIBLE_END_MS) * p;
  }

  riseMsAt(elapsedMs: number): number {
    const p = Math.min(1, elapsedMs / MOLE_GAME_MS);
    return MOLE_RISE_START_MS - (MOLE_RISE_START_MS - MOLE_RISE_END_MS) * p;
  }

  spawnMsAt(elapsedMs: number): number {
    const p = Math.min(1, elapsedMs / MOLE_GAME_MS);
    return MOLE_SPAWN_START_MS - (MOLE_SPAWN_START_MS - MOLE_SPAWN_END_MS) * p;
  }

  maxAliveAt(elapsedMs: number): number {
    return elapsedMs < MOLE_DOUBLE_AT_MS ? 1 : 2;
  }

  aliveCount(): number {
    return this.moles.filter((m) => m.phase !== 'hidden').length;
  }

  slotX(slot: number, width: number): number {
    return (width * (slot * 2 + 1)) / (MOLE_SLOTS * 2);
  }

  holeY(height: number): number {
    return height - 70;
  }

  // 두더지가 올라온 정도 0(숨음)~1(완전 출현).
  progressOf(m: Mole): number {
    if (m.phase === 'rising') return Math.min(1, m.tMs / Math.max(1, m.riseMs));
    if (m.phase === 'visible') return 1;
    if (m.phase === 'falling') return Math.max(0, 1 - m.tMs / Math.max(1, m.fallMs));
    if (m.phase === 'hit') return Math.max(0, 1 - m.tMs / MOLE_HIT_MS);
    return 0;
  }

  // 타격 판정점: 올라온 두더지의 얼굴 중심. 그리기(drawMole)와 같은 기준
  // (구멍선 +4px에서 몸통 높이 0.62배 위)으로 맞춰 손이 얼굴을 노리면 맞는다.
  headPos(slot: number, width: number, height: number, progress = 1): { x: number; y: number } {
    const size = this.moleSize(width);
    return { x: this.slotX(slot, width), y: this.holeY(height) + 4 - size * 0.62 * progress };
  }

  // 두더지 기준 크기(px). 6구멍 한 줄에 들어가면서 잘 보이게 1.5배 키웠다
  // (기존 width/12·44~72 → width/8·66~108).
  moleSize(width: number): number {
    return Math.min(108, Math.max(66, width / 8));
  }

  // 테스트·디버그용: 빈 구멍에 즉시 올라온 두더지를 내놓는다.
  forceSpawn(slot: number): void {
    const m = this.moles[slot];
    if (!m || m.phase !== 'hidden') return;
    const rise = this.riseMsAt(this.elapsedMs);
    m.riseMs = rise;
    m.fallMs = rise;
    m.visibleMs = this.visibleMsAt(this.elapsedMs);
    m.phase = 'visible';
    m.tMs = 0;
    this.lastSlot = slot;
  }

  private spawnRandom(): void {
    const hidden = this.moles.filter((m) => m.phase === 'hidden' && m.slot !== this.lastSlot);
    const pool = hidden.length > 0 ? hidden : this.moles.filter((m) => m.phase === 'hidden');
    if (pool.length === 0) return;
    const pick = pool[Math.floor(this.rnd() * pool.length)];
    const rise = this.riseMsAt(this.elapsedMs);
    pick.riseMs = rise;
    pick.fallMs = rise;
    pick.visibleMs = this.visibleMsAt(this.elapsedMs);
    pick.phase = 'rising';
    pick.tMs = 0;
    this.lastSlot = pick.slot;
  }

  private trackHand(frame: PoseFrame, side: 'left' | 'right', dtMs: number): { x: number; y: number } | null {
    const st = this.hands[side];
    const palm = palmOf(frame, side);
    if (!palm) {
      // 손이 사라지면 속도만 리셋하고 무장은 유지한다 (깜빡임에 관대).
      st.prevX = null;
      st.prevY = null;
      st.vy = 0;
      return null;
    }
    // 어깨 위로 한 번 올리면 무장 래치: 내려간 뒤에도 유지되고 타격 시 소모된다.
    const shoulder = getByName(frame, `${side}_shoulder`);
    const wrist = getByName(frame, `${side}_wrist`);
    if (shoulder && wrist && (wrist.score ?? 0) >= 0.3 && (shoulder.score ?? 0) >= 0.3) {
      if (wrist.y < shoulder.y - MOLE_ARM_DY) st.armed = true;
    }
    if (st.prevY != null && dtMs > 0) {
      st.vy = ((palm.y - st.prevY) / dtMs) * 1000;
    } else {
      st.vy = 0;
    }
    st.prevX = palm.x;
    st.prevY = palm.y;
    return palm;
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const events: GameEvent[] = [];
    this.elapsedMs += dtMs;

    // 1) 두더지 상태 전진.
    for (const m of this.moles) {
      if (m.phase === 'hidden') continue;
      m.tMs += dtMs;
      if (m.phase === 'rising' && m.tMs >= m.riseMs) {
        m.phase = 'visible';
        m.tMs = 0;
      } else if (m.phase === 'visible' && m.tMs >= m.visibleMs) {
        m.phase = 'falling';
        m.tMs = 0;
        this.missed += 1;
        this.board.comboMiss();
        events.push({ type: 'miss', points: 0, label: '두더지를 놓쳤어요' });
      } else if (m.phase === 'falling' && m.tMs >= m.fallMs) {
        m.phase = 'hidden';
        m.tMs = 0;
      } else if (m.phase === 'hit' && m.tMs >= MOLE_HIT_MS) {
        m.phase = 'hidden';
        m.tMs = 0;
      }
    }

    // 2) 스폰: 빈 구멍 중 직전 슬롯을 피해서 랜덤으로. 후반에는 최대 2마리 동시.
    this.spawnMs -= dtMs;
    if (this.spawnMs <= 0) {
      this.spawnMs = this.spawnMsAt(this.elapsedMs);
      if (this.aliveCount() < this.maxAliveAt(this.elapsedMs)) this.spawnRandom();
    }

    // 3) 손 추적 + 내려치기 판정.
    const palms: { side: 'left' | 'right'; x: number; y: number }[] = [];
    for (const side of ['left', 'right'] as const) {
      const p = this.trackHand(frame, side, dtMs);
      if (p) palms.push({ side, x: p.x, y: p.y });
    }
    for (const p of palms) {
      const st = this.hands[p.side];
      // 무장하지 않았거나(아래에서만 움직임) 내려오는 중이 아니면 타격 불가.
      if (!st.armed || st.vy < MOLE_DOWN_VY) continue;
      let best: Mole | null = null;
      let bestDist = MOLE_HIT_R;
      for (const m of this.moles) {
        if (m.phase !== 'visible') continue;
        const head = this.headPos(m.slot, frame.width, frame.height, this.progressOf(m));
        const d = Math.hypot(p.x - head.x, p.y - head.y);
        if (d <= bestDist) {
          bestDist = d;
          best = m;
        }
      }
      if (!best) continue;
      best.phase = 'hit';
      best.tMs = 0;
      st.armed = false;
      this.caught += 1;
      this.board.comboHit();
      this.board.add(10);
      events.push({ type: 'catch', points: 10, label: `두더지 ${this.caught}마리!` });
    }
    return events;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const h = height || 480;
    const judgeY = h - 20;
    const hy = this.holeY(h);
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1) 땅 라인 (좀비 스텝과 같은 높이·색).
    ctx.save();
    ctx.fillStyle = 'rgba(10, 16, 22, 0.55)';
    ctx.fillRect(0, judgeY - 2, width, 11);
    ctx.fillStyle = '#dfff00';
    ctx.fillRect(0, judgeY, width, 6);
    ctx.restore();

    // 2) 구멍 6개 + 두더지.
    for (let slot = 0; slot < MOLE_SLOTS; slot++) {
      const x = this.slotX(slot, width);
      const m = this.moles[slot];
      const hittable = m && (m.phase === 'rising' || m.phase === 'visible');
      this.drawHole(ctx, x, hy, width, hittable && !reduced);
      if (m && m.phase !== 'hidden') {
        // 구멍 위로만 보이게 클립: 아래에 묻힌 몸통은 잘라낸다.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width, hy + 2);
        ctx.clip();
        const p = this.progressOf(m);
        const size = this.moleSize(width);
        drawMole(ctx, x, hy + 4 - (size * 1.3 + 6) * (1 - p), size, m.phase === 'hit');
        ctx.restore();
      }
      // 구멍 앞 테두리: 두더지 몸통 아래를 덮어 구멍에서 나온 것처럼 보이게 한다.
      this.drawHoleLip(ctx, x, hy, width);
    }

    // 3) 상단 안내.
    drawLabel(ctx, `${this.caught}마리 잡았어요 · 놓침 ${this.missed}`, width / 2, 34, 28);
    drawLabel(ctx, '손을 어깨 위로 올렸다가 내려쳐요!', width / 2, 74, 30);
    // 4) 양손 무장 표시: 노랑이면 내려치기 가능, 회색이면 먼저 손을 올려야 함.
    this.drawArmBadge(ctx, width - 132, 34, '왼', this.hands.left.armed);
    this.drawArmBadge(ctx, width - 72, 34, '오', this.hands.right.armed);
  }

  private drawHole(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, glow: boolean): void {
    const w = Math.min(96, Math.max(56, width / 9));
    ctx.save();
    if (glow) {
      ctx.strokeStyle = '#dfff00';
      ctx.lineWidth = 5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2 + 8, 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#3a2415';
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawHoleLip(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
    const w = Math.min(96, Math.max(56, width / 9));
    ctx.save();
    ctx.strokeStyle = '#8a5a33';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w / 2, 12, 0, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.restore();
  }

  private drawArmBadge(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, armed: boolean): void {
    ctx.save();
    ctx.fillStyle = armed ? '#dfff00' : 'rgba(255, 255, 255, 0.25)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, label, x, y, 24);
  }
}

// 귀여운 두더지 (코드 직접 드로잉, 정면 대칭 — 셀카 미러에서도 방향 혼동 없음).
// baseY는 몸통이 구멍에 닿는 바닥선, s는 기준 크기(px). hit이면 깜짝 놀란 표정.
export function drawMole(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  s = 60,
  hit = false
): void {
  const k = s / 60;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const bodyW = 27 * k;
  const bodyH = 36 * k;
  const cy = baseY - bodyH;

  // 앞발 (몸통 양옆)
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.ellipse(x - bodyW - 2 * k, baseY - 14 * k, 8 * k, 11 * k, 0.3, 0, Math.PI * 2);
  ctx.ellipse(x + bodyW + 2 * k, baseY - 14 * k, 8 * k, 11 * k, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 몸통 (갈색 타원)
  ctx.fillStyle = '#a06a3b';
  ctx.strokeStyle = '#4a2c14';
  ctx.lineWidth = 3 * k;
  ctx.beginPath();
  ctx.ellipse(x, cy, bodyW, bodyH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 배 (연한 타원)
  ctx.fillStyle = '#e9cba5';
  ctx.beginPath();
  ctx.ellipse(x, cy + 12 * k, 15 * k, 18 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  // 귀 (양옆 분홍)
  ctx.fillStyle = '#f4a7b9';
  ctx.beginPath();
  ctx.arc(x - bodyW + 2 * k, cy - 26 * k, 6 * k, 0, Math.PI * 2);
  ctx.arc(x + bodyW - 2 * k, cy - 26 * k, 6 * k, 0, Math.PI * 2);
  ctx.fill();

  // 솜털 3가닥
  ctx.strokeStyle = '#4a2c14';
  ctx.lineWidth = 2.5 * k;
  ctx.beginPath();
  ctx.moveTo(x - 5 * k, cy - bodyH + 2 * k);
  ctx.lineTo(x - 7 * k, cy - bodyH - 7 * k);
  ctx.moveTo(x, cy - bodyH + 2 * k);
  ctx.lineTo(x, cy - bodyH - 9 * k);
  ctx.moveTo(x + 5 * k, cy - bodyH + 2 * k);
  ctx.lineTo(x + 7 * k, cy - bodyH - 7 * k);
  ctx.stroke();

  if (!hit) {
    // 기본 표정: 까만 눈 + 분홍 볼 + 미소 + 코
    ctx.fillStyle = '#22303c';
    ctx.beginPath();
    ctx.arc(x - 10 * k, cy - 8 * k, 3.4 * k, 0, Math.PI * 2);
    ctx.arc(x + 10 * k, cy - 8 * k, 3.4 * k, 0, Math.PI * 2);
    ctx.fill();
    // 눈 반짝이
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 11 * k, cy - 9 * k, 1.2 * k, 0, Math.PI * 2);
    ctx.arc(x + 9 * k, cy - 9 * k, 1.2 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 154, 162, 0.9)';
    ctx.beginPath();
    ctx.arc(x - 16 * k, cy, 4.5 * k, 0, Math.PI * 2);
    ctx.arc(x + 16 * k, cy, 4.5 * k, 0, Math.PI * 2);
    ctx.fill();
    // 코
    ctx.fillStyle = '#e2607a';
    ctx.beginPath();
    ctx.arc(x, cy - 1 * k, 4 * k, 0, Math.PI * 2);
    ctx.fill();
    // 미소
    ctx.strokeStyle = '#22303c';
    ctx.lineWidth = 2.2 * k;
    ctx.beginPath();
    ctx.arc(x, cy + 2 * k, 7 * k, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  } else {
    // 맞았을 때 표정: 감은 눈(><) + O 입 + 진한 볼
    ctx.strokeStyle = '#22303c';
    ctx.lineWidth = 3 * k;
    for (const sx of [-1, 1]) {
      const ex = x + sx * 10 * k;
      const ey = cy - 8 * k;
      ctx.beginPath();
      ctx.moveTo(ex - 4 * k, ey - 4 * k);
      ctx.lineTo(ex + 4 * k, ey + 4 * k);
      ctx.moveTo(ex + 4 * k, ey - 4 * k);
      ctx.lineTo(ex - 4 * k, ey + 4 * k);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 90, 110, 0.9)';
    ctx.beginPath();
    ctx.arc(x - 16 * k, cy + 2 * k, 5 * k, 0, Math.PI * 2);
    ctx.arc(x + 16 * k, cy + 2 * k, 5 * k, 0, Math.PI * 2);
    ctx.fill();
    // 놀란 O 입
    ctx.fillStyle = '#22303c';
    ctx.beginPath();
    ctx.arc(x, cy + 6 * k, 5 * k, 0, Math.PI * 2);
    ctx.fill();
    // 머리 위 별 파티클
    drawStar(ctx, x - 22 * k, cy - bodyH - 8 * k, 7 * k, '#dfff00');
    drawStar(ctx, x + 22 * k, cy - bodyH - 12 * k, 6 * k, '#ffffff');
    drawStar(ctx, x, cy - bodyH - 18 * k, 8 * k, '#ff71ce');
  }

  ctx.restore();
}
