import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { Cta, Eyebrow, Filters } from '../components/Blocks.jsx';
import { PostCard, PostCover, PostMeta } from '../components/NewsParts.jsx';
import Icon from '../components/Icon.jsx';
import { NEWS_CATS, POSTS } from '../data/news.js';
import { reducedMotion } from '../lib/env.js';

/** /news — the feed: newest post large on top, the rest in a grid, filter by category. */
export function News() {
  const { t, html } = useI18n();
  usePage('title.news');
  const [filter, setFilter] = useState('all');
  const grid = useRef(null);
  const first = useRef(true);

  const cats = NEWS_CATS.filter((cat) => POSTS.some((post) => post.cat === cat));
  const visible = POSTS.filter((post) => filter === 'all' || post.cat === filter);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const cards = [...grid.current.querySelectorAll('.post:not(.is-hidden)')];
    cards.forEach((card) => card.setAttribute('data-in', ''));
    if (reducedMotion) return;
    gsap.fromTo(
      cards,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05, clearProps: 'opacity,transform' },
    );
  }, [filter]);

  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <Eyebrow>{t('news.eyebrow')}</Eyebrow>
          <h1 className="h1" data-reveal="" {...html('news.title')} />
          <p className="lead" data-reveal="">
            {t('news.lead')}
          </p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <Filters
            value={filter}
            onChange={setFilter}
            options={[['all', t('news.all')], ...cats.map((cat) => [cat, t(`news.cat.${cat}`)])]}
          />
          <div className="posts" ref={grid}>
            {POSTS.map((post) => (
              <PostCard
                key={post.slug}
                post={post}
                featured={filter === 'all' && post === visible[0]}
                hidden={!visible.includes(post)}
              />
            ))}
          </div>
          {POSTS.some((post) => post.sample) && (
            <p className="note" data-reveal="">
              {t('news.note')}
            </p>
          )}
        </div>
      </section>

      <Cta />
    </main>
  );
}

/** /news/:slug — one post. */
export function NewsPost() {
  const { t, html, lang } = useI18n();
  const { slug } = useParams();
  const post = POSTS.find((item) => item.slug === slug);
  usePage('title.news', { title: post ? `${post[lang].title} — M.ACADEMY` : undefined });

  if (!post) {
    return (
      <main>
        <section className="page-hero">
          <div className="container">
            <Eyebrow>{t('news.eyebrow')}</Eyebrow>
            <h1 className="h1" data-reveal="">
              {t('news.missing')}
            </h1>
            <Link className="link-arrow" to="/news" data-reveal="">
              <span>{t('news.back')}</span>
              <Icon name="arrow" />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const text = post[lang];
  const others = POSTS.filter((item) => item !== post).slice(0, 3);

  return (
    <main>
      <article className="article">
        <div className="article__inner">
          <Link className="link-back" to="/news" data-reveal="">
            <Icon name="arrowLeft" />
            <span>{t('news.back')}</span>
          </Link>
          <div data-reveal="">
            <PostMeta post={post} minutes />
          </div>
          <h1 className="h1 article__title" data-reveal="">
            {text.title}
          </h1>
          <p className="article__excerpt" data-reveal="">
            {text.excerpt}
          </p>
          <div data-reveal="">
            <PostCover post={post} large />
          </div>

          <div className="article__body" data-reveal="">
            {text.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          {post.sample && (
            <p className="note note--left" data-reveal="">
              {t('news.note')}
            </p>
          )}

          <div className="article__actions" data-reveal="">
            <Link className="btn btn--gold magnetic" to="/register">
              <span>{t('cta.signup')}</span>
              <Icon name="arrow" />
            </Link>
            <Link className="btn btn--ghost" to="/news">
              {t('news.back')}
            </Link>
          </div>
        </div>
      </article>

      <section className="section">
        <div className="container">
          <header className="section__head">
            <h2 className="h2" data-reveal="" {...html('news.more')} />
          </header>
          <div className="posts">
            {others.map((item) => (
              <PostCard post={item} key={item.slug} />
            ))}
          </div>
        </div>
      </section>

      <Cta />
    </main>
  );
}
