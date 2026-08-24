// Landing page design tokens — Workwise navy + gold.
//
// Hotel-brand-book typography over the brand's own palette: navy carries the
// reading, gold carries the calls to action.
//
// Light only. A marketing page has no dark mode.

/* Surfaces ---------------------------------------------------------------- */
// Navy-dominant, matching the printed brochure: navy field, white type, gold
// accents. Sampled from the brochure photo, its gold is #D0A525 — the brand
// GOLD below is the same colour.
export const PAPER = '#0B1F3A'; // base navy canvas
export const PAPER_ALT = '#0E2748'; // alternating sections
export const PAPER_DEEP = '#13315B'; // cards, wells, inset panels

/* Ink --------------------------------------------------------------------- */
// "Ink" is now the light end of the scale, because it sits on navy.
export const INK = '#F2F6FA'; // headlines
export const INK_2 = '#B9C7D8'; // body copy
export const INK_3 = '#7F97B4'; // eyebrows, labels, captions
export const RULE = '#1E3B62'; // hairline dividers

/* Accent ------------------------------------------------------------------ */
// On navy both golds are legible, so they split by weight rather than by
// contrast: GOLD owns fills (always with PAPER-navy text on top), GOLD_DEEP is
// the brighter one used for accent text and for hover, which lifts on dark.
export const GOLD = '#C9A227'; // fills, marks, rules, accent text
export const GOLD_DEEP = '#E0BC4A'; // emphasis text, hover / pressed
export const GOLD_WASH = '#172C49'; // tinted wells behind gold icons

/* Data semantics ---------------------------------------------------------- */
export const GREEN = '#3FAE80'; // positive: best price, savings, locked rate
export const TERRACOTTA = '#E4795A'; // negative: overpay, spread, delay

/* Document palette -------------------------------------------------------- */
// The CardVisual illustrations depict printed quote sheets and screens, so they
// stay light no matter how dark the page around them is. Kept separate from the
// tokens above so page-level theming can never make document text vanish.
export const DOC = '#FFFFFF';
export const DOC_INK = '#0B1F3A';
export const DOC_GOLD = '#8A6D13';
export const DOC_GREEN = '#2C7A5B';
export const DOC_RED = '#C2492B';

/* Type -------------------------------------------------------------------- */
// Source Serif 4: an optical-size variable face with real weights, wider and
// lower-contrast than Instrument Serif, which read as cramped at display sizes.
export const SERIF = "'Source Serif 4', Georgia, 'Times New Roman', serif";
export const SANS = "'Geist', -apple-system, BlinkMacSystemFont, sans-serif";
export const MONO = "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace";

export const TYPE = {
  display: 'clamp(2.75rem, 6vw, 4.75rem)',
  heading: 'clamp(2rem, 3.6vw, 3rem)',
  subheading: 'clamp(1.25rem, 2vw, 1.6rem)',
  body: 'clamp(1rem, 1.15vw, 1.0625rem)',
  small: '0.9rem',
  eyebrow: '0.72rem',
};

/* Layout ------------------------------------------------------------------ */
export const MAXW = '1240px';
export const GUTTER = 'clamp(20px, 5vw, 64px)';

// Standardised from the 15 ad-hoc breakpoints the first build accumulated.
export const BP = {
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
};
