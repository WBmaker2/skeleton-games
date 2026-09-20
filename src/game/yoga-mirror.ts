import type { PoseFrame } from '../pose/types';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';
import { anglesFromFrame, poseSimilarity, type Angles } from './body-abc';
import { drawBar, drawLabel } from '../ui/renderer';

export interface YogaPose {
  name: string;
  angles: Angles;
}

export const YOGA_POSES: YogaPose[] = [
  { name: '나무', angles: { leftArm: 170, rightArm: 60, torso: 90 } },
  { name: '전사', angles: { leftArm: 170, rightArm: 170, torso: 90 } }
];

// 요가 거울: 자세를 3초 버티기. 균형·자세교정.
export class YogaMirror implements Game {
  id = 'yoga';
  pose: YogaPose = YOGA_POSES[0];
  board = new ScoreBoard();
  completed = 0;
  holdMs = 0;
  private running = false;
  private oi = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.completed = 0;
    this.oi = 0;
    this.pose = YOGA_POSES[0];
    this.holdMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number): void {
    drawLabel(ctx, `${this.pose.name} 자세`, width / 2, 60, 36);
    drawBar(ctx, width / 2 - 110, 100, 220, 12, this.progress, '#3d9e57');
  }
  get progress(): number {
    return Math.min(1, this.holdMs / 3000);
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const sim = poseSimilarity(anglesFromFrame(frame), this.pose.angles);
    if (sim <= 0.8) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= 3000) return [];
    const done = this.pose.name;
    this.holdMs = 0;
    this.oi = (this.oi + 1) % YOGA_POSES.length;
    this.pose = YOGA_POSES[this.oi];
    this.completed += 1;
    this.board.comboHit();
    this.board.add(25);
    return [{ type: 'pose-done', points: 25, label: `${done}자세 완성!` }];
  }
}
