import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { Cta, Eyebrow } from '../components/Blocks.jsx';
import Icon from '../components/Icon.jsx';
import TeacherCard from '../components/TeacherCard.jsx';
import { catLabel, getJSON, mediaUrl, pick, records } from '../lib/http.js';

/*
  One course: GET /api/courses/:slug (an id works too). Description, demo video,
  the lessons (title, note, video link) and the teachers linked to the course.
  "Apply" opens the sign-up page with this course chosen.
*/

const pad = (n) => String(n).padStart(2, '0');

/** YouTube link → privacy-friendly embed URL, or null for any other host. */
function youtubeEmbed(url = '') {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0` : null;
}

const paragraphs = (text) =>
  String(text || '')
    .split(/\n\s*\n|\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

function useCourse(slug) {
  const [state, setState] = useState({ course: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ course: null, error: null, loading: true });
    getJSON(`/courses/${encodeURIComponent(slug)}`, { signal: ctrl.signal }).then(
      (course) => setState({ course, error: null, loading: false }),
      (error) => !ctrl.signal.aborted && setState({ course: null, error, loading: false }),
    );
    return () => ctrl.abort();
  }, [slug, attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

function Lesson({ lesson, index }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const note = paragraphs(pick(lesson.note, lang));
  const embed = youtubeEmbed(lesson.video_url);
  const expandable = note.length > 0 || Boolean(lesson.video_url);
  return (
    <li className="lesson" data-open={open || undefined} data-reveal="">
      <button type="button" className="lesson__head" aria-expanded={open} disabled={!expandable} onClick={() => setOpen((v) => !v)}>
        <span className="lesson__num">{pad(index + 1)}</span>
        <span className="lesson__title">{pick(lesson.title, lang)}</span>
        {expandable && (
          <span className="lesson__toggle" aria-hidden="true">
            <Icon name="arrow" />
          </span>
        )}
      </button>
      {open && (
        <div className="lesson__body">
          {note.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {embed ? (
            <div className="lesson__video">
              <iframe
                src={embed}
                title={pick(lesson.title, lang)}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          ) : (
            lesson.video_url && (
              <a className="link-arrow" href={lesson.video_url} target="_blank" rel="noopener noreferrer">
                <span>{t('course.watch')}</span>
                <Icon name="arrowUpRight" />
              </a>
            )
          )}
        </div>
      )}
    </li>
  );
}

export default function CoursePage() {
  const { t, html, lang } = useI18n();
  const { slug } = useParams();
  const { course, error, loading, retry } = useCourse(slug);
  const title = course ? pick(course.title, lang) : '';
  const ready = usePage('title.course', { autoReady: false, title: title ? `${title} — M.ACADEMY` : undefined });

  useEffect(() => {
    if (!loading) ready();
  }, [loading, ready]);

  if (loading) return <main className="course-page" />;

  if (!course) {
    const missing = error?.status === 404;
    return (
      <main>
        <section className="page-hero">
          <div className="container">
            <Eyebrow>{t('courses.eyebrow')}</Eyebrow>
            <h1 className="h1" data-reveal="">
              {missing ? t('course.missing') : t('course.error')}
            </h1>
            {missing && (
              <p className="lead" data-reveal="">
                {t('course.missingText')}
              </p>
            )}
            <div className="course-hero__cta" data-reveal="">
              {!missing && (
                <button type="button" className="btn btn--gold" onClick={retry}>
                  <span>{t('course.retry')}</span>
                </button>
              )}
              <Link className="btn btn--ghost" to="/courses">
                <span>{t('course.back')}</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const about = paragraphs(pick(course.description, lang));
  const lessons = records(course.lessons).filter((l) => l.is_active !== false);
  const teachers = records(course.teachers);
  const category = course.category ? pick(catLabel(course.category), lang) : '';
  const apply = `/register?course=${encodeURIComponent(course.slug || course.id)}`;
  const glyph = course.symbol || title.slice(0, 2);

  return (
    <main className="course-page">
      <section className="page-hero course-hero">
        <div className="container course-hero__grid">
          <div className="course-hero__copy">
            <Link className="link-back" to="/courses" data-reveal="">
              <Icon name="arrowLeft" />
              <span>{t('course.back')}</span>
            </Link>
            <Eyebrow>{category || t('courses.eyebrow')}</Eyebrow>
            <h1 className="h1 course-hero__title" data-reveal="">
              {title}
            </h1>
            {about[0] && (
              <p className="lead" data-reveal="">
                {about[0]}
              </p>
            )}
            <dl className="course-meta" data-reveal="">
              {category && (
                <div>
                  <dt>{t('course.metaCategory')}</dt>
                  <dd>{category}</dd>
                </div>
              )}
              <div>
                <dt>{t('course.metaLessons')}</dt>
                <dd>{lessons.length || course.lessons_count || 0}</dd>
              </div>
              {teachers.length > 0 && (
                <div>
                  <dt>{t('course.metaTeachers')}</dt>
                  <dd>{teachers.length}</dd>
                </div>
              )}
            </dl>
            <div className="course-hero__cta" data-reveal="">
              <Link className="btn btn--gold magnetic" to={apply}>
                <span>{t('course.apply')}</span>
                <Icon name="arrow" />
              </Link>
              {course.demo_video && (
                <a className="btn btn--ghost" href="#demo">
                  <span>{t('course.watch')}</span>
                </a>
              )}
            </div>
          </div>

          <figure className="course-hero__media" data-reveal="">
            {course.image ? (
              <img src={mediaUrl(course.image)} alt={title} />
            ) : (
              <span className="course-hero__glyph" aria-hidden="true">
                {glyph}
              </span>
            )}
          </figure>
        </div>
      </section>

      {course.demo_video && (
        <section className="section section--tight" id="demo">
          <div className="container course-narrow">
            <header className="section__head">
              <div>
                <h2 className="h2" data-reveal="" {...html('course.demo')} />
                <p className="lead" data-reveal="">
                  {t('course.demoText')}
                </p>
              </div>
            </header>
            <div className="course-video" data-reveal="">
              <video
                src={mediaUrl(course.demo_video)}
                poster={course.image ? mediaUrl(course.image) : undefined}
                controls
                preload="metadata"
                playsInline
              />
            </div>
          </div>
        </section>
      )}

      {about.length > 1 && (
        <section className="section section--tight">
          <div className="container course-narrow">
            <h2 className="h2" data-reveal="">
              {t('course.about')}
            </h2>
            <div className="article__body" data-reveal="">
              {about.slice(1).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {lessons.length > 0 && (
        <section className="section">
          <div className="container course-narrow">
            <header className="section__head">
              <div>
                <h2 className="h2" data-reveal="" {...html('course.program')} />
                <p className="lead" data-reveal="">
                  {t('course.programText')}
                </p>
              </div>
            </header>
            <ol className="lessons">
              {lessons.map((lesson, i) => (
                <Lesson key={lesson.id ?? i} lesson={lesson} index={i} />
              ))}
            </ol>
          </div>
        </section>
      )}

      {teachers.length > 0 && (
        <section className="section">
          <div className="container">
            <header className="section__head">
              <h2 className="h2" data-reveal="" {...html('course.teachers')} />
            </header>
            <div className="mentors__grid">
              {teachers.map((person, i) => (
                <TeacherCard key={person.id ?? i} person={person} withCourses={false} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Cta />
    </main>
  );
}
