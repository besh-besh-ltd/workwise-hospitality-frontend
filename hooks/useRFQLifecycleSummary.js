import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { getLifecycleSummary } from "@/services/rfq";
import { submitApprovalAction } from "@/services/approval";

// Shared data hook for the RFQ lifecycle journey.
//
// Wraps the same /rfq/lifecycle-summary/:id endpoint + approval-action flow the
// original RFQLifecycleJourney component owns, so multiple presentational views
// (the legacy vendor-facing timeline and the buyer-side v2 journey) can consume
// one source of truth without duplicating fetch/refresh wiring. The legacy
// component is intentionally left untouched; this hook just exposes the same
// shape it computes internally.
const useRFQLifecycleSummary = (rfqId, { onActionComplete } = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!rfqId) return;
    setLoading(true);
    try {
      const res = await getLifecycleSummary(rfqId);
      const apiResp = res?.data || res;
      const ld = apiResp?.data || apiResp;
      if (ld?.phases?.length > 0) {
        setData(ld);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Lifecycle fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit an APPROVE / REJECT decision for one approval instance and refresh.
  const submitAction = useCallback(
    async ({ instance, action, comment }) => {
      if (!instance) return;
      setActionLoading(true);
      try {
        const payload = { approval_instance_id: instance.id, action };
        if (instance.user_approval_step_id) {
          payload.approval_instance_step_id = instance.user_approval_step_id;
        }
        if (comment?.trim()) payload.comment = comment.trim();
        await submitApprovalAction(payload);
        toast.success(`${action === "APPROVE" ? "Approved" : "Rejected"} successfully`);
        await fetchData();
        onActionComplete?.();
        return true;
      } catch (err) {
        toast.error(err?.message || "Action failed");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [fetchData, onActionComplete],
  );

  return { data, loading, actionLoading, refetch: fetchData, submitAction };
};

export default useRFQLifecycleSummary;
