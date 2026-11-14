import { useEffect, useState } from 'react';
import { NEWS, NEWS_CATS } from '../data/news.js';
import { catLabel, getJSON, records } from './http.js';

/*
  The news the site shows, from the backend:
    GET /api/news?limit=100      published posts, newest first (no full text)
    GET /api/news-categories     the filter buttons
    GET /api/news/:slug          one post: full text, reading_minutes, views (+1 per request), others

  Until the first post is published there — or when the API can't be reached — the sample
  posts in data/news.js stand in. As soon as one post is published, only real posts show.

  post: { id, slug, live, cat, catTitle: {uz,ru,en}|null, date, title, excerpt, body, image,
          glyph, sample, minutes, views }   (title / excerpt / body are { uz, ru, en })
  category: { key, title: {uz,ru,en}|null }  (null → the site's own label, news.cat.<key>)
*/

const fromStatic = (p) => ({
  id: p.slug,
  slug: p.slug,
  live: false,
  cat: p.cat,
  catTitle: null,
  date: p.date,
  title: { uz: p.uz.title, ru: p.ru.title, en: p.en.title },
  excerpt: { uz: p.uz.excerpt, ru: p.ru.excerpt, en: p.en.excerpt },
  body: { uz: p.uz.body, ru: p.ru.body, en: p.en.body },
  image: '',
  glyph: p.glyph,
  sample: Boolean(p.sample),
  minutes: null,
  views: null,
});

export const STATIC_FEED = (() => {
  const posts = [...NEWS].sort((a, b) => b.date.localeCompare(a.date)).map(fromStatic);
  return {
    live: false,
    posts,
    cats: NEWS_CATS.filter((key) => posts.some((p) => p.cat === key)).map((key) => ({ key, title: null })),
  };
})();

/** API post → the shape above. `titleOf(id)` finds a category's label when the post only has its id. */
function fromApi(n, titleOf = () => null) {
  const cat = n.category_id ?? n.category?.id ?? null;
  return {
    id: n.id,
    slug: n.slug || n.id,
    live: true,
    cat,
    catTitle: catLabel(n.category) ?? (cat ? titleOf(cat) : null),
    date: n.published_at ?? n.created_at ?? '',
    title: n.title,
    excerpt: n.excerpt,
    body: n.content ?? null,
    image: n.image || '',
    glyph: 'M',
    sample: false,
    minutes: n.reading_minutes ?? null,
    views: n.views ?? n.views_count ?? null,
  };
}

let cached = null;
let pending = null;

/** Fetch the feed once per page load; later calls share the promise / result. */
export function loadFeed() {
  if (cached) return Promise.resolve(cached);
  pending ??= Promise.all([getJSON('/news?limit=100'), getJSON('/news-categories').catch(() => [])])
    .then(([list, categories]) => {
      const rows = records(list);
      if (!rows.length) return STATIC_FEED;
      const cats = records(categories).map((c) => ({ key: c.id, title: catLabel(c) }));
      const titleOf = (id) => cats.find((c) => c.key === id)?.title ?? null;
      const posts = rows.map((n) => fromApi(n, titleOf));
      // a post may sit in a category the list leaves out: take it from the post
      posts.forEach((p) => p.cat && !cats.some((c) => c.key === p.cat) && p.catTitle && cats.push({ key: p.cat, title: p.catTitle }));
      return { live: true, posts, cats: cats.filter((c) => posts.some((p) => p.cat === c.key)) };
    })
    .catch(() => STATIC_FEED)
    .then((data) => {
      cached = data;
      pending = null;
      return data;
    });
  return pending;
}

/** The feed, or null while it loads (instant when it was prefetched). */
export function useFeed() {
  const [feed, setFeed] = useState(cached);
  useEffect(() => {
    if (feed) return undefined;
    let alive = true;
    loadFeed().then((d) => alive && setFeed(d));
    return () => {
      alive = false;
    };
  }, [feed]);
  return feed;
}

/**
 * One post with its full text and three others. A sample post is used only while the
 * site is showing samples. Throws an Error with .status (404) when there is no such post.
 */
export async function loadPost(slug, signal) {
  const feed = await loadFeed();
  if (!feed.live) {
    const post = STATIC_FEED.posts.find((p) => p.slug === slug);
    if (post) return { post, others: STATIC_FEED.posts.filter((p) => p !== post).slice(0, 3) };
  }
  const titleOf = (id) => feed.cats.find((c) => c.key === id)?.title ?? null;
  const n = await getJSON(`/news/${encodeURIComponent(slug)}`, { signal });
  return { post: fromApi(n, titleOf), others: records(n.others).map((o) => fromApi(o, titleOf)) };
}
