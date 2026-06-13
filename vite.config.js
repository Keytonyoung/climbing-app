import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/climbing-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Western Slope Climbing',
        short_name: 'Climbing',
        description: 'Rock climbing routes for Colorado\'s Western Slope',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/climbing-app/',
        start_url: '/climbing-app/',
        icons: [
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icon-192.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
})
