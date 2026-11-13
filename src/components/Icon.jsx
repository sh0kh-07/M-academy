const PATHS = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17 17 7M9 7h8v8" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  spark: (
    <>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <path d="m12 7.5 1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2L7.5 12l3.2-1.3L12 7.5Z" />
    </>
  ),
  cap: (
    <>
      <path d="M12 3 2 8l10 5 10-5-10-5Z" />
      <path d="M6 10.5V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5" />
      <path d="M22 8v6" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-5 4 3 5-7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 14-1.5 8 5-3 5 3-1.5-8" />
    </>
  ),
};

export default function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
