import { parseHash } from './ui/router';
import type { GameId } from './ui/router';
import { createGame, defaultCalibration } from './ui/app';
import type { PlayableId } from './ui/app';
import { FruitNinja } from './game/fruit-ninja';
import { BodyABC } from './game/body-abc';
import { MoveNetAdapter } from './pose/movenet-adapter';
import { MediaPipeAdapter } from './pose/mediapipe-adapter';
import type { PoseEngine } from './pose/pose-engine';
import { calibrate } from './calibration/calibrator';
import type { Calibration, PoseFrame } from './pose/types';
import { GameLoop } from './game/loop';
import { beep } from './ui/feedback';
import { saveScore, shareLink, topScores } from './game/storage';
import type { ScoreBoard } from './game/engine';
import updateLogRaw from '../docs/UPDATELOG.md';
import { openModal, parseUpdateLog, updateLogHTML } from './ui/modal';
import { RULES } from './ui/help';
import { wireUpdateLog } from './ui/landing';
import { getPreferredCamera, listCameras, setPreferredCamera } from './ui/camera';
import { fitStageToVideo } from './ui/stage';
import './ui/game.css';

const GAME_NAMES: Record<PlayableId, string> = {
  fruit: '과일 닌자 몸버전',
  squat: '스쿼트 러너',
  math: '점프 수학 퀴즈',
  abc: '몸으로 ABC',
  star: '별잡기 스트레칭',
  balloon: '풍선 헤딩',
  zombie: '좀비 스텝 피하기',
  dance: '리듬 댄스 카피',
  simon: '사이먼 AI 선생님',
  yoga: '요가 거울',
  duo: '2인 별자리',
  recycle: '분리수거 스트레칭'
};

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
    document.title = `${GAME_NAMES[id]} | Skeleton Play`;
    // WCAG: game screen landmarks + heading order (h1 game name).
    app.innerHTML =
      `<div class="game-screen"><div class="game-inner">` +
      `<header class="game-top"><p class="game-kicker">Skeleton Play</p>` +
      `<h1 class="game-title">${GAME_NAMES[id]}</h1>` +
      `<nav class="game-nav" aria-label="게임 이동"><a href="#/">← 모든 게임</a></nav></header>` +
      `<main aria-label="게임 화면">` +
      `<p data-testid="route" hidden>${id}</p>` +
      `<div class="stage-frame"><video id="cam" playsinline muted></video><canvas id="stage" width="640" height="480"></canvas></div>` +
      `<section class="hud" aria-label="점수판">` +
      `<div class="hud-chip"><span>점수</span><strong id="score">0</strong></div>` +
      `<div class="hud-chip"><span>콤보</span><strong id="combo">0</strong></div>` +
      `<div class="hud-chip"><span>상태</span><strong id="fps">준비 중</strong></div></section>` +
      `<p id="hud" class="hud-msg">준비 중…</p>` +
      `<div id="calib" class="overlay"><p id="calibmsg"></p><button id="skip" class="btn">스킵하고 시작</button></div>` +
      `<div class="camrow"><label for="camsel">카메라</label><select id="camsel"></select>` +
      `<button id="retry" class="btn btn-accent" hidden>카메라 다시 찾기</button></div>` +
      `<p class="shareline">공유: <span id="share"></span></p><ol id="ranks" class="ranks"></ol>` +
      `<p class="helprow"><button type="button" id="howto" class="btn-small">게임 방법</button> ` +
      `<button type="button" id="updatelog" class="btn-small">업데이트 내역</button></p>` +
      `</main></div></div>`;
    wireUpdateLog(app);
    wireHowTo(app, id);
    void start(id);
  };
  // Device labels need HTML-escaping (browser-provided strings).
  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // 카메라 선택 드롭다운을 채우고, 변경 시 저장 후 같은 게임을 다시 시작한다.
  const wireCameraSelect = async (id: PlayableId): Promise<void> => {
    const sel = document.getElementById('camsel') as HTMLSelectElement | null;
    if (!sel) return;
    const cams = await listCameras();
    sel.innerHTML =
      cams.length > 0
        ? cams.map((c) => `<option value="${c.deviceId}">${esc(c.label)}</option>`).join('')
        : `<option value="">카메라 없음</option>`;
    const preferred = getPreferredCamera();
    if (preferred && cams.some((c) => c.deviceId === preferred)) sel.value = preferred;
    sel.onchange = () => {
      setPreferredCamera(sel.value);
      void start(id);
    };
  };
  // 게임 방법 버튼 → 해당 게임의 플레이 방법 모달.
  const wireHowTo = (root: ParentNode, id: PlayableId): void => {
    root.querySelector('#howto')?.addEventListener('click', () => {
      const help = RULES[id];
      openModal({
        title: `${help.name} 게임 방법`,
        bodyHTML:
          `<ol>` + help.steps.map((s) => `<li>${s}</li>`).join('') + `</ol>`
      });
    });
  };
    const hud = document.getElementById('hud');
    const scoreEl = document.getElementById('score');
    const comboEl = document.getElementById('combo');
    const fpsEl = document.getElementById('fps');
    const overlay = document.getElementById('calib');
    const skip = document.getElementById('skip');
    const retry = document.getElementById('retry');
    skip?.addEventListener('click', () => {
      if (overlay) (overlay as HTMLElement & { skipped?: boolean }).skipped = true;
    });
    // 재인식 버튼: 같은 게임을 처음부터 다시 시도한다.
    retry?.addEventListener('click', () => {
      void start(id);
    });
    const game = createGame(id);
    wireCameraSelect(id);
    // 카메라 전용: 키보드·포인터 폴백 없음. 실패하면 재인식 UI를 보여준다.
    const showCamError = (msg: string): void => {
      const overlay = document.getElementById('calib');
      const msgEl = document.getElementById('calibmsg');
      const retry = document.getElementById('retry');
      const skipBtn = document.getElementById('skip');
      if (msgEl) msgEl.textContent = msg;
      if (overlay) overlay.classList.add('overlay-error');
      if (skipBtn) skipBtn.hidden = true;
      if (retry) {
        retry.hidden = false;
        retry.focus();
      }
      const hud = document.getElementById('hud');
      if (hud) hud.textContent = msg;
    };
    const video = await openCamera(getPreferredCamera() ?? undefined);
    if (!video) {
      showCamError('카메라를 찾지 못했어요. 카메라를 연결하고 아래 버튼을 눌러주세요.');
      return;
    }
    let engine: PoseEngine;
    try {
      engine = id === 'abc' ? new MediaPipeAdapter() : new MoveNetAdapter();
      await engine.load();
    } catch {
      showCamError('인식 모델을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.');
      return;
    }
    const cal = overlay ? await collectCalibration(engine, video, overlay) : defaultCalibration();
    overlay?.remove();
    if (game instanceof FruitNinja) game.radiusScale = cal.scale;
    if (game instanceof BodyABC) game.mode = cal.mode;
    game.start();
    current = { id, board: game.board };
    const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
    if (!canvas) return;
    // 캔버스 좌표계를 영상 해상도에 맞춰 스켈레톤 어긋남을 제거한다.
    fitStageToVideo(canvas, video.videoWidth, video.videoHeight);
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
          beep(
            e.type === 'wrong' || e.type === 'bomb' || e.type === 'miss' ||
              e.type === 'timeout' || e.type === 'caught' || e.type === 'drop' || e.type === 'mixed'
              ? 'miss'
              : e.type.startsWith('pose') || e.type === 'correct' || e.type === 'pair' || e.type === 'sorted'
                ? 'win'
                : 'hit'
          );
          if (hud) hud.textContent = `${e.label} — ${board.score}점 (콤보 ${board.combo})`;
          if (scoreEl) scoreEl.textContent = String(board.score);
          if (comboEl) comboEl.textContent = String(board.combo);
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

export async function openCamera(deviceId?: string): Promise<HTMLVideoElement | null> {
  const video = document.getElementById('cam') as HTMLVideoElement | null;
  if (!video) return null;
  // 저장된 카메라가 있으면 먼저 정확히 지정해서 시도한다.
  const attempts: MediaTrackConstraints[] = deviceId
    ? [{ deviceId: { exact: deviceId }, width: 1280, height: 720 }]
    : [];
  attempts.push(
    { width: 1280, height: 720, facingMode: 'user' },
    { width: 640, height: 480 }
  );
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
