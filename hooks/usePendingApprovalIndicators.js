import { useState, useEffect, useCallback, useRef } from "react";
import { getPendingApprovalCounts } from "@/services/approval";
import storageInstance from "@/utils/storageInstance";
import {
  getStoredHospitalityContext,
  subscribeHospitalityContext,
} from "@/utils/hospitalityContext";

const ENTITY_TYPE_TO_HREF = {
  RFQ: "/dashboard/buyer/rfq-management",
  TENDER: "/dashboard/buyer/rfq-management",
  TECHNICAL: "/dashboard/buyer/technical-evaluation",
  NEGOTIATION: "/dashboard/buyer/quote-compare",
  NEGOTIATION_QUOTE: "/dashboard/buyer/quote-compare",
  PO: "/dashboard/buyer/purchase-order",
  // ARC (v1) removed during ARC v2 quarantine.
  // v2 will add: ARC_TECH, ARC_COMMITTEE, ARC_AMENDMENT, MR — wired to /rate-contracts/* and /material-requisitions/*.
};

const POLL_INTERVAL_MS = 5000;

export const usePendingApprovalIndicators = ({ enabled = true } = {}) => {
  const [pendingHrefs, setPendingHrefs] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  const fetchIdRef = useRef(0);

  const fetchCounts = useCallback(async () => {
    if (!enabled || !storageInstance.getStorage("token")) {
      setPendingHrefs(new Set());
      return;
    }

    // Approval counts are buyer-only — skip for vendors (user_type=3)
    const userType = storageInstance.getStorage("current-user-type");
    if (userType === "vendor") {
      setPendingHrefs(new Set());
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
      const hrefsWithPending = new Set();

      counts.forEach(({ entity_type, count }) => {
        if (count > 0) {
          const href = ENTITY_TYPE_TO_HREF[entity_type];
          if (href) hrefsWithPending.add(href);
        }
      });

      setPendingHrefs(hrefsWithPending);
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

  const hasPendingApproval = useCallback(
    (href) => pendingHrefs.has(href),
    [pendingHrefs]
  );

  return { pendingHrefs, hasPendingApproval, loading, refetch: fetchCounts };
};

export default usePendingApprovalIndicators;
