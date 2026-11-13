/* Course catalogue — edit here to add / rename directions. */

export const CATS = {
  lang: { uz: 'Til', ru: 'Язык', en: 'Language' },
  exact: { uz: 'Aniq fan', ru: 'Точная наука', en: 'Exact science' },
  social: { uz: 'Ijtimoiy fan', ru: 'Общественная наука', en: 'Social science' },
};

export const COURSES = [
  { g: 'En', cat: 'lang', uz: 'Ingliz tili', ru: 'Английский язык', en: 'English' },
  { g: '한', cat: 'lang', uz: 'Koreys tili', ru: 'Корейский язык', en: 'Korean' },
  { g: '日', cat: 'lang', uz: 'Yapon tili', ru: 'Японский язык', en: 'Japanese' },
  { g: '中', cat: 'lang', uz: 'Xitoy tili', ru: 'Китайский язык', en: 'Chinese' },
  { g: 'Я', cat: 'lang', uz: 'Rus tili', ru: 'Русский язык', en: 'Russian' },
  { g: 'Ä', cat: 'lang', uz: 'Nemis tili', ru: 'Немецкий язык', en: 'German' },
  { g: 'É', cat: 'lang', uz: 'Fransuz tili', ru: 'Французский язык', en: 'French' },
  { g: 'Ş', cat: 'lang', uz: 'Turk tili', ru: 'Турецкий язык', en: 'Turkish' },
  { g: 'O‘', cat: 'lang', uz: 'O‘zbek tili', ru: 'Узбекский язык', en: 'Uzbek' },
  { g: '∑', cat: 'exact', uz: 'Matematika', ru: 'Математика', en: 'Mathematics' },
  { g: 'λ', cat: 'exact', uz: 'Fizika', ru: 'Физика', en: 'Physics' },
  { g: 'H₂', cat: 'exact', uz: 'Kimyo', ru: 'Химия', en: 'Chemistry' },
  { g: 'Ψ', cat: 'exact', uz: 'Biologiya', ru: 'Биология', en: 'Biology' },
  { g: 'Ⅻ', cat: 'social', uz: 'Tarix', ru: 'История', en: 'History' },
  { g: '◎', cat: 'social', uz: 'Geografiya', ru: 'География', en: 'Geography' },
  { g: '§', cat: 'social', uz: 'Huquq', ru: 'Право', en: 'Law' },
];

/**
 * Contact + lead form settings.
 * formEndpoint: URL that accepts a JSON POST ({ name, phone, course, lang }).
 * While it is empty the form runs in demo mode: nothing is sent anywhere.
 */
export const CONFIG = {
  formEndpoint: '',
  telegram: '#',
  instagram: '#',
  youtube: '#',
};
