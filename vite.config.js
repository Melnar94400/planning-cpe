import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/planning-cpe/', //
  plugins: [
    react(),
    tailwindcss(),
VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Planning CPE',
        short_name: 'PlanningCPE',
        description: 'Gestion des plannings et des AED pour la Vie Scolaire',
        theme_color: '#3B82F6',
        background_color: '#0b0f19',
        display: 'standalone',
        scope: '/planning-cpe/',
        start_url: '/planning-cpe/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: '/planning-cpe/', // <--- C'EST LA LIGNE MAGIQUE !
  build: {
    assetsDir: 'assets', // Assure que tous les assets vont dans ce dossier
  },
  server: {
    port: 1420,
    strictPort: true,
  }
});