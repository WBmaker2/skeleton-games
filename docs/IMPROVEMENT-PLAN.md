# 개선 구현 계획 (Skeleton Play)

> 작성일: 2026-11-09. 프로젝트 분석에서 나온 개선점을 단계별로 모두 구현하기 위한 작업 문서.
> 원칙: 기존 13종 게임 동작을 깨지 않는다. 공용 유틸은 점진적으로 적용한다.
> 진행 상태(2026-11-09): 1~5단계 구현 완료. 검증(`tsc`·`vitest`·`build`) 후 결과 반영.

## 0. 현황 요약

- `src/games/<id>/` 모듈 + `GAMEMETAS` 단일 소스, `GameLoop` 중앙 루프, MediaPipe 우선/MoveNet 폴백.
- 문제: 루프 추론 겹침, readiness가 구 모델만 확인, wasm CDN 의존, base 표기 불일치, 공용 로직 중복, 일지정지·음소거·연습모드 없음, CI 없음.

## 1단계: 견고성 (필수)

- [ ] `GameLoop` 단일 추론 가드: 추론 중이면 프레임 스킵, 겹침 방지.
- [ ] 연속 추론 실패 콜백 `onPoseError`: 30회 연속 실패마다 1회通知, 성공 시 리셋. HUD에 안내.
- [ ] `pause()`/`resume()`: 일시정지 시 `startedAt` 보정, `elapsedSec`·60초 타이머 정지.
- [ ] `storage.ts` 전체 try/catch: 시크릿모드·용량초과에서도 크래시 없음.
- [ ] `openCamera`: `frameRate { ideal:30, max:30 }` 추가, 720p→640 순서 유지.
- [ ] `readiness.ts`: pose task + movenet 둘 다 확인, `modelOk`는 둘 중 하나라도 되면 true. 기존 시그니처 유지.

## 2단계: 배포·PWA 정리

- [ ] `vite.config.ts` 주석 정리: 실제 base `/skeleton-games/` 유지, 폴더명과 repo명이 다른 이유 명시.
- [ ] `docs/DEPLOY.md`·`docs/PREDEPLOY.md`의 base 표기 통일.
- [ ] MediaPipe wasm 로컬 우선 시도: `models/wasm` → CDN 순. wasm 파일 벤더링은 후속 작업으로 문서에 남김.
- [ ] `.gitignore`에 `.DS_Store` 추가.
- [ ] PWA: 아트 이미지는 precache에서 제외하고 runtime 캐시로 (번들 부담 완화). `workbox.globPatterns`에서 `jpg` 제외 또는 `runtimeCaching` 추가.

## 3단계: 코드 공용화

- [ ] `src/game/rng.ts`: `createSeededRng(seed)` (기존 mole LCG와 동일 상수).
- [ ] `src/game/difficulty.ts`: `lerp`, `ramp(start,end,elapsed,duration)`.
- [ ] `src/game/hand-tracker.ts`: `HandTracker` (어깨위 무장 래치 + 하강속도, palm 기반).
- [ ] `MoleWhack`부터 적용, 기존 export 상수·동작 유지. 다른 게임은 점진 적용.
- [ ] `renderer.ts`: 공용 `drawPanelBase()` 추출, 3종 가이드에서 재사용. 함수 시그니처 유지.

## 4단계: UX·접근성

- [ ] 음소거: `feedback.ts`에 `isMuted/setMuted/toggleMuted` (localStorage `skelplay:muted`), 게임 화면에 소리 버튼.
- [ ] 일시정지 버튼: 루프 pause/resume + 오버레이 표시.
- [ ] 연습 모드: 카운트다운 오버레이에 체크박스, 선택 시 `timeLimitSec` 없이 무제한 플레이.
- [ ] 공유 링크 복사 버튼 (clipboard + fallback).
- [ ] `hud-msg`에 `aria-live="polite"`, 모달 Tab 트랩.
- [ ] 다음 단계 펄스(`btn-pulse` 금빛 링, `prefers-reduced-motion` 대응): 다시 도전·2인 대결·게임 시작 CTA에 적용.

## 5단계: 테스트·CI·문서

- [ ] 신규 테스트: `rng`, `difficulty`, `hand-tracker`, `feedback-mute`, `loop pause/single-flight/error`, `storage quota`, `readiness dual-model`.
- [ ] `.github/workflows/ci.yml`: `npm ci` → `tsc --noEmit` → `vitest run` → `vite build`.
- [ ] `docs/UPDATELOG.md`·`CHANGELOG.md`에 2026-11-09 항목 추가 (쉬운 말, 관리자 내용 제외).
- [ ] 이 문서(`docs/IMPROVEMENT-PLAN.md`)를 완료 기준으로 갱신.

## 검증

```bash
npm run build
npx vitest run
npx tsc --noEmit
```

실기기 QA는 `docs/QA-CHECKLIST.md` 항목으로 별도 수행.
