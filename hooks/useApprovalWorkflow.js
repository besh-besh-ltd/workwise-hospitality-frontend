import { useState, useEffect, useCallback } from "react";
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
export const useApprovalWorkflow = ({ entityType, entityId, enabled = true }) => {
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch approval instance for the entity
  const fetchApprovalInstance = useCallback(async () => {
    if (!enabled || !entityType || !entityId) {
      setLoading(false);
      setInstance(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, get approval instances for this entity
      const response = await getEntityApprovalInstances(entityType, entityId);
      const instances = response?.data?.data || response?.data || [];

      if (instances && instances.length > 0) {
        // Get detailed view of the first/active instance
        const detailedResponse = await getApprovalInstanceDetails(instances[0].id);
        const detailedInstance = detailedResponse?.data?.data || detailedResponse?.data || null;
        setInstance(detailedInstance);
      } else {
        setInstance(null);
      }
    } catch (err) {
      console.error("Failed to fetch approval instance:", err);
      setError(err?.message || "Failed to fetch approval status");
      setInstance(null);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, enabled]);

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

  return {
    instance,
    loading,
    error,
    actionLoading,
    canUserApprove,
    status,
    currentStep,
    totalSteps,
    steps,
    initiatedBy,
    handleApprovalAction,
    handleCancelApproval,
    refetch: fetchApprovalInstance,
  };
};

export default useApprovalWorkflow;
