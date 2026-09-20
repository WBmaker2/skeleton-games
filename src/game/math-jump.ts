// src/game/math-jump.ts
import type { PoseFrame } from '../pose/types';
import { bodyCenterX, getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';

export interface Quiz { q: string; choices: [number, number, number]; answerIndex: 0 | 1 | 2 }

const BANK: Quiz[] = [
  { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 },
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

  start(): void {
    this.running = true;
    this.board.reset();
    this.qi = 0;
    this.quiz = BANK[0];
    this.dwellMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  nextQuiz(): void {
    this.qi = (this.qi + 1) % BANK.length;
    this.quiz = BANK[this.qi];
    this.dwellMs = 0;
    this.lastZone = null;
  }
  zoneOf(x: number, width: number): 0 | 1 | 2 {
    if (x < width / 3) return 0;
    if (x < (width * 2) / 3) return 1;
    return 2;
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
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
    const confirmed = this.dwellMs > 600 || (handUp && this.dwellMs > 300);
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
