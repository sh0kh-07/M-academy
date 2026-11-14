import { useEffect, useState } from 'react';
import { api } from './api.js';
import { getJSON, query, records } from '../lib/http.js';

/*
  Admin endpoints for courses and their lessons (Swagger section "Admin · Kurslar").
  Multilingual fields are { uz, ru, en }; pass lang to get plain strings instead.
*/

export const LANG_KEYS = ['uz', 'ru', 'en'];

export const courses = {
  /** { records, pagination } — every course, active or not, with lessons/students/leads/teachers counts */
  list: ({ lang, page = 1, limit = 20, search, is_active, category_id } = {}, signal) =>
    api(`/admin/courses${query({ lang, page, limit, search, is_active, category_id })}`, { signal }),
  /** one course with its lessons and teachers (all languages) */
  get: (id, signal) => api(`/admin/courses/${encodeURIComponent(id)}`, { signal }),
  create: (body) => api('/admin/courses', { method: 'POST', body }),
  update: (id, body) => api(`/admin/courses/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/courses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const lessons = {
  list: (courseId, signal) => api(`/admin/courses/${encodeURIComponent(courseId)}/lessons`, { signal }).then(records),
  create: (courseId, body) => api(`/admin/courses/${encodeURIComponent(courseId)}/lessons`, { method: 'POST', body }),
  update: (id, body) => api(`/admin/lessons/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/lessons/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/**
 * Course categories for the pickers. The admin list (with inactive ones) when the role
 * allows it, otherwise the public list of active categories.
 */
export async function categories(signal) {
  try {
    return byOrder(records(await api('/admin/course-categories', { signal })));
  } catch (err) {
    if (signal?.aborted) throw err;
    return byOrder(records(await getJSON('/course-categories', { signal })));
  }
}

const byOrder = (list) => [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

/** Course categories (Swagger "Admin · Kurs kategoriyalari"). `name` is { uz, ru, en }, all three required. */
export const courseCategories = {
  /** every category, active or not, each with courses_count */
  list: (signal) => api('/admin/course-categories', { signal }).then((d) => byOrder(records(d))),
  create: (body) => api('/admin/course-categories', { method: 'POST', body }),
  update: (id, body) => api(`/admin/course-categories/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/course-categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/** Teachers (Swagger "Admin · Ustozlar"). course_ids in a PATCH replaces the teacher's courses entirely. */
export const teachers = {
  /** { records, pagination }; each teacher comes with the courses it is linked to */
  list: ({ lang, page = 1, limit = 20, search, is_active, course_id } = {}, signal) =>
    api(`/admin/teachers${query({ lang, page, limit, search, is_active, course_id })}`, { signal }),
  /** one teacher, all three languages */
  get: (id, signal) => api(`/admin/teachers/${encodeURIComponent(id)}`, { signal }),
  create: (body) => api('/admin/teachers', { method: 'POST', body }),
  update: (id, body) => api(`/admin/teachers/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/** Every course (up to 100) with titles in `lang`, for pickers and filters. */
export const courseOptions = (lang, signal) =>
  courses.list({ lang, limit: 100 }, signal).then((d) => byOrder(records(d)));

/** A teacher's linked course ids, whichever way the API spells them. */
export const teacherCourseIds = (p) =>
  (p?.course_ids ?? p?.courses?.map((c) => c.id ?? c.course_id) ?? []).filter(Boolean);

/** News (Swagger "Admin · Yangiliklar"). title / excerpt / content are { uz, ru, en }, all required. */
export const news = {
  /** { records, pagination }, drafts included */
  list: ({ lang, page = 1, limit = 20, search, is_published, category_id } = {}, signal) =>
    api(`/admin/news${query({ lang, page, limit, search, is_published, category_id })}`, { signal }),
  /** one post with its full text, all three languages */
  get: (id, signal) => api(`/admin/news/${encodeURIComponent(id)}`, { signal }),
  create: (body) => api('/admin/news', { method: 'POST', body }),
  update: (id, body) => api(`/admin/news/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/news/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/** News categories: { name: { uz, ru, en }, slug, sort_order }, each listed with news_count. */
export const newsCategories = {
  list: (signal) => api('/admin/news-categories', { signal }).then((d) => byOrder(records(d))),
  create: (body) => api('/admin/news-categories', { method: 'POST', body }),
  update: (id, body) => api(`/admin/news-categories/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/news-categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/* ---------------- leads ---------------- */

/** Lead stages; a converted lead leaves this list and becomes a student. */
export const LEAD_STATUSES = ['new', 'contacted', 'rejected'];

/** Leads (Swagger "Admin · Lidlar"): applications from the site and ones added by hand. */
export const leads = {
  /** { records, pagination }, newest first; from / to are YYYY-MM-DD (Tashkent time) */
  list: ({ lang, page = 1, limit = 20, search, region, course_id, from, to, status } = {}, signal) =>
    api(`/admin/leads${query({ lang, page, limit, search, region, course_id, from, to, status })}`, { signal }),
  get: (id, signal) => api(`/admin/leads/${encodeURIComponent(id)}`, { signal }),
  /** { full_name, age, phone: '+998XXXXXXXXX', region, course_id? } */
  create: (body) => api('/admin/leads', { method: 'POST', body }),
  /** any of full_name, age, phone, region, course_id, status, admin_note */
  update: (id, body) => api(`/admin/leads/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/leads/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  /** make the lead a student, enrolled in these courses */
  convert: (id, courseIds) => api(`/admin/leads/${encodeURIComponent(id)}/convert`, { method: 'POST', body: { course_ids: courseIds } }),
};

/** Tell the sidebar badge and the dashboard that leads changed. */
export const leadsChanged = () => window.dispatchEvent(new Event('adm:leads-changed'));

/** How many new leads are waiting; refreshed every minute and whenever leads change. */
export function useNewLeads() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      leads
        .list({ status: 'new', limit: 1 })
        .then((d) => alive && setCount(d?.pagination?.total_count ?? records(d).length))
        .catch(() => {});
    load();
    const id = setInterval(() => !document.hidden && load(), 60000);
    window.addEventListener('adm:leads-changed', load);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener('adm:leads-changed', load);
    };
  }, []);
  return count;
}

/* ---------------- students ---------------- */

/** A student's state in one course; only "active" counts as studying now in the statistics. */
export const ENROLL_STATUSES = ['active', 'finished', 'left'];

/** Students (Swagger "Admin · Studentlar"): converted leads and ones added directly. */
export const students = {
  /** { records, pagination }; enrollment_status works together with course_id; from / to = date they became a student */
  list: ({ lang, page = 1, limit = 20, search, region, course_id, enrollment_status, from, to } = {}, signal) =>
    api(`/admin/students${query({ lang, page, limit, search, region, course_id, enrollment_status, from, to })}`, { signal }),
  /** one student with their courses and the course they first asked about */
  get: (id, signal) => api(`/admin/students/${encodeURIComponent(id)}`, { signal }),
  /** { full_name, age, phone, region, course_ids, admin_note? } */
  create: (body) => api('/admin/students', { method: 'POST', body }),
  /** full_name, age, phone, region, admin_note — courses have their own endpoints */
  update: (id, body) => api(`/admin/students/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/students/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  /** the final list of courses: new ones are added, missing ones dropped, the rest keep status and date */
  setCourses: (id, courseIds) =>
    api(`/admin/students/${encodeURIComponent(id)}/courses`, { method: 'PUT', body: { course_ids: courseIds } }),
  /** active | finished | left in one course */
  setCourseStatus: (id, courseId, status) =>
    api(`/admin/students/${encodeURIComponent(id)}/courses/${encodeURIComponent(courseId)}`, { method: 'PATCH', body: { status } }),
  /** undo a mistaken conversion: back to the leads as "contacted", courses dropped */
  revert: (id) => api(`/admin/students/${encodeURIComponent(id)}/revert-to-lead`, { method: 'POST' }),
};

/** A student's courses as [{ id, title, status, enrolled_at }], whichever way the API nests them. */
export const enrollmentsOf = (student) =>
  (Array.isArray(student?.courses) ? student.courses : []).map((c) => ({
    id: c.course_id ?? c.course?.id ?? c.id,
    title: c.course?.title ?? c.title,
    symbol: c.course?.symbol ?? c.symbol,
    status: c.status ?? c.enrollment_status ?? 'active',
    enrolled_at: c.enrolled_at ?? c.created_at ?? null,
  }));

let regionList = null;
/** Uzbekistan's regions for the lead forms: [{ key: 'toshkent_sh', name: { uz, ru, en } }] (public, cached). */
export function regions(signal) {
  regionList ??= getJSON('/regions', { signal })
    .then(records)
    .catch((err) => {
      regionList = null;
      throw err;
    });
  return regionList;
}

/** "90 123 45 67", "+998901234567", "998 90 123-45-67" → "+998901234567" (or null if it isn't a UZ mobile). */
export function normalizePhone(value = '') {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}

/** "+998901234567" → "+998 90 123 45 67" */
export function formatPhone(value = '') {
  const m = String(value).replace(/\D/g, '').match(/^998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : value;
}

/** URL-friendly slug from a title: "Ingliz tili" → "ingliz-tili", "O‘zbek tili" → "ozbek-tili". */
export function slugify(text = '') {
  return text
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Only the keys whose values differ (deep-compared as JSON) — PATCH changes just what it gets. */
export function changes(before, after) {
  const out = {};
  Object.keys(after).forEach((key) => {
    if (JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after[key] ?? null)) out[key] = after[key];
  });
  return out;
}

/* ---------------- music ---------------- */

/**
 * Site background music (Swagger "Admin · Musiqa"). Upload the audio with
 * upload('audio', file) and the cover with upload('image', file), then send the paths.
 * The site plays the active tracks in sort_order.
 */
export const music = {
  list: (signal) => api('/admin/music', { signal }).then((d) => byOrder(records(d))),
  get: (id, signal) => api(`/admin/music/${encodeURIComponent(id)}`, { signal }),
  /** { title, artist?, file, cover?, duration_seconds?, sort_order?, is_active? } */
  create: (body) => api('/admin/music', { method: 'POST', body }),
  /** only the fields sent change; replacing file / cover deletes the old one on the server */
  update: (id, body) => api(`/admin/music/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  /** deletes the track and its audio / cover files */
  remove: (id) => api(`/admin/music/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
