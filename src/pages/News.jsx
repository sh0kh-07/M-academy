import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { useI18n } from '../i18n/index.jsx';
import { usePage } from '../components/Layout.jsx';
import { Cta, Eyebrow, Filters } from '../components/Blocks.jsx';
import { PostCard, PostCover, PostMeta } from '../components/NewsParts.jsx';
import Icon from '../components/Icon.jsx';
import { paragraphs } from '../data/news.js';
import { pick } from '../lib/http.js';
import { loadPost, useFeed } from '../lib/newsFeed.js';
import { reducedMotion } from '../lib/env.js';

/** /news — the feed: newest post large on top, the rest in a grid, filter by category. */
export function News() {
  const { t, html, lang } = useI18n();
  // the curtain stays down until the posts are here, so the grid doesn't pop in
  const ready = usePage('title.news', { autoReady: false });
  const feed = useFeed();
  const [filter, setFilter] = useState('all');
  const grid = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    if (feed) ready();
  }, [feed, ready]);

  const posts = feed?.posts ?? [];
  const visible = posts.filter((post) => filter === 'all' || post.cat === filter);
  const options = [
    ['all', t('news.all')],
    ...(feed?.cats ?? []).map((cat) => [cat.key, cat.title ? pick(cat.title, lang) : t(`news.cat.${cat.key}`)]),
  ];

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
          {options.length > 2 && <Filters value={filter} onChange={setFilter} options={options} />}
          <div className="posts" ref={grid}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                featured={filter === 'all' && post === visible[0]}
                hidden={!visible.includes(post)}
              />
            ))}
          </div>
          {posts.some((post) => post.sample) && (
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

/** /news/:slug — one post, with three others under it. */
export function NewsPost() {
  const { t, html, lang } = useI18n();
  const { slug } = useParams();
  const [state, setState] = useState({ loading: true, post: null, others: [] });

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ loading: true, post: null, others: [] });
    loadPost(slug, ctrl.signal).then(
      ({ post, others }) => setState({ loading: false, post, others }),
      () => !ctrl.signal.aborted && setState({ loading: false, post: null, others: [] }),
    );
    return () => ctrl.abort();
  }, [slug]);

  const { post, others, loading } = state;
  const title = post ? pick(post.title, lang) : '';
  const ready = usePage('title.news', { autoReady: false, title: title ? `${title} — M.ACADEMY` : undefined });
  useEffect(() => {
    if (!loading) ready();
  }, [loading, ready]);

  if (loading) return <main className="article-page" />;

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

  return (
    <main>
      <article className="article">
        <div className="article__inner">
          <Link className="link-back" to="/news" data-reveal="">
            <Icon name="arrowLeft" />
            <span>{t('news.back')}</span>
          </Link>
          <div data-reveal="">
            <PostMeta post={post} minutes views />
          </div>
          <h1 className="h1 article__title" data-reveal="">
            {title}
          </h1>
          <p className="article__excerpt" data-reveal="">
            {pick(post.excerpt, lang)}
          </p>
          <div data-reveal="">
            <PostCover post={post} large />
          </div>

          <div className="article__body" data-reveal="">
            {paragraphs(post, lang).map((paragraph, i) => (
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

      {others.length > 0 && (
        <section className="section">
          <div className="container">
            <header className="section__head">
              <h2 className="h2" data-reveal="" {...html('news.more')} />
            </header>
            <div className="posts">
              {others.map((item) => (
                <PostCard post={item} key={item.id} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Cta />
    </main>
  );
}
