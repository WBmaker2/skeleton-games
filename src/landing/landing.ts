import '../ui/theme.css';
import './landing.css';
import updateLogRaw from '../../docs/UPDATELOG.md?raw';
import { openModal, parseUpdateLog, updateLogHTML } from '../ui/modal';
import { adminDotHTML, wireAdminDot } from '../ui/leaderboard';
import { GAMEMETAS } from '../games';

export interface LandingGame {
  id: 'fruit' | 'squat' | 'math' | 'abc' | 'star' | 'balloon' | 'zombie' | 'dance' | 'simon' | 'yoga' | 'duo' | 'recycle';
  no: number;
  name: string;
  rule: string;
  effect: string;
  art: string;
  artAlt: string;
  accent: string;
}

// 카드 목록은 각 게임 폴더의 meta에서 가져온다 (게임 스펙의 실제 데이터).
// 새 게임은 src/games/<id>/meta.ts만 작성하고 GAMEMETAS에 등록하면 된다.
// No fabricated scores, telemetry, or testimonials.
export const LANDING_GAMES: LandingGame[] = GAMEMETAS.map((m) => ({
  id: m.id as LandingGame['id'],
  no: m.no,
  name: m.name,
  rule: m.rule,
  effect: m.effect,
  art: m.art,
  artAlt: m.artAlt,
  accent: m.accent
}));

// Decorative SVG placeholder shown until generated art is added.
// WCAG: aria-hidden (decorative); the <img> carries the accessible name.
function placeholderFace(): string {
  return `<svg class="art-fallback" viewBox="0 0 200 200" aria-hidden="true" focusable="false">`
    + `<circle cx="100" cy="105" r="58" fill="#ffffff" stroke="#22303c" stroke-width="7"/>`
    + `<circle cx="80" cy="95" r="9" fill="#22303c"/>`
    + `<circle cx="120" cy="95" r="9" fill="#22303c"/>`
    + `<circle cx="83" cy="92" r="3" fill="#ffffff"/>`
    + `<circle cx="123" cy="92" r="3" fill="#ffffff"/>`
    + `<path d="M78 122 Q100 140 122 122" fill="none" stroke="#22303c" stroke-width="7" stroke-linecap="round"/>`
    + `<circle cx="62" cy="112" r="7" fill="#7cc496"/>`
    + `<circle cx="138" cy="112" r="7" fill="#7cc496"/>`
    + `</svg>`;
}

function card(game: LandingGame): string {
  return `<li>`
    // Whole card is one native link: Tab moves card-to-card, Enter activates.
    + `<a class="game-card" style="--i: ${game.no - 1}" href="#/${game.id}">`
    + `<div class="art-frame">${placeholderFace()}`
    // Generated art (docs/game-art-prompts.md) goes to public/art/.
    // If the file is missing, the <img> removes itself and the SVG shows.
    + `<img src="${game.art}" alt="${game.artAlt}" loading="lazy" onerror="this.remove()">`
    + `</div>`
    + `<span class="game-card__badge">게임 ${game.no} · ${game.effect}</span>`
    + `<h2 class="game-card__title">${game.name}</h2>`
    + `<p class="game-card__rule">${game.rule}</p>`
    + `<span class="game-card__cta">게임 시작</span>`
    + `</a></li>`;
}

// Renders header + main landmarks with h1 -> h2 order (WCAG 1.3.1, 2.4.6).
export function renderLanding(app: HTMLElement): void {
  document.title = '게임 고르기 | Skeleton Play';
  app.innerHTML =
    `<div class="landing"><div class="landing__inner">`
    + `<header><p class="landing__kicker">몸을 움직이는 카메라 운동 게임</p>`
    + `<h1 class="landing__title">어떤 게임을 할까?</h1>`
    + `<p class="landing__sub">마음에 드는 카드를 골라 시작하세요. 카메라 앞에 서서 온몸으로 놀아보세요.</p></header>`
    + `<main aria-label="게임 목록"><ul class="landing__grid">`
    + LANDING_GAMES.map(card).join('')
    + `</ul></main>`
    + `<footer><p class="landing__foot">TIP: 카메라 앞에 서서 온몸으로 놀아보세요. 카메라는 게임 화면에서 바꿀 수 있어요. `
    + `<button type="button" id="updatelog" class="btn-small">업데이트 내역</button> ${adminDotHTML()}</p>`
    + `<p class="landing__readiness" id="readiness">인식 모델 확인 중…</p></footer>`
    + `</div></div>`;
  wireUpdateLog();
  wireAdminDot(app, () => {});
  void refreshReadiness(app);
}

// 랜딩에서 인식 모델 준비 상태를 표시한다 (무거운 모델 로드는 하지 않음).
async function refreshReadiness(app: HTMLElement): Promise<void> {
  const el = app.querySelector('#readiness');
  if (!el) return;
  try {
    const { checkReadiness, readinessMessage } = await import('../ui/readiness');
    el.textContent = readinessMessage(await checkReadiness());
  } catch {
    el.textContent = '인식 모델 확인 중…';
  }
}

// 업데이트 내역 버튼 → 날짜별 모달. 데이터는 docs/UPDATELOG.md.
export function wireUpdateLog(root: ParentNode = document): void {
  root.querySelector('#updatelog')?.addEventListener('click', () => {
    openModal({
      title: '업데이트 내역',
      bodyHTML: updateLogHTML(parseUpdateLog(updateLogRaw))
    });
  });
}
