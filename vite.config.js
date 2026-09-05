import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: './', // <--- C'EST LA LIGNE MAGIQUE !
  server: {
    port: 1420,
    strictPort: true,
  }
});