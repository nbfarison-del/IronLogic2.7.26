import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'IronLogic HQ',
        short_name: 'IronLogic HQ',
        description: 'Train Smarter, Perform Stronger with AI-powered coaching.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@firebase') || id.includes('node_modules/firebase')) return 'firebase';
          if (
            id.includes('recharts') ||
            id.includes('victory-vendor') ||
            id.includes('/d3-') ||
            id.includes('internmap')
          ) {
            return 'charts';
          }
          if (id.includes('@google/generative-ai')) return 'ai';
          if (id.includes('react-is') || id.includes('react-markdown')) return 'vendor';
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/scheduler') ||
            id.includes('react-router') ||
            id.includes('@remix-run') ||
            id.includes('use-sync-external-store') ||
            id.includes('node_modules/cookie/') ||
            id.includes('set-cookie-parser')
          ) {
            return 'react';
          }
          return 'vendor';
        }
      }
    }
  },
})
