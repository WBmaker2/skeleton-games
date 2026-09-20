// src/game/loop.ts
import type { PoseEngine } from '../pose/pose-engine';
import type { Calibration, PoseFrame } from '../pose/types';
import type { Game, GameEvent } from './types';
import type { ScoreBoard } from './engine';
import { FpsMonitor } from '../perf/fps-monitor';
import { drawFaceMask, drawParticles, drawSkeleton, drawZones, spawnBurst, tickParticles, type Particle } from '../ui/renderer';

export type GameEventHandler = (events: GameEvent[], board: { score: number; combo: number }) => void;

export interface LoopGame extends Game {
  board: ScoreBoard;
  // 게임 요소 그리기 (선택): 배경 지우기 → draw → 스켈레톤 순서로 렌더된다.
  draw?(ctx: CanvasRenderingContext2D, width: number, height: number): void;
}

export interface LoopOpts {
  video: HTMLVideoElement | null;
  canvas: HTMLCanvasElement;
  engine: PoseEngine;
  game: LoopGame;
  /** App owns application: radiusScale/mode 주입은 start 전, loop는 참조 보관용. */
  calibration: Calibration;
  showSkeleton: boolean;
  // 얼굴 마스크 이미지 (없으면 스킵). 게임별 art/mask-<id>.png.
  face?: HTMLImageElement | null;
  onEvent?: GameEventHandler;
  onDegrade?: (fps: number) => void;
}

// 축하 이펙트를 터뜨리는 성공 이벤트들 (12종 게임 공통).
const CELEBRATE = new Set([
  'slice', 'catch', 'bump', 'dodge', 'duck',
  'beat', 'correct', 'pose-ok', 'pose-done', 'pair', 'sorted'
]);

function wristOf(frame: PoseFrame): { x: number; y: number } | null {
  for (const name of ['right_wrist', 'left_wrist']) {
    const w = frame.keypoints.find((k) => k.name === name);
    if (w && (w.score ?? 0) > 0.3) return { x: w.x, y: w.y };
  }
  return null;
}

export class GameLoop {  private raf = 0;
  private running = false;
  private lastMs = 0;
  private lastInferMs = 0;
  private lastInferDuration = 0;
  private monitor = new FpsMonitor();
  private frames = 0;
  private particles: Particle[] = [];
  private dummyVideo: HTMLVideoElement | null = null;
  private degradedNotified = false;
  constructor(private opts: LoopOpts) {}

  get fps(): number {
    return this.monitor.fps;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.monitor.reset();
    this.degradedNotified = false;
    this.lastMs = 0;
    this.lastInferMs = 0;
    const tick = async (nowMs: number): Promise<void> => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      if (this.lastMs === 0) this.lastMs = nowMs;
      const dt = Math.min(100, Math.max(0, nowMs - this.lastMs));
      this.lastMs = nowMs;
      // 적응형 스로틀: 추론이 20ms 안에 끝나면 게이트 없이 매 프레임 추적하고,
      // 느린 기기에서만 33ms(30fps) 간격을 유지한다.
      const gate = this.lastInferDuration < 20 ? 0 : 33;
      if (nowMs - this.lastInferMs < gate) return;
      this.lastInferMs = nowMs;
      this.monitor.sample(nowMs);
      if (this.monitor.degraded && !this.degradedNotified) {
        this.degradedNotified = true;
        this.opts.onDegrade?.(this.monitor.fps);
      }
      this.frames += 1;
      if (this.monitor.degraded && this.frames % 2 === 0) return;
      const video = this.opts.video ?? (this.dummyVideo ??= document.createElement('video'));
      let frame: PoseFrame;
      const inferStart = performance.now();
      try {
        frame = await this.opts.engine.estimate(video);
      } catch {
        return;
      }
      this.lastInferDuration = performance.now() - inferStart;
      const events = this.opts.game.tick(frame, dt);
      // 성공 이벤트 축하 이펙트: 손목 위치에 파티클 폭발.
      for (const e of events) {
        if (!CELEBRATE.has(e.type)) continue;
        const at = wristOf(frame) ?? { x: frame.width / 2, y: frame.height / 2 };
        spawnBurst(this.particles, at.x, at.y);
      }
      this.particles = tickParticles(this.particles, dt);
      // 렌더 순서: 지우기 → 게임 요소 → 스켈레톤+손 → 마스크 → 파티클(맨 위).
      const ctx = this.opts.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.opts.canvas.width, this.opts.canvas.height);
        try {
          this.opts.game.draw?.(ctx, this.opts.canvas.width, this.opts.canvas.height);
        } catch {
          // 게임 그리기 실패는 루프를 멈추지 않음
        }
      }
      if (this.opts.showSkeleton) {
        try {
          drawSkeleton(this.opts.canvas, frame);
          if (ctx) {
            drawFaceMask(ctx, frame, this.opts.face);
            drawParticles(ctx, this.particles);
          }
        } catch {
          // 렌더 실패는 루프를 멈추지 않음
        }
      }
      if (this.opts.showSkeleton && this.opts.game.id === 'math') {
        try {
          drawZones(this.opts.canvas, frame.width);
        } catch {}
      }
      if (events.length > 0) {
        this.opts.onEvent?.(events, {
          score: this.opts.game.board.score,
          combo: this.opts.game.board.combo
        });
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
