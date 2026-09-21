import type { GameMeta } from '../meta';

export const recycleMeta: GameMeta = {
  id: 'recycle',
  no: 12,
  name: '분리수거 스트레칭',
  rule: '몸을 기울여 플라스틱은 왼쪽, 캔은 오른쪽 통에 넣어요.',
  effect: '환경 공부 · 유연성',
  art: 'art/recycle-sort.jpg',
  artAlt: '재활용 통에 쓰레기를 나누어 담는 귀여운 캐릭터 그림',
  accent: '#5d34d0',
  help: [
    '떨어지는 물건을 보고 몸을 기울이세요.',
    '플라스틱은 왼쪽, 캔은 오른쪽 통이에요.',
    '엉뚱한 통에 오래 있으면 감점이에요.'
  ]
};
