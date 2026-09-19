// src/ui/renderer.ts
import type { PoseFrame } from '../pose/types';

const LINKS: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle']
];

export function drawSkeleton(canvas: HTMLCanvasElement, frame: PoseFrame): void {
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const byName = new Map(frame.keypoints.map((k) => [k.name, k]));
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#22d3ee';
  for (const [a, b] of LINKS) {
    const p = byName.get(a);
    const q = byName.get(b);
    if (!p || !q || (p.score ?? 0) < 0.3 || (q.score ?? 0) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
}
