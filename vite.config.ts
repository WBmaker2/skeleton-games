import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages (project site) 기준. 저장소명이 다르면 '/<repo>/'로 교체 후 재빌드.
  // Cloudflare Pages·인트라넷 등 루트 호스팅 시에는 '/'로 되돌릴 것.
  base: '/skeleton-idea/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // pose engines (tfjs/mediapipe) push the bundle past
      // workbox's 2 MiB default precache limit — raise it.
      workbox: { maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 },
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
