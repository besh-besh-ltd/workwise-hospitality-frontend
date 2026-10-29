import { useEffect, useState } from "react";
import { getFormHotels } from "@/services/pr";
import { dedupeInFlight, sessionScopeKey } from "@/utils/requestCache";

// May the caller raise a purchase requisition? GET /pr/form/hotels lists the
// hotels where they hold pr.create; an empty list means nowhere. GET /pr never
// answers 403 (it just returns nothing), so this is how "New requisition" is
// gated.
//
// One request per page view: the rail and the page asking in the same tick
// share it (in-flight only, like the RBAC lookups — a grant an admin adds shows
// on the next page load).
export const loadPrCreateHotels = () =>
  dedupeInFlight(`pr-form-hotels|${sessionScopeKey()}`, () => getFormHotels())
    .then((res) => (Array.isArray(res?.data?.hotels) ? res.data.hotels : []));

/** true / false once known; null while loading, disabled, or when the lookup failed. */
export default function usePrCanCreate({ enabled = true } = {}) {
  const [canCreate, setCanCreate] = useState(null);
  useEffect(() => {
    if (!enabled) {
      setCanCreate(null);
      return undefined;
    }
    let cancelled = false;
    loadPrCreateHotels()
      .then((hotels) => { if (!cancelled) setCanCreate(hotels.length > 0); })
      // Unknown is not "no": keep showing the entry; the create page explains.
      .catch(() => { if (!cancelled) setCanCreate(null); });
    return () => { cancelled = true; };
  }, [enabled]);
  return canCreate;
}
