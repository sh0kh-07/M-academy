import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { formatDate, readingMinutes } from '../data/news.js';
import { Sample } from './Blocks.jsx';
import Icon from './Icon.jsx';

/** Posts have no photos yet, so each one gets a drawn cover: navy silk, gold band, one glyph. */
export function PostCover({ post, large = false }) {
  return (
    <div className={`cover cover--${post.cat}${large ? ' cover--large' : ''}`} aria-hidden="true">
      <span className="cover__band" />
      <span className="cover__glyph">{post.glyph}</span>
      <img className="cover__mark" src="/img/logo-mark.webp" alt="" width="543" height="531" loading="lazy" />
    </div>
  );
}

export function PostMeta({ post, minutes = false }) {
  const { t, lang } = useI18n();
  return (
    <p className="post__meta">
      <span className="post__cat">{t(`news.cat.${post.cat}`)}</span>
      <time dateTime={post.date}>{formatDate(post.date, lang)}</time>
      {minutes && (
        <span>
          {readingMinutes(post, lang)} {t('news.minutes')}
        </span>
      )}
    </p>
  );
}

/** A post in the feed. `featured` is the wide card at the top of the news page. */
export function PostCard({ post, featured = false, hidden = false }) {
  const { t, lang } = useI18n();
  const text = post[lang];
  return (
    <Link
      className={`post tilt${featured ? ' post--featured' : ''}${hidden ? ' is-hidden' : ''}`}
      to={`/news/${post.slug}`}
      data-reveal=""
    >
      <PostCover post={post} large={featured} />
      <div className="post__body">
        <div className="post__top">
          <PostMeta post={post} />
          {post.sample && <Sample />}
        </div>
        <h3 className="post__title">{text.title}</h3>
        <p className="post__excerpt">{text.excerpt}</p>
        <span className="post__more">
          {t('news.read')}
          <Icon name="arrow" />
        </span>
      </div>
    </Link>
  );
}
