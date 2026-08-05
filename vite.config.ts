import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const isPortable = process.env.VITE_PORTABLE === '1'

export default defineConfig({
  base: isPortable ? './' : '/',
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
        id: isPortable ? './' : '/',
        name: 'HOMS — SVCE Hostel Outpass',
        short_name: 'HOMS',
        description: 'Hostel Outpass Management System for Sri Venkateswara College of Engineering',
        theme_color: '#1A5CA0',
        background_color: '#F5F7FA',
        display: 'standalone',
        orientation: 'portrait',
        scope: isPortable ? './' : '/',
        start_url: isPortable ? './' : '/',
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
        // Keep precache lean — never precache index.html (stale HTML → blank page after deploys).
        globPatterns: ['**/*.{js,css,ico,svg,woff2}', 'pwa-icon-*.png'],
        globIgnores: ['**/index.html'],
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
    target: isPortable ? 'es2020' : 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    // Avoid manualChunks — they merged Vite's preload helper into the xlsx/jspdf
    // chunk and caused "Cannot access before initialization" on boot for some users.
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps) => {
        if (/assets\/index-/.test(filename)) return []
        return deps
      },
    },
  },
})
