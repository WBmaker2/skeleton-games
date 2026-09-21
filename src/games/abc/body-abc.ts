// src/games/abc/body-abc.ts
import type { PoseFrame, PoseMode } from '../../pose/types';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawBar, drawLabel, drawPoseGuide } from '../../ui/renderer';

export type Angles = Record<string, number>;

// 목표 팔 각도 (연속값, 단위: °).
// 0 = 팔을 몸통 옆에 내림, 90 = 수평으로 벌림, 180 = 머리 위로 쭉 뻗음.
// T·Y는 45° 차이로 벌려 두어 구별된다 (예전 170/140은 3단계 양자화에 묻혀
// 수평 팔이 Y를 통과시키는 원인이었다).
export const TEMPLATES: Record<'T' | 'Y' | 'O' | 'L', Angles> = {
  T: { leftArm: 90, rightArm: 90, torso: 90 },
  Y: { leftArm: 135, rightArm: 135, torso: 90 },
  O: { leftArm: 160, rightArm: 160, torso: 90 },
  L: { leftArm: 90, rightArm: 0, torso: 90 }
};

// 성공 판정 임계값: 양팔 평균 유사도 0.6 (양팔 합쳐 ±36°까지 허용, 예전 0.8보다 완화).
// T·Y 교차 유사도는 0.5라서 구별은 유지된다.
export const ABC_SIM_THRESHOLD = 0.6;

const ARM_KEYS = ['leftArm', 'rightArm'] as const;

export function poseSimilarity(current: Angles, target: Angles): number {
  // 팔만 비교한다. torso는 추정기가 항상 90을 반환하는 상수라
  // 평균에 넣으면 팔 차이가 희석되어 T·Y가 헷갈린다.
  const sims = ARM_KEYS.map((k) => {
    const diff = Math.abs((current[k] ?? 0) - target[k]);
    return Math.max(0, 1 - diff / 90);
  });
  return sims.reduce((a, b) => a + b, 0) / sims.length;
}

function armValue(sx: number, sy: number, wx: number, wy: number): number {
  // 어깨→손목 벡터의 수평 대비 올림각(-90=내림 ~ +90=올림)에 90을 더해
  // 템플릿 스케일(0=내림, 90=수평, 180=올림)에 맞춘다.
  const deg = (Math.atan2(sy - wy, Math.abs(wx - sx)) * 180) / Math.PI;
  return Math.min(180, Math.max(0, 90 + deg));
}

export function anglesFromFrame(frame: PoseFrame): Angles {
  // 연속 각도 추정: 카메라 거리·해상도에 영향받는 px 임계값 대신 각도를 쓴다.
  // 진짜 T(수평)는 90 근처, 진짜 Y(대각선 위)는 135 근처로 나와 서로 구별된다.
  const by = new Map(frame.keypoints.map((k) => [k.name, k]));
  const arm = (side: 'left' | 'right'): number => {
    const s = by.get(`${side}_shoulder`);
    const w = by.get(`${side}_wrist`);
    // 한쪽이 안 보이면 팔 내림(0)으로 보고 보수적으로 실패시킨다.
    // (예전 기본값 90은 관절이 없어도 T를 통과시키는 구멍이었다)
    if (!s || !w) return 0;
    return armValue(s.x, s.y, w.x, w.y);
  };
  return { leftArm: arm('left'), rightArm: arm('right'), torso: 90 };
}

export class BodyABC implements Game {
  id = 'abc';
  board = new ScoreBoard();
  mode: PoseMode = 'standing';
  // 상단에 문제 텍스트(목표 글자+가이드)가 나오므로 얼굴 마스크를 그리지 않는다 (시인성).
  hideFace = true;
  target: 'T' | 'Y' | 'O' | 'L' = 'T';
  holdMs = 0;
  private running = false;

  // 랜덤 출제: 고정 순서(T→Y→O→L) 대신 매번 무작위로 고른다.
  // 바로 직전 문제와 겹치지 않게 후보에서 제외한다 (수학 퀴즈 연속 중복 방지와 동일).
  private pickRandomTarget(exclude?: 'T' | 'Y' | 'O' | 'L'): 'T' | 'Y' | 'O' | 'L' {
    const pool: ('T' | 'Y' | 'O' | 'L')[] = (['T', 'Y', 'O', 'L'] as const).filter(
      (l) => l !== exclude
    );
    return pool[Math.floor(Math.random() * pool.length)];
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.target = this.pickRandomTarget();
    this.holdMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number, _height: number): void {
    drawLabel(ctx, this.target, width / 2, 78, 88);
    drawBar(ctx, width / 2 - 130, 136, 260, 14, this.holdMs / 1000, '#dfff00');
    // 목표 스켈레톤 예시: 오른쪽 위 패널에 막대인간 가이드를 함께 보여준다.
    // 글자만으로는 모양을 알기 어려우니, 코드로 그리는 벡터 가이드로 보완한다.
    const gw = 140;
    const gh = 180;
    const gx = Math.max(8, width - gw - 16);
    drawPoseGuide(ctx, this.target, gx, 16, gw, gh);
  }
  tickAngles(current: Angles, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const sim = poseSimilarity(current, TEMPLATES[this.target]);
    if (sim >= ABC_SIM_THRESHOLD) {
      this.holdMs += dtMs;
      if (this.holdMs > 1000) {
        const done = this.target;
        this.holdMs = 0;
        this.target = this.pickRandomTarget(done);
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
