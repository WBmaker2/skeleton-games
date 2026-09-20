import './theme.css';
import './landing.css';

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

// Real product data only: names, rules, and effects come from the game spec.
// No fabricated scores, telemetry, or testimonials.
export const LANDING_GAMES: LandingGame[] = [
  {
    id: 'fruit',
    no: 1,
    name: '과일 닌자 몸버전',
    rule: '손으로 과일을 베어라! 폭탄은 건드리면 안 돼요.',
    effect: '어깨 스트레칭 · 순발력',
    art: 'art/fruit-ninja.jpg',
    artAlt: '웃는 얼굴의 귀여운 닌자가 하늘에 뜬 과일을 베는 그림',
    accent: '#7cc496'
  },
  {
    id: 'squat',
    no: 2,
    name: '스쿼트 러너',
    rule: '앉았다 일어서기로 장애물을 피하는 달리기 게임이에요.',
    effect: '하체 운동 · 심폐 지구력',
    art: 'art/squat-runner.jpg',
    artAlt: '모자를 쓴 귀여운 러너 캐릭터가 신나게 달리는 그림',
    accent: '#00ffff'
  },
  {
    id: 'math',
    no: 3,
    name: '점프 수학 퀴즈',
    rule: '정답이 있는 쪽으로 몸을 움직여 점수를 올려요.',
    effect: '수학 공부 · 민첩성',
    art: 'art/math-jump.jpg',
    artAlt: '숫자 풍선을 향해 점프하는 귀여운 학생 캐릭터 그림',
    accent: '#dfff00'
  },
  {
    id: 'abc',
    no: 4,
    name: '몸으로 ABC',
    rule: 'T, Y, O, L 모양을 몸으로 만들어 영어 단어를 완성해요.',
    effect: '영어 공부 · 유연성',
    art: 'art/body-abc.jpg',
    artAlt: '팔을 벌려 T자 모양을 만드는 귀여운 캐릭터 그림',
    accent: '#5d34d0'
  },
  {
    id: 'star',
    no: 5,
    name: '별잡기 스트레칭',
    rule: '반짝이는 별에 손을 대고 잠시 기다리면 별을 잡아요.',
    effect: '유연성 · 스트레칭',
    art: 'art/star-catch.jpg',
    artAlt: '밤하늘의 큰 별을 향해 손을 뻗는 귀여운 캐릭터 그림',
    accent: '#7cc496'
  },
  {
    id: 'balloon',
    no: 6,
    name: '풍선 헤딩',
    rule: '머리로 풍선을 받아 떨어뜨리지 않고 오래 띄워요.',
    effect: '목·코어 운동',
    art: 'art/balloon-head.jpg',
    artAlt: '머리 위로 둥실 뜬 풍선을 받는 귀여운 캐릭터 그림',
    accent: '#00ffff'
  },
  {
    id: 'zombie',
    no: 7,
    name: '좀비 스텝 피하기',
    rule: '좌우로 몸을 움직여 다가오는 좀비를 피해요.',
    effect: '유산소 · 민첩성',
    art: 'art/zombie-steps.jpg',
    artAlt: '다가오는 장난감 좀비를 좌우 스텝으로 피하는 귀여운 캐릭터 그림',
    accent: '#dfff00'
  },
  {
    id: 'dance',
    no: 8,
    name: '리듬 댄스 카피',
    rule: '박자에 맞춰 화면의 포즈를 따라 추는 댄스 게임이에요.',
    effect: '리듬감 · 전신 운동',
    art: 'art/rhythm-dance.jpg',
    artAlt: '음표와 함께 신나게 춤추는 귀여운 캐릭터 그림',
    accent: '#5d34d0'
  },
  {
    id: 'simon',
    no: 9,
    name: '사이먼 AI 선생님',
    rule: '선생님의 지시를 듣고 몸으로 재빨리 답해요.',
    effect: '듣기 · 반응 속도',
    art: 'art/simon-says.jpg',
    artAlt: '확성기로 지시를 내리는 귀여운 로봇 선생님 그림',
    accent: '#7cc496'
  },
  {
    id: 'yoga',
    no: 10,
    name: '요가 거울',
    rule: '나무·전사 자세를 3초 동안 흔들리지 않고 버텨요.',
    effect: '균형 · 자세 교정',
    art: 'art/yoga-mirror.jpg',
    artAlt: '나무 자세로 균형을 잡는 귀여운 캐릭터 그림',
    accent: '#00ffff'
  },
  {
    id: 'duo',
    no: 11,
    name: '2인 별자리',
    rule: '양손으로 두 별을 동시에 잡아 별자리를 완성해요.',
    effect: '협동 · 집중력',
    art: 'art/duo-stars.jpg',
    artAlt: '양손으로 두 별을 이어 별자리를 만드는 귀여운 캐릭터 그림',
    accent: '#dfff00'
  },
  {
    id: 'recycle',
    no: 12,
    name: '분리수거 스트레칭',
    rule: '몸을 기울여 플라스틱은 왼쪽, 캔은 오른쪽 통에 넣어요.',
    effect: '환경 공부 · 유연성',
    art: 'art/recycle-sort.jpg',
    artAlt: '재활용 통에 쓰레기를 나누어 담는 귀여운 캐릭터 그림',
    accent: '#5d34d0'
  }
];

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
    + `<footer><p class="landing__foot">TIP: 카메라 앞에 서서 온몸으로 놀아보세요. 카메라는 게임 화면에서 바꿀 수 있어요.</p></footer>`
    + `</div></div>`;
}
