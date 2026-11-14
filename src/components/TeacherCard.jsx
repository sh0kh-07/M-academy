import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { getJSON, mediaUrl, pick, records } from '../lib/http.js';

/*
  Teachers on the site: GET /api/teachers (active ones, all three languages, with their courses).
  A teacher: { id, full_name: {uz,ru,en}, note: {uz,ru,en}, image, experience_years, courses: [...] }
*/

let cached = null;
let pending = null;

/** The teachers list, or null while it loads; [] when there are none (or the API is down). */
export function useTeachers() {
  const [list, setList] = useState(cached);
  useEffect(() => {
    if (list) return undefined;
    let alive = true;
    pending ??= getJSON('/teachers?limit=100')
      .then((d) => records(d).filter((p) => p.is_active !== false))
      .catch(() => [])
      .then((d) => {
        cached = d;
        pending = null;
        return d;
      });
    pending.then((d) => alive && setList(d));
    return () => {
      alive = false;
    };
  }, [list]);
  return list;
}

/** "8 yillik tajriba" / "Опыт 8 лет" / "8 years of experience" */
function experience(n, lang) {
  if (n == null || n === '' || Number(n) <= 0) return '';
  if (lang === 'ru') {
    const form = new Intl.PluralRules('ru').select(n);
    return `Опыт ${n} ${form === 'one' ? 'год' : form === 'few' ? 'года' : 'лет'}`;
  }
  if (lang === 'en') return `${n} ${Number(n) === 1 ? 'year' : 'years'} of experience`;
  return `${n} yillik tajriba`;
}

/** A teacher card in the style of the site's mentor cards. `withCourses` lists what they teach. */
export default function TeacherCard({ person, withCourses = true }) {
  const { lang } = useI18n();
  const name = pick(person.full_name ?? person.name, lang);
  const photo = person.image ?? person.photo;
  const courses = withCourses && Array.isArray(person.courses) ? person.courses.map((c) => pick(c.title, lang)).filter(Boolean) : [];
  const line = [courses.slice(0, 2).join(', '), experience(person.experience_years, lang)].filter(Boolean).join(' · ');
  const note = pick(person.note, lang);
  return (
    <article className="mentor tilt" data-reveal="">
      <div className={`mentor__photo${photo ? ' mentor__photo--img' : ''}`}>
        {photo ? (
          <img src={mediaUrl(photo)} alt={name} loading="lazy" />
        ) : (
          <b>
            {name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0] ?? '')
              .join('')}
          </b>
        )}
      </div>
      <h3>{name}</h3>
      {line && <p>{line}</p>}
      {note && <p className="mentor__note">{note}</p>}
    </article>
  );
}
