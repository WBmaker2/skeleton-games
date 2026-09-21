# 몸으로 ABC 스켈레톤 가이드 이미지 생성 프롬프트

현재 게임은 외부 이미지 없이 `drawPoseGuide()` 벡터 막대인간을 코드로 그린다
(`src/ui/renderer.ts` → `BodyABC.draw()`에서 오른쪽 위 140×180 패널).
글자(T·Y·O·L)만으로는 어떤 모양을 만들어야 하는지 알기 어려우니,
더 귀여운 캐릭터 예시가 필요하면 아래 4장을 외부 도구로 만들어 교체하면 된다.
필수는 아니다 — 이미지가 없어도 벡터 가이드가 항상 보인다.

## 공통 스펙 (4장 모두 동일)

- front-facing simple stick-figure / skeleton example, full body, centered,
  transparent background (PNG alpha), thick rounded limbs, white round head,
  neon-yellow (`#dfff00`) arms·legs·torso, dark outline for visibility,
  cute and friendly, kids game UI icon style, flat vector, no shadow,
  no text, no letters, no numbers, no watermark, square 1:1, 512×512 or larger
- 팔다리 굵기는 패널(140×180)에서 멀리서도 보여야 하므로 최소 10px 환산 굵기
- 정면을 보고 선 자세, 다리는 살짝 벌리고 곧게 (앉음 모드에서도 상체만 보면 됨)
- 눈·입 등 얼굴 디테일 없음 (마스크·얼굴 추적과 겹치지 않게)
- 글자는 코드(`drawLabel`)가 패널 하단에 그려주므로 이미지에 글자를 넣지 않는다
  (셀카 미러에서 뒤집혀 보이는 문제 방지)

## 배치 스펙 (코드 기준, 생성 시 참고)

- 위치: 스테이지 오른쪽 위, `x = width - 140 - 16, y = 16, w = 140, h = 180`
- 배경: 코드가 `rgba(10,16,22,0.72)` 둥근 패널을 그리고 그 안에 이미지를 얹는다
- 파일명(예정): `guide-abc-T.png`, `guide-abc-Y.png`, `guide-abc-O.png`, `guide-abc-L.png`
- 저장 위치(예정): `public/art/`
- 파일이 없으면 벡터 가이드로 폴백 (플레이스홀더 없음)
- 장차 교체 시: `drawPoseGuide()` 안에서 `drawImage`로 중앙에 정사각 크롭 후 표시,
  하단 40px은 글자 영역이라 비워 둘 것

## 1. guide-abc-T.png — T자 (양팔 수평)

- both arms stretched straight out horizontally to the sides at shoulder height,
  forming a capital T with the vertical torso, legs straight slightly apart

## 2. guide-abc-Y.png — Y자 (양팔 대각선 위)

- both arms raised diagonally up to the sky in a wide V,
  elbows straight, forming a capital Y with the torso, legs straight slightly apart

## 3. guide-abc-O.png — O자 (양손 머리 위에서 만나기)

- both arms curved up over the head, fingertips touching above the head,
  forming a round O circle with arms and head, legs straight slightly apart,
  funny round shape, not scary

## 4. guide-abc-L.png — L자 (왼팔 수평 + 오른팔 내리기)

- left arm stretched straight out horizontally to the side at shoulder height,
  right arm lowered straight down along the body,
  forming a capital L shape, legs straight slightly apart

## 참고: 현재 코드 가이드와의 대응

- `TEMPLATES` (`src/games/abc/body-abc.ts`): T(90,90), Y(135,135), O(160,160), L(90,0)
- 스케일: 0=팔 내림·90=수평·180=머리 위로 올림 (어깨→손목 벡터의 연속 각도),
  성공 임계값은 양팔 평균 유사도 0.6 (T·Y 교차 유사도 0.5라 구별됨)
- `drawPoseGuide` 팔 좌표와 위 프롬프트는 1:1 대응 (왼팔 수평/L자 비대칭 포함)
- L은 비대칭이라 셀카 미러 상쇄가 필요 — 이미지로 교체해도 좌우가 뒤집혀
  보이지 않는지 실기기로 확인할 것
