/**
 * ── SWAP SURFACE 1 of 2 ──────────────────────────────────────────────
 * Everything that makes this portal look like Workwise's rather than
 * anyone else's. Change these values and the whole product re-brands; no
 * other file hard-codes a colour, a name or a logo.
 *
 * To re-skin the demo for a named client, replace `logo.src` with their
 * supplied asset and the palette with their official hexes — nothing
 * else needs to move.
 * ─────────────────────────────────────────────────────────────────────
 */

export const brand = {
  // What the client sees this product called.
  clientName: "Workwise",
  clientShortName: "Workwise",
  productName: "Procurement",
  // Shown under the logo in the sidebar footer and on the login screen.
  poweredBy: "Hospitality Procurement Suite",

  logo: {
    // The Workwise wordmark. Two variants because the login's left panel is
    // navy: the gold-on-transparent mark carries the light surfaces, the
    // reversed white mark carries the navy ones.
    src: "/assets/images/logo-workwise-gold.png",
    srcLight: "/assets/images/logo-workwise-white.png",
    alt: "Workwise",
    // Native pixel size is 865×184; width is derived from the rendered height.
    width: 865,
    height: 184,
  },

  // Drives --primary / --primary-2 etc. in styles/tokens.css, which in turn
  // drives every accent in the copied portal shell. These are Workwise's own
  // navy and gold, the same values the public landing page uses — see
  // components/landing/theme.js.
  palette: {
    navy: "#0B1F3A",       // deep brand navy — sidebar accents, headings
    primary: "#13315B",    // the working accent: links, active nav, buttons
    primary2: "#2E6DB4",   // lighter accent: hovers, focus rings, chart line 2
    gold: "#C9A227",       // warm secondary — awards, savings, premium states
    goldSoft: "#FBF6EC",
    primarySoft: "#EEF3FA",
    primaryTint: "#F6F9FD",
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
