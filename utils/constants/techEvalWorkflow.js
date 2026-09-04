/**
 * Technical Evaluation Workflow Constants
 *
 * Supports iterative multi-round approval workflow where evaluations
 * continue until required number of vendors pass and are approved.
 */

// Workflow state machine states
export const TECH_EVAL_WORKFLOW_STATES = {
  EVALUATING: 'EVALUATING',           // Actively evaluating vendors in current round
  PENDING_APPROVAL: 'PENDING_APPROVAL', // Submitted for approval, waiting on approver
  AWAITING_NEXT_ROUND: 'AWAITING_NEXT_ROUND', // Approved, but more vendors needed
  COMPLETED: 'COMPLETED'               // 5 vendors cleared and approved
};

// Vendor evaluation status
export const VENDOR_EVAL_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  PENDING: 'pending'
};

// Target number of vendors that must pass
export const TARGET_PASSED_VENDORS = 5;

// Round status values from backend
export const ROUND_STATUS = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

/**
 * Creates metadata structure for approval submission
 * @param {Array} vendors - List of evaluated vendors with their status
 * @param {number} round - Current evaluation round number
 * @returns {Object} Metadata structure for approval workflow
 */
export const createTechEvalMetadata = (vendors, round) => ({
  vendors: vendors.map(v => ({
    vendor_id: v.vendor_id,
    vendor_name: v.vendor_name,
    status: v.is_passed ? VENDOR_EVAL_STATUS.PASSED : VENDOR_EVAL_STATUS.FAILED,
    calculated_score: v.calculated_score,
    rank: v.rank
  })),
  round,
  total_passed: vendors.filter(v => v.is_passed).length,
  total_failed: vendors.filter(v => !v.is_passed).length
});

/**
 * Get display label for workflow state
 * @param {string} state - Workflow state
 * @returns {string} Human readable label
 */
export const getWorkflowStateLabel = (state) => {
  const labels = {
    [TECH_EVAL_WORKFLOW_STATES.EVALUATING]: 'Evaluating',
    [TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL]: 'Pending Approval',
    [TECH_EVAL_WORKFLOW_STATES.AWAITING_NEXT_ROUND]: 'Awaiting Next Round',
    [TECH_EVAL_WORKFLOW_STATES.COMPLETED]: 'Completed'
  };
  return labels[state] || state;
};

/**
 * Get badge variant for workflow state (Bootstrap colors)
 * @param {string} state - Workflow state
 * @returns {string} Bootstrap badge variant
 */
export const getWorkflowStateBadgeVariant = (state) => {
  const variants = {
    [TECH_EVAL_WORKFLOW_STATES.EVALUATING]: 'primary',
    [TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL]: 'warning',
    [TECH_EVAL_WORKFLOW_STATES.AWAITING_NEXT_ROUND]: 'dark',
    [TECH_EVAL_WORKFLOW_STATES.COMPLETED]: 'success'
  };
  return variants[state] || 'secondary';
};
