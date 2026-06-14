import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/climbing-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // The bundled route seed pushes the main JS chunk past Workbox's 2 MiB
        // default precache cap. Raise it so the app shell still precaches for
        // offline. (Long-term fix: move routes to the backend — see the plan.)
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Cache OpenFreeMap tiles, glyphs, sprites, and the style JSON so a
        // downloaded area (and anything viewed online) renders offline.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'openfreemap-tiles',
              expiration: { maxEntries: 6000, maxAgeSeconds: 60 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Western Slope Climbing',
        short_name: 'Climbing',
        description: 'Rock climbing routes for Colorado\'s Western Slope',
        theme_color: '#3a4a5a',
        background_color: '#1c2530',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/climbing-app/',
        start_url: '/climbing-app/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
