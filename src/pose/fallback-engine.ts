// src/pose/fallback-engine.ts
import type { Keypoint, PoseFrame } from './types';
import type { PoseEngine } from './pose-engine';

export const CURSOR_SPEED = 240;
const W = 640;
const H = 480;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export class FallbackEngine implements PoseEngine {
  name = 'fallback';
  cursor = { x: 320, y: 240 };
  private el: HTMLElement | null = null;
  private onKey = (e: KeyboardEvent): void => {
    const step = CURSOR_SPEED / 10;
    if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); this.moveTo(this.cursor.x - step, this.cursor.y); }
    else if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); this.moveTo(this.cursor.x + step, this.cursor.y); }
    else if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); this.moveTo(this.cursor.x, this.cursor.y - step); }
    else if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); this.moveTo(this.cursor.x, this.cursor.y + step); }
    else if (e.key === ' ') { e.preventDefault(); this.moveTo(this.cursor.x, this.cursor.y - 60); }
  };
  private onPointer = (e: PointerEvent): void => {
    const rect = this.el?.getBoundingClientRect() ?? (e.target as HTMLElement).getBoundingClientRect?.();
    const x = rect && rect.width ? ((e.clientX - rect.left) / rect.width) * W : e.clientX;
    const y = rect && rect.height ? ((e.clientY - rect.top) / rect.height) * H : e.clientY;
    this.moveTo(x, y);
  };

  async load(): Promise<void> {}
  moveTo(x: number, y: number): void {
    this.cursor = { x: clamp(x, 0, W), y: clamp(y, 0, H) };
  }
  attach(el: HTMLElement): void {
    this.detach();
    this.el = el;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    el.focus();
    el.addEventListener('keydown', this.onKey);
    el.addEventListener('pointermove', this.onPointer as EventListener);
  }
  detach(): void {
    this.el?.removeEventListener('keydown', this.onKey);
    this.el?.removeEventListener('pointermove', this.onPointer as EventListener);
    this.el = null;
  }
  async estimate(_video: HTMLVideoElement): Promise<PoseFrame> {
    const kp = (name: string, x: number, y: number): Keypoint => ({ name, x, y, score: 1 });
    return {
      width: W,
      height: H,
      timestamp: performance.now(),
      keypoints: [
        kp('nose', 320, 80),
        kp('left_eye', 310, 72),
        kp('right_eye', 330, 72),
        kp('left_ear', 300, 80),
        kp('right_ear', 340, 80),
        kp('left_shoulder', 270, 120),
        kp('right_shoulder', 370, 120),
        kp('left_elbow', 240, 160),
        kp('right_elbow', 400, 160),
        kp('left_wrist', 220, 200),
        kp('right_wrist', this.cursor.x, this.cursor.y),
        kp('left_hip', 280, 220),
        kp('right_hip', 360, 220),
        kp('left_knee', 280, 320),
        kp('right_knee', 360, 320),
        kp('left_ankle', 280, 420),
        kp('right_ankle', 360, 420)
      ]
    };
  }
  async dispose(): Promise<void> {
    this.detach();
  }
}
