import { useI18n } from '../i18n/index.jsx';
import { pick } from '../lib/http.js';
import { formatPhone, normalizePhone } from './resources.js';
import { Field, Icon, useT, useToast } from './ui.jsx';

/* Pieces shared by Leads and Students: a person's details form, the phone block, date filters. */

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const daysAgo = (n) => isoDay(new Date(Date.now() - n * 86400000));

/** "17 yosh" / "17 лет" / "17 y/o" */
export function ageLabel(n, lang) {
  if (n == null || n === '') return '';
  if (lang === 'ru') {
    const form = new Intl.PluralRules('ru').select(n);
    return `${n} ${form === 'one' ? 'год' : form === 'few' ? 'года' : 'лет'}`;
  }
  return lang === 'en' ? `${n} y/o` : `${n} yosh`;
}

/** Copy a phone number, with a toast. */
export function useCopyPhone() {
  const t = useT();
  const notify = useToast();
  return async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      notify(t('lead.copied'));
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };
}

/** A person's editable details as form values. */
export const personForm = (p = {}, extra = {}) => ({
  full_name: p.full_name ?? '',
  age: p.age != null ? String(p.age) : '',
  phone: formatPhone(p.phone ?? ''),
  region: p.region ?? '',
  ...extra,
});

/**
 * Check and convert the details form. Returns { body } or { error, field }.
 * `withCourse` adds course_id (a lead's course of interest; null clears it).
 */
export function readPerson(f, t, { withCourse = false } = {}) {
  const name = f.full_name.trim();
  if (name.length < 2) return { error: t('lead.errName'), field: 'full_name' };
  const age = Number(f.age);
  if (!Number.isInteger(age) || age < 3 || age > 100) return { error: t('lead.errAge'), field: 'age' };
  const phone = normalizePhone(f.phone);
  if (!phone) return { error: t('lead.errPhone'), field: 'phone' };
  if (!f.region) return { error: t('lead.errRegion'), field: 'region' };
  const body = { full_name: name, age, phone, region: f.region };
  if (withCourse) body.course_id = f.course_id || null;
  return { body };
}

/** Name, age, phone, region (and, for leads, the course of interest). */
export function PersonFields({ form, setForm, error, regionList, courses = [], withCourse = false }) {
  const t = useT();
  const { lang } = useI18n();
  const bind = (key) => ({
    value: form[key],
    invalid: error?.field === key,
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });
  return (
    <>
      <div className="adm-grid-2 adm-grid-2--name">
        <Field label={t('lead.name')} maxLength={100} autoComplete="off" {...bind('full_name')} />
        <Field label={t('lead.ageField')} type="number" min={3} max={100} step={1} {...bind('age')} />
      </div>
      <div className="adm-grid-2">
        <Field label={t('lead.phone')} type="tel" inputMode="tel" placeholder="+998 90 123 45 67" hint={t('lead.phoneHint')} {...bind('phone')} />
        <Field label={t('lead.region')} type="select" {...bind('region')}>
          <option value="">{t('lead.chooseRegion')}</option>
          {regionList.map((r) => (
            <option key={r.key} value={r.key}>
              {pick(r.name, lang)}
            </option>
          ))}
        </Field>
      </div>
      {withCourse && (
        <Field label={t('lead.course')} type="select" {...bind('course_id')}>
          <option value="">{t('course.noCategory')}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {pick(c.title, lang)}
            </option>
          ))}
        </Field>
      )}
    </>
  );
}

/** The big phone number, Call / Telegram / Copy, and a row of facts: [[label, value], …]. */
export function PhoneHero({ phone = '', facts = [] }) {
  const t = useT();
  const copy = useCopyPhone();
  return (
    <div className="adm-lead-hero">
      <a className="adm-lead-hero__phone" href={`tel:${phone}`}>
        {formatPhone(phone)}
      </a>
      <div className="adm-row">
        <a className="adm-btn adm-btn--primary adm-btn--sm" href={`tel:${phone}`}>
          <Icon name="phone" />
          {t('lead.call')}
        </a>
        <a className="adm-btn adm-btn--ghost adm-btn--sm" href={`https://t.me/${phone.replace(/\s/g, '')}`} target="_blank" rel="noopener noreferrer">
          <Icon name="send" />
          {t('lead.telegram')}
        </a>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => copy(phone)}>
          <Icon name="copy" />
          {t('lead.copy')}
        </button>
      </div>
      {facts.length > 0 && (
        <dl className="adm-lead-facts" style={{ '--cols': facts.length }}>
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || '—'}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Today / 7 days / 30 days chips plus from–to dates. onChange({ from, to }). */
export function DateFilter({ from, to, onChange }) {
  const t = useT();
  const preset = from === isoDay(new Date()) && !to ? 'today' : from === daysAgo(6) && !to ? 'week' : from === daysAgo(29) && !to ? 'month' : '';
  return (
    <>
      <div className="adm-presets" role="group">
        {[
          ['today', 'leads.today', isoDay(new Date())],
          ['week', 'leads.week', daysAgo(6)],
          ['month', 'leads.month', daysAgo(29)],
        ].map(([key, label, day]) => (
          <button
            key={key}
            type="button"
            className="adm-chip adm-chip--sm"
            aria-pressed={preset === key}
            onClick={() => onChange(preset === key ? { from: '', to: '' } : { from: day, to: '' })}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <label className="adm-date">
        <span>{t('leads.from')}</span>
        <input type="date" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value, to })} />
      </label>
      <label className="adm-date">
        <span>{t('leads.to')}</span>
        <input type="date" value={to} min={from || undefined} onChange={(e) => onChange({ from, to: e.target.value })} />
      </label>
    </>
  );
}

/** A phone cell for tables: a tel: link and a copy button. */
export function PhoneCell({ phone }) {
  const t = useT();
  const copy = useCopyPhone();
  return (
    <>
      <a className="adm-phone" href={`tel:${phone}`}>
        {formatPhone(phone)}
      </a>
      <button type="button" className="adm-icon-btn adm-icon-btn--xs" title={t('lead.copy')} aria-label={t('lead.copy')} onClick={() => copy(phone)}>
        <Icon name="copy" />
      </button>
    </>
  );
}
