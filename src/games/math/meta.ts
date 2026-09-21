import type { GameMeta } from '../meta';

export const mathMeta: GameMeta = {
  id: 'math',
  no: 3,
  name: '점프 수학 퀴즈',
  rule: '정답이 있는 쪽으로 몸을 움직여 점수를 올려요.',
  effect: '수학 공부 · 민첩성',
  art: 'art/math-jump.jpg',
  artAlt: '숫자 풍선을 향해 점프하는 귀여운 학생 캐릭터 그림',
  accent: '#dfff00',
  help: [
    '새 문제가 나오면 먼저 3초 동안 읽고 정답을 생각하세요.',
    '“정답 쪽으로 이동!”이 나오면 답이 있는 쪽으로 몸을 움직이세요.',
    '그 자리에서 잠시 기다리거나 손을 들면 답이 확정돼요.',
    '문제를 맞히면 20점, 틀리면 다시 도전해요.'
  ]
};
