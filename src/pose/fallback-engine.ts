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
  crouch = false;
  private el: HTMLElement | null = null;
  setCrouch(b: boolean): void {
    this.crouch = b;
  }
  private onKey = (e: KeyboardEvent): void => {
    const step = CURSOR_SPEED / 10;
    if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); this.moveTo(this.cursor.x - step, this.cursor.y); }
    else if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); this.moveTo(this.cursor.x + step, this.cursor.y); }
    else if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); this.setCrouch(false); this.moveTo(this.cursor.x, this.cursor.y - step); }
    else if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); this.setCrouch(true); this.moveTo(this.cursor.x, this.cursor.y + step); }
    else if (e.key === ' ') { e.preventDefault(); this.moveTo(this.cursor.x, this.cursor.y - 60); }
  };
  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowDown' || e.key === 's') { this.setCrouch(false); }
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
    el.addEventListener('keyup', this.onKeyUp);
    el.addEventListener('pointermove', this.onPointer as EventListener);
  }
  detach(): void {
    this.el?.removeEventListener('keydown', this.onKey);
    this.el?.removeEventListener('keyup', this.onKeyUp);
    this.el?.removeEventListener('pointermove', this.onPointer as EventListener);
    this.el = null;
  }
  async estimate(_video: HTMLVideoElement): Promise<PoseFrame> {
    const kp = (name: string, x: number, y: number): Keypoint => ({ name, x, y, score: 1 });
    const cx = this.cursor.x;
    const cy = this.cursor.y;
    const hipLX = cx - 40;
    const hipRX = cx + 40;
    // crouch: hip.x-100, y 260; knee=(hip.x+100,320); ankle=(hip.x-100,380) → kneeAngle ~48°(<100)
    // standing: knee/ankle vertically under hip → 180°
    const leg = (hipX: number): { hip: number[]; knee: number[]; ankle: number[] } => {
      if (this.crouch) {
        const hx = hipX - 100;
        return { hip: [hx, 260], knee: [hx + 100, 320], ankle: [hx - 100, 380] };
      }
      return { hip: [hipX, 220], knee: [hipX, 320], ankle: [hipX, 420] };
    };
    const ll = leg(hipLX);
    const rl = leg(hipRX);
    return {
      width: W,
      height: H,
      timestamp: performance.now(),
      keypoints: [
        kp('nose', cx, 80),
        kp('left_eye', cx - 10, 72),
        kp('right_eye', cx + 10, 72),
        kp('left_ear', cx - 20, 80),
        kp('right_ear', cx + 20, 80),
        kp('left_shoulder', cx - 50, 120),
        kp('right_shoulder', cx + 50, 120),
        kp('left_elbow', cx - 80, 160),
        kp('right_elbow', cx + 80, 160),
        kp('left_wrist', cx, cy),
        kp('right_wrist', cx, cy),
        kp('left_hip', ll.hip[0], ll.hip[1]),
        kp('right_hip', rl.hip[0], rl.hip[1]),
        kp('left_knee', ll.knee[0], ll.knee[1]),
        kp('right_knee', rl.knee[0], rl.knee[1]),
        kp('left_ankle', ll.ankle[0], ll.ankle[1]),
        kp('right_ankle', rl.ankle[0], rl.ankle[1])
      ]
    };
  }
  async dispose(): Promise<void> {
    this.detach();
  }
}
