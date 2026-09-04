/**
 * ── SWAP SURFACE 2 of 2 ──────────────────────────────────────────────
 * IHG's properties and IHG's people. Every name, title, email and hotel
 * shown anywhere in the demo resolves through this file.
 *
 * PLACEHOLDER NOTICE: the properties are real IHG brands in real Indian
 * cities, but the key counts are illustrative and every person below is
 * invented. Replace `people` with the names and titles the client gave
 * us and the entire demo re-personalises — approval chains, evaluator
 * initials, SPOC blocks, "created by" lines, the lot.
 * ─────────────────────────────────────────────────────────────────────
 */

export const company = {
  id: "ihg-in",
  name: "IHG Hotels & Resorts",
  legalName: "IHG Hotels & Resorts — India",
  region: "South West Asia",
  procurementEmail: "procurement@ihg-demo.in",
  fy: "FY 2026-27",
};

/** The properties in scope. `id` is used everywhere as the stable key. */
export const properties = [
  {
    id: "ic-mumbai",
    numericId: 501,
    name: "InterContinental Marine Drive",
    shortName: "IC Marine Drive",
    brand: "InterContinental",
    city: "Mumbai",
    state: "Maharashtra",
    keys: 220,
    address: "Marine Drive, Mumbai 400020",
    store: "Linen Store, Level 2",
  },
  {
    id: "cp-noida",
    numericId: 502,
    name: "Crowne Plaza Greater Noida",
    shortName: "CP Greater Noida",
    brand: "Crowne Plaza",
    city: "Greater Noida",
    state: "Uttar Pradesh",
    keys: 180,
    address: "Knowledge Park, Greater Noida 201310",
    store: "Central Stores",
  },
  {
    id: "hie-blr",
    numericId: 503,
    name: "Holiday Inn Express Whitefield",
    shortName: "HIE Whitefield",
    brand: "Holiday Inn Express",
    city: "Bengaluru",
    state: "Karnataka",
    keys: 150,
    address: "Whitefield Main Road, Bengaluru 560066",
    store: "Housekeeping Store",
  },
  {
    id: "voco-corb",
    numericId: 504,
    name: "voco Jim Corbett",
    shortName: "voco Corbett",
    brand: "voco",
    city: "Ramnagar",
    state: "Uttarakhand",
    keys: 90,
    address: "Ramnagar, Nainital 244715",
    store: "Back-of-House Store",
  },
  {
    id: "ss-barwara",
    numericId: 505,
    name: "Six Senses Fort Barwara",
    shortName: "Six Senses Barwara",
    brand: "Six Senses",
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
  {
    id: "housekeeping",
    numericId: 901,
    name: "Ananya Rao",
    initials: "AR",
    title: "Executive Housekeeper",
    email: "ananya.rao@ihg-demo.in",
    phone: "+91 98200 41172",
    propertyIds: ["ic-mumbai"],
    department: "housekeeping",
    approvalLimit: 0,
    // What this persona is for, shown on the login card so the demo driver
    // can pick the right one without remembering the matrix.
    blurb: "Raises requisitions for her property. Sees her own demand, not the group's.",
    can: { raiseMR: true, runSourcing: false, approvePO: false, awardContract: false },
  },
  {
    id: "purchase",
    numericId: 902,
    name: "Dhruv Menon",
    initials: "DM",
    title: "Manager · Purchase",
    email: "dhruv.menon@ihg-demo.in",
    phone: "+91 98330 27714",
    propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"],
    department: "housekeeping",
    approvalLimit: 0,
    blurb: "Runs the sourcing desk across all five properties. The main demo persona.",
    can: { raiseMR: true, runSourcing: true, approvePO: false, awardContract: false },
  },
  {
    id: "finance",
    numericId: 903,
    name: "Priya Nair",
    initials: "PN",
    title: "Director of Finance",
    email: "priya.nair@ihg-demo.in",
    phone: "+91 99870 55210",
    propertyIds: ["ic-mumbai"],
    department: "finance",
    approvalLimit: 2500000,
    blurb: "Approves purchase orders up to ₹25L for InterContinental Marine Drive.",
    can: { raiseMR: false, runSourcing: false, approvePO: true, awardContract: false },
  },
  {
    id: "regional",
    numericId: 904,
    name: "Vikram Sethi",
    initials: "VS",
    title: "Regional Director · Procurement",
    email: "vikram.sethi@ihg-demo.in",
    phone: "+91 98110 60934",
    propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"],
    department: "procurement",
    approvalLimit: 100000000,
    blurb: "Signs off contract awards and any order above ₹25L, group-wide.",
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
