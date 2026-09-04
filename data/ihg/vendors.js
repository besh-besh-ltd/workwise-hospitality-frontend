/**
 * The supplier base.
 *
 * This is the single richest fixture in the demo, because four different AI
 * features read from it: Vendor Match ranks on `performance`, the Negotiator
 * reasons from `concessionPattern` and `history`, the Technical Evaluator
 * cites `evidence`, and the PO Decision Memo scores `risk`. Keeping it in one
 * place is what makes those four features agree with each other on screen.
 *
 * All suppliers are invented. The categories, certifications and Indian textile
 * clusters (Karur, Erode, Solapur) are real, so the data reads true to anyone
 * in the room who knows the category.
 */

export const vendors = [
  {
    id: "sriram",
    name: "Sriram Textiles Pvt Ltd",
    short: "Sriram Textiles",
    city: "Karur",
    state: "Tamil Nadu",
    since: 2019,
    incumbent: true,
    categories: ["Terry towelling", "Bath linen"],
    gst: "33AABCS4471K1ZP",
    performance: {
      onTimePct: 96,
      responseHours: 14,
      qualityRejectPct: 0.7,
      priceIndex: 94,          // 100 = parity with IHG's last awarded rate
      propertiesServed: 5,     // of the 5 in scope
      priorSpend: 31400000,
      contractsWon: 4,
      disputes: 0,
      fillRatePct: 98,
    },
    certifications: [
      { name: "OEKO-TEX Standard 100", status: "valid", expires: "2027-04-30" },
      { name: "ISO 9001:2015", status: "valid", expires: "2027-11-12" },
      { name: "SA8000 social compliance", status: "valid", expires: "2026-12-31" },
    ],
    risk: { level: "low", note: "Four years on contract, zero disputes, financials filed on time." },
    concessionPattern: "Opens close to target and moves 2–3% once. Rarely concedes twice.",
    strengths: ["Best on-time record in the base", "Serves all five properties directly"],
    watchOuts: ["Highest capacity utilisation — 82% committed for FY26-27"],
  },
  {
    id: "welspun",
    name: "Welspun Hospitality Solutions",
    short: "Welspun",
    city: "Anjar",
    state: "Gujarat",
    since: 2021,
    incumbent: false,
    categories: ["Bath linen", "Bed linen", "Bathrobes"],
    gst: "24AAACW1234M1Z8",
    performance: {
      onTimePct: 91,
      responseHours: 9,
      qualityRejectPct: 1.1,
      priceIndex: 102,
      propertiesServed: 5,
      priorSpend: 18700000,
      contractsWon: 2,
      disputes: 1,
      fillRatePct: 94,
    },
    certifications: [
      { name: "OEKO-TEX Standard 100", status: "valid", expires: "2027-08-19" },
      { name: "ISO 9001:2015", status: "valid", expires: "2028-02-28" },
      { name: "GOTS organic cotton", status: "valid", expires: "2027-06-30" },
    ],
    risk: { level: "low", note: "Large, well-capitalised. One delivery dispute in 2024, settled." },
    concessionPattern: "Opens high and concedes in steps — historically 6–8% across two rounds.",
    strengths: ["Fastest quote turnaround", "Deepest capacity — no volume ceiling"],
    watchOuts: ["Prices above the last award", "One prior dispute on short delivery"],
  },
  {
    id: "trident",
    name: "Trident Hometex Ltd",
    short: "Trident",
    city: "Budhni",
    state: "Madhya Pradesh",
    since: 2022,
    incumbent: false,
    categories: ["Bath linen", "Bed linen"],
    gst: "23AAACT5678N1ZQ",
    performance: {
      onTimePct: 89,
      responseHours: 21,
      qualityRejectPct: 1.4,
      priceIndex: 97,
      propertiesServed: 4,
      priorSpend: 9200000,
      contractsWon: 1,
      disputes: 0,
      fillRatePct: 92,
    },
    certifications: [
      { name: "OEKO-TEX Standard 100", status: "valid", expires: "2027-01-15" },
      { name: "ISO 9001:2015", status: "valid", expires: "2027-09-30" },
    ],
    risk: { level: "low", note: "Steady performer. No adverse findings." },
    concessionPattern: "Moves once, 3–4%, then holds firm.",
    strengths: ["Competitive on bed linen specifically"],
    watchOuts: ["Cannot serve Six Senses Fort Barwara — no Rajasthan logistics"],
  },
  {
    id: "aarvi",
    name: "Aarvi Linens & Amenities",
    short: "Aarvi",
    city: "Mumbai",
    state: "Maharashtra",
    since: 2020,
    incumbent: false,
    categories: ["Bath linen", "Amenities", "Bathrobes"],
    gst: "27AACFA9012P1ZR",
    performance: {
      onTimePct: 82,
      responseHours: 31,
      qualityRejectPct: 2.6,
      priceIndex: 107,
      propertiesServed: 3,
      priorSpend: 4100000,
      contractsWon: 1,
      disputes: 2,
      fillRatePct: 86,
    },
    certifications: [
      { name: "OEKO-TEX Standard 100", status: "expired", expires: "2026-03-31" },
      { name: "ISO 9001:2015", status: "valid", expires: "2027-05-20" },
    ],
    risk: {
      level: "high",
      note: "GST returns filed late in two of the last four quarters; OEKO-TEX lapsed in March.",
    },
    concessionPattern: "Concedes fast and deep — 9% in a single round — which usually signals the opening was padded.",
    strengths: ["Local to InterContinental Marine Drive"],
    watchOuts: [
      "OEKO-TEX certificate expired 31 Mar 2026",
      "On-time delivery 82% — lowest in the base",
      "Two open quality disputes",
    ],
  },
  {
    id: "nandan",
    name: "Nandan Terry Ltd",
    short: "Nandan Terry",
    city: "Ahmedabad",
    state: "Gujarat",
    since: 2023,
    incumbent: false,
    categories: ["Terry towelling", "Bath mats"],
    gst: "24AADCN3456Q1ZS",
    performance: {
      onTimePct: 94,
      responseHours: 12,
      qualityRejectPct: 0.9,
      priceIndex: 96,
      propertiesServed: 5,
      priorSpend: 6800000,
      contractsWon: 1,
      disputes: 0,
      fillRatePct: 95,
    },
    certifications: [
      { name: "OEKO-TEX Standard 100", status: "valid", expires: "2027-10-08" },
      { name: "ISO 9001:2015", status: "valid", expires: "2028-01-22" },
      { name: "BSCI audit", status: "valid", expires: "2027-03-15" },
    ],
    risk: { level: "low", note: "Newer to the base but clean on every measure." },
    concessionPattern: "Two small moves of 2% each. Patient negotiator.",
    strengths: ["Strong on terry specifically", "Best price-to-quality on bath mats"],
    watchOuts: ["Only three years of history with IHG"],
  },
  {
    id: "greenleaf",
    name: "GreenLeaf Amenities Pvt Ltd",
    short: "GreenLeaf",
    city: "Pune",
    state: "Maharashtra",
    since: 2022,
    incumbent: false,
    categories: ["Amenities", "Sustainable packaging"],
    gst: "27AAGCG7890R1ZT",
    performance: {
      onTimePct: 93,
      responseHours: 17,
      qualityRejectPct: 0.6,
      priceIndex: 99,
      propertiesServed: 5,
      priorSpend: 5600000,
      contractsWon: 2,
      disputes: 0,
      fillRatePct: 97,
    },
    certifications: [
      { name: "FSC Chain of Custody", status: "valid", expires: "2027-07-01" },
      { name: "ISO 14001:2015", status: "valid", expires: "2027-12-10" },
      { name: "Cruelty-free (Leaping Bunny)", status: "valid", expires: "2027-02-28" },
    ],
    risk: { level: "low", note: "Specialist supplier, consistently clean record." },
    concessionPattern: "Holds on unit price but will fund freight and packaging changes.",
    strengths: [
      "Only supplier meeting IHG's paraben-free and FSC carton spec without substitution",
      "Lowest quality reject rate in the base",
    ],
    watchOuts: ["Amenities only — cannot bid the linen lines"],
  },

  // ── invited but did not quote ──────────────────────────────────
  {
    id: "kaveri",
    name: "Kaveri Home Textiles",
    short: "Kaveri",
    city: "Erode",
    state: "Tamil Nadu",
    since: 2021,
    incumbent: false,
    quoted: false,
    categories: ["Bed linen"],
    performance: { onTimePct: 88, responseHours: 26, priceIndex: 101, propertiesServed: 4, priorSpend: 3200000, contractsWon: 0, disputes: 0 },
    certifications: [{ name: "OEKO-TEX Standard 100", status: "valid", expires: "2027-05-05" }],
    risk: { level: "medium", note: "Declined to quote — capacity booked through Q3." },
  },
  {
    id: "orientcraft",
    name: "Orient Craft Hospitality",
    short: "Orient Craft",
    city: "Gurugram",
    state: "Haryana",
    since: 2024,
    incumbent: false,
    quoted: false,
    categories: ["Bathrobes", "Bed linen"],
    performance: { onTimePct: 90, responseHours: 19, priceIndex: 104, propertiesServed: 3, priorSpend: 1400000, contractsWon: 0, disputes: 0 },
    certifications: [{ name: "ISO 9001:2015", status: "valid", expires: "2027-08-30" }],
    risk: { level: "medium", note: "No response by the submission deadline." },
  },
  {
    id: "solapur",
    name: "Solapur Terry Mills",
    short: "Solapur Terry",
    city: "Solapur",
    state: "Maharashtra",
    since: 2025,
    incumbent: false,
    quoted: false,
    categories: ["Terry towelling"],
    performance: { onTimePct: 79, responseHours: 44, priceIndex: 93, propertiesServed: 2, priorSpend: 620000, contractsWon: 0, disputes: 1 },
    certifications: [],
    risk: { level: "high", note: "Regretted — cannot meet the 500 GSM specification." },
  },
];

export const vendorsById = Object.fromEntries(vendors.map((v) => [v.id, v]));
export const getVendor = (id) => vendorsById[id] || null;

/** The six who actually responded, in the order they submitted. */
export const quotingVendorIds = ["welspun", "sriram", "nandan", "trident", "greenleaf", "aarvi"];

export default vendors;
