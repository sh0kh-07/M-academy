import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { Cta, Eyebrow, Sample, Stats } from '../components/Blocks.jsx';

export default function Results() {
  const { t, html } = useI18n();
  usePage('title.results');

  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <Eyebrow>{t('results.eyebrow')}</Eyebrow>
          <h1 className="h1" data-reveal="" {...html('results.title')} />
          <p className="lead" data-reveal="">
            {t('results.lead')}
          </p>
        </div>
      </section>

      <section className="section section--tight results">
        <div className="container">
          <Stats />
          <div className="wins">
            {[1, 2, 3].map((n) => (
              <article className="card win tilt" data-reveal="" key={n}>
                <Sample />
                <h3>{t(`results.w${n}.title`)}</h3>
                <p>{t(`results.w${n}.text`)}</p>
              </article>
            ))}
          </div>
          <p className="note" data-reveal="">
            {t('results.note')}
          </p>
        </div>
      </section>

      <section className="section stories">
        <div className="container">
          <header className="section__head">
            <div>
              <Eyebrow>{t('stories.eyebrow')}</Eyebrow>
              <h2 className="h2" data-reveal="" {...html('stories.title')} />
            </div>
          </header>
          <div className="stories__grid">
            {[1, 2, 3].map((n) => (
              <figure className="card story tilt" data-reveal="" key={n}>
                <Sample />
                <span className="story__mark">“</span>
                <blockquote>{t('stories.quote')}</blockquote>
                <figcaption>
                  <i />
                  <span>
                    <b>{t('stories.name')}</b>
                    <small>{t('stories.course')}</small>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="note" data-reveal="">
            {t('stories.note')}
          </p>
        </div>
      </section>

      <Cta />
    </main>
  );
}
