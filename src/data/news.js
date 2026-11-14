/*
  Sample news posts ("Yangiliklar").

  Real posts now come from the backend (admin panel → Yangiliklar; see src/lib/newsFeed.js).
  These samples only show while the backend has no published post.

  Fields:
    slug   — the address of the post: /news/<slug> (latin letters, digits, dashes)
    date   — YYYY-MM-DD; the list is shown newest first
    cat    — 'announce' | 'course' | 'event' | 'tech' (labels are in src/i18n/dict.js → news.cat.*)
    glyph  — one or two characters drawn on the cover
    sample — true shows the "Namuna" tag; remove it on real posts
    uz / ru / en — title, excerpt (one sentence for the card) and body (paragraphs)

  The posts below are samples written to show the layout.
*/

export const NEWS_CATS = ['announce', 'course', 'event', 'tech'];

export const NEWS = [
  {
    slug: 'qabul-boshlandi',
    date: '2026-11-10',
    cat: 'announce',
    glyph: 'M',
    sample: true,
    uz: {
      title: 'Yangi o‘quv mavsumiga qabul boshlandi',
      excerpt: 'M.ACADEMY barcha 16 yo‘nalish bo‘yicha yangi guruhlarga ariza qabul qilishni boshladi.',
      body: [
        'M.ACADEMY yangi o‘quv mavsumi uchun qabulni ochdi. Xorijiy tillar, aniq va ijtimoiy fanlar — jami 16 yo‘nalish bo‘yicha guruhlar shakllantirilmoqda.',
        'Ariza qoldirish uchun saytdagi ro‘yxatdan o‘tish sahifasida yo‘nalishni tanlang va aloqa ma’lumotlaringizni kiriting. Jamoamiz siz bilan bog‘lanib, darajangizni aniqlashga va mos guruhni tanlashga yordam beradi.',
        'Guruhlardagi o‘rinlar soni cheklangan, shuning uchun arizani ertaroq qoldirishni tavsiya qilamiz.',
      ],
    },
    ru: {
      title: 'Открыт набор на новый учебный сезон',
      excerpt: 'M.ACADEMY начала приём заявок в новые группы по всем 16 направлениям.',
      body: [
        'M.ACADEMY открыла набор на новый учебный сезон. Группы формируются по 16 направлениям: иностранные языки, точные и общественные науки.',
        'Чтобы оставить заявку, выберите направление на странице регистрации и укажите контакты. Наша команда свяжется с вами, поможет определить уровень и подобрать подходящую группу.',
        'Количество мест в группах ограничено, поэтому советуем не откладывать заявку.',
      ],
    },
    en: {
      title: 'Enrolment for the new season is open',
      excerpt: 'M.ACADEMY is now accepting applications for new groups across all 16 tracks.',
      body: [
        'M.ACADEMY has opened enrolment for the new learning season. Groups are forming across 16 tracks: foreign languages, exact sciences and social sciences.',
        'To apply, choose a track on the sign-up page and leave your contact details. Our team will get in touch, help assess your level and find the right group.',
        'Places in each group are limited, so we recommend applying early.',
      ],
    },
  },
  {
    slug: 'nigina-yordamchi',
    date: '2026-11-03',
    cat: 'tech',
    glyph: 'AI',
    sample: true,
    uz: {
      title: 'NIGINA: aqlli yordamchi ustida ish davom etmoqda',
      excerpt: 'Sun’iy intellektga asoslangan o‘quv yordamchimiz qanday bo‘lishi haqida qisqacha.',
      body: [
        'NIGINA — M.ACADEMY’ning sun’iy intellektga asoslangan o‘quv yordamchisi. Hozirda u ishlab chiqish bosqichida.',
        'Rejaga ko‘ra, NIGINA o‘quvchilarning savollariga javob beradi, mashqlarni tushuntiradi va har bir o‘quvchiga shaxsiy tavsiyalar beradi. Muloqot uch tilda — o‘zbek, rus va ingliz tillarida bo‘ladi.',
        'Yordamchi tayyor bo‘lishi bilan bu haqda shu sahifada xabar beramiz.',
      ],
    },
    ru: {
      title: 'NIGINA: работа над умным помощником продолжается',
      excerpt: 'Коротко о том, каким будет наш учебный помощник на базе искусственного интеллекта.',
      body: [
        'NIGINA — учебный помощник M.ACADEMY на базе искусственного интеллекта. Сейчас он находится в разработке.',
        'По плану NIGINA будет отвечать на вопросы учеников, объяснять упражнения и давать каждому личные рекомендации. Общаться с ней можно будет на трёх языках — узбекском, русском и английском.',
        'Как только помощник будет готов, мы сообщим об этом на этой странице.',
      ],
    },
    en: {
      title: 'NIGINA: work on the smart assistant continues',
      excerpt: 'A short note on what our AI-powered study assistant will be.',
      body: [
        'NIGINA is M.ACADEMY’s AI-powered study assistant. It is currently in development.',
        'The plan is for NIGINA to answer students’ questions, explain exercises and give each student personal recommendations. It will work in three languages — Uzbek, Russian and English.',
        'We will announce it on this page as soon as the assistant is ready.',
      ],
    },
  },
  {
    slug: 'ielts-guruhlari',
    date: '2026-10-27',
    cat: 'course',
    glyph: 'En',
    sample: true,
    uz: {
      title: 'Ingliz tili: IELTS’ga tayyorlov guruhlari',
      excerpt: 'Ingliz tili yo‘nalishida xalqaro imtihonga tayyorlanish uchun guruhlar ochiladi.',
      body: [
        'Ingliz tili yo‘nalishida IELTS imtihoniga tayyorlov guruhlari shakllantirilmoqda.',
        'Darslar to‘rt ko‘nikma — tinglash, o‘qish, yozish va gapirish — bo‘yicha olib boriladi. Har bir o‘quvchi uchun boshlang‘ich daraja aniqlanadi va shunga mos reja tuziladi.',
        'Guruhga yozilish uchun ro‘yxatdan o‘tish sahifasida «Ingliz tili» yo‘nalishini tanlang.',
      ],
    },
    ru: {
      title: 'Английский язык: группы подготовки к IELTS',
      excerpt: 'На направлении английского языка открываются группы подготовки к международному экзамену.',
      body: [
        'На направлении английского языка формируются группы подготовки к экзамену IELTS.',
        'Занятия строятся вокруг четырёх навыков — аудирования, чтения, письма и говорения. Для каждого ученика определяется стартовый уровень и составляется план под него.',
        'Чтобы записаться в группу, выберите направление «Английский язык» на странице регистрации.',
      ],
    },
    en: {
      title: 'English: IELTS preparation groups',
      excerpt: 'The English track is opening groups for international exam preparation.',
      body: [
        'IELTS preparation groups are forming on the English track.',
        'Lessons are built around the four skills — listening, reading, writing and speaking. Each student’s starting level is assessed and a plan is made to match.',
        'To join a group, choose the “English” track on the sign-up page.',
      ],
    },
  },
  {
    slug: 'ochiq-dars',
    date: '2026-10-18',
    cat: 'event',
    glyph: '◎',
    sample: true,
    uz: {
      title: 'Ochiq onlayn dars: akademiya bilan tanishuv',
      excerpt: 'Platforma, ustozlar va o‘quv jarayoni bilan tanishish uchun ochiq dars.',
      body: [
        'M.ACADEMY ochiq onlayn dars o‘tkazishni rejalashtirmoqda. Bu — akademiya bilan tanishishning eng oson yo‘li.',
        'Darsda platforma qanday ishlashi, o‘quv yo‘li qanday tuzilishi va natijalar qanday kuzatilishi ko‘rsatiladi. Savollaringizga ustozlar javob beradi.',
        'Dars sanasi va qatnashish tartibi alohida e’lon qilinadi.',
      ],
    },
    ru: {
      title: 'Открытый онлайн-урок: знакомство с академией',
      excerpt: 'Открытый урок, чтобы познакомиться с платформой, наставниками и учебным процессом.',
      body: [
        'M.ACADEMY планирует провести открытый онлайн-урок. Это самый простой способ познакомиться с академией.',
        'На уроке покажем, как устроена платформа, как строится учебный путь и как отслеживаются результаты. На вопросы ответят наставники.',
        'Дата урока и порядок участия будут объявлены отдельно.',
      ],
    },
    en: {
      title: 'Open online lesson: meet the academy',
      excerpt: 'An open lesson to get to know the platform, the mentors and how learning works.',
      body: [
        'M.ACADEMY is planning an open online lesson. It is the easiest way to get to know the academy.',
        'The lesson will show how the platform works, how a learning path is built and how results are tracked. Mentors will answer your questions.',
        'The date and how to take part will be announced separately.',
      ],
    },
  },
  {
    slug: 'uch-til',
    date: '2026-10-09',
    cat: 'tech',
    glyph: 'Aa',
    sample: true,
    uz: {
      title: 'Sayt endi uch tilda',
      excerpt: 'M.ACADEMY sayti o‘zbek, rus va ingliz tillarida ishlaydi.',
      body: [
        'M.ACADEMY sayti endi uch tilda — o‘zbek, rus va ingliz tillarida ochiladi.',
        'Tilni sahifaning yuqori qismidagi UZ / RU / EN tugmalari orqali almashtirish mumkin. Tanlov eslab qolinadi va keyingi safar sayt o‘sha tilda ochiladi.',
        'Kurslar ro‘yxati, yangiliklar va ro‘yxatdan o‘tish sahifasi ham tanlangan tilda ko‘rsatiladi.',
      ],
    },
    ru: {
      title: 'Сайт теперь на трёх языках',
      excerpt: 'Сайт M.ACADEMY работает на узбекском, русском и английском.',
      body: [
        'Сайт M.ACADEMY теперь открывается на трёх языках — узбекском, русском и английском.',
        'Язык переключается кнопками UZ / RU / EN в верхней части страницы. Выбор запоминается, и в следующий раз сайт откроется на том же языке.',
        'Список курсов, новости и страница регистрации тоже показываются на выбранном языке.',
      ],
    },
    en: {
      title: 'The site now speaks three languages',
      excerpt: 'The M.ACADEMY website works in Uzbek, Russian and English.',
      body: [
        'The M.ACADEMY website is now available in three languages — Uzbek, Russian and English.',
        'Switch language with the UZ / RU / EN buttons at the top of the page. Your choice is remembered, so the site opens in the same language next time.',
        'The course list, the news and the sign-up page are shown in the chosen language too.',
      ],
    },
  },
  {
    slug: 'aniq-fanlar',
    date: '2026-09-30',
    cat: 'course',
    glyph: '∑',
    sample: true,
    uz: {
      title: 'Aniq fanlar: matematika, fizika, kimyo va biologiya',
      excerpt: 'Aniq fanlar yo‘nalishidagi to‘rt fan haqida qisqacha.',
      body: [
        'M.ACADEMY’ning aniq fanlar yo‘nalishi to‘rt fanni o‘z ichiga oladi: matematika, fizika, kimyo va biologiya.',
        'Har bir fanda o‘quv yo‘li besh bosqichdan iborat — boshlang‘ichdan mutaxassisgacha. Mavzular nazariya bilan birga amaliy mashqlarda mustahkamlanadi.',
        'Yo‘nalishlar bilan «Kurslar» sahifasida tanishishingiz mumkin.',
      ],
    },
    ru: {
      title: 'Точные науки: математика, физика, химия и биология',
      excerpt: 'Коротко о четырёх предметах направления точных наук.',
      body: [
        'Направление точных наук M.ACADEMY включает четыре предмета: математику, физику, химию и биологию.',
        'По каждому предмету учебный путь состоит из пяти ступеней — от начального уровня до эксперта. Темы закрепляются не только теорией, но и практическими заданиями.',
        'Познакомиться с направлениями можно на странице «Курсы».',
      ],
    },
    en: {
      title: 'Exact sciences: mathematics, physics, chemistry and biology',
      excerpt: 'A short overview of the four subjects in the exact sciences track.',
      body: [
        'M.ACADEMY’s exact sciences track covers four subjects: mathematics, physics, chemistry and biology.',
        'In each subject the learning path has five stages — from beginner to expert. Topics are reinforced with practice as well as theory.',
        'You can explore the tracks on the Courses page.',
      ],
    },
  },
];

/** Newest first. */
const MONTHS = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** '2026-11-10' or an ISO timestamp → '10-noyabr, 2026' / '10 ноября 2026' / '10 November 2026' */
export function formatDate(value, lang) {
  if (!value) return '';
  let y;
  let m;
  let d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    [y, m, d] = value.split('-').map(Number);
  } else {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    [y, m, d] = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
  }
  const month = MONTHS[lang][m - 1];
  return lang === 'uz' ? `${d}-${month}, ${y}` : `${d} ${month} ${y}`;
}

/** A post's full text as paragraphs: sample posts keep a list, posts from the API one text split on line breaks. */
export function paragraphs(post, lang) {
  const body = post.body?.[lang] || post.body?.uz || post.body?.ru || post.body?.en || '';
  if (Array.isArray(body)) return body;
  return String(body)
    .split(/\n\s*\n|\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Reading time in whole minutes: the server's figure when there is one, otherwise ~160 words a minute. */
export function readingMinutes(post, lang) {
  if (post.minutes) return post.minutes;
  const words = paragraphs(post, lang).join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 160));
}
