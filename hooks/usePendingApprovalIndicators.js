import { useState, useEffect, useCallback, useRef } from "react";
import { getPendingApprovalCounts } from "@/services/approval";
import storageInstance from "@/utils/storageInstance";
import {
  getStoredHospitalityContext,
  subscribeHospitalityContext,
} from "@/utils/hospitalityContext";

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
  // Contracts (ARC v2)
  ARC_TECH: "/dashboard/buyer/rate-contracts",
  ARC_COMMITTEE: "/dashboard/buyer/rate-contracts",
  ARC_AMENDMENT: "/dashboard/buyer/rate-contracts",
  // Requisition & Orders
  MR: "/dashboard/buyer/material-requisitions",
  PO: "/dashboard/buyer/purchase-orders",
};

const POLL_INTERVAL_MS = 5000;

export const usePendingApprovalIndicators = ({ enabled = true } = {}) => {
  // Map<href, count> — how many items at that nav module need the user's action.
  const [countsByHref, setCountsByHref] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  const fetchIdRef = useRef(0);

  const fetchCounts = useCallback(async () => {
    if (!enabled || !storageInstance.getStorage("token")) {
      setCountsByHref(new Map());
      return;
    }

    // Approval counts are buyer-only — skip for vendors (user_type=3)
    const userType = storageInstance.getStorage("current-user-type");
    if (userType === "vendor") {
      setCountsByHref(new Map());
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

  // Initial fetch + polling
  useEffect(() => {
    if (!enabled) return;

    fetchCounts();
    intervalRef.current = setInterval(fetchCounts, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCounts, enabled]);

  // Re-fetch on hospitality context change
  useEffect(() => {
    const unsubscribe = subscribeHospitalityContext(() => {
      fetchCounts();
    });
    return () => unsubscribe();
  }, [fetchCounts]);

  // Re-fetch on tab visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchCounts();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchCounts]);

  // How many items at this exact nav href need my action.
  const pendingCountFor = useCallback(
    (href) => countsByHref.get(href) || 0,
    [countsByHref]
  );
  const hasPendingApproval = useCallback(
    (href) => (countsByHref.get(href) || 0) > 0,
    [countsByHref]
  );

  return { countsByHref, pendingCountFor, hasPendingApproval, loading, refetch: fetchCounts };
};

export default usePendingApprovalIndicators;
