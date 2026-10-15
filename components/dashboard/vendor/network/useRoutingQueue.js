// The routing queue and the org's routable entities, loaded together (GET
// /routing/queue + GET /org). Shared by the Routing page and the contract
// pages' "Fulfilled by" panel so both read the queue and pick entities the
// same way. A newer load always wins over an older one still in flight.

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrg, getRoutingQueue } from "@/services/vendorNetwork";
import { networkErrorMessage } from "./networkErrors";

const EMPTY_QUEUE = { unrouted: [], pending: [], accepted: [], declined: [] };

/** Entities an item can be routed to: ACTIVE, and never the principal. The server re-checks seats. */
export function routableEntities(entities, org) {
  return (entities || []).filter(
    (e) => e.status === "ACTIVE" && e.relationship !== "PRINCIPAL" && Number(e.vendor_id) !== Number(org?.principal_vendor_id)
  );
}

/**
 * @param errorFallback  the message shown when the load fails without a server message
 * @returns { loading, reloading, loadError, queue, org, setOrg, entities, load }
 */
export default function useRoutingQueue(errorFallback = "Could not load the routing queue.") {
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [queue, setQueue] = useState(EMPTY_QUEUE);
  const [org, setOrg] = useState(null);
  const [entities, setEntities] = useState([]);
  const loadSeq = useRef(0);
  const fallbackRef = useRef(errorFallback);
  fallbackRef.current = errorFallback;

  const load = useCallback(async () => {
    const mine = ++loadSeq.current;
    setLoadError("");
    setReloading(true);
    try {
      const [queueRes, orgRes] = await Promise.all([getRoutingQueue(), getOrg()]);
      if (mine !== loadSeq.current) return; // a newer load is in flight
      const q = queueRes?.data || {};
      setQueue({ unrouted: q.unrouted || [], pending: q.pending || [], accepted: q.accepted || [], declined: q.declined || [] });
      const o = orgRes?.data?.org || null;
      setOrg(o);
      setEntities(routableEntities(orgRes?.data?.entities, o));
    } catch (err) {
      if (mine === loadSeq.current) setLoadError(networkErrorMessage(err, fallbackRef.current));
    } finally {
      if (mine === loadSeq.current) {
        setLoading(false);
        setReloading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, reloading, loadError, queue, org, setOrg, entities, load };
}
