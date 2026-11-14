import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { Cta, Eyebrow, Sample } from '../components/Blocks.jsx';
import { Emblem } from '../components/Scenes.jsx';
import Icon from '../components/Icon.jsx';
import { COURSES } from '../data/courses.js';
import TeacherCard, { useTeachers } from '../components/TeacherCard.jsx';

const WHY = [
  { icon: 'cap', wide: true, deco: 'rings' },
  { icon: 'layers', wide: true, deco: 'grid' },
  { icon: 'chart' },
  { icon: 'clock' },
  { icon: 'award' },
];

/** Placeholder mentor cards, shown until the first teacher is added in the admin panel. */
const MENTORS = [
  { course: 0, exp: 'mentors.exp1' },
  { course: 1, exp: 'mentors.exp2' },
  { course: 9, exp: 'mentors.exp3' },
  { course: 11, exp: 'mentors.exp4' },
];

export default function About() {
  const { t, html, lang } = useI18n();
  usePage('title.about');
  const teachers = useTeachers(); // null while loading
  const live = Boolean(teachers?.length);

  return (
    <main>
      <section className="page-hero page-hero--split">
        <div className="container page-hero__grid">
          <div>
            <Eyebrow>{t('about.eyebrow')}</Eyebrow>
            <h1 className="h1" data-reveal="" {...html('about.title')} />
            <p className="lead" data-reveal="">
              {t('about.text')}
            </p>
            <div className="about__sign" data-reveal="">
              <img src="/img/logo-mark.webp" alt="" width="543" height="531" />
              <span>
                BEYOND LEARNING.
                <br />
                BEYOND LIMITS.
              </span>
            </div>
          </div>
          <Emblem />
        </div>
      </section>

      <section className="section why">
        <div className="container">
          <header className="section__head section__head--center">
            <Eyebrow center>{t('why.eyebrow')}</Eyebrow>
            <h2 className="h2" data-reveal="" {...html('why.title')} />
          </header>
          <div className="bento">
            {WHY.map((item, i) => (
              <article
                className={`card bento__item${item.wide ? ' bento__item--wide' : ''} tilt`}
                data-reveal=""
                key={item.icon}
              >
                <div className="icon">
                  <Icon name={item.icon} />
                </div>
                <h3>{t(`why.${i + 1}.title`)}</h3>
                <p>{t(`why.${i + 1}.text`)}</p>
                {item.deco && <span className={`bento__deco bento__deco--${item.deco}`} />}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section mentors">
        <div className="container">
          <header className="section__head">
            <div>
              <Eyebrow>{t('mentors.eyebrow')}</Eyebrow>
              <h2 className="h2" data-reveal="" {...html('mentors.title')} />
              <p className="lead" data-reveal="">
                {t('mentors.sub')}
              </p>
            </div>
          </header>
          <div className="mentors__grid">
            {live && teachers.map((person) => <TeacherCard key={person.id} person={person} />)}
            {teachers && !live && MENTORS.map(({ course, exp }) => (
              <article className="mentor tilt" data-reveal="" key={course}>
                <div className="mentor__photo">
                  <Sample />
                  <b>{COURSES[course].g}</b>
                </div>
                <h3>{t('mentors.name')}</h3>
                <p>
                  {COURSES[course][lang]} · {t(exp)}
                </p>
              </article>
            ))}
          </div>
          {teachers && !live && (
            <p className="note" data-reveal="">
              {t('mentors.note')}
            </p>
          )}
        </div>
      </section>

      <Cta />
    </main>
  );
}
