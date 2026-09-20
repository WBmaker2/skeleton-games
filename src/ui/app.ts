import type { Calibration, PoseMode } from '../pose/types';
import type { GameId } from './router';
import { FruitNinja } from '../game/fruit-ninja';
import { SquatRunner } from '../game/squat-runner';
import { MathJump } from '../game/math-jump';
import { BodyABC } from '../game/body-abc';

export type PlayableId = Exclude<GameId, 'home'>;
export type PlayableGame = FruitNinja | SquatRunner | MathJump | BodyABC;

export function createGame(id: PlayableId): PlayableGame {
  if (id === 'squat') return new SquatRunner();
  if (id === 'math') return new MathJump();
  if (id === 'abc') return new BodyABC();
  return new FruitNinja();
}

export function selectEngineKind(cameraOk: boolean): 'camera' | 'fallback' {
  return cameraOk ? 'camera' : 'fallback';
}

export function defaultCalibration(): Calibration {
  return { scale: 1, centerX: 320, mode: 'seated' as PoseMode, shoulderWidth: 100 };
}
