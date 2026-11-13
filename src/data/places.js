/**
 * Markers on the globe: the capital that stands in for each language the school teaches.
 * `course` is the index in COURSES (src/data/courses.js); `side` is where the label sits
 * relative to its marker, chosen so neighbouring labels do not collide.
 */
export const PLACES = [
  { course: 8, lat: 41.31, lon: 69.24, home: true, side: 'bottom' }, // Tashkent — Uzbek
  { course: 0, lat: 51.51, lon: -0.13, side: 'left' }, // London — English
  { course: 6, lat: 48.86, lon: 2.35, side: 'bottom-left' }, // Paris — French
  { course: 5, lat: 52.52, lon: 13.4, side: 'top' }, // Berlin — German
  { course: 4, lat: 55.75, lon: 37.62, side: 'top' }, // Moscow — Russian
  { course: 7, lat: 39.93, lon: 32.86, side: 'bottom' }, // Ankara — Turkish
  { course: 3, lat: 39.9, lon: 116.4, side: 'top' }, // Beijing — Chinese
  { course: 1, lat: 37.57, lon: 126.98, side: 'bottom' }, // Seoul — Korean
  { course: 2, lat: 35.68, lon: 139.69, side: 'right' }, // Tokyo — Japanese
];
