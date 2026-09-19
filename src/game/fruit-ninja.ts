// src/game/fruit-ninja.ts
import type { PoseFrame } from '../pose/types';
import { getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';

export interface Fruit { x: number; y: number; vx: number; vy: number; kind: 'fruit' | 'bomb'; alive: boolean }

export class FruitNinja implements Game {
  id = 'fruit';
  fruits: Fruit[] = [];
  board = new ScoreBoard();
  private running = false;
  private spawnMs = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.fruits = [];
    this.spawnMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  spawn(): void {
    const kind = Math.random() < 0.2 ? 'bomb' : 'fruit';
    this.fruits.push({ x: 60 + Math.random() * 520, y: 480, vx: (Math.random() - 0.5) * 120, vy: -(260 + Math.random() * 160), kind, alive: true });
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const dt = dtMs / 1000;
    this.spawnMs += dtMs;
    if (this.spawnMs > 900) {
      this.spawnMs = 0;
      this.spawn();
    }
    for (const f of this.fruits) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 500 * dt;
    }
    const wrists = [getByName(frame, 'left_wrist'), getByName(frame, 'right_wrist')].filter((w) => w && (w.score ?? 0) > 0.3);
    const events: GameEvent[] = [];
    for (const f of this.fruits) {
      if (!f.alive) continue;
      const hit = wrists.some((w) => w && Math.hypot(w.x - f.x, w.y - f.y) < 48);
      if (hit) {
        f.alive = false;
        if (f.kind === 'fruit') {
          this.board.comboHit();
          this.board.add(10);
          events.push({ type: 'slice', points: 10, label: '과일 베기!' });
        } else {
          this.board.comboMiss();
          this.board.add(-15);
          events.push({ type: 'bomb', points: -15, label: '폭탄! X자로 피하세요' });
        }
      }
    }
    this.fruits = this.fruits.filter((f) => f.alive && f.y < 520);
    return events;
  }
}
