/*
  Client for the M.ACADEMY backend (NestJS; Swagger at /api/docs).

  Base URL: VITE_API_URL, or /api on the same origin (Vite proxies it in dev and
  preview; in production the web server should do the same, or set VITE_API_URL
  and ask the backend to allow the site's origin in CORS).

  Session = access token (short-lived, sent as "Authorization: Bearer …") plus a
  refresh token. Refresh tokens are single-use: every refresh returns a new pair,
  and sending a spent one again makes the server assume theft and end ALL of the
  user's sessions. So refreshing is serialised — one at a time inside a tab (a
  shared promise) and across tabs (Web Locks) — and the newest pair is re-read
  from storage right before it is spent.
*/

import { API_BASE as BASE } from '../lib/http.js';

const STORAGE_KEY = 'ma-admin-session';
const LOCK_NAME = 'ma-admin-refresh';
const TIMEOUT_MS = 15000;
const RENEW_BEFORE_MS = 30000; // renew the access token this long before it expires

export class ApiError extends Error {
  /**
   * @param {number} status HTTP status; 0 = no response (network down or timeout)
   * @param {string} message first message from the server, or 'network' / 'timeout'
   */
  constructor(status, message, { messages = [], retryAfter = 0, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages; // the server sends a list for validation errors
    this.retryAfter = retryAfter; // seconds, from the Retry-After header (429)
    this.data = data;
  }
}

/* ---------------- session storage ---------------- */

let session = null; // { access, refresh, received }
const listeners = new Set();

/** Re-read the session from localStorage (another tab may have changed it). */
function load() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return session; // storage blocked: the in-memory copy is all there is
  }
  try {
    session = raw ? JSON.parse(raw) : null;
  } catch {
    session = null;
  }
  return session;
}

function save(next) {
  session = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode: the session lasts until the tab closes */
  }
  listeners.forEach((fn) => fn(session, 'local'));
}

load();
window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY && e.key !== null) return;
  load();
  listeners.forEach((fn) => fn(session, 'tab'));
});

export const hasSession = () => Boolean(session?.access || session?.refresh);

/** fn(session, source) runs whenever the session changes; source is 'local' or 'tab'. */
export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Forget the session on this device without asking the server. */
export const dropSession = () => save(null);

const fromTokens = (data) => ({ access: data.access_token, refresh: data.refresh_token, received: Date.now() });

/** Milliseconds the access token still has, judged by its own lifetime so a wrong clock doesn't matter. */
function timeLeft(s) {
  try {
    const part = s.access.split('.')[1];
    const { exp, iat } = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    if (!exp) return Infinity;
    if (iat && s.received) return (exp - iat) * 1000 - (Date.now() - s.received);
    return exp * 1000 - Date.now();
  } catch {
    return Infinity; // not a JWT we can read: let the server decide
  }
}

/* ---------------- transport ---------------- */

async function send(method, path, { body, token, signal } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort('timeout'), TIMEOUT_MS);
  const cancel = () => ctrl.abort('cancelled');
  signal?.addEventListener('abort', cancel);

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  let text = '';
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include', // lets the server's httpOnly refresh cookie travel too
      signal: ctrl.signal,
    });
    text = await res.text();
  } catch (err) {
    if (signal?.aborted) throw err; // the caller gave up; nothing to report
    throw new ApiError(0, ctrl.signal.reason === 'timeout' ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const raw = data && typeof data === 'object' ? data.message : null;
    const messages = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String);
    throw new ApiError(res.status, messages[0] || `HTTP ${res.status}`, {
      messages,
      retryAfter: Number(res.headers.get('Retry-After')) || 0,
      data,
    });
  }
  return data;
}

/* ---------------- refresh ---------------- */

let renewing = null;

const withLock = (fn) => (navigator.locks?.request ? navigator.locks.request(LOCK_NAME, fn) : fn());

/** Get a new token pair. `spent` is the access token the caller found stale. */
function renew(spent) {
  renewing ??= withLock(async () => {
    const current = load();
    if (!current?.refresh) throw new ApiError(401, 'no-session');
    if (current.access && current.access !== spent) return current; // another tab already renewed it
    try {
      const data = await send('POST', '/auth/refresh', { body: { refresh_token: current.refresh } });
      const next = fromTokens(data);
      save(next);
      return next;
    } catch (err) {
      if (err.status === 401) save(null); // refresh token expired or revoked: the session is over
      throw err;
    }
  }).finally(() => {
    renewing = null;
  });
  return renewing;
}

async function accessToken() {
  const s = session ?? load();
  if (!s?.refresh && !s?.access) throw new ApiError(401, 'no-session');
  if (!s.access || timeLeft(s) < RENEW_BEFORE_MS) return (await renew(s.access)).access;
  return s.access;
}

/* ---------------- public API ---------------- */

/**
 * Call the backend. Signed in by default; a 401 triggers one refresh and one retry
 * (pass retry: false where a 401 can also mean "wrong password").
 */
export async function api(path, { method = 'GET', body, auth = true, retry = true, signal } = {}) {
  if (!auth) return send(method, path, { body, signal });
  const token = await accessToken();
  try {
    return await send(method, path, { body, token, signal });
  } catch (err) {
    if (err.status !== 401 || !retry) throw err;
    const next = await renew(token);
    return send(method, path, { body, token: next.access, signal });
  }
}

/** POST /auth/login → the signed-in user. */
export async function login(username, password) {
  const data = await send('POST', '/auth/login', { body: { username, password } });
  save(fromTokens(data));
  return data.user;
}

/** POST /auth/logout. The local session is dropped even if the server can't be reached. */
export async function logout() {
  try {
    const token = await accessToken();
    await send('POST', '/auth/logout', { token });
  } catch {
    /* already gone on the server, or offline — either way we forget it here */
  }
  save(null);
}

/** GET /auth/me */
export async function me(signal) {
  const data = await api('/auth/me', { signal });
  return data?.user ?? data;
}

/** PATCH /auth/change-password. The server ends every session afterwards, so we do too. */
export async function changePassword(oldPassword, newPassword) {
  await api('/auth/change-password', {
    method: 'PATCH',
    body: { old_password: oldPassword, new_password: newPassword },
    retry: false,
  });
  save(null);
}

/* ---------------- file uploads ---------------- */

function xhrUpload(path, file, token, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BASE + path);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = xhr.responseText;
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
      const raw = data && typeof data === 'object' ? data.message : null;
      const messages = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(String);
      reject(new ApiError(xhr.status, messages[0] || `HTTP ${xhr.status}`, { messages, data }));
    };
    xhr.onerror = () => reject(new ApiError(0, 'network'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    const body = new FormData();
    body.append('file', file);
    xhr.send(body);
  });
}

/**
 * POST /uploads/image, /uploads/video or /uploads/audio (multipart, field "file").
 * Resolves to the stored path, e.g. "/uploads/images/….webp".
 */
export async function upload(kind, file, { onProgress, signal } = {}) {
  const path = `/uploads/${kind}`;
  const token = await accessToken();
  let data;
  try {
    data = await xhrUpload(path, file, token, onProgress, signal);
  } catch (err) {
    if (err.status !== 401) throw err;
    data = await xhrUpload(path, file, (await renew(token)).access, onProgress, signal);
  }
  const stored = typeof data === 'string' ? data : (data?.path ?? data?.url ?? data?.file?.path ?? data?.data?.path);
  if (!stored) throw new ApiError(500, 'Upload answered without a file path', { data });
  return stored;
}
