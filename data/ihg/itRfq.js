/**
 * The IT RFQ — the one that demonstrates the masking rule.
 *
 * The linen thread shows the commercial story end to end, but it has no
 * technical clauses, so its quotes are visible as soon as bidding closes.
 * That contradicts the pitch line: "quotes are only visible once the technical
 * evaluation is done."
 *
 * This RFQ exists to make that true and demonstrable. Five items, five
 * suppliers, EVERY line quoted by EVERY supplier — so once the mask lifts the
 * grid is complete and every vendor carries a comparable total — and five
 * mandatory clauses that must be scored before any price is shown.
 */

export const IT_RFQ_ID = "535970";
export const IT_CATEGORY = "IT infrastructure";

export const itRfq = {
  id: IT_RFQ_ID,
  title: "Guest Network & Front-Desk Hardware Refresh — FY 2026-27",
  department: "Information Technology",
  propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"],
  status: "Quotes received",
  invited: 5,
  quoted: 5,
  closesOn: "2026-09-28",
  estimatedValue: 38600000,
  ownerId: "regional",
};

/** Five lines, priced per unit. `lastRate` is what IHG last paid, all-in ex-GST. */
export const itLineItems = [
  {
    id: "wifi-ap-6e",
    name: "Wi-Fi 6E Access Point",
    uom: "unit",
    spec: "Tri-band · WPA3 · PoE+ · ceiling mount",
    annualQty: 1240,
    lastRate: 18400,
  },
  {
    id: "switch-48-poe",
    name: "48-port PoE+ Switch",
    uom: "unit",
    spec: "740 W budget · 10G uplink · L3 lite",
    annualQty: 96,
    lastRate: 214000,
  },
  {
    id: "fd-workstation",
    name: "Front-Desk Workstation",
    uom: "unit",
    spec: "i5 · 16 GB · 512 GB NVMe · 3-yr on-site",
    annualQty: 210,
    lastRate: 62800,
  },
  {
    id: "pms-printer",
    name: "PMS Thermal Receipt Printer",
    uom: "unit",
    spec: "80 mm · USB + LAN · auto-cutter",
    annualQty: 180,
    lastRate: 14600,
  },
  {
    id: "ups-3kva",
    name: "3 kVA Rack UPS",
    uom: "unit",
    spec: "Online double-conversion · SNMP card · 2U",
    annualQty: 64,
    lastRate: 96500,
  },
];

/**
 * The five suppliers, and how each prices against the last purchase rate.
 * Full coverage is deliberate: this RFQ's job is to show a complete grid the
 * moment the technical gate lifts.
 */
export const itVendors = [
  { id: "it-netcore", name: "Netcore Systems Pvt Ltd", short: "Netcore", city: "Bengaluru", factor: 0.94, onTimePct: 95, leadDays: 28 },
  { id: "it-orbit", name: "Orbit Technologies Ltd", short: "Orbit", city: "Pune", factor: 0.97, onTimePct: 92, leadDays: 24 },
  { id: "it-zenith", name: "Zenith Infratech", short: "Zenith", city: "Gurugram", factor: 1.01, onTimePct: 88, leadDays: 35 },
  { id: "it-arcline", name: "Arcline Networks", short: "Arcline", city: "Chennai", factor: 0.99, onTimePct: 90, leadDays: 30 },
  { id: "it-vertex", name: "Vertex Digital Infra", short: "Vertex", city: "Hyderabad", factor: 1.05, onTimePct: 84, leadDays: 21 },
];

export const itVendorsById = Object.fromEntries(itVendors.map((v) => [v.id, v]));

/**
 * Per-item variation on top of each vendor's base factor, so the L1 is not the
 * same supplier on every line — otherwise the comparison has nothing to read.
 */
const ITEM_SKEW = {
  "wifi-ap-6e":     { "it-netcore": 0.97, "it-orbit": 1.02, "it-zenith": 0.99, "it-arcline": 1.03, "it-vertex": 1.0 },
  "switch-48-poe":  { "it-netcore": 1.03, "it-orbit": 0.96, "it-zenith": 1.0,  "it-arcline": 0.99, "it-vertex": 1.02 },
  "fd-workstation": { "it-netcore": 1.0,  "it-orbit": 1.01, "it-zenith": 0.96, "it-arcline": 1.02, "it-vertex": 0.99 },
  "pms-printer":    { "it-netcore": 0.99, "it-orbit": 1.03, "it-zenith": 1.01, "it-arcline": 0.95, "it-vertex": 1.0 },
  "ups-3kva":       { "it-netcore": 1.02, "it-orbit": 0.98, "it-zenith": 1.03, "it-arcline": 1.0,  "it-vertex": 0.96 },
};

/** What a supplier quoted for one line — deterministic, no randomness. */
export const itRate = (vendorId, itemId) => {
  const item = itLineItems.find((i) => i.id === itemId);
  const vendor = itVendorsById[vendorId];
  if (!item || !vendor) return 0;
  const skew = ITEM_SKEW[itemId]?.[vendorId] ?? 1;
  return Math.round((item.lastRate * vendor.factor * skew) / 10) * 10;
};

/**
 * The five mandatory clauses. These are the gate: no price is visible until
 * every vendor has been scored against all five.
 */
export const itClauses = [
  {
    id: 6101,
    num: 1,
    title: "Wireless security",
    text: "Access points must support WPA3-Enterprise with 802.1X, and be certified for Wi-Fi 6E operation in the 6 GHz band per WPC/ETA India regulations.",
    maxMark: 25,
    evidenceType: "CERTIFICATION",
  },
  {
    id: 6102,
    num: 2,
    title: "PoE power budget",
    text: "Switches must deliver a minimum 740 W PoE+ budget across 48 ports simultaneously, evidenced by the manufacturer's datasheet.",
    maxMark: 20,
    evidenceType: "SPEC",
  },
  {
    id: 6103,
    num: 3,
    title: "On-site support SLA",
    text: "Next-business-day on-site replacement at all five properties, including Sawai Madhopur and Ramnagar, for the full three-year term.",
    maxMark: 20,
    evidenceType: "SLA",
  },
  {
    id: 6104,
    num: 4,
    title: "End-of-life commitment",
    text: "No quoted model may reach end-of-sale within 24 months of award, and security patching must be committed for five years.",
    maxMark: 20,
    evidenceType: "DECLARATION",
  },
  {
    id: 6105,
    num: 5,
    title: "Integration with the PMS",
    text: "Front-desk hardware must be certified against the incumbent PMS build, with a named integration contact and a rollback plan.",
    maxMark: 15,
    evidenceType: "TEST",
  },
];

export const IT_MIN_SCORE = 65;

export default { itRfq, itLineItems, itVendors, itClauses, itRate, IT_RFQ_ID };
