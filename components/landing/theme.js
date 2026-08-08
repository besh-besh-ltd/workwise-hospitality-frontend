// Landing page design tokens — Workwise navy + gold.
//
// Hotel-brand-book typography over the brand's own palette: navy carries the
// reading, gold carries the calls to action.
//
// Light only. A marketing page has no dark mode.

/* Surfaces ---------------------------------------------------------------- */
export const PAPER = '#FFFFFF'; // page canvas
export const PAPER_ALT = '#F4F7FA'; // alternating sections
export const PAPER_DEEP = '#E9EFF6'; // cards, wells, inset panels

/* Ink --------------------------------------------------------------------- */
export const INK = '#0B1F3A'; // headlines — brand navy
export const INK_2 = '#44546A'; // body copy
export const INK_3 = '#8496AB'; // eyebrows, labels, captions
export const RULE = '#DBE3EC'; // hairline dividers

/* Accent ------------------------------------------------------------------ */
// Two golds by role, because a single one cannot do both jobs legibly:
// GOLD is bright enough to own a button but only ~2.6:1 on white, so it is
// reserved for FILLS and always pairs with INK text. GOLD_DEEP is the gold for
// TEXT and hairlines on light surfaces (~5.1:1 on white) and doubles as the
// pressed state under a GOLD fill.
export const GOLD = '#C9A227'; // fills, marks, rules — never small text
export const GOLD_DEEP = '#8A6D13'; // accent text on light, hover / pressed
export const GOLD_WASH = '#FAF3E0'; // tinted backgrounds, icon wells

/* Data semantics ---------------------------------------------------------- */
export const GREEN = '#2C7A5B'; // positive: best price, savings, locked rate
export const TERRACOTTA = '#C2492B'; // negative: overpay, spread, delay

/* Type -------------------------------------------------------------------- */
// Instrument Serif ships regular + italic only. The constraint is the
// discipline: hierarchy comes from size and space, never from weight.
export const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif";
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
