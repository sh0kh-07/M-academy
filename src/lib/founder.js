import { useEffect, useState } from 'react';
import { getJSON } from './http.js';

/*
  The founder page (GET /api/founder, all three languages; read fields with pick()).
  404 means the page is not filled in yet or is switched off: then this gives null
  and the site hides everything about the founder.

  useFounder() → undefined while loading, null when there is no page, or the data.
*/

let cached; // undefined = not asked yet
let pending = null;

export function loadFounder() {
  if (cached !== undefined) return Promise.resolve(cached);
  pending ??= getJSON('/founder')
    .then((data) => (data && data.full_name ? data : null))
    .catch(() => null)
    .then((data) => {
      cached = data;
      pending = null;
      return data;
    });
  return pending;
}

export function useFounder() {
  const [data, setData] = useState(cached);
  useEffect(() => {
    let alive = true;
    if (cached === undefined) loadFounder().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
