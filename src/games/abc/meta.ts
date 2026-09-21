import type { GameMeta } from '../meta';

export const abcMeta: GameMeta = {
  id: 'abc',
  no: 4,
  name: '몸으로 ABC',
  rule: 'T, Y, O, L 모양을 몸으로 만들어 영어 단어를 완성해요.',
  effect: '영어 공부 · 유연성',
  art: 'art/body-abc.jpg',
  artAlt: '팔을 벌려 T자 모양을 만드는 귀여운 캐릭터 그림',
  accent: '#5d34d0',
  help: [
    'T, Y, O, L 순서대로 몸으로 알파벳 모양을 만드세요.',
    '모양을 1초 동안 유지하면 인정돼요.',
    '앉아서 할 때는 상체 모양만 봐요.'
  ]
};
