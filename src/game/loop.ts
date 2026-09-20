// src/game/loop.ts
import type { PoseEngine } from '../pose/pose-engine';
import type { Calibration, PoseFrame } from '../pose/types';
import type { Game, GameEvent } from './types';
import type { ScoreBoard } from './engine';
import { FpsMonitor } from '../perf/fps-monitor';
import { drawSkeleton, drawZones } from '../ui/renderer';

export type GameEventHandler = (events: GameEvent[], board: { score: number; combo: number }) => void;

export interface LoopGame extends Game {
  board: ScoreBoard;
}

export interface LoopOpts {
  video: HTMLVideoElement | null;
  canvas: HTMLCanvasElement;
  engine: PoseEngine;
  game: LoopGame;
  /** App owns application: radiusScale/mode 주입은 start 전, loop는 참조 보관용. */
  calibration: Calibration;
  showSkeleton: boolean;
  onEvent?: GameEventHandler;
  onDegrade?: (fps: number) => void;
}

export class GameLoop {
  private raf = 0;
  private running = false;
  private lastMs = 0;
  private monitor = new FpsMonitor();
  private frames = 0;
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
    const tick = async (nowMs: number): Promise<void> => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      if (this.lastMs === 0) this.lastMs = nowMs;
      const dt = Math.min(100, Math.max(0, nowMs - this.lastMs));
      this.lastMs = nowMs;
      this.monitor.sample(nowMs);
      if (this.monitor.degraded && !this.degradedNotified) {
        this.degradedNotified = true;
        this.opts.onDegrade?.(this.monitor.fps);
      }
      this.frames += 1;
      if (this.monitor.degraded && this.frames % 2 === 0) return;
      const video = this.opts.video ?? (this.dummyVideo ??= document.createElement('video'));
      let frame: PoseFrame;
      try {
        frame = await this.opts.engine.estimate(video);
      } catch {
        return;
      }
      const events = this.opts.game.tick(frame, dt);
      if (this.opts.showSkeleton) {
        try {
          drawSkeleton(this.opts.canvas, frame);
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
