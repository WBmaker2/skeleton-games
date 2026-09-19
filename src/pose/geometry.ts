// src/pose/geometry.ts
import type { Point, PoseFrame, Keypoint } from './types';

export function getByName(frame: PoseFrame, name: string): Keypoint | undefined {
  return frame.keypoints.find((k) => k.name === name);
}

export function angleDeg(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const n1 = Math.hypot(v1x, v1y) || 1e-6;
  const n2 = Math.hypot(v2x, v2y) || 1e-6;
  const cos = Math.min(1, Math.max(-1, dot / (n1 * n2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function shoulderWidth(frame: PoseFrame): number {
  const l = getByName(frame, 'left_shoulder');
  const r = getByName(frame, 'right_shoulder');
  if (!l || !r) return 100;
  return Math.max(20, Math.hypot(l.x - r.x, l.y - r.y));
}

export function bodyCenterX(frame: PoseFrame): number {
  const names = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'];
  const xs = names
    .map((n) => getByName(frame, n)?.x)
    .filter((v): v is number => typeof v === 'number');
  if (xs.length === 0) return frame.width / 2;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
