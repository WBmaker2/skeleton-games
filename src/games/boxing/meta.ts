import type { GameMeta } from '../meta';

export const boxingMeta: GameMeta = {
  id: 'boxing',
  no: 14,
  name: '쉐도우 복싱',
  rule: '날아오는 미트를 향해 주먹을 휙 뻗어 쳐라!',
  effect: '어깨·팔 순발력',
  art: 'art/boxing-shadow.jpg',
  artAlt: '빨간 복싱 글러브로 미트를 치는 귀여운 캐릭터 그림',
  accent: '#ff5d5d',
  help: [
    '미트가 뜨면 주먹을 휙 뻗어 치세요. 가만히 대면 맞지 않아요.',
    '왼손·오른손 어느 손으로 쳐도 돼요. 번갈아 치면 더 빨라요.',
    '미트는 시간이 지나면 사라져요. 1대당 10점, 연속 펀치는 콤보 보너스!'
  ]
};
