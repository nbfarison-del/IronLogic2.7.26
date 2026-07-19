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
        manualChunks: {
          'firebase': ['firebase/firestore', 'firebase/app'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'recharts': ['recharts'],
          'react-markdown': ['react-markdown', 'remark-gfm'],
          'gemini': ['@google/generative-ai']
        }
      }
    }
  },
})
