import { useId, useState } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import { mediaUrl, pick } from '../../lib/http.js';
import { LANG_KEYS, changes, socials } from '../resources.js';
import MediaField from '../MediaField.jsx';
import SocialIcon, { SOCIAL_ICON_KEYS } from '../../components/SocialIcon.jsx';
import {
  Alert,
  Confirm,
  Empty,
  Field,
  FormFooter,
  Icon,
  Modal,
  PageHead,
  Presence,
  Section,
  Spinner,
  Switch,
  errorText,
  usePageTitle,
  useQuery,
  useT,
  useToast,
} from '../ui.jsx';

/** Readable names for the icon keys, also used as a name suggestion for a new link. */
const ICON_LABELS = {
  telegram: 'Telegram',
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  phone: 'Telefon',
  email: 'E-mail',
  website: 'Sayt',
  link: 'Havola',
};

const URL_RE = /^(https?:\/\/\S+|tel:\+?[\d\s()-]{5,}|mailto:\S+@\S+)$/i;

/** The little picture of a link: the uploaded image, or the drawing for its icon key. */
function LinkMark({ item }) {
  return (
    <span className="adm-social">
      {item.image ? <img src={mediaUrl(item.image)} alt="" loading="lazy" /> : <SocialIcon name={item.icon} />}
    </span>
  );
}

/*
  Footer social links (Swagger "Admin · Ijtimoiy tarmoqlar"): list, add / edit,
  on/off for the site, reorder, delete. The site shows the active ones in this order.
*/
export default function SocialsList() {
  const t = useT();
  const { lang } = useI18n();
  const notify = useToast();
  usePageTitle(t('soc.title'));

  const list = useQuery((signal) => socials.list(signal), []);
  const [editing, setEditing] = useState(null); // a link, or {} for a new one
  const [removing, setRemoving] = useState(null);
  const [moving, setMoving] = useState(false);
  const rows = list.data ?? [];

  // swap two neighbours, then renumber sort_order 0…n-1 where it changed
  async function move(index, step) {
    const next = [...rows];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    list.setData(next);
    setMoving(true);
    try {
      for (let i = 0; i < next.length; i += 1) {
        if ((next[i].sort_order ?? 0) !== i) {
          await socials.update(next[i].id, { sort_order: i });
          next[i] = { ...next[i], sort_order: i };
        }
      }
      list.setData([...next]);
    } catch (err) {
      notify(errorText(err, t), 'error');
      list.reload();
    } finally {
      setMoving(false);
    }
  }

  async function toggle(item) {
    const on = item.is_active === false;
    list.setData((all) => all.map((x) => (x.id === item.id ? { ...x, is_active: on } : x)));
    try {
      await socials.update(item.id, { is_active: on });
      notify(t(on ? 'soc.shown' : 'soc.hidden'));
    } catch (err) {
      notify(errorText(err, t), 'error');
      list.reload();
    }
  }

  const nextOrder = rows.reduce((max, x) => Math.max(max, (x.sort_order ?? 0) + 1), 0);
  const name = (item) => pick(item.name, lang) || '—';

  return (
    <>
      <PageHead title={t('soc.title')} text={t('soc.text')}>
        <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
          <Icon name="plus" />
          {t('soc.new')}
        </button>
      </PageHead>

      <section className="adm-card adm-card--flush">
        {list.error ? (
          <div className="adm-pad">
            <Alert tone="error">{errorText(list.error, t)}</Alert>
            <button type="button" className="adm-btn adm-btn--ghost adm-mt" onClick={list.reload}>
              <Icon name="refresh" />
              {t('boot.retry')}
            </button>
          </div>
        ) : list.loading && !list.data ? (
          <div className="adm-loading">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <Empty icon="link" title={t('soc.empty')} text={t('soc.emptyText')}>
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => setEditing({})}>
              <Icon name="plus" />
              {t('soc.new')}
            </button>
          </Empty>
        ) : (
          <div className="adm-table-wrap" data-loading={moving || undefined}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('soc.colName')}</th>
                  <th>{t('soc.url')}</th>
                  <th>{t('col.status')}</th>
                  <th aria-label={t('common.edit')} />
                </tr>
              </thead>
              <tbody>
                {rows.map((item, i) => {
                  const others = LANG_KEYS.filter((l) => l !== lang)
                    .map((l) => item.name?.[l])
                    .filter((v) => v && v !== pick(item.name, lang));
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="adm-track">
                          <LinkMark item={item} />
                          <button type="button" className="adm-cell-btn" onClick={() => setEditing(item)}>
                            <b>{name(item)}</b>
                            {others.length > 0 && <small>{[...new Set(others)].join(' · ')}</small>}
                          </button>
                        </div>
                      </td>
                      <td>
                        <a className="adm-link adm-link--sm adm-ellipsis" href={item.url} target="_blank" rel="noopener noreferrer">
                          {item.url}
                        </a>
                      </td>
                      <td>
                        <button type="button" className="adm-cell-btn" onClick={() => toggle(item)}>
                          <span className={`adm-status${item.is_active === false ? ' adm-status--off' : ''}`}>
                            {t(item.is_active === false ? 'common.inactive' : 'common.active')}
                          </span>
                        </button>
                      </td>
                      <td>
                        <div className="adm-actions">
                          <button type="button" className="adm-icon-btn" disabled={moving || i === 0} onClick={() => move(i, -1)} title={t('lesson.up')} aria-label={t('lesson.up')}>
                            <Icon name="arrowUp" />
                          </button>
                          <button
                            type="button"
                            className="adm-icon-btn"
                            disabled={moving || i === rows.length - 1}
                            onClick={() => move(i, 1)}
                            title={t('lesson.down')}
                            aria-label={t('lesson.down')}
                          >
                            <Icon name="arrowDown" />
                          </button>
                          <button type="button" className="adm-icon-btn" onClick={() => setEditing(item)} title={t('common.edit')} aria-label={t('common.edit')}>
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="adm-icon-btn adm-icon-btn--danger"
                            onClick={() => setRemoving(item)}
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Presence when={editing}>
        {(item) => (
          <SocialDialog
            item={item.id ? item : null}
            nextOrder={nextOrder}
            onClose={() => setEditing(null)}
            onSaved={(created) => {
              notify(t(created ? 'soc.created' : 'soc.saved'));
              setEditing(null);
              list.reload();
            }}
          />
        )}
      </Presence>

      <Presence when={removing}>
        {(item) => (
          <Confirm
            title={t('soc.deleteTitle')}
            text={t('soc.deleteText', { name: name(item) })}
            confirmLabel={t('common.delete')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
              await socials.remove(item.id);
              notify(t('soc.deleted'));
              setRemoving(null);
              list.reload();
            }}
          />
        )}
      </Presence>
    </>
  );
}

function SocialDialog({ item, nextOrder, onClose, onSaved }) {
  const t = useT();
  const formId = useId();
  const [initial] = useState(() => ({
    name: { uz: '', ru: '', en: '', ...(item?.name && typeof item.name === 'object' ? item.name : { uz: item?.name ?? '' }) },
    icon: item?.icon || 'telegram',
    image: item?.image ?? null,
    url: item?.url ?? '',
    sort_order: item?.sort_order ?? nextOrder,
    is_active: item ? item.is_active !== false : true,
  }));
  const [form, setForm] = useState(initial);
  const [uploads, setUploads] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { text, field?, langs? }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const bodyOf = (f) => ({
    name: { uz: f.name.uz.trim(), ru: f.name.ru.trim(), en: f.name.en.trim() },
    icon: f.icon,
    image: f.image || null,
    url: f.url.trim(),
    sort_order: Number(f.sort_order) || 0,
    is_active: f.is_active,
  });

  // picking an icon fills in empty names with the network's own name
  function pickIcon(key) {
    setForm((f) => {
      const label = ICON_LABELS[key] ?? '';
      const before = ICON_LABELS[f.icon] ?? '';
      const name = { ...f.name };
      LANG_KEYS.forEach((l) => {
        if (!name[l].trim() || name[l] === before) name[l] = label;
      });
      return { ...f, icon: key, name };
    });
  }

  async function submit(e) {
    e.preventDefault();
    if (busy || uploads) return;
    const body = bodyOf(form);
    const empty = LANG_KEYS.filter((l) => !body.name[l]);
    if (empty.length) {
      setError({ text: t('soc.errName'), field: 'name', langs: empty });
      return;
    }
    if (!URL_RE.test(body.url)) {
      setError({ text: t('soc.errUrl'), field: 'url' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (item) {
        const patch = changes(bodyOf(initial), body);
        if (Object.keys(patch).length) await socials.update(item.id, patch);
        onSaved(false);
      } else {
        if (!body.image) delete body.image;
        await socials.create(body);
        onSaved(true);
      }
    } catch (err) {
      setError({ text: errorText(err, t) });
      setBusy(false);
    }
  }

  const bad = (l) => error?.field === 'name' && error.langs?.includes(l);
  return (
    <Modal
      title={t(item ? 'soc.editTitle' : 'soc.newTitle')}
      size="md"
      onClose={onClose}
      busy={busy}
      footer={<FormFooter formId={formId} busy={busy} disabled={uploads > 0} error={error?.text} onCancel={onClose} />}
    >
      <form id={formId} className="adm-form" onSubmit={submit} noValidate>
        <Section title={t('soc.icon')}>
          <div className="adm-icongrid" role="radiogroup" aria-label={t('soc.icon')}>
            {SOCIAL_ICON_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={form.icon === key}
                title={ICON_LABELS[key] ?? key}
                onClick={() => pickIcon(key)}
              >
                <SocialIcon name={key} />
              </button>
            ))}
          </div>
          <small className="adm-field__hint">{t('soc.iconHint')}</small>
        </Section>

        <Section title={t('soc.colName')}>
          <div className="adm-grid-3">
            {LANG_KEYS.map((l) => (
              <Field
                key={l}
                label={l.toUpperCase()}
                value={form.name[l]}
                maxLength={60}
                invalid={bad(l)}
                onChange={(e) => set({ name: { ...form.name, [l]: e.target.value } })}
              />
            ))}
          </div>
        </Section>

        <Section title={t('soc.url')}>
          <Field
            label={t('soc.url')}
            hint={t('soc.urlHint')}
            value={form.url}
            placeholder="https://t.me/m_academy"
            inputMode="url"
            spellCheck={false}
            autoCapitalize="off"
            maxLength={500}
            invalid={error?.field === 'url'}
            onChange={(e) => set({ url: e.target.value })}
          />
          <div className="adm-grid-2">
            <Field
              type="number"
              label={t('course.order')}
              hint={t('course.orderHint')}
              value={form.sort_order}
              min={0}
              step={1}
              onChange={(e) => set({ sort_order: e.target.value })}
            />
          </div>
          <Switch label={t('soc.active')} hint={t('soc.activeHint')} checked={form.is_active} onChange={(v) => set({ is_active: v })} />
        </Section>

        <Section title={t('soc.image')}>
          <MediaField
            hint={t('soc.imageHint')}
            value={form.image}
            onBusy={(on) => setUploads((n) => Math.max(0, n + (on ? 1 : -1)))}
            onChange={(path) => set({ image: path })}
          />
        </Section>
      </form>
    </Modal>
  );
}
