import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/index.jsx';
import { founder, LANG_KEYS } from '../resources.js';
import MediaField from '../MediaField.jsx';
import FounderIcon, { FOUNDER_ICON_KEYS } from '../../components/FounderIcon.jsx';
import { Alert, Field, Icon, LangTabs, PageHead, Spinner, Switch, errorText, useFormat, usePageTitle, useQuery, useT, useToast } from '../ui.jsx';

/*
  "Akademiya → Asoschisi" page (Swagger "Admin · Asoschi"). There is one page:
  PUT /admin/founder creates or replaces it whole, so the form always sends everything.
  Limits: titles ≤ 6, highlights ≤ 6, stats ≤ 8.
*/

const LIMITS = { titles: 6, highlights: 6, stats: 8 };
const blank = () => ({ uz: '', ru: '', en: '' });
const text = (v) => (v && typeof v === 'object' ? { ...blank(), ...v } : { ...blank(), uz: v ?? '' });
const clean = (v) => ({ uz: v.uz.trim(), ru: v.ru.trim(), en: v.en.trim() });
const filled = (v) => LANG_KEYS.some((l) => v[l].trim());

const EMPTY = {
  full_name: blank(),
  titles: [],
  bio: blank(),
  image: null,
  highlights: [],
  quote: blank(),
  signature: null,
  stats: [],
  is_active: true,
};

const toForm = (d) =>
  d
    ? {
        full_name: text(d.full_name),
        titles: (d.titles ?? []).map(text),
        bio: text(d.bio),
        image: d.image ?? null,
        highlights: (d.highlights ?? []).map((h) => ({ icon: h.icon || 'star', title: text(h.title), subtitle: text(h.subtitle) })),
        quote: text(d.quote),
        signature: d.signature ?? null,
        stats: (d.stats ?? []).map((s) => ({ icon: s.icon || 'users', value: text(s.value), label: text(s.label) })),
        is_active: d.is_active !== false,
      }
    : EMPTY;

/** The whole page as PUT expects it; empty rows are dropped, an empty quote becomes null. */
const toBody = (f) => ({
  full_name: clean(f.full_name),
  titles: f.titles.filter(filled).map(clean),
  bio: clean(f.bio),
  image: f.image || null,
  highlights: f.highlights
    .filter((h) => filled(h.title))
    .map((h) => ({ icon: h.icon, title: clean(h.title), subtitle: clean(h.subtitle) })),
  quote: filled(f.quote) ? clean(f.quote) : null,
  signature: f.signature || null,
  stats: f.stats.filter((s) => filled(s.value)).map((s) => ({ icon: s.icon, value: clean(s.value), label: clean(s.label) })),
  is_active: f.is_active,
});

/** Languages where a filled-in item is missing a translation. */
function missingLangs(body) {
  const out = new Set();
  const check = (v) => v && LANG_KEYS.forEach((l) => !v[l] && out.add(l));
  check(body.full_name);
  check(body.bio);
  check(body.quote);
  body.titles.forEach(check);
  body.highlights.forEach((h) => check(h.title));
  body.stats.forEach((s) => check(s.value));
  return [...out];
}

export default function FounderEdit() {
  const t = useT();
  const fmt = useFormat();
  const { lang } = useI18n();
  const notify = useToast();
  usePageTitle(t('founder.title'));

  const loaded = useQuery((signal) => founder.get(signal), []);
  const [initial, setInitial] = useState(EMPTY);
  const [form, setForm] = useState(EMPTY);
  const [tab, setTab] = useState(lang);
  const [uploads, setUploads] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null); // { text, langs? }
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (loaded.loading || loaded.error) return;
    const values = toForm(loaded.data);
    setInitial(values);
    setForm(values);
    setSavedAt(loaded.data?.updated_at ?? null);
  }, [loaded.loading, loaded.error, loaded.data]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setText = (key, value) => setForm((f) => ({ ...f, [key]: { ...f[key], [tab]: value } }));
  const busy = (on) => setUploads((n) => Math.max(0, n + (on ? 1 : -1)));

  /* lists: titles / highlights / stats */
  const updateItem = (list, i, patch) => setForm((f) => ({ ...f, [list]: f[list].map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const removeItem = (list, i) => setForm((f) => ({ ...f, [list]: f[list].filter((_, j) => j !== i) }));
  const moveItem = (list, i, step) =>
    setForm((f) => {
      const next = [...f[list]];
      [next[i], next[i + step]] = [next[i + step], next[i]];
      return { ...f, [list]: next };
    });
  const addItem = (list, item) => setForm((f) => (f[list].length >= LIMITS[list] ? f : { ...f, [list]: [...f[list], item] }));

  async function save() {
    if (saving || uploads) return;
    const body = toBody(form);
    if (!body.full_name.uz && !body.full_name.ru && !body.full_name.en) {
      setError({ text: t('founder.errName'), langs: LANG_KEYS });
      return;
    }
    const missing = missingLangs(body);
    if (missing.length) {
      if (!missing.includes(tab)) setTab(missing[0]);
      setError({ text: t('founder.errLangs'), langs: missing });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const saved = await founder.save(body);
      const values = saved && typeof saved === 'object' && saved.full_name ? toForm(saved) : form;
      setInitial(values);
      setForm(values);
      setSavedAt(saved?.updated_at ?? new Date().toISOString());
      notify(t('founder.saved'));
    } catch (err) {
      const langs = err.status === 400 ? [...new Set(err.messages.join(' ').match(/\.(uz|ru|en)\b/g)?.map((m) => m.slice(1)) ?? [])] : [];
      setError({ text: errorText(err, t), langs });
      if (langs.length && !langs.includes(tab)) setTab(langs[0]);
    } finally {
      setSaving(false);
    }
  }

  if (loaded.error) {
    return (
      <>
        <PageHead title={t('founder.title')} />
        <Alert tone="error">{errorText(loaded.error, t)}</Alert>
        <button type="button" className="adm-btn adm-btn--ghost adm-mt" onClick={loaded.reload}>
          <Icon name="refresh" />
          {t('boot.retry')}
        </button>
      </>
    );
  }
  if (loaded.loading && !loaded.data && !savedAt) {
    return (
      <div className="adm-loading">
        <Spinner />
      </div>
    );
  }

  const missing = error?.langs ?? [];
  const L = tab.toUpperCase();
  const exists = Boolean(savedAt);

  return (
    <>
      <PageHead title={t('founder.title')} text={t('founder.text')}>
        {exists && initial.is_active && (
          <a className="adm-btn adm-btn--ghost" href="/about/founder" target="_blank" rel="noopener">
            <Icon name="external" />
            {t('course.view')}
          </a>
        )}
      </PageHead>

      <div className="adm-editor">
        <div className="adm-editor__main adm-stack">
          {/* ---------- name, titles, text ---------- */}
          <section className="adm-card adm-stack">
            <div className="adm-card__bar">
              <h2 className="adm-card__title">{t('founder.main')}</h2>
              <LangTabs value={tab} onChange={setTab} missing={missing} />
            </div>
            <Field
              key={`n-${tab}`}
              label={`${t('founder.name')} · ${L}`}
              value={form.full_name[tab]}
              maxLength={120}
              placeholder="Muslim Mamarasulov"
              invalid={missing.includes(tab) && !form.full_name[tab].trim()}
              onChange={(e) => setText('full_name', e.target.value)}
            />

            <div className="adm-field">
              <span className="adm-field__label">
                {t('founder.titles')} · {L}
              </span>
              <div className="adm-repeat">
                {form.titles.map((item, i) => (
                  <div className="adm-repeat__row" key={i}>
                    <div className="adm-input">
                      <input
                        value={item[tab]}
                        maxLength={80}
                        placeholder={t('founder.titlePh')}
                        aria-label={`${t('founder.titles')} ${i + 1}`}
                        aria-invalid={(missing.includes(tab) && filled(item) && !item[tab].trim()) || undefined}
                        onChange={(e) => updateItem('titles', i, { [tab]: e.target.value })}
                      />
                    </div>
                    <RowTools list="titles" i={i} count={form.titles.length} onMove={moveItem} onRemove={removeItem} />
                  </div>
                ))}
              </div>
              <AddButton count={form.titles.length} limit={LIMITS.titles} label={t('founder.addTitle')} onClick={() => addItem('titles', blank())} />
              <small className="adm-field__hint">{t('founder.titlesHint')}</small>
            </div>

            <Field
              key={`b-${tab}`}
              type="textarea"
              rows={7}
              label={`${t('founder.bio')} · ${L}`}
              hint={t('founder.bioHint')}
              value={form.bio[tab]}
              invalid={missing.includes(tab) && filled(form.bio) && !form.bio[tab].trim()}
              onChange={(e) => setText('bio', e.target.value)}
            />
            <Field
              key={`q-${tab}`}
              type="textarea"
              rows={2}
              label={`${t('founder.quote')} · ${L}`}
              hint={t('founder.quoteHint')}
              value={form.quote[tab]}
              maxLength={400}
              invalid={missing.includes(tab) && filled(form.quote) && !form.quote[tab].trim()}
              onChange={(e) => setText('quote', e.target.value)}
            />
          </section>

          {/* ---------- cards under the text ---------- */}
          <section className="adm-card adm-stack">
            <div className="adm-card__bar">
              <div>
                <h2 className="adm-card__title">{t('founder.highlights')}</h2>
                <p className="adm-card__sub">{t('founder.highlightsHint')}</p>
              </div>
              <LangTabs value={tab} onChange={setTab} missing={missing} />
            </div>
            {form.highlights.map((h, i) => (
              <div className="adm-repeat__row adm-repeat__row--card" key={i}>
                <IconPick value={h.icon} onChange={(icon) => updateItem('highlights', i, { icon })} />
                <div className="adm-grid-2 adm-grow">
                  <Field
                    label={`${t('founder.hTitle')} · ${L}`}
                    value={h.title[tab]}
                    maxLength={60}
                    placeholder="TOPIK 4"
                    invalid={missing.includes(tab) && filled(h.title) && !h.title[tab].trim()}
                    onChange={(e) => updateItem('highlights', i, { title: { ...h.title, [tab]: e.target.value } })}
                  />
                  <Field
                    label={`${t('founder.hSub')} · ${L}`}
                    value={h.subtitle[tab]}
                    maxLength={80}
                    placeholder={t('founder.hSubPh')}
                    onChange={(e) => updateItem('highlights', i, { subtitle: { ...h.subtitle, [tab]: e.target.value } })}
                  />
                </div>
                <RowTools list="highlights" i={i} count={form.highlights.length} onMove={moveItem} onRemove={removeItem} />
              </div>
            ))}
            <AddButton
              count={form.highlights.length}
              limit={LIMITS.highlights}
              label={t('founder.addHighlight')}
              onClick={() => addItem('highlights', { icon: 'graduation-cap', title: blank(), subtitle: blank() })}
            />
          </section>

          {/* ---------- numbers ---------- */}
          <section className="adm-card adm-stack">
            <div className="adm-card__bar">
              <div>
                <h2 className="adm-card__title">{t('founder.stats')}</h2>
                <p className="adm-card__sub">{t('founder.statsHint')}</p>
              </div>
              <LangTabs value={tab} onChange={setTab} missing={missing} />
            </div>
            {form.stats.map((s, i) => (
              <div className="adm-repeat__row adm-repeat__row--card" key={i}>
                <IconPick value={s.icon} onChange={(icon) => updateItem('stats', i, { icon })} />
                <div className="adm-grid-2 adm-grow">
                  <Field
                    label={`${t('founder.sValue')} · ${L}`}
                    value={s.value[tab]}
                    maxLength={20}
                    placeholder="4 000+"
                    invalid={missing.includes(tab) && filled(s.value) && !s.value[tab].trim()}
                    onChange={(e) => updateItem('stats', i, { value: { ...s.value, [tab]: e.target.value } })}
                  />
                  <Field
                    label={`${t('founder.sLabel')} · ${L}`}
                    value={s.label[tab]}
                    maxLength={80}
                    placeholder={t('founder.sLabelPh')}
                    onChange={(e) => updateItem('stats', i, { label: { ...s.label, [tab]: e.target.value } })}
                  />
                </div>
                <RowTools list="stats" i={i} count={form.stats.length} onMove={moveItem} onRemove={removeItem} />
              </div>
            ))}
            <AddButton
              count={form.stats.length}
              limit={LIMITS.stats}
              label={t('founder.addStat')}
              onClick={() => addItem('stats', { icon: 'users', value: blank(), label: blank() })}
            />
          </section>
        </div>

        {/* ---------- side: photo, signature, publish ---------- */}
        <aside className="adm-editor__side">
          <section className="adm-card adm-stack">
            <h2 className="adm-card__title">{t('founder.publish')}</h2>
            <Switch label={t('founder.active')} hint={t('founder.activeHint')} checked={form.is_active} onChange={(v) => set({ is_active: v })} />
            {error && <Alert tone="error">{error.text}</Alert>}
            <button type="button" className="adm-btn adm-btn--primary adm-btn--block" disabled={saving || uploads > 0 || !dirty} onClick={save}>
              {saving && <Spinner />}
              {t(saving ? 'common.saving' : 'common.save')}
            </button>
            <small className="adm-field__hint">
              {dirty ? t('founder.unsaved') : exists ? t('founder.savedAt', { date: fmt.date(savedAt) }) : t('founder.notYet')}
            </small>
          </section>

          <section className="adm-card">
            <MediaField label={t('founder.photo')} hint={t('founder.photoHint')} value={form.image} portrait onBusy={busy} onChange={(v) => set({ image: v })} />
          </section>

          <section className="adm-card">
            <MediaField label={t('founder.signature')} hint={t('founder.signatureHint')} value={form.signature} onBusy={busy} onChange={(v) => set({ signature: v })} />
          </section>
        </aside>
      </div>
    </>
  );
}

/** Up / down / delete for one row of a list. */
function RowTools({ list, i, count, onMove, onRemove }) {
  const t = useT();
  return (
    <div className="adm-actions">
      <button type="button" className="adm-icon-btn" disabled={i === 0} onClick={() => onMove(list, i, -1)} title={t('lesson.up')} aria-label={t('lesson.up')}>
        <Icon name="arrowUp" />
      </button>
      <button type="button" className="adm-icon-btn" disabled={i === count - 1} onClick={() => onMove(list, i, 1)} title={t('lesson.down')} aria-label={t('lesson.down')}>
        <Icon name="arrowDown" />
      </button>
      <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => onRemove(list, i)} title={t('common.delete')} aria-label={t('common.delete')}>
        <Icon name="trash" />
      </button>
    </div>
  );
}

function AddButton({ count, limit, label, onClick }) {
  const t = useT();
  return (
    <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-self-start" disabled={count >= limit} onClick={onClick}>
      <Icon name="plus" />
      {label}
      <span className="adm-muted">
        {count}/{limit}
      </span>
      {count >= limit && <span className="adm-muted">· {t('founder.limit')}</span>}
    </button>
  );
}

/** Icon picker: the same pictures the site draws for each keyword. */
function IconPick({ value, onChange }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="adm-iconpick">
      <button type="button" className="adm-iconpick__btn" onClick={() => setOpen((v) => !v)} aria-expanded={open} title={t('founder.icon')} aria-label={t('founder.icon')}>
        <FounderIcon name={value} />
      </button>
      {open && (
        <div className="adm-iconpick__menu" role="listbox">
          {FOUNDER_ICON_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={key === value}
              title={key}
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
            >
              <FounderIcon name={key} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
