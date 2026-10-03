import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getPendingApprovalCounts } from "@/services/approval";
import storageInstance from "@/utils/storageInstance";
import {
  getStoredHospitalityContext,
  subscribeHospitalityContext,
} from "@/utils/hospitalityContext";
import { subscribeApprovalsChanged } from "@/utils/approvalEvents";
import usePolling from "@/hooks/usePolling";
import { useRealtimeEvent } from "@/hooks/useRealtime";

// Every approval entity type the engine can raise, mapped to the nav module
// (landing href) where the user goes to act. The /counts endpoint groups by
// entity_type across ALL of these, so wiring them here lights up the matching
// tab. Hrefs match the buyer rail in headerConfig.js exactly.
const ENTITY_TYPE_TO_HREF = {
  // Sourcing
  RFQ: "/dashboard/buyer/rfq-management",
  TENDER: "/dashboard/buyer/rfq-management",
  TECHNICAL: "/dashboard/buyer/rfq-management",      // tech eval lives inside the RFQ lifecycle
  NEGOTIATION: "/dashboard/buyer/negotiation",
  // Vendor finalization ("award") approvals are decided on a per-product card
  // in Quote Compare, reached through the RFQ — NOT on the Negotiations list,
  // whose rows open a negotiation ROUND that carries no finalization control.
  // Badging Negotiations sent approvers to a page where the action they were
  // asked for does not exist. Quote Compare has no rail entry of its own, so
  // this follows TECHNICAL above and badges the RFQ module it lives under.
  NEGOTIATION_QUOTE: "/dashboard/buyer/rfq-management",
  // Contracts (ARC v2) — single-hotel and group rate contracts raise the same
  // instance types; only the policy that shapes them differs.
  ARC_PUBLISH: "/dashboard/buyer/rate-contracts",
  ARC_NEGOTIATION: "/dashboard/buyer/rate-contracts",
  ARC_TECH: "/dashboard/buyer/rate-contracts",
  ARC_COMMITTEE: "/dashboard/buyer/rate-contracts",
  ARC_AMENDMENT: "/dashboard/buyer/rate-contracts",
  // Requisition & Orders
  MR: "/dashboard/buyer/material-requisitions",
  PO: "/dashboard/buyer/purchase-orders",
};

// Approval badges are pushed, not polled. The server emits `approval:changed`
// to `user:<id>` after any instance/step/approver change, and we refetch on
// that frame. The 60 s poll only backs up a dropped socket or a missed frame,
// so it runs at the same rate whether the socket is up or not. It pauses in
// hidden tabs. Until Oct 2026 this was a 5 s poll, mounted twice per
// dashboard page and never paused: 32.7k calls/day, 45% of backend time.
// See hooks/usePolling.js for the portal-wide cadence policy.
export const APPROVAL_POLL_INTERVAL_MS = 60 * 1000;

const EMPTY_MAP = new Map();

/**
 * The single source of approval counts. Mount this exactly once per page:
 * DashboardShell does it through <ApprovalIndicatorsProvider>. The legacy
 * Header (never mounted together with DashboardShell) falls back to its own
 * instance through usePendingApprovalIndicators below.
 */
const useApprovalIndicatorsSource = ({ enabled = true } = {}) => {
  // Map<href, count> — how many items at that nav module need the user's action.
  const [countsByHref, setCountsByHref] = useState(EMPTY_MAP);
  const [loading, setLoading] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchCounts = useCallback(async () => {
    if (!enabled || !storageInstance.getStorage("token")) {
      setCountsByHref(EMPTY_MAP);
      return;
    }

    // Approval counts are buyer-only — skip for vendors (user_type=3)
    const userType = storageInstance.getStorage("current-user-type");
    if (userType === "vendor") {
      setCountsByHref(EMPTY_MAP);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;

    try {
      setLoading(true);
      const context = getStoredHospitalityContext();
      const params = {};
      if (context?.companyId) params.hospitality_company_id = context.companyId;
      if (context?.hotelId) params.hotel_id = context.hotelId;

      const response = await getPendingApprovalCounts(params);

      if (fetchIdRef.current !== currentFetchId) return;

      const counts = response?.data || [];
      const map = new Map();

      counts.forEach(({ entity_type, count }) => {
        const n = Number(count) || 0;
        if (n <= 0) return;
        const href = ENTITY_TYPE_TO_HREF[entity_type];
        if (href) map.set(href, (map.get(href) || 0) + n);
      });

      setCountsByHref(map);
    } catch (err) {
      if (fetchIdRef.current !== currentFetchId) return;
      console.error("Failed to fetch pending approval counts:", err);
    } finally {
      if (fetchIdRef.current === currentFetchId) {
        setLoading(false);
      }
    }
  }, [enabled]);

  // Mount fetch + 60 s fallback poll, paused while hidden, one refetch on
  // tab return. Overlapping triggers collapse into one trailing request.
  const { refetch } = usePolling(fetchCounts, {
    interval: APPROVAL_POLL_INTERVAL_MS,
    enabled,
  });

  // Logging out (or a vendor session) must not leave stale badges behind.
  useEffect(() => {
    if (!enabled) setCountsByHref(EMPTY_MAP);
  }, [enabled]);

  // Push: the server says something about my approvals changed.
  useRealtimeEvent("approval:changed", refetch, { enabled });

  // Re-fetch on hospitality context change
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeHospitalityContext(() => refetch());
  }, [enabled, refetch]);

  // The user approved/rejected/cancelled something in this tab.
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeApprovalsChanged(() => refetch());
  }, [enabled, refetch]);

  // How many items at this exact nav href need my action.
  const pendingCountFor = useCallback(
    (href) => countsByHref.get(href) || 0,
    [countsByHref]
  );
  const hasPendingApproval = useCallback(
    (href) => (countsByHref.get(href) || 0) > 0,
    [countsByHref]
  );

  return useMemo(
    () => ({ countsByHref, pendingCountFor, hasPendingApproval, loading, refetch }),
    [countsByHref, pendingCountFor, hasPendingApproval, loading, refetch]
  );
};

const ApprovalIndicatorsContext = createContext(null);

/**
 * One poller + one socket subscription for every badge on the page
 * (SideNav, MobileNav, ...). Consumers call usePendingApprovalIndicators().
 */
export const ApprovalIndicatorsProvider = ({ enabled = true, children }) => {
  const value = useApprovalIndicatorsSource({ enabled });
  return (
    <ApprovalIndicatorsContext.Provider value={value}>
      {children}
    </ApprovalIndicatorsContext.Provider>
  );
};

/**
 * Read approval badge counts. Inside <ApprovalIndicatorsProvider> this reads
 * the shared instance and makes no requests of its own (the provider's
 * `enabled` wins). Outside a provider (the legacy Header) it runs its own
 * instance, as before.
 */
export const usePendingApprovalIndicators = ({ enabled = true } = {}) => {
  const shared = useContext(ApprovalIndicatorsContext);
  const own = useApprovalIndicatorsSource({ enabled: enabled && !shared });
  return shared || own;
};

export default usePendingApprovalIndicators;
