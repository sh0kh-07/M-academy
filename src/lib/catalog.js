import { useEffect, useState } from 'react';
import { CATS, COURSES } from '../data/courses.js';
import { catLabel, getJSON, records } from './http.js';

/*
  The course catalogue the site shows, from the backend:
    GET /api/courses            active courses (sort_order), all three languages
    GET /api/course-categories  active categories (sort_order)

  Until the first course is published there — or when the API can't be reached —
  the built-in list in data/courses.js stands in, so the site is never empty.
  As soon as the backend has one active course, the site shows only backend courses.

  course:   { id, slug, glyph, title: {uz,ru,en}, cat, image, lessons, live }
            live = from the backend, so it has its own page at /courses/:slug
  category: { key, title: {uz,ru,en} | null }  (null → the site's own label, courses.<key>)
*/

export const FALLBACK = {
  live: false,
  cats: Object.keys(CATS).map((key) => ({ key, title: null })),
  courses: COURSES.map((c) => ({
    id: c.slug,
    slug: c.slug,
    glyph: c.g,
    title: { uz: c.uz, ru: c.ru, en: c.en },
    cat: c.cat,
    catTitle: CATS[c.cat],
    image: '',
    lessons: 0,
    live: false,
  })),
};

let cached = null;
let pending = null;

function fromApi(list, categories) {
  const rows = records(list);
  if (!rows.length) return FALLBACK;

  const cats = records(categories).map((c) => ({ key: c.id, title: catLabel(c) }));
  const courses = rows.map((c) => {
    const cat = c.category_id ?? c.category?.id ?? null;
    // a course may sit in a category the public list leaves out: take it from the course
    if (cat && c.category && !cats.some((x) => x.key === cat)) cats.push({ key: cat, title: catLabel(c.category) });
    return {
      id: c.id,
      slug: c.slug || c.id,
      glyph: c.symbol || '',
      title: c.title,
      cat,
      catTitle: catLabel(c.category) ?? cats.find((x) => x.key === cat)?.title ?? null,
      image: c.image || '',
      lessons: c.lessons_count ?? 0,
      live: true,
    };
  });
  return { live: true, cats: cats.filter((x) => courses.some((c) => c.cat === x.key)), courses };
}

/** Fetch once per page load; later calls get the same promise / result. */
export function loadCatalog() {
  if (cached) return Promise.resolve(cached);
  pending ??= Promise.all([getJSON('/courses?limit=100'), getJSON('/course-categories').catch(() => [])])
    .then(([list, categories]) => fromApi(list, categories))
    .catch(() => FALLBACK)
    .then((data) => {
      cached = data;
      pending = null;
      return data;
    });
  return pending;
}

/** The catalogue, or null while it is loading (instant when it was prefetched). */
export function useCatalog() {
  const [data, setData] = useState(cached);
  useEffect(() => {
    if (data) return undefined;
    let alive = true;
    loadCatalog().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [data]);
  return data;
}

/** Where a course card leads: its own page when it comes from the backend, else straight to sign-up. */
export const courseHref = (course) => (course.live ? `/courses/${course.slug}` : `/register?course=${course.slug}`);
