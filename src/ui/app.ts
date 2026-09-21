import type { Calibration, PoseMode } from '../pose/types';
import type { GameId } from './router';
import type { PoseEngine } from '../pose/pose-engine';
import { FruitNinja } from '../game/fruit-ninja';
import { SquatRunner } from '../game/squat-runner';
import { MathJump } from '../game/math-jump';
import { BodyABC } from '../game/body-abc';
import { StarCatch } from '../game/star-catch';
import { BalloonHead } from '../game/balloon-head';
import { ZombieSteps } from '../game/zombie-steps';
import { RhythmDance } from '../game/rhythm-dance';
import { SimonSays } from '../game/simon-says';
import { YogaMirror } from '../game/yoga-mirror';
import { DuoStars } from '../game/duo-stars';
import { RecycleSort } from '../game/recycle-sort';

export type PlayableId = Exclude<GameId, 'home'>;
export type PlayableGame =
  | FruitNinja | SquatRunner | MathJump | BodyABC
  | StarCatch | BalloonHead | ZombieSteps | RhythmDance
  | SimonSays | YogaMirror | DuoStars | RecycleSort;

export function createGame(id: PlayableId): PlayableGame {
  switch (id) {
    case 'squat': return new SquatRunner();
    case 'math': return new MathJump();
    case 'abc': return new BodyABC();
    case 'star': return new StarCatch();
    case 'balloon': return new BalloonHead();
    case 'zombie': return new ZombieSteps();
    case 'dance': return new RhythmDance();
    case 'simon': return new SimonSays();
    case 'yoga': return new YogaMirror();
    case 'duo': return new DuoStars();
    case 'recycle': return new RecycleSort();
    default: return new FruitNinja();
  }
}

export function defaultCalibration(): Calibration {
  return { scale: 1, centerX: 320, mode: 'seated' as PoseMode, shoulderWidth: 100 };
}

// 기본 엔진은 MediaPipe PoseLandmarker (GPU 네이티브 경로로 MoveNet보다 빠름).
// 실패하면 MoveNet으로 폴백한다. 동적 import로 첫 로딩을 가볍게 유지.
export async function loadEngine(_id: PlayableId): Promise<PoseEngine | null> {
  try {
    const { MediaPipeAdapter } = await import('../pose/mediapipe-adapter');
    const mp = new MediaPipeAdapter();
    await mp.load();
    return mp;
  } catch (err) {
    console.warn('[pose] MediaPipe failed, falling back to MoveNet', err);
  }
  try {
    const { MoveNetAdapter } = await import('../pose/movenet-adapter');
    const mn = new MoveNetAdapter();
    await mn.load();
    return mn;
  } catch (err) {
    console.warn('[pose] MoveNet failed too', err);
    return null;
  }
}
