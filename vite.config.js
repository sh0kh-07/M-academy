import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: false, host: true },
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
