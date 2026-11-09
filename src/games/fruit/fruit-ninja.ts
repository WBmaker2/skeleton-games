// src/games/fruit/fruit-ninja.ts
import type { PoseFrame } from '../../pose/types';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { SwipeTracker } from '../../game/swipe';

export interface Fruit { x: number; y: number; vx: number; vy: number; kind: 'fruit' | 'bomb'; alive: boolean }

export class FruitNinja implements Game {
  id = 'fruit';
  fruits: Fruit[] = [];
  board = new ScoreBoard();
  radiusScale = 1;
  slices = 0;
  private running = false;
  private spawnMs = 0;
  private spawnCount = 0;
  private swipe = new SwipeTracker();

  start(): void {
    this.running = true;
    this.board.reset();
    this.fruits = [];
    this.spawnMs = 0;
    this.slices = 0;
    this.spawnCount = 0;
    this.swipe.reset();
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    for (const f of this.fruits) {
      if (!f.alive) continue;
      ctx.save();
      if (f.kind === 'fruit') {
        ctx.fillStyle = '#ff5d5d';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3d9e57';
        ctx.beginPath();
        ctx.ellipse(f.x + 10, f.y - 20, 11, 6, 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#22303c';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dfff00';
        ctx.beginPath();
        ctx.arc(f.x + 8, f.y - 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  spawn(width = 640): void {
    const kind = Math.random() < 0.2 ? 'bomb' : 'fruit';
    // 좌우 편중 방지: 왼쪽·가운데·오른쪽 구역을 차례로 순환하고
    // 구역 안에서만 jitter를 준다. 연속 스폰이 한쪽에 몰리지 않는다.
    // 너비는 프레임 기준 (720p 등 넓은 화면에서도 전역에 분포).
    const zone = this.spawnCount % 3;
    this.spawnCount += 1;
    const center = (width * (zone * 2 + 1)) / 6;
    const lo = width * 0.06;
    const hi = width * 0.94;
    const x = Math.min(hi, Math.max(lo, center + (Math.random() - 0.5) * width * 0.22));
    // 위에서 떨어지기: 화면 위(y=-20) 스폰 후 낙하. 빠른 상승 대신
    // 빠른 낙하 + 강한 중력으로 박진감 있게 빽빽히 떨어진다.
    this.fruits.push({ x, y: -20, vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 140, kind, alive: true });
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const dt = dtMs / 1000;
    this.spawnMs += dtMs;
    if (this.spawnMs > 400) {
      this.spawnMs = 0;
      this.spawn(frame.width);
    }
    for (const f of this.fruits) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 700 * dt;
    }
    // 베기 판정: 손이 일정 속도 이상으로 움직이면서 닿아야 인정한다.
    // 가만히 손을 받쳐 과일을 받는 것만으로는 점수가 오르지 않는다.
    const hands: { x: number; y: number; swiping: boolean }[] = [];
    for (const side of ['left', 'right'] as const) {
      const p = this.swipe.track(frame, side, dtMs);
      if (p) hands.push({ x: p.x, y: p.y, swiping: this.swipe.isSwiping(side) });
    }
    const events: GameEvent[] = [];
    for (const f of this.fruits) {
      if (!f.alive) continue;
      const hit = hands.some((w) => w.swiping && Math.hypot(w.x - f.x, w.y - f.y) < 48 * this.radiusScale);
      if (hit) {
        f.alive = false;
        if (f.kind === 'fruit') {
          this.board.comboHit();
          this.board.add(10);
          this.slices += 1;
          // 10개마다 2개 동시 스폰으로 박진감 유지.
          if (this.slices % 10 === 0) {
            this.spawn(frame.width);
            this.spawn(frame.width);
          }
          events.push({ type: 'slice', points: 10, label: '과일 베기!' });
        } else {
          this.board.comboMiss();
          this.board.add(-15);
          events.push({ type: 'bomb', points: -15, label: '폭탄! X자로 피하세요' });
        }
      }
    }
    // 스테이지 바닥(캔버스 높이 + 여유)에 닿아야 사라진다. 고정값이 아니라
    // 프레임 해상도 기준이라 720p에서도 바닥까지 떨어진다.
    const floorY = frame.height + 40;
    this.fruits = this.fruits.filter(
      (f) => f.alive && f.y < floorY && f.x > -40 && f.x < frame.width + 40
    );
    return events;
  }
}
