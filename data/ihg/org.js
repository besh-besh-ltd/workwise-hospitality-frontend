/**
 * ── SWAP SURFACE 2 of 2 ──────────────────────────────────────────────
 * The demo tenant's properties and people. Every name, title, email and
 * hotel shown anywhere in the demo resolves through this file.
 *
 * PLACEHOLDER NOTICE: the properties are unbranded hotels in real Indian
 * cities, and the key counts and every person below are invented. To
 * re-skin the demo for a named client, replace `people` and `properties`
 * with the names they give us and the whole thing re-personalises —
 * approval chains, evaluator initials, SPOC blocks, "created by" lines,
 * the lot.
 * ─────────────────────────────────────────────────────────────────────
 */

export const company = {
  id: "wwh-in",
  name: "Workwise Hospitality",
  legalName: "Workwise Hospitality Group — India",
  region: "India",
  procurementEmail: "procurement@letsworkwise.com",
  fy: "FY 2026-27",
};

/** The properties in scope. `id` is used everywhere as the stable key. */
export const properties = [
  {
    id: "ic-mumbai",
    numericId: 501,
    name: "The Grand Marine Drive",
    shortName: "The Grand Marine Drive",
    brand: "The Grand",
    city: "Mumbai",
    state: "Maharashtra",
    keys: 220,
    address: "Marine Drive, Mumbai 400020",
    store: "Linen Store, Level 2",
  },
  {
    id: "cp-noida",
    numericId: 502,
    name: "Metro Business Hotel Greater Noida",
    shortName: "Metro Greater Noida",
    brand: "Metro Business Hotel",
    city: "Greater Noida",
    state: "Uttar Pradesh",
    keys: 180,
    address: "Knowledge Park, Greater Noida 201310",
    store: "Central Stores",
  },
  {
    id: "hie-blr",
    numericId: 503,
    name: "City Express Whitefield",
    shortName: "City Express Whitefield",
    brand: "City Express",
    city: "Bengaluru",
    state: "Karnataka",
    keys: 150,
    address: "Whitefield Main Road, Bengaluru 560066",
    store: "Housekeeping Store",
  },
  {
    id: "voco-corb",
    numericId: 504,
    name: "Riverside Retreat Jim Corbett",
    shortName: "Riverside Corbett",
    brand: "Riverside Retreat",
    city: "Ramnagar",
    state: "Uttarakhand",
    keys: 90,
    address: "Ramnagar, Nainital 244715",
    store: "Back-of-House Store",
  },
  {
    id: "ss-barwara",
    numericId: 505,
    name: "Fort Barwara Heritage Resort",
    shortName: "Fort Barwara",
    brand: "Heritage Resorts",
    city: "Sawai Madhopur",
    state: "Rajasthan",
    keys: 48,
    address: "Chauth Ka Barwara, Sawai Madhopur 322001",
    store: "Palace Store",
  },
];

export const departments = [
  { id: "housekeeping", name: "Housekeeping" },
  { id: "fnb", name: "Food & Beverage" },
  { id: "engineering", name: "Engineering" },
  { id: "front-office", name: "Front Office" },
];

/**
 * The four demo logins. `id` doubles as the persona key in the session
 * cookie; `approvalLimit` is in rupees and gates the approve button.
 */
export const people = [
  // The four demo identities. The `id`s below are the demo's capability
  // slots and are referenced across every fixture (approval chains, RFQ
  // ownership, MR raisers) — they stay put; only the identities change.
  //
  // Two of these are IT rather than procurement, so their cards describe the
  // VIEW they open rather than pretending they run a housekeeping desk.
  {
    id: "housekeeping",
    numericId: 901,
    name: "Rohan Mehta",
    initials: "RM",
    title: "IT · India",
    email: "rohan.mehta@letsworkwise.com",
    phone: "+91 22 6195 0100",
    propertyIds: ["ic-mumbai"],
    department: "housekeeping",
    approvalLimit: 0,
    // What this persona is for, shown on the login card so the demo driver
    // can pick the right one without remembering the matrix.
    blurb: "Requisitioner view — raises requisitions for one property, and sees only that property's demand.",
    can: { raiseMR: true, runSourcing: false, approvePO: false, awardContract: false },
  },
  {
    id: "purchase",
    numericId: 902,
    name: "Ananya Rao",
    initials: "AR",
    title: "Procurement Lead · India",
    email: "ananya.rao@letsworkwise.com",
    phone: "+91 22 6195 0101",
    propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"],
    department: "housekeeping",
    approvalLimit: 0,
    blurb: "Runs the sourcing desk across all five properties. The main demo persona.",
    can: { raiseMR: true, runSourcing: true, approvePO: false, awardContract: false },
  },
  {
    id: "finance",
    numericId: 903,
    name: "Karan Bhatia",
    initials: "KB",
    title: "IT · India",
    email: "karan.bhatia@letsworkwise.com",
    phone: "+91 22 6195 0102",
    propertyIds: ["ic-mumbai"],
    department: "finance",
    approvalLimit: 2500000,
    blurb: "Approver view — approves purchase orders up to ₹25L for The Grand Marine Drive.",
    can: { raiseMR: false, runSourcing: false, approvePO: true, awardContract: false },
  },
  {
    id: "regional",
    numericId: 904,
    name: "Sameer Nair",
    initials: "SN",
    title: "Head of IT · India",
    email: "sameer.nair@letsworkwise.com",
    phone: "+91 22 6195 0103",
    propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"],
    department: "procurement",
    approvalLimit: 100000000,
    blurb: "Full group view — signs off contract awards and any order above ₹25L.",
    can: { raiseMR: false, runSourcing: true, approvePO: true, awardContract: true },
  },
];

export const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));
export const propertiesById = Object.fromEntries(properties.map((p) => [p.id, p]));

export const getPerson = (id) => peopleById[id] || null;
export const getProperty = (id) => propertiesById[id] || null;

/** The properties a given persona is mapped to, in display order. */
export const propertiesFor = (personId) => {
  const person = peopleById[personId];
  if (!person) return [];
  return properties.filter((p) => person.propertyIds.includes(p.id));
};

export default { company, properties, departments, people };
