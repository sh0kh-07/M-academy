/*
  Icons for social links. The API sends a keyword (socials[].icon); this is the
  picture for each one, and the admin panel offers exactly these keys. An uploaded
  image (socials[].image) is shown instead when there is one. Unknown keys get a link icon.
*/

export const SOCIAL_ICONS = {
  telegram: <path d="M21 4.5 2.8 11.4c-.9.4-.9 1.6.1 1.9l4.5 1.4 1.7 5.3c.2.7 1.1.9 1.6.4l2.5-2.4 4.7 3.5c.6.4 1.4.1 1.6-.6L22.3 5.8c.2-.9-.6-1.6-1.3-1.3ZM9.5 14.3l8-6.3-6.4 7.4" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.2 6.8h.01" />
    </>
  ),
  youtube: (
    <>
      <path d="M21.6 7.6a2.6 2.6 0 0 0-1.8-1.8C18.2 5.4 12 5.4 12 5.4s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.6C2 9.2 2 12 2 12s0 2.8.4 4.4a2.6 2.6 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.6.4-4.4.4-4.4s0-2.8-.4-4.4Z" />
      <path d="m10 15 5.2-3L10 9v6Z" />
    </>
  ),
  facebook: <path d="M14 21v-7.5h2.6l.4-3H14V8.6c0-.9.3-1.5 1.5-1.5H17V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8.3v3H11V21" />,
  tiktok: <path d="M14.5 3.5v11.2a3.3 3.3 0 1 1-3.3-3.3M14.5 3.5c.4 2.4 2 4 4.5 4.3" />,
  x: <path d="M4 4l7 9.2L4.3 20H6l5.9-5.9L16.5 20H20l-7.3-9.6L19 4h-1.7l-5.4 5.4L7.5 4H4Z" />,
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8 10.5V16M8 7.8v.01M11.5 16v-5.5M11.5 13c0-1.7 1-2.6 2.3-2.6 1.4 0 2.2.9 2.2 2.6V16" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M4 20l1.2-4A8.5 8.5 0 1 1 8.4 19L4 20Z" />
      <path d="M9 8.5c0 3.3 3.2 6.5 6.5 6.5l1-1.5-2-1-1 .9c-1-.4-2-1.4-2.4-2.4l.9-1-1-2L9.5 8" />
    </>
  ),
  phone: <path d="M5 4h3.5l1.5 4-2 1.3a10 10 0 0 0 4.7 4.7L14 12l4 1.5V17a2 2 0 0 1-2 2A13 13 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  email: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m3.5 7 8.5 6.3L20.5 7" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5S14.4 18.1 12 20.5C9.6 18.1 8.5 15.3 8.5 12S9.6 5.9 12 3.5Z" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
};

export const SOCIAL_ICON_KEYS = Object.keys(SOCIAL_ICONS);

export default function SocialIcon({ name, className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {SOCIAL_ICONS[name] ?? SOCIAL_ICONS.link}
    </svg>
  );
}
