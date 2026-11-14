/*
  Built-in course list. The site now reads courses from the backend (src/lib/catalog.js);
  this list is only the stand-in while the backend has no published courses, and the
  decorative globe / mentors use it for glyphs and names. `slug` matches the backend's
  course slug, so /register?course=ingliz-tili picks the same course either way.
*/

export const CATS = {
  lang: { uz: 'Til', ru: 'Язык', en: 'Language' },
  exact: { uz: 'Aniq fan', ru: 'Точная наука', en: 'Exact science' },
  social: { uz: 'Ijtimoiy fan', ru: 'Общественная наука', en: 'Social science' },
};

export const COURSES = [
  { g: 'En', cat: 'lang', uz: 'Ingliz tili', slug: 'ingliz-tili', ru: 'Английский язык', en: 'English' },
  { g: '한', cat: 'lang', uz: 'Koreys tili', slug: 'koreys-tili', ru: 'Корейский язык', en: 'Korean' },
  { g: '日', cat: 'lang', uz: 'Yapon tili', slug: 'yapon-tili', ru: 'Японский язык', en: 'Japanese' },
  { g: '中', cat: 'lang', uz: 'Xitoy tili', slug: 'xitoy-tili', ru: 'Китайский язык', en: 'Chinese' },
  { g: 'Я', cat: 'lang', uz: 'Rus tili', slug: 'rus-tili', ru: 'Русский язык', en: 'Russian' },
  { g: 'Ä', cat: 'lang', uz: 'Nemis tili', slug: 'nemis-tili', ru: 'Немецкий язык', en: 'German' },
  { g: 'É', cat: 'lang', uz: 'Fransuz tili', slug: 'fransuz-tili', ru: 'Французский язык', en: 'French' },
  { g: 'Ş', cat: 'lang', uz: 'Turk tili', slug: 'turk-tili', ru: 'Турецкий язык', en: 'Turkish' },
  { g: 'O‘', cat: 'lang', uz: 'O‘zbek tili', slug: 'ozbek-tili', ru: 'Узбекский язык', en: 'Uzbek' },
  { g: '∑', cat: 'exact', uz: 'Matematika', slug: 'matematika', ru: 'Математика', en: 'Mathematics' },
  { g: 'λ', cat: 'exact', uz: 'Fizika', slug: 'fizika', ru: 'Физика', en: 'Physics' },
  { g: 'H₂', cat: 'exact', uz: 'Kimyo', slug: 'kimyo', ru: 'Химия', en: 'Chemistry' },
  { g: 'Ψ', cat: 'exact', uz: 'Biologiya', slug: 'biologiya', ru: 'Биология', en: 'Biology' },
  { g: 'Ⅻ', cat: 'social', uz: 'Tarix', slug: 'tarix', ru: 'История', en: 'History' },
  { g: '◎', cat: 'social', uz: 'Geografiya', slug: 'geografiya', ru: 'География', en: 'Geography' },
  { g: '§', cat: 'social', uz: 'Huquq', slug: 'huquq', ru: 'Право', en: 'Law' },
];

/**
 * Social links in the footer ('#' = not set yet).
 * The sign-up form sends applications to the backend (POST /api/leads) — see pages/Register.jsx.
 */
export const CONFIG = {
  telegram: '#',
  instagram: '#',
  youtube: '#',
};
