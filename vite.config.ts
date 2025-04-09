import { fileURLToPath, URL } from "url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Rose Coupon - Ahorra y Compra con Facilidad',
        short_name: 'Rose Coupon',
        description: 'Rose Coupon es una aplicación que te permite ahorrar dinero y comprar con facilidad. Encuentra las mejores ofertas y promociones en tu área.',
        start_url: '/',
        lang: 'es',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#42b883',
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
      "@": fileURLToPath(new URL("./src", import.meta.url)),
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
  }
});
