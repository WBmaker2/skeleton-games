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

// 고정 3문제 순환 대신 매번 새로 만드는 랜덤 문제 은행.
// 초등 수준: 덧셈·뺄셈(음수 없음)·구구단 곱셈, 오답은 정답 근처 그럴듯한 값.
type Op = '+' | '-' | '×';

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickDistractors(answer: number): [number, number] {
  const cands = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10, answer + 3];
  const out: number[] = [];
  for (const c of cands) {
    if (c < 0 || c === answer || out.includes(c)) continue;
    out.push(c);
    if (out.length === 2) break;
  }
  let d = answer + 4;
  while (out.length < 2) {
    if (d !== answer && !out.includes(d)) out.push(d);
    d += 1;
  }
  return [out[0], out[1]];
}

function buildQuiz(a: number, op: Op, b: number): Quiz {
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const [d1, d2] = pickDistractors(answer);
  const vals = [d1, d2, answer];
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  return {
    q: `${a}${op}${b}=?`,
    choices: [vals[0], vals[1], vals[2]],
    answerIndex: vals.indexOf(answer) as 0 | 1 | 2
  };
}

export function makeQuiz(prevQ?: string): Quiz {
  let a = 7;
  let op: Op = '+';
  let b = 8;
  for (let attempt = 0; attempt < 8; attempt++) {
    const roll = Math.random();
    if (roll < 0.4) {
      a = randInt(4, 19); b = randInt(3, 9); op = '+';
    } else if (roll < 0.7) {
      a = randInt(5, 19); b = randInt(2, a - 1); op = '-';
    } else {
      a = randInt(2, 9); b = randInt(2, 9); op = '×';
    }
    if (`${a}${op}${b}=?` !== prevQ) break;
  }
  return buildQuiz(a, op, b);
}

export class MathJump implements Game {
  id = 'math';
  board = new ScoreBoard();
  quiz: Quiz = makeQuiz();
  // 상단에 문제 텍스트가 나오므로 얼굴 마스크를 그리지 않는다 (시인성).
  hideFace = true;
  private running = false;
  private dwellMs = 0;
  private lastZone: 0 | 1 | 2 | null = null;
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
    this.quiz = makeQuiz();
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
    this.quiz = makeQuiz(this.quiz.q);
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
