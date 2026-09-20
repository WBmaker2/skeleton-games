# 게임 아트 이미지 생성 프롬프트

랜딩페이지 4장의 카드 이미지(`public/art/*.png`)를 외부 도구로 만들 때 사용하세요.
다 만들어지면 `public/art/`에 넣고 `npm run build`만 하면 카드에 자동 표시됩니다.
(파일이 없을 때는 귀여운 얼굴 플레이스홀더가 대신 보입니다.)

## 공통 스타일 (4장 모두 동일하게 적용)

- cute flat vector illustration for elementary school kids, thick dark outlines,
  soft pastel colors with a pop of neon, simple shapes, big friendly eyes,
  cheerful, no text, no letters, no numbers, no watermark, square 1:1, 1024x1024

## 1. public/art/fruit-ninja.png

- a cute little ninja in a pink headband joyfully slicing a big smiling
  watermelon in mid-air, fruit slices and sparkles flying, sky-blue background

## 2. public/art/squat-runner.png

- a cute kid runner character with a cyan cap running fast on a track,
  motion lines and stars behind, orange sunset background

## 3. public/art/math-jump.png

- a cute student character jumping high toward giant smiling number balloons
  (7, 8, 9), confetti, light-yellow background

## 4. public/art/body-abc.png

- a cute character making a T-pose with arms wide open like the letter T,
  big soft alphabet blocks nearby, lavender background

## 배치 확인

- 파일명 오타 주의 ( 코드가 참조하는 경로: `art/fruit-ninja.png`,
  `art/squat-runner.png`, `art/math-jump.png`, `art/body-abc.png` )
- PNG 권장, 1024px 이상. 넣은 뒤 `npm run dev`로 카드에 뜨는지 확인
- 대체 텍스트는 `src/ui/landing.ts`의 `artAlt`에 이미 작성되어 있음
