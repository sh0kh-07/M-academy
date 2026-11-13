import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import Icon from '../components/Icon.jsx';

export default function NotFound() {
  const { t, html } = useI18n();
  usePage('title.notFound');
  return (
    <main>
      <section className="page-hero page-hero--tall">
        <div className="container">
          <p className="eyebrow" data-reveal="">
            <span className="eyebrow__line" />
            <span>404</span>
          </p>
          <h1 className="h1" data-reveal="" {...html('notFound.title')} />
          <p className="lead" data-reveal="">
            {t('notFound.text')}
          </p>
          <Link className="link-arrow" to="/" data-reveal="">
            <span>{t('nav.home')}</span>
            <Icon name="arrow" />
          </Link>
        </div>
      </section>
    </main>
  );
}
