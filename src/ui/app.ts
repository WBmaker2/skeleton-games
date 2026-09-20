import type { Calibration, PoseMode } from '../pose/types';
import type { GameId } from './router';
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
