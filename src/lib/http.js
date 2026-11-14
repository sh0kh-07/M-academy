/*
  Shared bits for talking to the backend, used by both the site and the admin panel.

  API_BASE  — VITE_API_URL, or /api on the same origin (Vite proxies /api and /uploads
              in dev and preview; in production the web server should do the same).
  mediaUrl  — turns a stored file path ("/uploads/images/….webp") into a URL.
  pick      — reads a { uz, ru, en } field in the visitor's language.
*/

export const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

// uploaded files live at the backend's root (/uploads/…), not under /api
const MEDIA_ORIGIN = /^https?:\/\//.test(API_BASE) ? new URL(API_BASE).origin : '';

export function mediaUrl(path) {
  if (!path) return '';
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return MEDIA_ORIGIN + (path.startsWith('/') ? path : `/${path}`);
}

/** A multilingual field in `lang`, falling back to Uzbek, then to any language that has text. */
export function pick(value, lang) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  return value[lang] || value.uz || value.ru || value.en || '';
}

/** A course category's label: `name` per the API docs (older answers may say `title`). */
export const catLabel = (cat) => cat?.name ?? cat?.title ?? null;

/** "?a=1&b=x" from an object, skipping empty values. */
export function query(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Public GET (no token). Throws an Error with .status on a non-2xx answer. */
export async function getJSON(path, { signal } = {}) {
  const res = await fetch(API_BASE + path, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Public POST (no token). Throws an Error with .status and .messages (the server's
 * validation messages) on a non-2xx answer.
 */
export async function postJSON(path, body, { keepalive = false } = {}) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    keepalive,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const raw = data && typeof data === 'object' ? data.message : null;
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.messages = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String);
    throw err;
  }
  return data;
}

/** List endpoints answer { records, pagination }; a few answer a bare array. */
export const records = (data) => (Array.isArray(data) ? data : (data?.records ?? []));
