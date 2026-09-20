import type { PoseFrame } from '../pose/types';
import { getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';
import { drawBar, drawLabel } from '../ui/renderer';

export type DanceMove = 'left' | 'right' | 'both' | 'down';

export const MOVE_KR: Record<DanceMove, string> = {
  left: '왼손',
  right: '오른손',
  both: '양손',
  down: '내리기'
};

// 손목 높이 패턴: 사이먼 게임과 공유한다.
export function wristPattern(frame: PoseFrame): DanceMove {
  const lw = getByName(frame, 'left_wrist');
  const rw = getByName(frame, 'right_wrist');
  const ls = getByName(frame, 'left_shoulder');
  const rs = getByName(frame, 'right_shoulder');
  const up = (w: typeof lw, s: typeof ls): boolean =>
    !!w && !!s && (w.score ?? 0) > 0.3 && w.y < s.y - 20;
  const l = up(lw, ls);
  const r = up(rw, rs);
  if (l && r) return 'both';
  if (l) return 'left';
  if (r) return 'right';
  return 'down';
}

// 리듬 댄스 카피: 박자에 맞춰 포즈 따라하기. 4박자 순환.
export class RhythmDance implements Game {
  id = 'dance';
  moves: DanceMove[] = ['left', 'right', 'both', 'down'];
  move: DanceMove = 'left';
  board = new ScoreBoard();
  beats = 0;
  private running = false;
  private waitMs = 0;

  get beatFrac(): number {
    return Math.min(1, this.waitMs / 1800);
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.beats = 0;
    this.waitMs = 0;
    this.move = this.moves[0];
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number): void {
    drawLabel(ctx, MOVE_KR[this.move], width / 2, 70, 44);
    drawBar(ctx, width / 2 - 110, 110, 220, 12, 1 - this.beatFrac, '#00ffff');
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    if (wristPattern(frame) === this.move) {
      this.beats += 1;
      this.board.comboHit();
      this.board.add(10);
      this.advance();
      return [{ type: 'beat', points: 10, label: '리듬 적중!' }];
    }
    this.waitMs += dtMs;
    if (this.waitMs <= 1800) return [];
    this.waitMs = 0;
    this.board.comboMiss();
    this.advance();
    return [{ type: 'miss', points: 0, label: '박자를 놓쳤어요' }];
  }
  private advance(): void {
    this.waitMs = 0;
    const i = this.moves.indexOf(this.move);
    this.move = this.moves[(i + 1) % this.moves.length];
  }
}
