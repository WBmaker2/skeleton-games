import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages (project site) 기준: https://WBmaker2.github.io/skeleton-games/
  // 로컬 폴더명은 skeleton-idea지만, 배포 repo명은 skeleton-games라서 base는 games로 유지한다.
  // 루트 호스팅 시에는 '/'로 되돌릴 것.
  base: '/skeleton-games/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // pose engines (tfjs/mediapipe) push the bundle past
      // workbox's 2 MiB default precache limit — raise it.
      // Self-hosted pose models (json/bin/task) are precached too,
      // so the games work offline after the first visit.
      // 아트(jpg)·마스크(png)는 precache에서 빼고 런타임 캐시로 둔다:
      // 첫 방문 데이터 부담을 줄이고, 본 게임 이미지만 필요할 때 받는다.
      workbox: {
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        globPatterns: [
          '**/*.{js,css,html,ico,svg,json,bin,task,webmanifest}',
          'icon-192.png',
          'icon-512.png'
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' && url.pathname.includes('/art/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'skelplay-art',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 90 }
            }
          }
        ]
      },
      manifest: {
        name: 'Skeleton Play',
        short_name: 'SkelPlay',
        start_url: '.',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#0b1020',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
});
