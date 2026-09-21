// src/game/squat-runner.ts
import type { PoseFrame } from '../pose/types';
import { angleDeg, getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';
import { drawLabel } from '../ui/renderer';

export function kneeAngle(frame: PoseFrame, side: 'left' | 'right' = 'left'): number {
  const hip = getByName(frame, `${side}_hip`);
  const knee = getByName(frame, `${side}_knee`);
  const ankle = getByName(frame, `${side}_ankle`);
  if (!hip || !knee || !ankle) return 180;
  return angleDeg(hip, knee, ankle);
}

export interface RunnerObstacle { x: number; alive: boolean }
export interface RunnerCoin { x: number; lane: 'high' | 'low'; alive: boolean }

export class SquatRunner implements Game {
  id = 'squat';
  board = new ScoreBoard();
  isDown = false;
  reps = 0;
  obstacles: RunnerObstacle[] = [];
  coins: RunnerCoin[] = [];
  distanceM = 0;
  private running = false;
  private holdMs = 0;
  private elapsedMs = 0;
  private distancePx = 0;
  private scrollX = 0;
  private obstacleMs = 0;
  private coinMs = 0;

  get speedPxPerSec(): number {
    return Math.min(700, 320 + (this.elapsedMs / 1000) * 4 + this.board.combo * 8);
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.isDown = false;
    this.reps = 0;
    this.holdMs = 0;
    this.obstacles = [];
    this.coins = [];
    this.distanceM = 0;
    this.distancePx = 0;
    this.elapsedMs = 0;
    this.scrollX = 0;
    this.obstacleMs = 0;
    this.coinMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  spawnObstacle(x = 680): void {
    this.obstacles.push({ x, alive: true });
  }
  spawnCoin(lane: 'high' | 'low' = Math.random() < 0.5 ? 'high' : 'low', x = 680): void {
    this.coins.push({ x, lane, alive: true });
  }
  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const groundY = height - 60;
    const playerX = width * 0.22;
    // 트랙: 바닥 라인 + 스크롤 대시로 속도감.
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, groundY, width, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    const gap = 80;
    const off = -(this.scrollX % gap);
    for (let x = off; x < width; x += gap) {
      ctx.fillRect(x, groundY + 16, 44, 6);
    }
    // 속도선: 콤보가 붙으면 3줄 스피드 라인.
    if (this.board.combo >= 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 3; i++) {
        const y = groundY - 140 - i * 26;
        ctx.fillRect(0, y, width * 0.3, 3);
      }
    }
    // 플레이어: 서면 김, 앉으면 납작.
    const pw = this.isDown ? 56 : 44;
    const ph = this.isDown ? 50 : 90;
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(playerX - pw / 2, groundY - ph, pw, ph);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(playerX, groundY - ph - 14, 13, 0, Math.PI * 2);
    ctx.fill();
    // 장애물: 머리 높이 오버헤드 바 (앉아야 통과).
    for (const ob of this.obstacles) {
      if (!ob.alive) continue;
      const barY = groundY - 118;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(ob.x - 27, barY, 54, 26);
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(ob.x - 27, barY, 54, 5);
      ctx.fillRect(ob.x - 27, barY + 21, 54, 5);
    }
    // 코인: high=서서, low=앉아서.
    for (const c of this.coins) {
      if (!c.alive) continue;
      const cy = c.lane === 'high' ? groundY - 128 : groundY - 26;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(c.x, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7c5a00';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
    drawLabel(ctx, this.isDown ? '일어서세요!' : '앉으세요!', width / 2, 78, 40);
    drawLabel(ctx, `${this.reps}회 · ${this.distanceM.toFixed(0)}m`, width / 2, 128, 28);
  }
  tick(frame: PoseFrame, _dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const dt = _dtMs / 1000;
    this.elapsedMs += _dtMs;
    const speed = this.speedPxPerSec;
    this.distancePx += speed * dt;
    this.distanceM = this.distancePx / 100;
    this.scrollX += speed * dt;
    // 스쿼트 판정 (기존 계약 유지).
    const hasSide = (side: 'left' | 'right'): boolean =>
      !!getByName(frame, `${side}_hip`) && !!getByName(frame, `${side}_knee`) && !!getByName(frame, `${side}_ankle`);
    const leftOk = hasSide('left');
    const rightOk = hasSide('right');
    let angle: number;
    if (leftOk && rightOk) angle = Math.min(kneeAngle(frame, 'left'), kneeAngle(frame, 'right'));
    else if (leftOk) angle = kneeAngle(frame, 'left');
    else if (rightOk) angle = kneeAngle(frame, 'right');
    else angle = 180;
    const events: GameEvent[] = [];
    if (angle < 100) {
      this.holdMs += _dtMs;
      if (!this.isDown && this.holdMs > 300) {
        this.isDown = true;
        this.reps += 1;
        this.board.comboHit();
        this.board.add(10);
        if (this.reps % 10 === 0) events.push({ type: 'rest', points: 0, label: '10회! 잠시 쉬세요' });
        else events.push({ type: 'duck', points: 10, label: `${this.reps}회!` });
      }
    } else {
      this.holdMs = 0;
      this.isDown = false;
    }
    // 스폰: 장애물은 1600→900ms로 가속, 코인은 1100ms 고정.
    const playerX = frame.width * 0.22;
    this.obstacleMs += _dtMs;
    const obstacleInterval = Math.max(900, 1600 - this.elapsedMs * 0.01);
    if (this.obstacleMs > obstacleInterval) {
      this.obstacleMs = 0;
      this.spawnObstacle(frame.width + 40);
    }
    this.coinMs += _dtMs;
    if (this.coinMs > 1100) {
      this.coinMs = 0;
      this.spawnCoin(undefined, frame.width + 40);
    }
    for (const ob of this.obstacles) {
      if (!ob.alive) continue;
      ob.x -= speed * dt;
      if (ob.x <= playerX) {
        ob.alive = false;
        if (this.isDown) {
          this.board.comboHit();
          this.board.add(10);
          events.push({ type: 'dodge', points: 10, label: '장애물 통과!' });
        } else {
          this.board.comboMiss();
          events.push({ type: 'caught', points: 0, label: '부딪혔어요! 앉으세요!' });
        }
      }
    }
    for (const c of this.coins) {
      if (!c.alive) continue;
      c.x -= speed * dt;
      const wantsDown = c.lane === 'low';
      if (Math.abs(c.x - playerX) < 34) {
        if (this.isDown === wantsDown) {
          c.alive = false;
          this.board.comboHit();
          this.board.add(5);
          events.push({ type: 'catch', points: 5, label: '코인!' });
        }
      } else if (c.x < playerX - 34) {
        c.alive = false;
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.alive && o.x > -60);
    this.coins = this.coins.filter((c) => c.alive && c.x > -60);
    return events;
  }
}
