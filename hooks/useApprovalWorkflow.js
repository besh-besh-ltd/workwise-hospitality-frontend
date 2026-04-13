import { useState, useEffect, useCallback, useRef } from "react";
import {
  getEntityApprovalInstances,
  getApprovalInstanceDetails,
  submitApprovalAction,
  cancelApproval,
} from "@/services/approval";

/**
 * Custom hook for managing approval workflow state and actions
 * Fetches approval instance on page load and provides action handlers
 *
 * @param {Object} options
 * @param {string} options.entityType - 'RFQ' or 'TENDER'
 * @param {number} options.entityId - ID of the entity
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 * @returns {Object} Approval state and action handlers
 */
export const useApprovalWorkflow = ({ entityType, entityId, allEntityIds, enabled = true, refreshTrigger = 0, preloadedInstances = null }) => {
  const [instance, setInstance] = useState(null);
  const [allInstances, setAllInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const preloadConsumedRef = useRef(false);

  // Fetch approval instance for the entity
  const fetchApprovalInstance = useCallback(async (forceNetwork = false) => {
    if (!enabled || !entityType || !entityId) {
      setLoading(false);
      setInstance(null);
      setAllInstances([]);
      return;
    }

    // Use preloaded data on first mount if available (skip network)
    if (!forceNetwork && !preloadConsumedRef.current && Array.isArray(preloadedInstances)) {
      preloadConsumedRef.current = true;
      const sorted = [...preloadedInstances].sort((a, b) => (a.id || 0) - (b.id || 0));
      setAllInstances(sorted);
      setInstance(sorted.length > 0 ? sorted[sorted.length - 1] : null);
      setLoading(false);
      return;
    }
    preloadConsumedRef.current = true;

    setLoading(true);
    setError(null);

    try {
      // Determine which entity IDs to query
      // For TECHNICAL, allEntityIds contains all round IDs — fetch across all rounds
      const idsToFetch = (allEntityIds && allEntityIds.length > 0)
        ? [...new Set(allEntityIds)] // dedupe
        : [entityId];

      // Fetch instances for all entity IDs
      const allInstancesRaw = [];
      const seenIds = new Set();
      for (const eid of idsToFetch) {
        try {
          const response = await getEntityApprovalInstances(entityType, eid);
          const instances = response?.data?.data || response?.data || [];
          for (const inst of instances) {
            if (!seenIds.has(inst.id)) {
              seenIds.add(inst.id);
              allInstancesRaw.push(inst);
            }
          }
        } catch {
          // Skip failed fetches for individual entity IDs
        }
      }

      if (allInstancesRaw.length > 0) {
        // Fetch details for ALL instances
        const detailedAll = [];
        for (const inst of allInstancesRaw) {
          try {
            const detailRes = await getApprovalInstanceDetails(inst.id);
            const detail = detailRes?.data?.data || detailRes?.data || null;
            if (detail) detailedAll.push(detail);
          } catch {
            // If detail fetch fails, use basic instance data
            detailedAll.push(inst);
          }
        }

        // Sort by id ascending (oldest first for chronological journey)
        detailedAll.sort((a, b) => (a.id || 0) - (b.id || 0));
        setAllInstances(detailedAll);

        // The active/current instance is the latest one
        setInstance(detailedAll.length > 0 ? detailedAll[detailedAll.length - 1] : null);
      } else {
        setInstance(null);
        setAllInstances([]);
      }
    } catch (err) {
      console.error("Failed to fetch approval instance:", err);
      setError(err?.message || "Failed to fetch approval status");
      setInstance(null);
      setAllInstances([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, allEntityIds?.join(','), enabled, refreshTrigger]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchApprovalInstance();
  }, [fetchApprovalInstance]);

  // Submit approve/reject action
  const handleApprovalAction = useCallback(
    async (action, comment = "") => {
      if (!instance) {
        return { success: false, error: "No active approval instance" };
      }

      setActionLoading(true);
      try {
        const payload = {
          approval_instance_id: instance.id,
          action, // 'APPROVE' or 'REJECT'
        };

        // Include step ID if available
        if (instance.user_approval_step_id) {
          payload.approval_instance_step_id = instance.user_approval_step_id;
        }

        // Include comment if provided
        if (comment && comment.trim()) {
          payload.comment = comment.trim();
        }

        await submitApprovalAction(payload);
        await fetchApprovalInstance(); // Refresh data
        return { success: true };
      } catch (err) {
        console.error("Approval action failed:", err);
        return {
          success: false,
          error: err?.message || `Failed to ${action.toLowerCase()}`,
        };
      } finally {
        setActionLoading(false);
      }
    },
    [instance, fetchApprovalInstance]
  );

  // Cancel approval instance
  const handleCancelApproval = useCallback(
    async (reason = "") => {
      if (!instance) {
        return { success: false, error: "No active approval instance" };
      }

      setActionLoading(true);
      try {
        const payload = {
          instance_id: instance.id,
        };

        if (reason && reason.trim()) {
          payload.reason = reason.trim();
        }

        await cancelApproval(payload);
        await fetchApprovalInstance(); // Refresh data
        return { success: true };
      } catch (err) {
        console.error("Cancel approval failed:", err);
        return {
          success: false,
          error: err?.message || "Failed to cancel approval",
        };
      } finally {
        setActionLoading(false);
      }
    },
    [instance, fetchApprovalInstance]
  );

  // Derived states
  const canUserApprove = instance?.can_user_approve || false;
  const status = instance?.status || null;
  const currentStep = instance?.current_step || 0;
  const totalSteps = instance?.total_steps || 0;
  const steps = instance?.steps || [];
  const initiatedBy = instance?.initiated_by || null;

  // Auto-approved detection
  const isAutoApproved = instance?.metadata?.auto_approved === true || !!instance?.metadata?.auto_approved_reason;
  const autoApprovedReason = instance?.metadata?.auto_approved_reason || instance?.metadata?.reason || null;

  // Previous instances (rejected/cancelled) — all except the current one
  const previousInstances = allInstances.slice(0, -1);

  return {
    instance,
    allInstances,
    previousInstances,
    loading,
    error,
    actionLoading,
    canUserApprove,
    status,
    currentStep,
    totalSteps,
    steps,
    initiatedBy,
    isAutoApproved,
    autoApprovedReason,
    handleApprovalAction,
    handleCancelApproval,
    refetch: () => fetchApprovalInstance(true),
  };
};

export default useApprovalWorkflow;
