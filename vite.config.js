import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is a single-page React app with client-side routes (/courses, /news/…, /admin),
// so the hosting must serve index.html for unknown paths (SPA fallback).

// Backend (NestJS, docs at /api/docs). In dev and preview the app calls /api on its own
// origin and Vite forwards it there, so CORS and the refresh-token cookie just work.
// To point at another backend: API_TARGET=https://… npm run dev
const API_TARGET = process.env.API_TARGET || 'https://dev.m-academy.uz';

const forward = {
  target: API_TARGET,
  changeOrigin: true,
  cookieDomainRewrite: '', // keep the backend's cookie on localhost
  // the browser sees a same-origin request; don't let the backend's CORS check see localhost
  configure: (p) => p.on('proxyReq', (req) => req.removeHeader('origin')),
};
// /uploads = images and videos uploaded through the admin panel
const proxy = { '/api': forward, '/uploads': forward };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: false, host: true, proxy },
  preview: { proxy },
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
