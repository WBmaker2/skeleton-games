import type { PoseFrame } from '../pose/types';
import { bodyCenterX } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';
import { drawLabel } from '../ui/renderer';

export interface Ghoul {
  zone: 0 | 1 | 2;
  y: number;
  alive: boolean;
}

// 좀비 스텝: 좌우 스텝으로 좀비 피하기. 유산소·민첩성.
export class ZombieSteps implements Game {
  id = 'zombie';
  ghouls: Ghoul[] = [];
  board = new ScoreBoard();
  dodged = 0;
  private running = false;
  private spawnMs = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.ghouls = [];
    this.dodged = 0;
    this.spawnMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number): void {
    for (const gh of this.ghouls) {
      if (!gh.alive) continue;
      const cx = (width * (gh.zone * 2 + 1)) / 6;
      ctx.save();
      ctx.fillStyle = '#3d9e57';
      ctx.beginPath();
      ctx.roundRect(cx - 36, gh.y - 26, 72, 80, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 15, gh.y + 2, 8, 0, Math.PI * 2);
      ctx.arc(cx + 15, gh.y + 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22303c';
      ctx.beginPath();
      ctx.arc(cx - 15, gh.y + 3, 3, 0, Math.PI * 2);
      ctx.arc(cx + 15, gh.y + 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawLabel(ctx, `${this.dodged}회 회피`, width / 2, 44, 26);
  }
  zoneOf(x: number, width: number): 0 | 1 | 2 {
    if (x < width / 3) return 0;
    if (x < (width * 2) / 3) return 1;
    return 2;
  }
  spawn(zone?: 0 | 1 | 2): void {
    const z = zone ?? (Math.floor(Math.random() * 3) as 0 | 1 | 2);
    this.ghouls.push({ zone: z, y: -20, alive: true });
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const dt = dtMs / 1000;
    this.spawnMs += dtMs;
    if (this.spawnMs > 1200) {
      this.spawnMs = 0;
      this.spawn();
    }
    const player = this.zoneOf(bodyCenterX(frame), frame.width);
    const events: GameEvent[] = [];
    for (const gh of this.ghouls) {
      if (!gh.alive) continue;
      gh.y += 220 * dt;
      if (gh.y < 460) continue;
      gh.alive = false;
      if (player !== gh.zone) {
        this.dodged += 1;
        this.board.comboHit();
        this.board.add(10);
        events.push({ type: 'dodge', points: 10, label: '좀비를 피했어요!' });
      } else {
        this.board.comboMiss();
        events.push({ type: 'caught', points: 0, label: '좀비에게 잡혔어요' });
      }
    }
    this.ghouls = this.ghouls.filter((g) => g.alive);
    return events;
  }
}
