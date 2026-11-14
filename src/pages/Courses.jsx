import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { CourseGrid, Cta, Eyebrow, Filters } from '../components/Blocks.jsx';
import { LearningPath } from '../components/Scenes.jsx';
import { useCatalog } from '../lib/catalog.js';
import { pick } from '../lib/http.js';

export default function Courses() {
  const { t, html, lang } = useI18n();
  // keep the curtain down until the catalogue is here, so the grid doesn't pop in
  const ready = usePage('title.courses', { autoReady: false });
  const catalog = useCatalog();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (catalog) ready();
  }, [catalog, ready]);

  const options = [
    ['all', t('courses.all')],
    ...(catalog?.cats ?? []).map((cat) => [cat.key, cat.title ? pick(cat.title, lang) : t(`courses.${cat.key}`)]),
  ];

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
          {catalog && (
            <>
              {options.length > 2 && <Filters value={filter} onChange={setFilter} options={options} />}
              <CourseGrid courses={catalog.courses} filter={filter} />
            </>
          )}
        </div>
      </section>

      <LearningPath />
      <Cta />
    </main>
  );
}
