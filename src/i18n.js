/* ------------------------------------------------------------------
   Three languages. Uzbek lives in index.html (it is the default and
   is read from the DOM on start); Russian and English live here.
   Keys match the data-i18n attributes.
   ------------------------------------------------------------------ */

const dict = {
  // strings that only exist in JS (not present in the markup)
  uz: {
    'meta.title': 'M.ACADEMY • Online School — Beyond Learning. Beyond Limits.',
    'meta.desc':
      'M.ACADEMY — zamonaviy onlayn ta’lim ekotizimi: xorijiy tillar, aniq va ijtimoiy fanlar bo‘yicha 16 ta yo‘nalish.',
    'chat.q': 'Present Perfect qachon ishlatiladi?',
    'chat.a':
      'Present Perfect o‘tmishda bo‘lib, natijasi hozir muhim bo‘lgan ish-harakatlar uchun ishlatiladi. Masalan: “I have finished my homework.”',
    'chat.q2': 'Yana bitta misol bering',
    'chat.a2': '“She has visited Samarkand twice.” — u Samarqandda ikki marta bo‘lgan, va bu tajriba hozir ham ahamiyatli.',
    'form.any': 'Hali tanlamadim',
    'course.enroll': 'Yozilish',
  },

  ru: {
    'meta.title': 'M.ACADEMY • Онлайн-школа — Beyond Learning. Beyond Limits.',
    'meta.desc':
      'M.ACADEMY — современная экосистема онлайн-образования: 16 направлений по иностранным языкам, точным и общественным наукам.',
    'nav.about': 'Академия',
    'nav.courses': 'Курсы',
    'nav.mentors': 'Наставники',
    'nav.results': 'Результаты',
    'nav.contact': 'Контакты',
    'cta.signup': 'Записаться',
    'hero.sub': 'Создавайте своё будущее с новыми знаниями.',
    'hero.cta1': 'Смотреть курсы',
    'hero.cta2': 'Учитесь с нами',
    'hero.tag1': 'Языки',
    'hero.tag2': 'Точные науки',
    'hero.tag3': 'Общественные науки',
    'hero.scroll': 'Листайте вниз',
    'about.eyebrow': 'Академия',
    'about.title': 'Современная <em>экосистема</em> онлайн-образования',
    'about.text':
      'M.ACADEMY — цифровая школа, где встречаются знания, технологии и вдохновение. Мы даём каждому ученику возможность учиться в своём темпе, из любой точки мира, с лучшими наставниками.',
    'about.f1.title': 'Единая экосистема',
    'about.f1.text': 'Уроки, материалы и результаты — всё собрано на одной удобной платформе.',
    'about.f2.title': 'Личный путь',
    'about.f2.text': 'Учебная траектория под уровень и цель каждого ученика.',
    'about.f3.title': 'Технологии будущего',
    'about.f3.text': 'Обучение, усиленное искусственным интеллектом и интерактивными инструментами.',
    'courses.eyebrow': 'Курсы',
    'courses.title': 'Откройте путь <em>в мир знаний</em>',
    'courses.sub': 'От иностранных языков до точных и общественных наук — 16 направлений.',
    'courses.all': 'Все',
    'courses.lang': 'Языки',
    'courses.exact': 'Точные науки',
    'courses.social': 'Общественные науки',
    'why.eyebrow': 'Почему M.ACADEMY',
    'why.title': 'Новый <em>стандарт</em> образования',
    'why.1.title': 'Опытные наставники',
    'why.1.text': 'Эксперты своего дела делятся знаниями и вдохновением.',
    'why.2.title': 'Современная экосистема',
    'why.2.text': 'Весь учебный процесс — в едином цифровом пространстве.',
    'why.3.title': 'Контроль результата',
    'why.3.text': 'Каждый ваш шаг — в ясном и понятном виде.',
    'why.4.title': 'Гибкое обучение',
    'why.4.text': 'Учитесь в удобное время и в удобном месте.',
    'why.5.title': 'Достижения',
    'why.5.text': 'Каждый успех замечают и поощряют.',
    'mentors.eyebrow': 'Наставники',
    'mentors.title': 'Наставники, которые <em>вдохновляют</em>',
    'mentors.sub': 'Команда экспертов, которые делятся знаниями с любовью.',
    'mentors.name': 'Имя наставника',
    'mentors.exp1': 'опыт 8+ лет',
    'mentors.exp2': 'опыт 6+ лет',
    'mentors.exp3': 'опыт 10+ лет',
    'mentors.exp4': 'опыт 7+ лет',
    'mentors.note': 'Примеры профилей — настоящие наставники появятся здесь совсем скоро.',
    'common.sample': 'Пример',
    'results.eyebrow': 'Результаты',
    'results.title': '<em>M.ACADEMY</em> в цифрах',
    'results.s1': 'Учеников',
    'results.s2': 'Направлений',
    'results.s3': 'Наставников',
    'results.s4': 'Довольны обучением',
    'results.w1.title': 'Международные сертификаты',
    'results.w1.text': 'Здесь будут результаты IELTS, TOPIK, HSK и других экзаменов.',
    'results.w2.title': 'Победители олимпиад',
    'results.w2.text': 'Место для достижений на предметных олимпиадах.',
    'results.w3.title': 'Поступление в вузы',
    'results.w3.text': 'Успехи наших учеников в высшем образовании.',
    'results.note': 'Значения-примеры — реальные данные будут добавлены позже.',
    'path.eyebrow': 'Учебный путь',
    'path.title': 'От новичка <em>до эксперта</em>',
    'path.1.title': 'Начальный',
    'path.1.text': 'Определяем уровень и ставим цели.',
    'path.2.title': 'База',
    'path.2.text': 'Прочный фундамент и правильные привычки.',
    'path.3.title': 'Средний',
    'path.3.text': 'Знания закрепляются практикой.',
    'path.4.title': 'Продвинутый',
    'path.4.text': 'Сложные темы и подготовка к экзаменам.',
    'path.5.title': 'Эксперт',
    'path.5.text': 'Свободное владение и новые вершины.',
    'stories.eyebrow': 'Отзывы учеников',
    'stories.title': 'Истории <em>успеха</em>',
    'stories.quote': 'Здесь будет настоящий отзыв ученика.',
    'stories.name': 'Имя ученика',
    'stories.course': 'Название курса',
    'stories.note': 'Места-примеры — настоящие отзывы публикуются с согласия учеников.',
    'nigina.badge': 'В разработке',
    'nigina.eyebrow': 'Искусственный интеллект',
    'nigina.sub': 'Ваш умный учебный помощник',
    'nigina.text':
      'NIGINA — помощник M.ACADEMY на базе искусственного интеллекта. Она отвечает на вопросы, объясняет упражнения и персонализирует ваш учебный путь.',
    'nigina.c1': 'Ответы 24/7',
    'nigina.c2': 'Личные рекомендации',
    'nigina.c3': 'Разбор упражнений',
    'nigina.c4': 'Общение на трёх языках',
    'nigina.note': 'Скоро — NIGINA запустится на следующих этапах.',
    'nigina.demo': 'демо',
    'nigina.placeholder': 'Напишите свой вопрос…',
    'chat.q': 'Когда используется Present Perfect?',
    'chat.a':
      'Present Perfect описывает действие в прошлом, результат которого важен сейчас. Например: «I have finished my homework».',
    'chat.q2': 'Дай ещё один пример',
    'chat.a2': '«She has visited Samarkand twice» — она была в Самарканде дважды, и этот опыт важен сейчас.',
    'cta.eyebrow': 'Время начать',
    'cta.title': 'Начните своё образовательное путешествие <em>сегодня</em>.',
    'cta.sub': 'Сделайте первый шаг — а дальше мы рядом.',
    'cta.contact': 'Связаться',
    'footer.tagline': 'Цифровая школа, где встречаются знания, технологии и вдохновение.',
    'footer.nav': 'Разделы',
    'footer.social': 'Соцсети',
    'footer.rights': 'Все права защищены.',
    'footer.top': 'Наверх ↑',
    'form.title': 'Запись на обучение',
    'form.sub': 'Оставьте контакты — мы свяжемся с вами.',
    'form.name': 'Ваше имя',
    'form.phone': 'Номер телефона',
    'form.course': 'Направление',
    'form.any': 'Пока не выбрал(а)',
    'form.error': 'Пожалуйста, укажите имя и корректный номер телефона.',
    'form.submit': 'Отправить заявку',
    'form.doneTitle': 'Спасибо!',
    'form.doneText': 'Заявка принята. Мы скоро свяжемся с вами.',
    'form.close': 'Закрыть',
    'course.enroll': 'Записаться',
  },

  en: {
    'meta.title': 'M.ACADEMY • Online School — Beyond Learning. Beyond Limits.',
    'meta.desc':
      'M.ACADEMY is a modern online learning ecosystem: 16 tracks across foreign languages, exact and social sciences.',
    'nav.about': 'Academy',
    'nav.courses': 'Courses',
    'nav.mentors': 'Mentors',
    'nav.results': 'Results',
    'nav.contact': 'Contact',
    'cta.signup': 'Sign up',
    'hero.sub': 'Shape your future with new knowledge.',
    'hero.cta1': 'Explore courses',
    'hero.cta2': 'Learn with us',
    'hero.tag1': 'Languages',
    'hero.tag2': 'Exact sciences',
    'hero.tag3': 'Social sciences',
    'hero.scroll': 'Scroll down',
    'about.eyebrow': 'Academy',
    'about.title': 'A modern online learning <em>ecosystem</em>',
    'about.text':
      'M.ACADEMY is a digital school where knowledge, technology and inspiration meet. We give every student the chance to learn at their own pace, from anywhere, with the best mentors.',
    'about.f1.title': 'One ecosystem',
    'about.f1.text': 'Lessons, materials and results — all in one convenient platform.',
    'about.f2.title': 'A personal path',
    'about.f2.text': 'A learning track matched to each student’s level and goals.',
    'about.f3.title': 'Future technologies',
    'about.f3.text': 'A learning experience enriched with AI and interactive tools.',
    'courses.eyebrow': 'Courses',
    'courses.title': 'Open the door to <em>a world of knowledge</em>',
    'courses.sub': 'From foreign languages to exact and social sciences — 16 tracks.',
    'courses.all': 'All',
    'courses.lang': 'Languages',
    'courses.exact': 'Exact sciences',
    'courses.social': 'Social sciences',
    'why.eyebrow': 'Why M.ACADEMY',
    'why.title': 'A new <em>standard</em> of education',
    'why.1.title': 'Experienced mentors',
    'why.1.text': 'Experts in their fields share knowledge and inspiration.',
    'why.2.title': 'A modern ecosystem',
    'why.2.text': 'The entire learning process in one digital space.',
    'why.3.title': 'Progress tracking',
    'why.3.text': 'Every step you take, clear and easy to follow.',
    'why.4.title': 'Flexible learning',
    'why.4.text': 'Learn at a time and place that suits you.',
    'why.5.title': 'Achievements',
    'why.5.text': 'Every success is recognised and rewarded.',
    'mentors.eyebrow': 'Mentors',
    'mentors.title': 'Mentors who <em>inspire</em>',
    'mentors.sub': 'A team of experts who share knowledge with passion.',
    'mentors.name': 'Mentor name',
    'mentors.exp1': '8+ years of experience',
    'mentors.exp2': '6+ years of experience',
    'mentors.exp3': '10+ years of experience',
    'mentors.exp4': '7+ years of experience',
    'mentors.note': 'Sample profiles — real mentors will appear here soon.',
    'common.sample': 'Sample',
    'results.eyebrow': 'Results',
    'results.title': '<em>M.ACADEMY</em> in numbers',
    'results.s1': 'Students',
    'results.s2': 'Tracks',
    'results.s3': 'Mentors',
    'results.s4': 'Satisfaction',
    'results.w1.title': 'International certificates',
    'results.w1.text': 'IELTS, TOPIK, HSK and other exam results will be shown here.',
    'results.w2.title': 'Olympiad winners',
    'results.w2.text': 'A place for achievements in subject olympiads.',
    'results.w3.title': 'University admissions',
    'results.w3.text': 'Our students’ success in higher education.',
    'results.note': 'Sample values — real data will be added later.',
    'path.eyebrow': 'Learning path',
    'path.title': 'From beginner <em>to expert</em>',
    'path.1.title': 'Beginner',
    'path.1.text': 'We assess your level and set goals.',
    'path.2.title': 'Foundation',
    'path.2.text': 'A solid base and the right habits.',
    'path.3.title': 'Intermediate',
    'path.3.text': 'Knowledge reinforced through practice.',
    'path.4.title': 'Advanced',
    'path.4.text': 'Complex topics and exam preparation.',
    'path.5.title': 'Expert',
    'path.5.text': 'Fluent mastery and new heights.',
    'stories.eyebrow': 'Student voices',
    'stories.title': 'Success <em>stories</em>',
    'stories.quote': 'A real student review will be placed here.',
    'stories.name': 'Student name',
    'stories.course': 'Course name',
    'stories.note': 'Sample slots — real reviews are published with students’ consent.',
    'nigina.badge': 'In development',
    'nigina.eyebrow': 'Artificial intelligence',
    'nigina.sub': 'Your smart study assistant',
    'nigina.text':
      'NIGINA is M.ACADEMY’s AI-powered assistant. She answers your questions, explains exercises and personalises your learning path.',
    'nigina.c1': '24/7 Q&A',
    'nigina.c2': 'Personal recommendations',
    'nigina.c3': 'Exercise breakdowns',
    'nigina.c4': 'Speaks three languages',
    'nigina.note': 'Coming soon — NIGINA launches in the next stages.',
    'nigina.demo': 'demo',
    'nigina.placeholder': 'Type your question…',
    'chat.q': 'When do I use the Present Perfect?',
    'chat.a':
      'Use the Present Perfect for a past action whose result matters now. For example: “I have finished my homework.”',
    'chat.q2': 'Give me one more example',
    'chat.a2': '“She has visited Samarkand twice.” — she has been there two times, and that experience still counts now.',
    'cta.eyebrow': 'Time to start',
    'cta.title': 'Start your learning journey <em>today</em>.',
    'cta.sub': 'Take the first step — we’ll be with you the rest of the way.',
    'cta.contact': 'Contact us',
    'footer.tagline': 'A digital school where knowledge, technology and inspiration meet.',
    'footer.nav': 'Sections',
    'footer.social': 'Social',
    'footer.rights': 'All rights reserved.',
    'footer.top': 'Back to top ↑',
    'form.title': 'Sign up',
    'form.sub': 'Leave your details and we’ll get in touch.',
    'form.name': 'Your name',
    'form.phone': 'Phone number',
    'form.course': 'Track',
    'form.any': 'Not decided yet',
    'form.error': 'Please enter your name and a valid phone number.',
    'form.submit': 'Send request',
    'form.doneTitle': 'Thank you!',
    'form.doneText': 'Your request has been received. We’ll be in touch soon.',
    'form.close': 'Close',
    'course.enroll': 'Enrol',
  },
};

const LANGS = ['uz', 'ru', 'en'];
const STORAGE_KEY = 'ma-lang';
const listeners = new Set();
let current = 'uz';

export function getLang() {
  return current;
}

export function t(key) {
  return dict[current]?.[key] ?? dict.uz[key] ?? key;
}

export function onLang(fn) {
  listeners.add(fn);
}

function apply() {
  document.documentElement.lang = current;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const html = t(el.dataset.i18n);
    if (el.innerHTML !== html) el.innerHTML = html;
  });
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.desc'));
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    const active = btn.dataset.lang === current;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

export function setLang(lang) {
  if (!LANGS.includes(lang) || lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private mode — language simply isn't remembered */
  }
  apply();
  listeners.forEach((fn) => fn(lang));
}

export function initI18n() {
  // Uzbek text is the markup itself: capture it once so we can switch back.
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (!(key in dict.uz)) dict.uz[key] = el.innerHTML.replace(/\s+/g, ' ').trim();
  });

  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (saved && LANGS.includes(saved)) current = saved;
  apply();

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (btn) setLang(btn.dataset.lang);
  });
}
