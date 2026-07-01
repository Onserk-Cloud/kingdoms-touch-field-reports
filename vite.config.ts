import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Inject CSS via JS instead of a render-blocking <link>, so the static
    // paint shell renders instantly (matters most over real/slow networks).
    cssInjectedByJsPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register ourselves in main.tsx (virtual:pwa-register) so the app
      // can poll for updates and reload itself — users never reinstall.
      injectRegister: false,
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Kingdoms Touch',
        short_name: 'Kingdoms Touch',
        description:
          'Capture photos, GPS and completion reports in the field. Works offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Allow rotation — the UI adapts to landscape (PhoneFrame letterboxes a
        // phone-width column). iOS ignores this for installed PWAs anyway.
        orientation: 'any',
        background_color: '#1F3D2B',
        theme_color: '#1F3D2B',
        lang: 'en',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'New Report',
            short_name: 'New',
            description: 'Start a new job completion report',
            url: '/new-report',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'My Reports',
            short_name: 'Reports',
            description: 'View your submitted reports',
            url: '/my-reports',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Pull in our push/notification-click handlers on top of the
        // Workbox-generated SW (keeps precache + runtime caching intact).
        importScripts: ['push-sw.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
        // Precache ALL emitted chunks (incl. react/supabase/pdf, which are
        // eagerly modulepreloaded from index.html anyway). This keeps the
        // service worker self-consistent: after a deploy the new SW's precache
        // holds a matching hash for every chunk the new index references, so a
        // returning client never requests a now-deleted chunk over the network
        // (which returned the SPA fallback → blank screen). Updates are atomic.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /supabase\.co\/.*\/rest\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          pdf: ['jspdf'],
        },
      },
    },
  },
});
