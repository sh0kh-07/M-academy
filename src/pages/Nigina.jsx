import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { Cta, Eyebrow } from '../components/Blocks.jsx';
import { NiginaChat } from '../components/Scenes.jsx';

export default function Nigina() {
  const { t } = useI18n();
  usePage('title.nigina');

  return (
    <main>
      <section className="page-hero nigina">
        <div className="container nigina__grid">
          <div className="nigina__copy">
            <span className="badge" data-reveal="">
              <i />
              <span>{t('nigina.badge')}</span>
            </span>
            <Eyebrow>{t('nigina.eyebrow')}</Eyebrow>
            <h1 className="nigina__title" data-reveal="">
              NIGINA
            </h1>
            <p className="nigina__sub" data-reveal="">
              {t('nigina.sub')}
            </p>
            <p className="lead" data-reveal="">
              {t('nigina.text')}
            </p>
            <ul className="chips" data-reveal="">
              {[1, 2, 3, 4].map((n) => (
                <li key={n}>{t(`nigina.c${n}`)}</li>
              ))}
            </ul>
            <p className="note note--left" data-reveal="">
              {t('nigina.note')}
            </p>
          </div>

          <div className="nigina__stage" data-reveal="">
            <div className="orb" aria-hidden="true">
              <span className="orb__ring orb__ring--a" />
              <span className="orb__ring orb__ring--b" />
              <span className="orb__ring orb__ring--c" />
              <span className="orb__core" />
            </div>
            <NiginaChat />
          </div>
        </div>
      </section>

      <Cta />
    </main>
  );
}
