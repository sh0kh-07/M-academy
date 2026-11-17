import { useEffect, useState } from 'react';
import { getJSON, records } from './http.js';

/*
  Footer social links (GET /api/socials: active links, managed in the admin panel →
  Ijtimoiy tarmoqlar). Each: { id, name: {uz,ru,en}, icon, image, url, sort_order }.
  Loaded once per visit; an empty list (or no answer) hides the footer block.
*/

let cached; // undefined = not asked yet
let pending = null;

function load() {
  if (cached !== undefined) return Promise.resolve(cached);
  pending ??= getJSON('/socials')
    .then((data) =>
      records(data)
        .filter((s) => s?.url && s.is_active !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    )
    .catch(() => [])
    .then((list) => {
      cached = list;
      pending = null;
      return list;
    });
  return pending;
}

/** [] while loading or when there are none. */
export function useSocials() {
  const [list, setList] = useState(cached ?? []);
  useEffect(() => {
    let alive = true;
    if (cached === undefined) load().then((l) => alive && setList(l));
    return () => {
      alive = false;
    };
  }, []);
  return list;
}
