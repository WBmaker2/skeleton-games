// tests/keyboard-run.test.ts
// 키보드·포인터 폴백 경로로 4종 완주를 증명하는 통합 테스트.
// FallbackEngine 합성 프레임 + 실제 게임 클래스를 그대로 사용한다.
import { describe, expect, it } from 'vitest';
import { FallbackEngine } from '../src/pose/fallback-engine';
import { FruitNinja } from '../src/game/fruit-ninja';
import { SquatRunner } from '../src/game/squat-runner';
import { MathJump } from '../src/game/math-jump';
import { BodyABC } from '../src/game/body-abc';
import type { PoseFrame } from '../src/pose/types';

const dummyVideo = {} as HTMLVideoElement;

async function frame(eng: FallbackEngine): Promise<PoseFrame> {
  return eng.estimate(dummyVideo);
}

describe('keyboard fallback completes all four games', () => {
  it('slices a fruit at the cursor', async () => {
    const eng = new FallbackEngine();
    const g = new FruitNinja();
    g.start();
    eng.moveTo(320, 240);
    g.fruits.length = 0;
    g.fruits.push({ x: 320, y: 240, vx: 0, vy: 0, kind: 'fruit', alive: true });
    const events = g.tick(await frame(eng), 16);
    expect(events.some((e) => e.type === 'slice')).toBe(true);
  });

  it('ducks on crouch hold', async () => {
    const eng = new FallbackEngine();
    const g = new SquatRunner();
    g.start();
    eng.setCrouch(true);
    const seen: string[] = [];
    for (let i = 0; i < 20; i++) {
      const events = g.tick(await frame(eng), 16);
      seen.push(...events.map((e) => e.type));
    }
    expect(seen).toContain('duck');
  });

  it('answers math by moving to the correct zone', async () => {
    const eng = new FallbackEngine();
    const g = new MathJump();
    g.start();
    g.quiz = { q: 'test', choices: [1, 2, 3], answerIndex: 2 };
    eng.moveTo(550, 240);
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      const events = g.tick(await frame(eng), 16);
      seen.push(...events.map((e) => e.type));
    }
    expect(seen).toContain('correct');
  });

  it('completes ABC T pose with raised cursor', async () => {
    const eng = new FallbackEngine();
    const g = new BodyABC();
    g.start();
    expect(g.target).toBe('T');
    eng.moveTo(320, 40);
    const seen: string[] = [];
    for (let i = 0; i < 70; i++) {
      const events = g.tick(await frame(eng), 16);
      seen.push(...events.map((e) => e.type));
    }
    expect(seen).toContain('pose-ok');
  });
});
