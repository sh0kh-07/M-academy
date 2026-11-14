import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import gsap from 'gsap';
import App from './App.jsx';
import { I18nProvider } from './i18n/index.jsx';
import { startSmoothScroll } from './lib/scroll.js';
import { loadCatalog } from './lib/catalog.js';
import { loadFeed } from './lib/newsFeed.js';
import './styles.css';

if (import.meta.env.DEV) window.__gsap = gsap; // dev only: lets tests fast-forward animations

startSmoothScroll();
// courses and news from the API, fetched while the page boots
if (!location.pathname.startsWith('/admin')) {
  loadCatalog();
  loadFeed();
}

createRoot(document.getElementById('root')).render(
  <I18nProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </I18nProvider>,
);
