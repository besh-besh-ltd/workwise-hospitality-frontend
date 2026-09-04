import { peopleById, properties, company } from "@/data/ihg/org";

/**
 * Turns an IHG persona into the session shape the real portal expects.
 *
 * The forked app was written against a live backend: it reads a JWT from
 * localStorage, a `userProfile` from Redux, and RBAC permissions from an API.
 * Rather than change 400 components, we hand them exactly what they already
 * look for — the persona simply becomes a normal logged-in user.
 */

/** `hospitality_mappings` — one row per property the persona can act on. */
export const mappingsFor = (persona) =>
  properties
    .filter((p) => persona.propertyIds.includes(p.id))
    .map((p, i) => ({
      id: 1000 + i,
      hospitality_company_id: 1,
      company_name: company.name,
      hospitality_hotel_id: p.numericId,
      hotel_name: p.name,
      city: p.city,
      // 1 = hotel-specific. Nobody in the demo holds a company-wide mapping,
      // so the property switcher always has something real to switch between.
      mapping_type: 1,
    }));

export const userProfileFor = (persona) => ({
  id: persona.numericId,
  user_id: persona.numericId,
  name: persona.name,
  email: persona.email,
  phone: persona.phone,
  user_type: "buyer",
  company_name: company.name,
  is_hospitality: 1,
  has_valid_hospitality_subscription: true,
  hospitality_mappings: mappingsFor(persona),
});

/**
 * A permission set wide enough that no buyer screen shows an access-denied
 * page, scoped so the approval limit still means something. The real product
 * resolves this per hotel/department from the RBAC service.
 */
export const permissionsFor = (persona) => {
  const modules = [
    "tender", "rfq", "purchase_order", "material_requisition",
    "negotiation", "technical_evaluation", "arc", "dashboard", "awarding",
  ];
  const actions = ["read", "create", "update", "delete"];
  const codes = [];
  modules.forEach((m) => {
    actions.forEach((a) => codes.push(`${m}.${a}`));
    // Only the approvers get approve rights — this is what makes signing in
    // as a different person actually change the screen.
    if (persona.can.approvePO || persona.can.awardContract) codes.push(`${m}.approve`);
  });
  codes.push("dashboard.buyer.view");
  return codes;
};


/** base64url, without padding — what a JWT segment actually looks like. */
const b64url = (obj) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * An unsigned token in JWT *shape*. Not a credential: it carries no signature
 * and grants nothing. It exists so `parseJwt` in services/Auth.js has
 * something well-formed to read instead of throwing on the first page load.
 */
export const demoJwt = (persona) => {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: "none", typ: "JWT" });
  const payload = b64url({
    sub: persona.numericId,
    name: persona.name,
    email: persona.email,
    user_type: "buyer",
    iat: now,
    exp: now + 60 * 60 * 12,
  });
  return `${header}.${payload}.`;
};

/** Everything the client needs in storage for the app to consider you signed in. */
export const seedBrowserSession = (persona) => {
  if (typeof window === "undefined") return;
  const profile = userProfileFor(persona);
  // Shaped like a JWT because the app parses it: `getUserDetails()` base64-
  // decodes the payload segment and reads `sub`/`name`/`exp`. It is unsigned
  // and verifies nothing — the real gate is the httpOnly cookie checked in
  // middleware.js. This only satisfies the client-side "who am I" reads the
  // forked app already made.
  window.localStorage.setItem("token", demoJwt(persona));
  window.localStorage.setItem("current-user-type", "buyer");
  window.localStorage.setItem("current-user-name", persona.name);
  window.localStorage.setItem("current-user-email", persona.email);
  window.localStorage.setItem("user-permissions", JSON.stringify(permissionsFor(persona)));
  return profile;
};

export const clearBrowserSession = () => {
  if (typeof window === "undefined") return;
  ["token", "current-user-type", "current-user-name", "current-user-email",
   "user-permissions", "hospitality_context_selection"].forEach((k) =>
    window.localStorage.removeItem(k)
  );
};

export const getPersona = (id) => peopleById[id] || null;
