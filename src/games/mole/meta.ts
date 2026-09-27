import type { GameMeta } from '../meta';

export const moleMeta: GameMeta = {
  id: 'mole',
  no: 13,
  name: '두더지 팡팡',
  rule: '바닥 6개 구멍에서 올라오는 두더지를 손을 위로 올렸다가 내려쳐서 잡아요.',
  effect: '어깨 스트레칭 · 순발력',
  art: 'art/mole-whack.jpg',
  artAlt: '바닥 구멍에서 올라온 귀여운 두더지를 손으로 잡는 캐릭터 그림',
  accent: '#b07a4f',
  help: [
    '손을 어깨 위로 올리면 손 표시가 노랑으로 바뀌어요. (왼손·오른손 따로 준비돼요)',
    '노랑일 때 두더지 머리를 향해 손을 아래로 내려치면 잡혀요. 아래에서만 움직이면 안 잡혀요.',
    '맞은 두더지는 깜짝 놀란 표정으로 내려가요. 60초 동안 많이 잡아보세요! (후반에는 2마리까지 동시에 나와요)'
  ]
};
