import { useEffect, useState } from "react";
import { getPOInitiators } from "@/services/po";

/* How many initiators a surface lists before the rest fold behind "+N more".
   Four is enough to find a name you recognise without turning a hero banner
   into a staff directory, and the button counts everybody, so nobody is hidden
   silently. Shared so the PO page and the RFQ PO tab make the same cut. */
export const INITIATORS_VISIBLE = 4;

/* Contact hrefs, shared for the same reason: a stored mobile can carry spaces
   or dashes ("+91 98200 11223") that some diallers refuse, so the label keeps
   the human formatting and the href does not. Neither is ever built for a
   null value — every caller checks first, because an empty mailto: is a link
   to nowhere. */
export const mailtoHref = (email) => `mailto:${String(email).trim()}`;
export const telHref = (mobile) => `tel:${String(mobile).replace(/[\s-]+/g, "")}`;

/**
 * Who can initiate a draft purchase order that the viewer cannot.
 *
 * Mount this hook ONLY where the answer is needed — a draft PO the viewer has
 * no grant on. It fetches on mount, so a component that renders conditionally
 * is the gate: nothing is requested for the users who can already initiate.
 *
 * Every failure (including the deliberate 404 the endpoint returns to an
 * out-of-scope caller) resolves to `status: "failed"`, which every caller
 * renders as nothing at all. This block is additive help; it may never be the
 * reason a purchase order page breaks.
 *
 * @param {number|string} po_id
 * @returns {{ status: "loading"|"ready"|"failed", initiators: Object[], total: number, canInitiate: boolean|null }}
 *   `total` is the true uncapped count (never less than the number of rows
 *   actually returned); `canInitiate` is the server's own answer for this
 *   viewer, which is the only thing a surface that cannot resolve permissions
 *   locally has to go on.
 */
const usePoInitiators = (po_id) => {
  const [state, setState] = useState({ status: "loading", initiators: [], total: 0, canInitiate: null });

  useEffect(() => {
    const failed = { status: "failed", initiators: [], total: 0, canInitiate: null };
    if (!po_id) {
      setState(failed);
      return;
    }
    let live = true;
    setState({ status: "loading", initiators: [], total: 0, canInitiate: null });
    // An async IIFE rather than .then/.catch: it turns a synchronous throw out
    // of the service (a mis-shaped call, an interceptor blowing up) into the
    // same rejection path as a 404, so nothing here can take the page down.
    (async () => {
      try {
        const data = await getPOInitiators(po_id);
        if (!live) return;
        const initiators = Array.isArray(data?.initiators) ? data.initiators.filter(Boolean) : [];
        const total = Number(data?.total);
        setState({
          status: "ready",
          initiators,
          // A total that contradicts the rows it came with is not a total —
          // "+3 more" over five visible names is worse than no affordance.
          total: Number.isFinite(total) && total > initiators.length ? total : initiators.length,
          canInitiate: data?.can_initiate === true,
        });
      } catch (_) {
        if (live) setState(failed);
      }
    })();
    return () => {
      live = false;
    };
  }, [po_id]);

  return state;
};

export default usePoInitiators;
