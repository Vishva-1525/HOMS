import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: [
        'pwa-icon-192.png',
        'pwa-icon-512.png',
        'favicon.svg',
      ],
      manifest: {
        name: 'HOMS — SVCE Hostel Outpass',
        short_name: 'HOMS',
        description: 'Hostel Outpass Management System for Sri Venkateswara College of Engineering',
        theme_color: '#1A5CA0',
        background_color: '#F5F7FA',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/pwa-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/pwa-screenshot-mobile.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'HOMS mobile — student outpass dashboard',
          },
          {
            src: '/pwa-screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'HOMS desktop — warden approval workflow',
          },
        ],
      },
      injectManifest: {
        // Keep precache lean — large screenshots/campus photo stay network-first.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}', 'pwa-icon-*.png'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) {
            return 'vendor-react'
          }
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('lucide-react') || id.includes('@tabler/icons-react')) {
            return 'vendor-icons'
          }
          if (id.includes('xlsx') || id.includes('jspdf')) return 'vendor-export'
          if (id.includes('@zxing') || id.includes('qrcode')) return 'vendor-scan'
        },
      },
    },
  },
})
