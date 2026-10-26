import { useCallback, useEffect, useRef, useState } from "react";
import { getBulkPermissions } from "@/services/rbac";
import { errorInfo } from "./stockUtils";

// Which of `hotels` grant `moduleKey.action`, hotel by hotel.
//
// The bulk permissions endpoint answers with the union over the hotels it is
// given, so a list of hotels where an action is allowed takes one call per
// hotel (run in parallel; the service de-duplicates identical calls in flight).
// The result only narrows what the UI offers: the server checks every action.
//
// @returns {{ids: Set<number>, loading: boolean, error: string|null, retry: () => void}}

const actionsOf = (res, moduleKey) => {
  const data = res?.data?.data || res?.data || {};
  const entry = (data.permissions || data || {})[moduleKey];
  return Array.isArray(entry) ? entry : entry?.actions || [];
};

const EMPTY = new Set();

const usePermittedHotels = ({ moduleKey, action, hotels, enabled = true }) => {
  const key = (hotels || []).map((h) => Number(h.id ?? h)).filter(Boolean).sort((a, b) => a - b).join(",");
  const [state, setState] = useState({ key: null, ids: EMPTY, error: null });
  const [attempt, setAttempt] = useState(0);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const ids = key ? key.split(",").map(Number) : [];
    const seq = ++seqRef.current;
    if (!ids.length) {
      setState({ key, ids: EMPTY, error: null });
      return undefined;
    }
    (async () => {
      try {
        const answers = await Promise.all(ids.map((id) => getBulkPermissions(moduleKey, [id])));
        if (seq !== seqRef.current) return;
        const allowed = new Set(ids.filter((id, i) => actionsOf(answers[i], moduleKey).includes(action)));
        setState({ key, ids: allowed, error: null });
      } catch (err) {
        if (seq !== seqRef.current) return;
        setState({ key, ids: EMPTY, error: errorInfo(err, "Could not check your permissions.").message });
      }
    })();
    return () => {
      seqRef.current += 1;
    };
  }, [moduleKey, action, key, enabled, attempt]);

  const retry = useCallback(() => {
    setState((s) => ({ ...s, key: null }));
    setAttempt((n) => n + 1);
  }, []);
  const loading = enabled && state.key !== key;
  return {
    ids: loading ? EMPTY : state.ids,
    loading,
    error: loading ? null : state.error,
    retry,
  };
};

export default usePermittedHotels;
