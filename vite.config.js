import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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