import type { GameMeta } from '../meta';

export const yogaMeta: GameMeta = {
  id: 'yoga',
  no: 10,
  name: '요가 거울',
  rule: '나무·전사 자세를 3초 동안 흔들리지 않고 버텨요.',
  effect: '균형 · 자세 교정',
  art: 'art/yoga-mirror.jpg',
  artAlt: '나무 자세로 균형을 잡는 귀여운 캐릭터 그림',
  accent: '#00ffff',
  help: [
    '나무 자세부터 시작해 3초 동안 흔들리지 않고 버티세요.',
    '완성하면 전사 자세로 넘어가요.',
    '자세가 흐트러지면 처음부터 다시 세어요.'
  ]
};
