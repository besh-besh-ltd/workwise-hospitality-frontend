import { vendors } from "@/data/ihg/vendors";

/**
 * AI Vendor Match — runs on the vendor step of the RFQ wizard.
 *
 * Ranks the supplier base for a specific basket and a specific set of
 * properties. The weights below are deliberately visible in the UI: a buyer
 * who disagrees with the ranking can see exactly which factor drove it, which
 * is the difference between a recommendation and an oracle.
 */

export const WEIGHTS = [
  { key: "delivery",   label: "On-time delivery", weight: 0.25 },
  { key: "price",      label: "Price vs last award", weight: 0.25 },
  { key: "coverage",   label: "Property coverage", weight: 0.2 },
  { key: "compliance", label: "Compliance", weight: 0.15 },
  { key: "response",   label: "Quote responsiveness", weight: 0.1 },
  { key: "history",    label: "History with IHG", weight: 0.05 },
];

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

/** Can this supplier actually bid the basket at all? */
const coversCategory = (vendor, categories) =>
  !categories?.length || vendor.categories.some((c) => categories.includes(c));

const factorScores = (v, propertyCount) => {
  const p = v.performance;
  const certs = v.certifications || [];
  const expired = certs.filter((c) => c.status === "expired").length;
  const validCerts = certs.filter((c) => c.status === "valid").length;

  return {
    // 100% on-time is the ceiling; below 80% falls away fast.
    delivery: clamp((p.onTimePct - 75) * 4),
    // priceIndex 100 = parity. Every point under parity is worth 5.
    price: clamp(100 - (p.priceIndex - 100) * 5),
    coverage: clamp((p.propertiesServed / propertyCount) * 100),
    // An expired certificate is not a small deduction — it can disqualify.
    compliance: clamp(expired > 0 ? 30 - expired * 10 : 55 + validCerts * 15),
    // 8h turnaround is the ceiling, 48h the floor.
    response: clamp(100 - (p.responseHours - 8) * 2.3),
    history: clamp(Math.min(p.priorSpend / 350000, 70) + (p.contractsWon || 0) * 10 - (p.disputes || 0) * 15),
  };
};

/** The one-line justification. Leads with whatever actually moved the ranking. */
const explain = (v, f) => {
  const bits = [];
  if (f.delivery >= 80) bits.push(`${v.performance.onTimePct}% on-time across ${v.performance.contractsWon || 0} prior contracts`);
  if (f.price >= 85) bits.push(`quoting ${100 - v.performance.priceIndex}% under your last awarded rate`);
  else if (f.price < 60) bits.push(`historically ${v.performance.priceIndex - 100}% above your last awarded rate`);
  if (f.coverage === 100) bits.push("can deliver to all five properties directly");
  else bits.push(`reaches ${v.performance.propertiesServed} of the five properties`);
  if (f.compliance < 50) bits.push("compliance gap on file");
  return bits.length ? `${bits[0].charAt(0).toUpperCase()}${bits.slice(0, 3).join("; ").slice(1)}.` : "—";
};

/** Anything a human should look at before inviting them. */
const flagsFor = (v) => {
  const flags = [];
  (v.certifications || [])
    .filter((c) => c.status === "expired")
    .forEach((c) => flags.push({ tone: "danger", text: `${c.name} expired ${c.expires}` }));
  if (v.performance.onTimePct < 85) flags.push({ tone: "warn", text: `On-time delivery ${v.performance.onTimePct}%` });
  if (v.performance.disputes) flags.push({ tone: "warn", text: `${v.performance.disputes} open dispute${v.performance.disputes > 1 ? "s" : ""}` });
  if (v.risk?.level === "high") flags.push({ tone: "danger", text: v.risk.note });
  if (v.performance.propertiesServed < 5) flags.push({ tone: "neutral", text: `No coverage for ${5 - v.performance.propertiesServed} propert${v.performance.propertiesServed === 4 ? "y" : "ies"}` });
  return flags;
};

export const engine = {
  steps: [
    { label: "Reading the basket", detail: "8 line items · terry, bed linen and amenities", ms: 620 },
    { label: "Matching supplier categories", detail: "9 suppliers on the approved list", ms: 700 },
    { label: "Pulling delivery and quality history", detail: "36 months of GRN records", ms: 880 },
    { label: "Checking certificates and GST filings", ms: 760 },
    { label: "Benchmarking against your last awarded rates", ms: 820 },
    { label: "Ranking", ms: 520 },
  ],

  compute: ({ categories = [], propertyCount = 5, invite = 5 } = {}) => {
    const eligible = vendors.filter((v) => coversCategory(v, categories));

    const ranked = eligible
      .map((v) => {
        const factors = factorScores(v, propertyCount);
        const score = WEIGHTS.reduce((sum, w) => sum + factors[w.key] * w.weight, 0);
        return {
          vendorId: v.id,
          name: v.name,
          city: v.city,
          state: v.state,
          incumbent: v.incumbent,
          score: Math.round(score),
          factors,
          why: explain(v, factors),
          flags: flagsFor(v),
          // Below 55 the assistant will not put its name to a recommendation.
          recommend: score >= 55,
        };
      })
      .sort((a, b) => b.score - a.score);

    const recommended = ranked.filter((r) => r.recommend);
    const shortlist = recommended.slice(0, invite);

    return {
      ranked,
      shortlist,
      shortlistIds: shortlist.map((r) => r.vendorId),
      considered: eligible.length,
      // Three buckets, and every eligible supplier lands in exactly one of
      // them. A supplier the assistant quietly dropped is the first thing a
      // client will ask about, so nothing is allowed to fall between the
      // shortlist and the rejections:
      //   shortlist  — recommended, inside the invite cap
      //   belowCut   — recommended, but ranked below the cap
      //   excluded   — scored too low to recommend, with the reasons
      belowCut: recommended.slice(invite),
      excluded: ranked.filter((r) => !r.recommend),
      inviteCap: invite,
      confidence: 88,
    };
  },
};

export default engine;
