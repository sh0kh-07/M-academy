import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

/** Every page of the site. Add a file name here when you add a new page. */
const pages = ['index', 'about', 'courses', 'results', 'nigina', 'register'];

/**
 * Shared markup (head, nav, footer…) lives in /partials and is pulled into
 * each page with an HTML comment:  <!-- @include nav.html -->
 */
function htmlPartials() {
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(/<!--\s*@include\s+([\w./-]+)\s*-->/g, (_, file) =>
          readFileSync(resolve(root, 'partials', file), 'utf8'),
        ),
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [htmlPartials()],
  server: { port: 5173, strictPort: false, host: true },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: Object.fromEntries(pages.map((name) => [name, resolve(root, `${name}.html`)])),
    },
  },
});
