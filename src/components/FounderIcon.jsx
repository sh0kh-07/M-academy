/*
  Icons for the founder page. The API sends a keyword (highlights[].icon, stats[].icon);
  this is the picture for each one. The admin panel offers exactly these keys.
  Unknown keys fall back to a star.
*/

export const FOUNDER_ICONS = {
  'graduation-cap': (
    <>
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.2V16c0 1.6 2.7 3 6 3s6-1.4 6-3v-4.8" />
      <path d="M22 9v5.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16 14.6c2.6.1 4.4 1.7 5 4.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6" />
    </>
  ),
  teacher: (
    <>
      <circle cx="8" cy="7.5" r="2.8" />
      <path d="M3 19c.5-3.3 2.5-5.2 5-5.2 1.4 0 2.6.5 3.5 1.5" />
      <rect x="12.5" y="5" width="8.5" height="6.5" rx="1" />
      <path d="M14.5 14.5 16.5 11.5" />
    </>
  ),
  rocket: (
    <>
      <path d="M14 4.5c3-1 5.5-.5 5.5-.5s.5 2.5-.5 5.5c-1 3-4.5 6-7.5 7.5L8.5 14c1.5-3 4.5-8.5 5.5-9.5Z" />
      <circle cx="15" cy="9" r="1.6" />
      <path d="M8.5 14 5 13l2.5-3.5h3M10 15.5l1 3.5 3.5-2.5v-3" />
      <path d="M6.5 17.5 4 20" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z" />
      <path d="M12 6.5v13" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m8.7 13.6-1.4 7.4 4.7-2.8 4.7 2.8-1.4-7.4" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H4.5c0 3 1.5 4.5 3.7 4.8M16 6h3.5c0 3-1.5 4.5-3.7 4.8" />
      <path d="M12 13v4M8.5 20h7M10 17h4v3h-4z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5S14.4 18.1 12 20.5C9.6 18.1 8.5 15.3 8.5 12S9.6 5.9 12 3.5Z" />
    </>
  ),
  language: (
    <>
      <path d="M4 5.5h9M8.5 4v1.5c0 3.5-1.8 6.5-4.5 8M6 9c1 2 3 3.8 5.5 4.8" />
      <path d="m12.5 20 3.8-9 3.7 9M13.8 17h5" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L12 3.5Z" />,
  heart: <path d="M12 19.5S4 14.8 4 9.3A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.3c0 5.5-8 10.2-8 10.2Z" />,
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="m8 15 3.5-4 3 2.5L19 8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  certificate: (
    <>
      <rect x="3.5" y="4.5" width="17" height="12" rx="1.5" />
      <path d="M7.5 9h9M7.5 12h5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
      <path d="m15.3 18.6-.8 2.9 2-1 2 1-.8-2.9" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10.5 5-3v9l-5-3" />
    </>
  ),
};

export const FOUNDER_ICON_KEYS = Object.keys(FOUNDER_ICONS);

export default function FounderIcon({ name, className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {FOUNDER_ICONS[name] ?? FOUNDER_ICONS.star}
    </svg>
  );
}
