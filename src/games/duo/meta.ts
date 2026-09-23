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
    '화면에 보이는 왼쪽 별·오른쪽 별에 양손 동그라미를 각각 겹치세요 (어느 손이 어느 별이어도 돼요).',
    '동그라미 중심이 별 중심에 화면 너비의 10% 이내로 가까워야 해요.',
    '0.8초 동안 동시에 유지하면 별자리 1개 완성, 20점이에요.',
    '친구와 한 손씩 잡고 함께 해도 돼요.'
  ]
};
