import type { GameMeta } from '../meta';

export const zombieMeta: GameMeta = {
  id: 'zombie',
  no: 7,
  name: '좀비 스텝 피하기',
  rule: '좌우로 몸을 움직여 다가오는 좀비를 피해요.',
  effect: '유산소 · 민첩성',
  art: 'art/zombie-steps.jpg',
  artAlt: '다가오는 장난감 좀비를 좌우 스텝으로 피하는 귀여운 캐릭터 그림',
  accent: '#dfff00',
  help: [
    '좀비가 다가오는 줄을 보고 좌우로 몸을 피하세요.',
    '좀비와 같은 줄에 있으면 잡혀요.',
    '피할 때마다 10점씩 올라요.'
  ]
};
