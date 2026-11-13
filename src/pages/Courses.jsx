import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { CourseGrid, Cta, Eyebrow, Filters } from '../components/Blocks.jsx';
import { LearningPath } from '../components/Scenes.jsx';

export default function Courses() {
  const { t, html } = useI18n();
  usePage('title.courses');
  const [filter, setFilter] = useState('all');

  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <Eyebrow>{t('courses.eyebrow')}</Eyebrow>
          <h1 className="h1" data-reveal="" {...html('courses.title')} />
          <p className="lead" data-reveal="">
            {t('courses.sub')}
          </p>
        </div>
      </section>

      <section className="section section--tight courses">
        <div className="container">
          <Filters
            value={filter}
            onChange={setFilter}
            options={[
              ['all', t('courses.all')],
              ['lang', t('courses.lang')],
              ['exact', t('courses.exact')],
              ['social', t('courses.social')],
            ]}
          />
          <CourseGrid filter={filter} />
        </div>
      </section>

      <LearningPath />
      <Cta />
    </main>
  );
}
