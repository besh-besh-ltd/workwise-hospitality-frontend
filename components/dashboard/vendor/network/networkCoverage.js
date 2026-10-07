// How a network member's subscription standing reads on the vendor subscription
// surfaces (header pill, profile banner, subscription page).
//
// The backend sends `covered_by_network` on GET /hospitality/vendor/subscription-status
// and /vendor/subscription-summary only for a non-principal entity of a vendor network:
// its network's subscription covers it, plus its own seat. Vendors in no network and
// the principal never get the key, so callers fall through to their existing states.

import { fmtDate } from "./networkFormat";

/**
 * null when `cov` is absent; otherwise
 * { key: "covered" | "seat_expired" | "suspended" | "not_active" | "lapsed", label, short, detail }
 * where `label` is the pill text, `short` its one-word form for phones and `detail`
 * the sentence for banners.
 * Members never get a buy/renew action: anything wrong is for the network admin.
 */
export function networkCoverageView(cov) {
  if (!cov) return null;
  const org = cov.org_name || "your network";

  if (cov.entity_status === "SUSPENDED") {
    return {
      key: "suspended",
      label: "Network access suspended",
      short: "Suspended",
      detail: `Your access in ${org} is suspended — ask your network admin.`,
    };
  }
  if (cov.entity_status === "INVITED") {
    return {
      key: "not_active",
      label: "Entity not active yet — invitation pending",
      short: "Not active",
      detail: `This entity is not active yet in ${org} — ask your network admin.`,
    };
  }
  if (cov.entity_status && cov.entity_status !== "ACTIVE") {
    return {
      key: "not_active",
      label: "Entity not active",
      short: "Not active",
      detail: `This entity is not active in ${org} — ask your network admin.`,
    };
  }
  if (!cov.seat_active) {
    return {
      key: "seat_expired",
      label: "Seat expired",
      short: "Seat expired",
      detail: cov.seat_expired_on
        ? `Seat expired on ${fmtDate(cov.seat_expired_on)} — ask your network admin.`
        : "Seat expired — ask your network admin.",
    };
  }
  if (!cov.subscription_active) {
    return {
      key: "lapsed",
      label: "Network subscription inactive",
      short: "Inactive",
      detail: `${org}'s subscription is not active — ask your network admin.`,
    };
  }
  return {
    key: "covered",
    label: `Covered by ${org}`,
    short: "Covered",
    detail: cov.seat_valid_until ? `Seat active · till ${fmtDate(cov.seat_valid_until)}` : "Seat active",
  };
}
