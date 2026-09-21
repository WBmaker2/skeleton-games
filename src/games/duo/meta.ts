import type { GameMeta } from '../meta';

export const duoMeta: GameMeta = {
  id: 'duo',
  no: 11,
  name: '2인 별자리',
  rule: '양손으로 두 별을 동시에 잡아 별자리를 완성해요.',
  effect: '협동 · 집중력',
  art: 'art/duo-stars.jpg',
  artAlt: '양손으로 두 별을 이어 별자리를 만드는 귀여운 캐릭터 그림',
  accent: '#dfff00',
  help: [
    '왼손은 왼쪽 별, 오른손은 오른쪽 별에 동시에 대세요.',
    '0.8초 유지하면 별자리 1개 완성, 20점이에요.',
    '친구와 한 손씩 잡고 함께 해도 돼요.'
  ]
};
