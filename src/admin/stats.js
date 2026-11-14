import { api } from './api.js';
import { pick, query } from '../lib/http.js';

/*
  Statistics (Swagger "Admin · Statistika"). Only /overview has a documented example; the rest
  are described in words, so every reader below accepts the likely spellings of a field and
  falls back to 0 / empty — an unrecognised block is hidden rather than breaking the page.
  All dates and hours are Asia/Tashkent on the server side.
*/

export const statistics = {
  dashboard: (lang, signal) => api(`/admin/statistics/dashboard${query({ lang })}`, { signal }),
  overview: (signal) => api('/admin/statistics/overview', { signal }),
  courses: (lang, signal) => api(`/admin/statistics/courses${query({ lang })}`, { signal }),
  leads: ({ lang, from, to, group_by }, signal) => api(`/admin/statistics/leads${query({ lang, from, to, group_by })}`, { signal }),
  students: ({ lang, from, to, group_by }, signal) =>
    api(`/admin/statistics/students${query({ lang, from, to, group_by })}`, { signal }),
  visits: ({ lang, from, to, group_by }, signal) => api(`/admin/statistics/visits${query({ lang, from, to, group_by })}`, { signal }),
};

export const list = (v) => (Array.isArray(v) ? v : Array.isArray(v?.records) ? v.records : []);

/** The first of `keys` that holds a number. */
export function num(o, keys, fallback = 0) {
  for (const k of keys) {
    const v = o?.[k];
    if (v != null && v !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return fallback;
}

/** The first of `keys` that holds something. */
export function str(o, keys) {
  for (const k of keys) if (o?.[k] != null && o[k] !== '') return o[k];
  return null;
}

const DATE_KEYS = ['date', 'day', 'period', 'bucket', 'week', 'month', 'start', 'from', 'label', 'key'];
export const dateOf = (p) => String(str(p, DATE_KEYS) ?? '');

/** A time series → [{ label, ...fields }] where fields = { name: [possible keys] }. */
export function series(arr, fields) {
  return list(arr).map((p) => {
    const row = { label: dateOf(p) };
    Object.entries(fields).forEach(([name, keys]) => (row[name] = num(p, keys)));
    return row;
  });
}

/* ---------- weekdays & hours ---------- */

/** 0 = Monday … 6 = Sunday, from a number (Postgres DOW 0=Sun or ISO 1=Mon…7=Sun — they agree on 1–6) or a name. */
export function dayIndex(raw) {
  if (raw == null) return -1;
  if (typeof raw === 'string' && !/^\d+$/.test(raw)) {
    const s = raw.toLowerCase();
    const names = [
      ['mon', 'du', 'пон', 'пн'],
      ['tue', 'se', 'вт'],
      ['wed', 'chor', 'ср'],
      ['thu', 'pay', 'чт', 'чет'],
      ['fri', 'jum', 'ju', 'пт', 'пят'],
      ['sat', 'shan', 'sh', 'сб', 'суб'],
      ['sun', 'yak', 'вс', 'вос'],
    ];
    return names.findIndex((group) => group.some((n) => s.startsWith(n)));
  }
  const n = Number(raw);
  return n === 0 || n === 7 ? 6 : n - 1;
}

const DAY_KEYS = ['weekday', 'day_of_week', 'dow', 'isodow', 'day', 'name', 'label'];
const VALUE_KEYS = ['visits', 'count', 'applications', 'leads', 'students', 'value', 'total'];

export function byHour(arr, valueKeys = VALUE_KEYS) {
  const out = Array(24).fill(0);
  list(arr).forEach((p) => {
    const h = num(p, ['hour', 'h'], -1);
    if (h >= 0 && h < 24) out[h] += num(p, valueKeys);
  });
  return out;
}

export function byWeekday(arr, valueKeys = VALUE_KEYS) {
  const out = Array(7).fill(0);
  list(arr).forEach((p) => {
    const d = dayIndex(str(p, DAY_KEYS));
    if (d >= 0 && d < 7) out[d] += num(p, valueKeys);
  });
  return out;
}

export function heatCells(arr) {
  return list(arr)
    .map((p) => ({ day: dayIndex(str(p, DAY_KEYS)), hour: num(p, ['hour', 'h'], -1), value: num(p, VALUE_KEYS) }))
    .filter((c) => c.day >= 0 && c.hour >= 0);
}

/* ---------- named breakdowns ---------- */

/** [{ key, label, value, share? }] from a breakdown list; `labelOf` turns an item into its name. */
export function breakdown(arr, labelKeys, valueKeys = VALUE_KEYS, lang = 'uz') {
  return list(arr).map((p, i) => {
    const raw = str(p, labelKeys);
    return {
      key: String(str(p, ['id', 'key', 'region', 'path']) ?? i),
      label: raw && typeof raw === 'object' ? pick(raw, lang) : raw != null ? String(raw) : '—',
      value: num(p, valueKeys),
      share: num(p, ['share', 'percent', 'percentage'], null),
      raw: p,
    };
  });
}

/* ---------- the dashboard's last 30 days ---------- */

/**
 * Daily rows { label, leads, students, visits } from `last_30_days`, whether it is one daily list
 * or one list per metric.
 */
export function last30Days(l30) {
  if (!l30) return [];
  const daily = list(l30.daily ?? l30.dynamics ?? l30.days ?? l30.timeline ?? l30.by_day ?? (Array.isArray(l30) ? l30 : null));
  if (daily.length) {
    return daily.map((p) => ({
      label: dateOf(p),
      leads: num(p, ['leads', 'applications', 'leads_count', 'applications_count']),
      students: num(p, ['new_students', 'students', 'converted']),
      visits: num(p, ['visits', 'views', 'visits_count']),
    }));
  }
  const rows = new Map();
  const add = (arr, field, keys) =>
    list(arr).forEach((p) => {
      const d = dateOf(p);
      const row = rows.get(d) ?? { label: d, leads: 0, students: 0, visits: 0 };
      row[field] = num(p, keys);
      rows.set(d, row);
    });
  add(l30.leads ?? l30.applications, 'leads', ['count', 'value', 'leads', 'applications', 'total']);
  add(l30.new_students ?? l30.students, 'students', ['count', 'value', 'new_students', 'students', 'total']);
  add(l30.visits, 'visits', ['count', 'value', 'visits', 'total']);
  return [...rows.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** "2026-11-14" / "2026-11" / ISO → short label for an axis, or a full one for a tooltip. */
export function dateLabel(value, lang, groupBy = 'day', long = false) {
  if (!value) return '';
  const months = {
    uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'],
    ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  }[lang];
  const m = String(value).match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!m) return String(value);
  const [, y, mo, d] = m;
  const month = months[Number(mo) - 1];
  if (groupBy === 'month' || !d) return long ? `${month} ${y}` : month;
  const text = `${Number(d)} ${month}`;
  if (groupBy === 'week' && long) {
    const end = new Date(Number(y), Number(mo) - 1, Number(d) + 6); // weeks start on Monday
    return `${text} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
  }
  return long ? `${text} ${y}` : text;
}
