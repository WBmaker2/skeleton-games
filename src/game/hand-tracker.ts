// src/game/hand-tracker.ts — 손 무장 래치 + 하강 속도 추적.
// 두더지·수학 퀴즈 등 "손을 올렸다가 내려치기" 판정의 공용 구현.
import type { PoseFrame } from '../pose/types';
import { getByName, palmOf } from '../pose/geometry';

export interface HandTrackerOpts {
  // 손목이 어깨보다 이만큼(px) 위에 있어야 무장. 기본 20.
  armDy?: number;
}

export type HandSide = 'left' | 'right';

interface HandState {
  armed: boolean;
  prevX: number | null;
  prevY: number | null;
  vy: number;
}

export class HandTracker {
  private states: Record<HandSide, HandState> = {
    left: { armed: false, prevX: null, prevY: null, vy: 0 },
    right: { armed: false, prevX: null, prevY: null, vy: 0 }
  };

  constructor(private opts: HandTrackerOpts = {}) {}

  reset(): void {
    this.states = {
      left: { armed: false, prevX: null, prevY: null, vy: 0 },
      right: { armed: false, prevX: null, prevY: null, vy: 0 }
    };
  }

  get armed(): Record<HandSide, boolean> {
    return { left: this.states.left.armed, right: this.states.right.armed };
  }

  // 손 위치를 갱신하고 palm 좌표를 돌려준다. 손이 없으면 null + 속도 리셋.
  track(frame: PoseFrame, side: HandSide, dtMs: number): { x: number; y: number } | null {
    const st = this.states[side];
    const palm = palmOf(frame, side);
    if (!palm) {
      st.prevX = null;
      st.prevY = null;
      st.vy = 0;
      return null;
    }
    const armDy = this.opts.armDy ?? 20;
    const shoulder = getByName(frame, `${side}_shoulder`);
    const wrist = getByName(frame, `${side}_wrist`);
    if (shoulder && wrist && (wrist.score ?? 0) >= 0.3 && (shoulder.score ?? 0) >= 0.3) {
      if (wrist.y < shoulder.y - armDy) st.armed = true;
    }
    if (st.prevY != null && dtMs > 0) {
      st.vy = ((palm.y - st.prevY) / dtMs) * 1000;
    } else {
      st.vy = 0;
    }
    st.prevX = palm.x;
    st.prevY = palm.y;
    return palm;
  }

  velocity(side: HandSide): number {
    return this.states[side].vy;
  }

  // 타격 인정 후 무장을 소모한다.
  consume(side: HandSide): void {
    this.states[side].armed = false;
  }
}
