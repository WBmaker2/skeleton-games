import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // GitHub Pages (project site) 기준: https://WBmaker2.github.io/skeleton-games/
  // 루트 호스팅 시에는 '/'로 되돌릴 것.
  base: '/skeleton-games/',
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
