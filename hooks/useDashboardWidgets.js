/* ────────────────────────────────────────────────────────────
   useDashboardWidgets — buyer dashboard permission context + hook
   ──────────────────────────────────────────────────────────── */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getDashboardPermissions } from "@/services/rbac";
import {
  DASHBOARD_WIDGETS,
  getRenderableWidgets,
} from "@/components/dashboard/buyer/DashboardRegistry";

/**
 * Context shape:
 *   permissions  string[]  — flat list of permission names the user has
 *                            (e.g. "action_center", "my_drafts")
 *   visibleCodes string[]  — `dashboard.*` codes the user can render
 *                            (intersect of permissions × registry × has-component)
 *   isLoading    boolean
 *   error        Error | null
 *   refetch      () => Promise — re-fetch on demand
 */
const DashboardPermissionsContext = createContext({
  permissions: [],
  visibleCodes: [],
  isLoading: true,
  error: null,
  refetch: () => Promise.resolve(),
});

/**
 * Provider — wraps the buyer dashboard tree. Fetches the user's
 * `dashboard.*` permissions once per change in selected hotel IDs and
 * memoises the result so all widget gates can read from a single source
 * without each issuing its own request.
 */
export const DashboardPermissionsProvider = ({ hotelIds, children }) => {
  const [permissions, setPermissions] = useState([]);
  // `isLoading` flips to true ONLY on the first fetch. After that, BU changes
  // (and any other refetch) update permissions silently — the previously-loaded
  // widget list keeps showing, and each widget's own skeleton handles the data
  // refresh. This prevents the whole dashboard from blanking on BU change.
  // `isRefetching` exposes the background refresh state for any consumer that
  // wants a subtle indicator.
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState(null);
  const fetchIdRef = useRef(0);
  const firstLoadDoneRef = useRef(false);

  // Stable key so empty / reordered arrays don't re-trigger.
  const hotelIdsKey = useMemo(
    () => (hotelIds || []).slice().sort().join(","),
    [hotelIds]
  );

  const fetchPermissions = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    if (!firstLoadDoneRef.current) {
      setIsLoading(true);
    } else {
      setIsRefetching(true);
    }
    setError(null);

    try {
      const list = await getDashboardPermissions(hotelIds || []);
      if (fetchIdRef.current !== currentFetchId) return; // stale
      setPermissions(Array.isArray(list) ? list : []);
    } catch (err) {
      if (fetchIdRef.current !== currentFetchId) return;
      // Backend may not yet expose dashboard.* codes — treat as "no grants"
      // rather than surfacing an error. The UI will fall through to the
      // empty-state card explaining the user has no widget access.
      // Real network errors still get logged for diagnostics.
      // eslint-disable-next-line no-console
      console.warn("Failed to fetch dashboard permissions:", err);
      setError(err?.message || err);
      setPermissions([]);
    } finally {
      if (fetchIdRef.current === currentFetchId) {
        setIsLoading(false);
        setIsRefetching(false);
        firstLoadDoneRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelIdsKey]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Intersect granted permissions with the registry — only codes the user
  // has AND that have a renderable component should show.
  const visibleCodes = useMemo(() => {
    const granted = new Set(permissions);
    return getRenderableWidgets()
      .filter((w) => granted.has(w.permission))
      .map((w) => w.code);
  }, [permissions]);

  const value = useMemo(
    () => ({
      permissions,
      visibleCodes,
      isLoading,
      isRefetching,
      error,
      refetch: fetchPermissions,
    }),
    [permissions, visibleCodes, isLoading, isRefetching, error, fetchPermissions]
  );

  return (
    <DashboardPermissionsContext.Provider value={value}>
      {children}
    </DashboardPermissionsContext.Provider>
  );
};

/** Main hook — returns the full context value. */
export default function useDashboardWidgets() {
  return useContext(DashboardPermissionsContext);
}

/** Quick check: does the user have this specific widget code? */
export const useHasDashboardWidget = (code) => {
  const { visibleCodes, isLoading } = useContext(DashboardPermissionsContext);
  return { granted: visibleCodes.includes(code), isLoading };
};

/** Convenience: lookup the registry entries the user should see, in
 *  declaration order. Used by the renderer to materialise the layout. */
export const useVisibleDashboardWidgets = () => {
  const { visibleCodes, isLoading, error } = useContext(
    DashboardPermissionsContext
  );
  const widgets = useMemo(() => {
    const set = new Set(visibleCodes);
    return DASHBOARD_WIDGETS.filter(
      (w) => set.has(w.code) && typeof w.component === "function"
    );
  }, [visibleCodes]);
  return { widgets, isLoading, error };
};
