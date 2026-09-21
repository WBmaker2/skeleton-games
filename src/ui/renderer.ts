// src/ui/renderer.ts
import type { PoseFrame } from '../pose/types';
import { palmOf } from '../pose/geometry';

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

export function drawZones(canvas: HTMLCanvasElement, width: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  for (const fx of [1 / 3, 2 / 3]) {
    ctx.beginPath();
    ctx.moveTo(width * fx, 0);
    ctx.lineTo(width * fx, canvas.height);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color = '#22d3ee'
): void {
  const f = Math.min(1, Math.max(0, frac));
  ctx.save();
  ctx.fillStyle = 'rgba(10, 16, 22, 0.6)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * f, h);
  ctx.restore();
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 28
): void {
  ctx.save();
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(10, 16, 22, 0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// 얼굴 마스크 오버레이: 코 앵커, 어깨너비 × 1.4 크기.
// 이미지가 없거나 아직 로드 전이면 조용히 건너뛴다.
export function drawFaceMask(
  ctx: CanvasRenderingContext2D,
  frame: PoseFrame,
  img: HTMLImageElement | null | undefined
): void {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const byName = new Map(frame.keypoints.map((k) => [k.name, k]));
  const nose = byName.get('nose');
  const ls = byName.get('left_shoulder');
  const rs = byName.get('right_shoulder');
  let cx = 0;
  let cy = 0;
  if (nose && (nose.score ?? 0) > 0.3) {
    cx = nose.x;
    cy = nose.y;
  } else if (ls && rs) {
    cx = (ls.x + rs.x) / 2;
    cy = (ls.y + rs.y) / 2 - 40;
  } else {
    return;
  }
  const sw =
    ls && rs ? Math.max(40, Math.hypot(ls.x - rs.x, ls.y - rs.y)) : 100;
  const size = sw * 1.4;
  // 소스가 정사각이 아니어도 중앙 정사각 크롭으로 왜곡 없이 그린다.
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.save();
  ctx.drawImage(img, sx, sy, side, side, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}

export function drawSkeleton(canvas: HTMLCanvasElement, frame: PoseFrame): void {
  // 화면 지우기는 GameLoop가 담당 (게임 요소 → 스켈레톤 순서로 겹쳐 그리기).
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
  // 손 마커: 베기·잡기의 판정점(손바닥 중심)을 동그라미로 표시.
  // 양손 동일: 과일 베기 등 양손을 동등하게 쓰는 게임에서
  // 한쪽만 강조하면 다른 쪽 손이 안 보이는 착시가 생긴다.
  // 노랑 이중 링으로 멀리서도 식별 (WCAG 1.4.1: 모양 단서).
  for (const side of ['left', 'right'] as const) {
    const w = palmOf(frame, side);
    if (!w) continue;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#22303c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#dfff00';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const BURST_COLORS = ['#dfff00', '#ff71ce', '#ffffff', '#00ffff'];
export const PENALTY_COLORS = ['#ff3b30', '#8a8f98', '#22303c'];

// 미션 성공 축하 파티클: 호출자가 배열을 보관하고 매 틱 tick/draw한다.
// colors를 넘기면 감점 등 다른 톤의 이펙트에도 쓴다.
export function spawnBurst(
  out: Particle[],
  x: number,
  y: number,
  n = 14,
  colors: string[] = BURST_COLORS
): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 90 + Math.random() * 220;
    const life = 450 + Math.random() * 350;
    out.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 120,
      life,
      maxLife: life,
      color: colors[i % colors.length],
      size: 3 + Math.random() * 4
    });
  }
}

export function tickParticles(ps: Particle[], dtMs: number): Particle[] {
  const dt = dtMs / 1000;
  for (const p of ps) {
    p.vy += 900 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dtMs;
  }
  return ps.filter((p) => p.life > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]): void {
  ctx.save();
  for (const p of ps) {
    ctx.globalAlpha = Math.min(1, Math.max(0, p.life / p.maxLife));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
