import type { PoseFrame } from '../../pose/types';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { anglesFromFrame, poseSimilarity, type Angles } from '../abc';
import { drawBar, drawLabel, drawYogaGuide } from '../../ui/renderer';

export interface YogaPose {
  name: string;
  angles: Angles;
}

export const YOGA_POSES: YogaPose[] = [
  // 팔 각도 스케일(0=내림, 90=수평, 180=올림): 나무는 왼팔 올림+오른팔 내림, 전사는 양팔 올림.
  { name: '나무', angles: { leftArm: 170, rightArm: 10, torso: 90 } },
  { name: '전사', angles: { leftArm: 155, rightArm: 155, torso: 90 } }
];

// 요가 거울: 자세를 3초 버티기. 균형·자세교정.
export class YogaMirror implements Game {
  id = 'yoga';
  // 상단에 목표 자세(글자+스켈레톤 가이드)가 나오므로 얼굴 마스크를 그리지 않는다 (시인성).
  hideFace = true;
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
    drawLabel(ctx, `${this.pose.name} 자세`, width / 2, 66, 44);
    drawBar(ctx, width / 2 - 130, 110, 260, 14, this.progress, '#3d9e57');
    // 따라할 자세 스켈레톤 예시: 오른쪽 위 패널에 막대인간 가이드를 함께 보여준다.
    // 글자만으로는 팔 모양을 알기 어려우니, 코드로 그리는 벡터 가이드로 보완한다.
    const gw = 140;
    const gh = 180;
    const gx = Math.max(8, width - gw - 16);
    drawYogaGuide(ctx, this.pose.name as '나무' | '전사', gx, 16, gw, gh, `${this.pose.name} 자세`);
  }
  get progress(): number {
    return Math.min(1, this.holdMs / 3000);
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const sim = poseSimilarity(anglesFromFrame(frame), this.pose.angles);
    // 예전 임계값 0.8은 항상 90인 torso까지 평균한 값이라 양팔만으로 치면 0.7과 동등.
    // poseSimilarity가 팔만 비교하도록 바뀌었으므로 0.7로 맞춰 기존 난이도를 유지한다.
    if (sim <= 0.7) {
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
