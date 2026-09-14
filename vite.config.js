import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // <-- C'est cette ligne qu'il faut ajouter
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Planning CPE',
        short_name: 'PlanningCPE',
        description: 'Gestion des plannings et des AED pour la Vie Scolaire',
        theme_color: '#3B82F6',
        background_color: '#0b0f19',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
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