import type { GameMeta } from '../meta';

export const balloonMeta: GameMeta = {
  id: 'balloon',
  no: 6,
  name: '풍선 헤딩',
  rule: '머리로 풍선을 받아 떨어뜨리지 않고 오래 띄워요.',
  effect: '목·코어 운동',
  art: 'art/balloon-head.jpg',
  artAlt: '머리 위로 둥실 뜬 풍선을 받는 귀여운 캐릭터 그림',
  accent: '#00ffff',
  help: [
    '머리로 풍선을 받아 위로 띄우세요.',
    '풍선이 바닥에 떨어지면 콤보가 끊겨요.',
    '받을 때마다 5점씩 올라요.'
  ]
};
