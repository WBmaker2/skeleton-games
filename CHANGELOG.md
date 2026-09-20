# Changelog

## 0.3.0 (2026-09-20) — 카메라 전용 + 게임 화면 디자인

- 카메라 전용 플레이: 키보드·포인터 폴백 제거 (FallbackEngine 삭제)
- 게임 화면 카메라 선택 드롭다운 (선택 localStorage 저장)
- 카메라 미인식 시 안내 + “카메라 다시 찾기” 버튼
- 추론 30fps 스로틀 (디스플레이 주사율과 무관)
- 게임 화면 디자인: 점수판 칩·스테이지 프레임·오버레이 (랜딩과 동일 앵커)
- 랜딩: 게임 선택 카드 + 아트 프레임

## 0.2.1 (2026-09-19) — 배포 준비

- 키보드 완주 통합테스트 (4종 완주를 CI에서 증명)
- GitHub Pages base `/skeleton-idea/` 적용, dist/PWA 감사 기록 (docs/PREDEPLOY.md)
- PWA 아이콘 실측 확인 (PNG 192/512), SW precache 2.5MB

## 0.2.0 (2026-09-19) — 플레이 가능

- 플레이 루프: rAF·dt클램프·fps 저하 시 15fps 스킵·HUD
- 폴백: 키보드(WASD/방향키/스페이스)·포인터 합성 엔진
- 보정: T자세 3초 + 스킵 시 seated 기본값, 과일 반경 스케일·ABC 모드 보관
- 카메라: 720p→480p 폴백 체인, facingMode user
- MediaPipe canonical 네이밍 매핑으로 ABC 하이브리드 연결
- 문서: README·DEPLOY·QA-CHECKLIST·CHANGELOG

## 0.1.0 — 프로토타입

- 4종 게임 로직 + MoveNet/MediaPipe 어댑터 + 단위테스트 29개
