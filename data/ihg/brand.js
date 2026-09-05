/**
 * ── SWAP SURFACE 1 of 2 ──────────────────────────────────────────────
 * Everything that makes this portal look like IHG's rather than anyone
 * else's. Change these values and the whole product re-brands; no other
 * file hard-codes a colour, a name or a logo.
 *
 * PLACEHOLDER NOTICE: the palette below is an IHG-plausible navy/gold,
 * not values taken from IHG's brand guide, and the logo is a wordmark we
 * drew. Replace `logo.src` with the supplied asset and the palette with
 * the official hexes when they arrive — nothing else needs to move.
 * ─────────────────────────────────────────────────────────────────────
 */

export const brand = {
  // What the client sees this product called.
  clientName: "IHG Hotels & Resorts",
  clientShortName: "IHG",
  productName: "Procurement",
  // Shown under the logo in the sidebar footer and on the login screen.
  poweredBy: "Powered by Workwise",

  logo: {
    // The official secondary horizontal mark, taken from ihgplc.com. Two
    // variants because the login's left panel is navy: the supplied asset is
    // a single-fill SVG, so `white` is the same file with fill:#000 → #fff.
    src: "/ihg/ihg-logo.svg",
    srcLight: "/ihg/ihg-logo-white.svg",
    alt: "IHG Hotels & Resorts",
    // Native viewBox is 300×60; width is derived from the rendered height.
    width: 300,
    height: 60,
  },

  // Drives --primary / --primary-2 etc. in styles/tokens.css, which in turn
  // drives every accent in the copied portal shell.
  palette: {
    navy: "#00205B",       // deep brand navy — sidebar accents, headings
    primary: "#0B4DA2",    // the working accent: links, active nav, buttons
    primary2: "#2E7BD6",   // lighter accent: hovers, focus rings, chart line 2
    gold: "#B8893B",       // warm secondary — awards, savings, premium states
    goldSoft: "#FBF6EC",
    primarySoft: "#EEF4FC",
    primaryTint: "#F6FAFF",
  },

  login: {
    // Lifted from the live site's hero (data/landingPageContent.json) so the
    // login says exactly what workwise says, rather than a second version of it.
    eyebrow: "AI-Powered Procurement Platform",
    headline: "Procurement se Profit",
    tagline: "Crafted exclusively for Hospitality",
    subhead:
      "Every rupee, accounted for. Workwise runs RFQs, tenders and negotiations across every property on one platform — so you know you paid the right price, every single time.",
    // The site's proof band. Fills the panel's dead middle with something
    // worth reading instead of empty navy.
    stats: [
      { value: "6-9%", label: "Average cost reduction" },
      { value: "75%", label: "Less time to award" },
      { value: "1", label: "Rate per item, every property" },
    ],
    // Small print at the foot of the login card.
    footnote: "Demonstration environment · seeded with representative data",
  },
};

export default brand;
