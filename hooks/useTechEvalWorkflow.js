import { useState, useEffect, useCallback } from "react";
import { getTechEvalStatus } from "@/services/rfq";
import {
  TECH_EVAL_WORKFLOW_STATES,
  TARGET_PASSED_VENDORS,
  ROUND_STATUS
} from "@/utils/constants/techEvalWorkflow";

/**
 * Custom hook for managing technical evaluation workflow state
 * Supports iterative multi-round approval workflow
 *
 * @param {Object} options
 * @param {number} options.rfq_product_id - RFQ product ID
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 * @returns {Object} Workflow state and actions
 */
export const useTechEvalWorkflow = ({ rfq_product_id, enabled = true }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch workflow status
  const fetchStatus = useCallback(async () => {
    if (!enabled || !rfq_product_id) {
      setLoading(false);
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getTechEvalStatus(rfq_product_id);
      const responseData = response?.data?.data || response?.data || null;
      setData(responseData);
    } catch (err) {
      console.error("Failed to fetch tech eval workflow status:", err);
      setError(err?.message || "Failed to fetch workflow status");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [rfq_product_id, enabled]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Compute workflow state based on API response
  const computeWorkflowState = useCallback(() => {
    if (!data) return TECH_EVAL_WORKFLOW_STATES.EVALUATING;

    // If workflow is complete, return COMPLETED
    if (data.is_complete) {
      return TECH_EVAL_WORKFLOW_STATES.COMPLETED;
    }

    // Check if any round is pending approval (PENDING = just created, SUBMITTED = sent for approval)
    const hasPendingRound = data.rounds?.some(
      r => r.status === ROUND_STATUS.PENDING || r.status === ROUND_STATUS.SUBMITTED
    );
    if (hasPendingRound) {
      return TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL;
    }

    // Check if there are vendors pending evaluation
    const hasPendingVendors = data.vendors?.pending_evaluation?.length > 0;
    if (hasPendingVendors) {
      return TECH_EVAL_WORKFLOW_STATES.EVALUATING;
    }

    // If all eligible vendors have been evaluated (passed + failed = selected,
    // none pending), treat as complete even if the passed count is below
    // the configured threshold.
    const passedCount = data.vendors?.passed_verified?.length || 0;
    const failedCount = data.vendors?.failed_verified?.length || 0;
    const selectedCount = data.vendors?.selected?.length || 0;
    if (selectedCount > 0 && passedCount + failedCount >= selectedCount) {
      return TECH_EVAL_WORKFLOW_STATES.COMPLETED;
    }

    // Otherwise, awaiting next round (need to fetch replacement vendors)
    return TECH_EVAL_WORKFLOW_STATES.AWAITING_NEXT_ROUND;
  }, [data]);

  const workflowState = computeWorkflowState();

  // Get the latest round (most recent)
  const latestRound = data?.rounds?.length > 0
    ? data.rounds[data.rounds.length - 1]
    : null;

  // Calculate remaining vendors needed
  // Use the actual passed_verified array length as source of truth (more reliable than stored field)
  const passedVerifiedCount = data?.vendors?.passed_verified?.length ?? 0;
  const storedTotalPassedVerified = data?.total_passed_verified ?? 0;
  // Use the maximum of actual count and stored value to ensure progress is always accurate
  const totalPassedVerified = Math.max(passedVerifiedCount, storedTotalPassedVerified);
  const requiredPassedVendors = data?.required_passed_vendors || TARGET_PASSED_VENDORS;
  const remainingNeeded = Math.max(0, requiredPassedVendors - totalPassedVerified);

  return {
    // Raw data from API
    techEvalId: data?.tech_evaluation_id || null,
    isComplete: data?.is_complete || false,
    currentRound: data?.current_round || 1,
    totalPassedVerified,
    requiredPassedVendors,
    blockedInsufficientVendors: data?.blocked_insufficient_vendors || false,

    // Rounds data
    rounds: data?.rounds || [],
    latestRound,

    // Vendors categorized
    passedVerifiedVendors: data?.vendors?.passed_verified || [],
    failedVerifiedVendors: data?.vendors?.failed_verified || [],
    pendingEvaluationVendors: data?.vendors?.pending_evaluation || [],

    // Summary
    summary: data?.summary || {
      passed_verified_count: 0,
      failed_verified_count: 0,
      pending_count: 0,
      vendors_needed: TARGET_PASSED_VENDORS
    },

    // Computed
    workflowState,
    remainingNeeded,

    // State
    loading,
    error,
    refetch: fetchStatus
  };
};

export default useTechEvalWorkflow;
