// src/game/body-abc.ts
import type { PoseFrame, PoseMode } from '../pose/types';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';
import { drawBar, drawLabel } from '../ui/renderer';

export type Angles = Record<string, number>;

export const TEMPLATES: Record<'T' | 'Y' | 'O' | 'L', Angles> = {
  T: { leftArm: 170, rightArm: 170, torso: 90 },
  Y: { leftArm: 140, rightArm: 140, torso: 90 },
  O: { leftArm: 60, rightArm: 60, torso: 90 },
  L: { leftArm: 170, rightArm: 90, torso: 90 }
};

export function poseSimilarity(current: Angles, target: Angles): number {
  const keys = Object.keys(target);
  if (keys.length === 0) return 0;
  const sims = keys.map((k) => {
    const diff = Math.abs((current[k] ?? 0) - target[k]);
    return Math.max(0, 1 - diff / 90);
  });
  return sims.reduce((a, b) => a + b, 0) / sims.length;
}

export function anglesFromFrame(frame: PoseFrame): Angles {
  // MoveNet 모드: 손목 높이만으로 근사 (상체모드 지원)
  const by = new Map(frame.keypoints.map((k) => [k.name, k]));
  const ls = by.get('left_shoulder');
  const rs = by.get('right_shoulder');
  const lw = by.get('left_wrist');
  const rw = by.get('right_wrist');
  if (!ls || !rs || !lw || !rw) return { leftArm: 90, rightArm: 90, torso: 90 };
  const leftArm = lw.y < ls.y - 40 ? 170 : lw.y > ls.y + 60 ? 60 : 120;
  const rightArm = rw.y < rs.y - 40 ? 170 : rw.y > rs.y + 60 ? 60 : 120;
  return { leftArm, rightArm, torso: 90 };
}

export class BodyABC implements Game {
  id = 'abc';
  board = new ScoreBoard();
  mode: PoseMode = 'standing';
  target: 'T' | 'Y' | 'O' | 'L' = 'T';
  holdMs = 0;
  private running = false;
  private order: ('T' | 'Y' | 'O' | 'L')[] = ['T', 'Y', 'O', 'L'];
  private oi = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.oi = 0;
    this.target = this.order[0];
    this.holdMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number, _height: number): void {
    drawLabel(ctx, this.target, width / 2, 78, 88);
    drawBar(ctx, width / 2 - 130, 136, 260, 14, this.holdMs / 1000, '#dfff00');
  }
  tickAngles(current: Angles, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const sim = poseSimilarity(current, TEMPLATES[this.target]);
    if (sim > 0.8) {
      this.holdMs += dtMs;
      if (this.holdMs > 1000) {
        const done = this.target;
        this.holdMs = 0;
        this.oi = (this.oi + 1) % this.order.length;
        this.target = this.order[this.oi];
        this.board.comboHit();
        this.board.add(20);
        return [{ type: 'pose-ok', points: 20, label: `${done} 완성!` }];
      }
      return [];
    }
    this.holdMs = 0;
    return [];
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    return this.tickAngles(anglesFromFrame(frame), dtMs);
  }
}
