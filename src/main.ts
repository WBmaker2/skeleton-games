import { parseHash } from './ui/router';
import type { GameId } from './ui/router';
import { createGame, defaultCalibration, selectEngineKind } from './ui/app';
import type { PlayableId } from './ui/app';
import { FruitNinja } from './game/fruit-ninja';
import { BodyABC } from './game/body-abc';
import { MoveNetAdapter } from './pose/movenet-adapter';
import { MediaPipeAdapter } from './pose/mediapipe-adapter';
import { FallbackEngine } from './pose/fallback-engine';
import type { PoseEngine } from './pose/pose-engine';
import { calibrate } from './calibration/calibrator';
import type { Calibration, PoseFrame } from './pose/types';
import { GameLoop } from './game/loop';
import { beep } from './ui/feedback';
import { saveScore, shareLink, topScores } from './game/storage';
import type { ScoreBoard } from './game/engine';
import { renderLanding } from './ui/landing';

function gameIdOr(id: GameId): PlayableId {
  return id === 'home' ? 'fruit' : id;
}

async function collectCalibration(engine: PoseEngine, video: HTMLVideoElement | null, overlay: HTMLElement): Promise<Calibration> {
  const msg = overlay.querySelector('#calibmsg') ?? overlay;
  msg.textContent = 'T자세로 3초간 서주세요 (스킵 가능)';
  const frames: PoseFrame[] = [];
  const dummy = video ?? document.createElement('video');
  const started = performance.now();
  while (performance.now() - started < 3000 && frames.length < 60) {
    if ((overlay as HTMLElement & { skipped?: boolean }).skipped) break;
    try {
      frames.push(await engine.estimate(dummy));
    } catch {
      break;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  if (frames.length < 4) return defaultCalibration();
  return calibrate(frames);
}

export function boot(): void {
  if ((window as unknown as { __skelplay_booted?: boolean }).__skelplay_booted) return;
  (window as unknown as { __skelplay_booted?: boolean }).__skelplay_booted = true;
  const app = document.getElementById('app');
  if (!app) return;
  let loop: GameLoop | null = null;
  let engine: PoseEngine | null = null;
  let fpsTimer = 0;
  let current: { id: PlayableId; board: ScoreBoard } | null = null;
  const render = () => {
    if (current && current.board.score > 0) saveScore(current.id, { name: '나', score: current.board.score });
    current = null;
    const oldVideo = document.getElementById('cam') as HTMLVideoElement | null;
    const oldStream = oldVideo?.srcObject as MediaStream | null;
    if (oldStream && typeof oldStream.getTracks === 'function') oldStream.getTracks().forEach((t) => t.stop());
    if (engine && 'detach' in engine && typeof (engine as { detach?: unknown }).detach === 'function') {
      (engine as { detach: () => void }).detach();
    }
    engine = null;
    loop?.stop();
    loop = null;
    clearInterval(fpsTimer);
    // Landing: game picker. Game behavior below is untouched.
    if (parseHash(window.location.hash) === 'home') {
      document.title = '게임 고르기 | Skeleton Play';
      renderLanding(app);
      return;
    }
    const id = gameIdOr(parseHash(window.location.hash));
    // WCAG 2.4.2: page title matches the current route.
    document.title = `${({ fruit: '과일 닌자 몸버전', squat: '스쿼트 러너', math: '점프 수학 퀴즈', abc: '몸으로 ABC' })[id]} | Skeleton Play`;
    app.innerHTML =
      `<nav><a href="#/fruit">과일</a> <a href="#/squat">스쿼트</a> <a href="#/math">수학</a> <a href="#/abc">ABC</a></nav>` +
      `<p data-testid="route">${id}</p>` +
      `<video id="cam" playsinline muted></video><canvas id="stage" width="640" height="480"></canvas>` +
      `<p id="hud">준비 중…</p><p id="fps"></p><div id="calib"><p id="calibmsg"></p><button id="skip">스킵하고 시작</button></div>` +
      `<p>카메라 거부 시 키보드 모드: 방향키/WASD=이동, 스페이스=손들기, 포인터 이동도 가능</p>` +
      `<p>공유: <span id="share"></span></p><ol id="ranks"></ol>`;
    void start(id);
  };
  const start = async (id: PlayableId) => {
    const hud = document.getElementById('hud');
    const fpsEl = document.getElementById('fps');
    const overlay = document.getElementById('calib');
    const skip = document.getElementById('skip');
    skip?.addEventListener('click', () => {
      if (overlay) (overlay as HTMLElement & { skipped?: boolean }).skipped = true;
    });
    const game = createGame(id);
    const video = await openCamera();
    const cameraOk = video !== null;
    const kind = selectEngineKind(cameraOk);
    if (kind === 'fallback') {
      const fb = new FallbackEngine();
      await fb.load();
      fb.attach(app);
      engine = fb;
    } else if (id === 'abc') {
      engine = new MediaPipeAdapter();
      try {
        await engine.load();
      } catch {
        const fb = new FallbackEngine();
        await fb.load();
        fb.attach(app);
        engine = fb;
      }
    } else {
      engine = new MoveNetAdapter();
      try {
        await engine.load();
      } catch {
        const fb = new FallbackEngine();
        await fb.load();
        fb.attach(app);
        engine = fb;
      }
    }
    const cal = overlay ? await collectCalibration(engine, video, overlay) : defaultCalibration();
    overlay?.remove();
    if (game instanceof FruitNinja) game.radiusScale = cal.scale;
    if (game instanceof BodyABC) game.mode = cal.mode;
    game.start();
    current = { id, board: game.board };
    const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
    if (!canvas) return;
    const share = document.getElementById('share');
    if (share) share.textContent = shareLink(id);
    const showRanks = () => {
      const ol = document.getElementById('ranks');
      if (ol) ol.innerHTML = topScores(id).map((s) => `<li>${s.name}: ${s.score}</li>`).join('');
    };
    showRanks();
    loop = new GameLoop({
      video,
      canvas,
      engine,
      game,
      calibration: cal,
      showSkeleton: true,
      onEvent: (events, board) => {
        for (const e of events) {
          beep(e.type === 'wrong' || e.type === 'bomb' ? 'miss' : e.type.startsWith('pose') || e.type === 'correct' ? 'win' : 'hit');
          if (hud) hud.textContent = `${e.label} — ${board.score}점 (콤보 ${board.combo})`;
        }
      },
      onDegrade: (fps) => {
        if (fpsEl) fpsEl.textContent = `저사양 모드 (${fps.toFixed(0)}fps, 15fps로 동작 중)`;
      }
    });
    loop.start();
    fpsTimer = Number(setInterval(() => {
      if (!loop) {
        clearInterval(fpsTimer);
        return;
      }
      if (fpsEl && !fpsEl.textContent?.startsWith('저사양')) fpsEl.textContent = `${loop.fps.toFixed(0)}fps · ${cal.mode === 'seated' ? '앉음' : '선'} 모드`;
    }, 500));
  };
  window.addEventListener('hashchange', render);
  render();
}

export async function openCamera(): Promise<HTMLVideoElement | null> {
  const video = document.getElementById('cam') as HTMLVideoElement | null;
  if (!video) return null;
  const attempts: MediaTrackConstraints[] = [
    { width: 1280, height: 720, facingMode: 'user' },
    { width: 640, height: 480 }
  ];
  for (const vc of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: vc, audio: false });
      video.srcObject = stream;
      await video.play();
      return video;
    } catch {
      // 다음 해상도로 폴백
    }
  }
  return null;
}

boot();
