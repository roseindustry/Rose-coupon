import { fileURLToPath, URL } from "url";
import path from 'path';

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { VitePWA } from 'vite-plugin-pwa';

/// <reference types="vitest" />

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: 'https://app.rosecoupon.com/',
        name: 'Rose Coupon - Ahorra y Compra con Facilidad',
        short_name: 'Rose Coupon',
        description: 'Rose Coupon es una aplicación que te permite ahorrar dinero y comprar con facilidad. Encuentra las mejores ofertas y promociones en tu área.',
        start_url: '/',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#29122f',
        categories: ['shopping', 'finance', 'coupons', 'deals', 'discount', 'cashback', 'rebates', 'savings', 'promotions', 'offers'],
        prefer_related_applications: false,
        iarc_rating_id: '13+',
        launch_handler: {
          client_mode: 'navigate-existing'
        },
        icons: [
          {
            src: 'assets/img/icon/roseapp-icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'assets/img/icon/playstore.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        screenshots: [
          {
            src: 'assets/img/screenshots/portal-clientes.png',
            sizes: '326x690',
            type: 'image/png'
          },
          {
            src: 'assets/img/screenshots/comercios-afiliados.png',
            sizes: '326x690',
            type: 'image/png'
          },
          {
            src: 'assets/img/screenshots/cupones.png',
            sizes: '326x690',
            type: 'image/png'
          },
          {
            src: 'assets/img/screenshots/preferencias.png',
            sizes: '326x690',
            type: 'image/png'
          },
          {
            src: 'assets/img/screenshots/panel-credito.png',
            sizes: '326x690',
            type: 'image/png'
          },
          {
            src: 'assets/img/screenshots/sistema-puntos.png',
            sizes: '326x690',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        cacheId: `rose-coupon-cache-${new Date().getTime()}`,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
            handler: 'StaleWhileRevalidate', // Cache busting strategy
            options: {
              cacheName: 'assets-cache',  // Custom cache name
              expiration: {
                maxEntries: 50,  // Limit entries in the cache
                maxAgeSeconds: 60 * 60 * 24 * 1,  // Cache for 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],  // Cache only successful requests
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst', // For images, serve from cache first
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,  // Limit entries for images
                maxAgeSeconds: 60 * 60 * 24 * 7,  // Cache for 7 days
              },
            },
          },
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Set the limit to 5 MB
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['vue-demi']
  },
  server: {
    host: '0.0.0.0', // Listen on all local IPs
    watch: {
      usePolling: true, // Use polling to detect file changes (helpful for network file systems)
    },
  },
  test: {
    globals: true,
    ui: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/**/*.d.ts',
        'src/**/*.test.{js,ts,jsx,tsx}',
        'src/**/*.spec.{js,ts,jsx,tsx}',
      ],
    },
  }
});
