import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { Cta } from '../components/Blocks.jsx';
import FounderIcon from '../components/FounderIcon.jsx';
import Icon from '../components/Icon.jsx';
import { useFounder } from '../lib/founder.js';
import { mediaUrl, pick } from '../lib/http.js';

/** "Muslim Mamarasulov" → ["Muslim", "Mamarasulov"]: the last word is set in gold. */
function splitName(name) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return ['', name];
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

/*
  "Akademiya → Asoschisi" (GET /api/founder; filled in from the admin panel → Asoschi).
  Photo on the left in front of the gold M, the story on the right, numbers along the bottom.
*/
export default function Founder() {
  const { t, lang } = useI18n();
  const data = useFounder();
  const name = data ? pick(data.full_name, lang) : '';
  const ready = usePage('title.founder', { autoReady: false, title: name ? `${name} — M.ACADEMY` : undefined });

  useEffect(() => {
    if (data !== undefined) ready();
  }, [data, ready]);

  if (data === undefined) return <main className="founder founder--loading" />;

  if (!data) {
    return (
      <main>
        <section className="page-hero page-hero--tall">
          <div className="container">
            <p className="eyebrow" data-reveal="">
              <span className="eyebrow__line" />
              <span>{t('founder.eyebrow')}</span>
            </p>
            <h1 className="h1" data-reveal="">
              {t('founder.missing')}
            </h1>
            <Link className="link-arrow" to="/about" data-reveal="">
              <span>{t('nav.about')}</span>
              <Icon name="arrow" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [first, last] = splitName(name);
  const titles = (data.titles ?? []).map((x) => pick(x, lang)).filter(Boolean);
  const highlights = (data.highlights ?? []).filter((h) => pick(h.title, lang));
  const stats = (data.stats ?? []).filter((s) => pick(s.value, lang));
  const bio = pick(data.bio, lang);
  const quote = pick(data.quote, lang);

  return (
    <main className="founder">
      <section className="founder__hero">
        <span className="founder__band founder__band--a" aria-hidden="true" />
        <span className="founder__band founder__band--b" aria-hidden="true" />

        <div className="container founder__grid">
          {/* ---------- photo in front of the gold M ---------- */}
          <div className="founder__visual tilt" data-tilt="0.35" data-reveal="">
            <img className="founder__mark" src="/img/logo-mark.webp" alt="" width="543" height="531" />
            <span className="founder__glow" aria-hidden="true" />
            {data.image ? (
              <img className="founder__photo" src={mediaUrl(data.image)} alt={name} />
            ) : (
              <span className="founder__photo founder__photo--empty" aria-hidden="true" />
            )}
          </div>

          {/* ---------- story ---------- */}
          <div className="founder__copy">
            <nav className="crumbs" aria-label="Breadcrumb" data-reveal="">
              <Link to="/" aria-label={t('nav.home')}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 11 12 4.5l8 6.5" />
                  <path d="M6 9.5V19.5h4.5v-5h3v5H18V9.5" />
                </svg>
              </Link>
              <i aria-hidden="true">›</i>
              <Link to="/about">{t('nav.about')}</Link>
              <i aria-hidden="true">›</i>
              <span aria-current="page">{t('founder.crumb')}</span>
            </nav>

            <p className="eyebrow founder__eyebrow" data-reveal="">
              {t('founder.eyebrow')}
            </p>
            <h1 className="founder__name" data-reveal="">
              {first && <span>{first} </span>}
              <em>{last}</em>
            </h1>
            {titles.length > 0 && (
              <ul className="founder__titles" data-reveal="">
                {titles.map((title, i) => (
                  <li key={i}>{title}</li>
                ))}
              </ul>
            )}
            {bio && (
              <div className="founder__bio" data-reveal="">
                {bio
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
              </div>
            )}

            {highlights.length > 0 && (
              <ul className="founder__highlights">
                {highlights.map((h, i) => (
                  <li className="founder__chip tilt" data-tilt="0.6" data-reveal="" key={i}>
                    <FounderIcon name={h.icon} />
                    <span>
                      <b>{pick(h.title, lang)}</b>
                      {pick(h.subtitle, lang) && <small>{pick(h.subtitle, lang)}</small>}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {quote && (
              <figure className="founder__quote" data-reveal="">
                <span className="founder__qmark" aria-hidden="true">
                  “
                </span>
                <blockquote>{quote}</blockquote>
                <figcaption>
                  {data.signature && <img src={mediaUrl(data.signature)} alt="" />}
                  <span>{name}</span>
                </figcaption>
              </figure>
            )}
          </div>
        </div>

        {/* ---------- numbers ---------- */}
        {stats.length > 0 && (
          <div className="container">
            <div className="founder__stats" data-reveal="" style={{ '--n': stats.length }}>
              {stats.map((s, i) => (
                <div className="founder__stat" key={i}>
                  <FounderIcon name={s.icon} />
                  <b>{pick(s.value, lang)}</b>
                  {pick(s.label, lang) && <small>{pick(s.label, lang)}</small>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <Cta />
    </main>
  );
}

/** A short card on the Academy page that leads to the founder page; hidden while there is none. */
export function FounderTeaser() {
  const { t, lang } = useI18n();
  const data = useFounder();
  if (!data) return null;
  const name = pick(data.full_name, lang);
  const [first, last] = splitName(name);
  const titles = (data.titles ?? []).map((x) => pick(x, lang)).filter(Boolean);
  const quote = pick(data.quote, lang);

  return (
    <section className="section founder-teaser">
      <div className="container">
        <Link to="/about/founder" className="founder-teaser__card tilt" data-tilt="0.3" data-reveal="">
          <span className="founder-teaser__media">
            <img className="founder__mark" src="/img/logo-mark.webp" alt="" width="543" height="531" />
            {data.image && <img className="founder-teaser__photo" src={mediaUrl(data.image)} alt="" loading="lazy" />}
          </span>
          <span className="founder-teaser__body">
            <span className="eyebrow">
              <span className="eyebrow__line" />
              <span>{t('founder.eyebrow')}</span>
            </span>
            <span className="founder-teaser__name">
              {first && <span>{first} </span>}
              <em>{last}</em>
            </span>
            {titles.length > 0 && <span className="founder-teaser__titles">{titles.join(' · ')}</span>}
            {quote && <span className="founder-teaser__quote">“{quote}”</span>}
            <span className="link-arrow">
              <span>{t('founder.more')}</span>
              <Icon name="arrow" />
            </span>
          </span>
        </Link>
      </div>
    </section>
  );
}
