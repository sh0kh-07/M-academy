import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is a single-page React app with client-side routes (/courses, /news/…),
// so the hosting must serve index.html for unknown paths (SPA fallback).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: false, host: true },
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
