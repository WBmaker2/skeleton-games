// src/game/swipe.ts — "휙 움직여야 인정" 스윕 판정 공용 구현.
// 과일·별·듀오·분리수거처럼 손으로 목표물을 타격하는 게임은
// 가만히 접촉만으로 점수가 오르면 안 된다: 손이 일정 속도 이상으로
// 움직이면서 닿아야만 타격으로 인정한다.
import type { PoseFrame } from '../pose/types';
import { palmOf } from '../pose/geometry';
import type { HandSide } from './hand-tracker';

// 손 스윕 최소 속도(px/s). 가만히 두면 0~50, 가볍게 휘두르면 200 이상 나온다.
// 아이도 쉽게 성공하되, 받치기·올려놓기는 인정하지 않는 수준으로 100으로 잡았다.
export const SWIPE_MIN_SPEED = 100;

// 머리(풍선 헤딩) 최소 속도(px/s). 머리는 손보다 느리게 움직이므로 기준을 낮춘다.
export const HEAD_MIN_SPEED = 50;

interface SwipeState {
  prevX: number | null;
  prevY: number | null;
  speed: number;
}

export class SwipeTracker {
  private states: Record<HandSide, SwipeState> = {
    left: { prevX: null, prevY: null, speed: 0 },
    right: { prevX: null, prevY: null, speed: 0 }
  };

  reset(): void {
    this.states = {
      left: { prevX: null, prevY: null, speed: 0 },
      right: { prevX: null, prevY: null, speed: 0 }
    };
  }

  // 손 위치를 갱신하고 palm 좌표+속도를 돌려준다. 손이 없으면 null.
  track(frame: PoseFrame, side: HandSide, dtMs: number): { x: number; y: number; speed: number } | null {
    const st = this.states[side];
    const palm = palmOf(frame, side);
    if (!palm) {
      st.prevX = null;
      st.prevY = null;
      st.speed = 0;
      return null;
    }
    if (st.prevX != null && st.prevY != null && dtMs > 0) {
      const dist = Math.hypot(palm.x - st.prevX, palm.y - st.prevY);
      st.speed = (dist / dtMs) * 1000;
    } else {
      // 첫 프레임은 움직임을 알 수 없으므로 속도 0 (받치기 방지).
      st.speed = 0;
    }
    st.prevX = palm.x;
    st.prevY = palm.y;
    return { x: palm.x, y: palm.y, speed: st.speed };
  }

  speed(side: HandSide): number {
    return this.states[side].speed;
  }

  isSwiping(side: HandSide, min: number = SWIPE_MIN_SPEED): boolean {
    return this.states[side].speed >= min;
  }
}
