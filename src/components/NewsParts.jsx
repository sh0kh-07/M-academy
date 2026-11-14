import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { formatDate, readingMinutes } from '../data/news.js';
import { mediaUrl, pick } from '../lib/http.js';
import { Sample } from './Blocks.jsx';
import Icon from './Icon.jsx';

const DRAWN = ['announce', 'course', 'event', 'tech']; // sample categories with their own cover tint

/**
 * The post's picture. With an uploaded image: the photo under a soft dark fade.
 * Without one: a drawn cover — navy silk, gold band, one glyph.
 */
export function PostCover({ post, large = false }) {
  if (post.image) {
    return (
      <div className={`cover cover--photo${large ? ' cover--large' : ''}`}>
        <img src={mediaUrl(post.image)} alt="" loading={large ? 'eager' : 'lazy'} />
      </div>
    );
  }
  const tint = DRAWN.includes(post.cat) ? ` cover--${post.cat}` : '';
  return (
    <div className={`cover${tint}${large ? ' cover--large' : ''}`} aria-hidden="true">
      <span className="cover__band" />
      <span className="cover__glyph">{post.glyph}</span>
      <img className="cover__mark" src="/img/logo-mark.webp" alt="" width="543" height="531" loading="lazy" />
    </div>
  );
}

/** Category · date [· reading time] [· views] */
export function PostMeta({ post, minutes = false, views = false }) {
  const { t, lang } = useI18n();
  const category = post.catTitle ? pick(post.catTitle, lang) : post.cat ? t(`news.cat.${post.cat}`) : '';
  return (
    <p className="post__meta">
      {category && <span className="post__cat">{category}</span>}
      {post.date && <time dateTime={post.date}>{formatDate(post.date, lang)}</time>}
      {minutes && (
        <span>
          {readingMinutes(post, lang)} {t('news.minutes')}
        </span>
      )}
      {views && post.views != null && (
        <span className="post__views" title={t('news.views')}>
          <Icon name="eye" />
          {post.views}
        </span>
      )}
    </p>
  );
}

/** A post in the feed. `featured` is the wide card at the top of the news page. */
export function PostCard({ post, featured = false, hidden = false }) {
  const { t, lang } = useI18n();
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
        <h3 className="post__title">{pick(post.title, lang)}</h3>
        <p className="post__excerpt">{pick(post.excerpt, lang)}</p>
        <span className="post__more">
          {t('news.read')}
          <Icon name="arrow" />
        </span>
      </div>
    </Link>
  );
}
