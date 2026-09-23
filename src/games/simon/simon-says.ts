import type { PoseFrame } from '../../pose/types';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { wristPattern, MOVE_KR, type DanceMove } from '../dance';
import { drawBar, drawLabel } from '../../ui/renderer';

export type SimonCmd = DanceMove;

// 사이먼 AI 선생님: 지시를 듣고 포즈로 답하기. 듣기·반응.
export class SimonSays implements Game {
  id = 'simon';
  // 상단에 지시 텍스트가 나오므로 얼굴 마스크를 그리지 않는다 (시인성).
  hideFace = true;
  commands: SimonCmd[] = ['left', 'right', 'both', 'down', 'right', 'left'];
  command: SimonCmd = 'left';
  board = new ScoreBoard();
  solved = 0;
  private running = false;
  private waitMs = 0;
  private ci = 0;

  get timeFrac(): number {
    return Math.min(1, this.waitMs / 2500);
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.solved = 0;
    this.ci = 0;
    this.command = this.commands[0];
    this.waitMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number): void {
    drawLabel(ctx, `${MOVE_KR[this.command]}!`, width / 2, 78, 52);
    drawBar(ctx, width / 2 - 130, 122, 260, 14, 1 - this.timeFrac, '#ff71ce');
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    if (wristPattern(frame) === this.command) {
      this.solved += 1;
      this.board.comboHit();
      this.board.add(15);
      const done = this.command;
      this.next();
      return [{ type: 'correct', points: 15, label: `"${done}" 성공!` }];
    }
    this.waitMs += dtMs;
    if (this.waitMs <= 2500) return [];
    this.board.comboMiss();
    this.next();
    return [{ type: 'timeout', points: 0, label: '시간 초과! 다음 지시' }];
  }
  private next(): void {
    this.waitMs = 0;
    this.ci = (this.ci + 1) % this.commands.length;
    this.command = this.commands[this.ci];
  }
}
