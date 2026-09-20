# 배포 가이드 (정적 호스팅, 서버 없음)

## 공통

```bash
npm install
npm run build   # dist/ 생성
```

`dist/` 통째로 업로드. 환경변수 없음. HTTPS 필수 (카메라·PWA).

## GitHub Pages

`vite.config.ts`에 `base: '/<repo>/'` 추가 후 build, `dist/`를 `gh-pages` 브랜치에 푸시.

## Cloudflare Pages

빌드 명령 `npm run build`, 출력 디렉토리 `dist`, 프레임워크 프리셋 Vite.

## 학교 인트라넷

`dist/`를 내부 웹서버에 복사. 최초 모델 로드만 외부 CDN 필요:
- `@mediapipe/tasks-vision` wasm (jsdelivr)
- pose_landmarker_lite.task (googleapis)
이후 Service Worker가 캐시. 완전 오프라인이 필요하면 위 파일을 내부 경로에 두고 어댑터 URL 교체.
