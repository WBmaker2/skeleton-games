// src/games/math/math-jump.ts
import type { PoseFrame } from '../../pose/types';
import { bodyCenterX, getByName } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawBar, drawLabel } from '../../ui/renderer';

export interface Quiz { q: string; choices: [number, number, number]; answerIndex: 0 | 1 | 2 }

// 문제를 읽고 정답을 생각한 뒤 자리로 이동할 수 있도록,
// 새 문제가 나온 뒤 일정 시간은 답을 확정하지 않는 '생각 시간'을 둔다.
export const MATH_THINK_MS = 3500;
export const MATH_DWELL_MS = 600;
export const MATH_HAND_UP_DWELL_MS = 300;

const BANK: Quiz[] = [
  { q: '7+8=?', choices: [12, 15, 16], answerIndex: 1 },
  { q: '9-4=?', choices: [5, 6, 4], answerIndex: 0 },
  { q: '3×4=?', choices: [11, 12, 14], answerIndex: 1 }
];

export class MathJump implements Game {
  id = 'math';
  board = new ScoreBoard();
  quiz: Quiz = BANK[0];
  private running = false;
  private dwellMs = 0;
  private lastZone: 0 | 1 | 2 | null = null;
  private qi = 0;
  private elapsedMs = 0;

  get isThinking(): boolean {
    return this.elapsedMs < MATH_THINK_MS;
  }

  get thinkRemainingMs(): number {
    return Math.max(0, MATH_THINK_MS - this.elapsedMs);
  }

  get thinkFrac(): number {
    return Math.min(1, this.elapsedMs / MATH_THINK_MS);
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.qi = 0;
    this.quiz = BANK[0];
    this.dwellMs = 0;
    this.elapsedMs = 0;
    this.lastZone = null;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    drawLabel(ctx, this.quiz.q, width / 2, 52, 36);
    if (this.isThinking) {
      const secs = Math.ceil(this.thinkRemainingMs / 1000);
      drawLabel(ctx, `잘 보고 생각해요… ${secs}`, width / 2, 96, 24);
      drawBar(ctx, width / 2 - 130, 116, 260, 12, this.thinkFrac, '#dfff00');
    } else {
      drawLabel(ctx, '정답 쪽으로 이동!', width / 2, 96, 24);
    }
    const labels = [String(this.quiz.choices[0]), String(this.quiz.choices[1]), String(this.quiz.choices[2])];
    for (let i = 0; i < 3; i++) {
      const cx = (width * (i * 2 + 1)) / 6;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(cx - 85, height - 180, 170, 110, 16);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawLabel(ctx, labels[i], cx, height - 125, 42);
    }
  }
  nextQuiz(): void {
    this.qi = (this.qi + 1) % BANK.length;
    this.quiz = BANK[this.qi];
    this.dwellMs = 0;
    this.lastZone = null;
    this.elapsedMs = 0;
  }
  zoneOf(x: number, width: number): 0 | 1 | 2 {
    if (x < width / 3) return 0;
    if (x < (width * 2) / 3) return 1;
    return 2;
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    this.elapsedMs += dtMs;
    // 생각 시간에는 문제를 읽고 이동할 여유를 준다: 답 확정 없음.
    if (this.isThinking) {
      this.dwellMs = 0;
      this.lastZone = null;
      return [];
    }
    const cx = bodyCenterX(frame);
    const zone = this.zoneOf(cx, frame.width);
    const gateNames = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip', 'left_wrist', 'right_wrist'];
    const confident = gateNames.filter((n) => (getByName(frame, n)?.score ?? 0) > 0.5).length >= 2;
    if (!confident) {
      this.dwellMs = 0;
      return [];
    }
    const lw = getByName(frame, 'left_wrist');
    const ls = getByName(frame, 'left_shoulder');
    const rw = getByName(frame, 'right_wrist');
    const rs = getByName(frame, 'right_shoulder');
    const handUp = [lw && ls ? lw.y < ls.y - 20 : false, rw && rs ? rw.y < rs.y - 20 : false].some(Boolean);
    if (zone === this.lastZone) {
      this.dwellMs += dtMs;
    } else {
      this.lastZone = zone;
      this.dwellMs = 0;
    }
    const confirmed = this.dwellMs > MATH_DWELL_MS || (handUp && this.dwellMs > MATH_HAND_UP_DWELL_MS);
    if (!confirmed) return [];
    const correct = zone === this.quiz.answerIndex;
    const q = this.quiz.q;
    this.nextQuiz();
    if (correct) {
      this.board.comboHit();
      this.board.add(20);
      return [{ type: 'correct', points: 20, label: `${q} 정답!` }];
    }
    this.board.comboMiss();
    return [{ type: 'wrong', points: 0, label: `${q} 다시 도전!` }];
  }
}
