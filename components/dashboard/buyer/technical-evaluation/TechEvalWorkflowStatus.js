import React from 'react';
import { Badge, ProgressBar, Alert } from 'react-bootstrap';
import {
  TECH_EVAL_WORKFLOW_STATES,
  getWorkflowStateLabel,
  getWorkflowStateBadgeVariant
} from '@/utils/constants/techEvalWorkflow';
import { BsCheckCircleFill, BsClockFill, BsExclamationTriangleFill, BsArrowRepeat } from 'react-icons/bs';

/**
 * Displays the technical evaluation workflow status banner
 * Shows progress bar, current round, and status indicators
 */
const TechEvalWorkflowStatus = ({
  workflowState,
  currentRound,
  totalPassedVerified,
  requiredPassedVendors,
  remainingNeeded,
  blockedInsufficientVendors
}) => {
  // Calculate progress percentage
  const progressPercent = requiredPassedVendors > 0
    ? Math.round((totalPassedVerified / requiredPassedVendors) * 100)
    : 0;

  // Get status icon based on workflow state
  const getStatusIcon = () => {
    switch (workflowState) {
      case TECH_EVAL_WORKFLOW_STATES.COMPLETED:
        return <BsCheckCircleFill className="text-success" size={20} />;
      case TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL:
        return <BsClockFill className="text-warning" size={20} />;
      case TECH_EVAL_WORKFLOW_STATES.AWAITING_NEXT_ROUND:
        return <BsArrowRepeat className="text-info" size={20} />;
      default:
        return <BsArrowRepeat className="text-primary" size={20} />;
    }
  };

  // Get progress bar variant based on state
  const getProgressVariant = () => {
    if (workflowState === TECH_EVAL_WORKFLOW_STATES.COMPLETED) return 'success';
    if (progressPercent >= 60) return 'info';
    if (progressPercent >= 40) return 'warning';
    return 'primary';
  };

  return (
    <div className="tech-eval-workflow-status mb-4">
      {/* Main Status Card */}
      <div
        className="border rounded p-3"
        style={{
          backgroundColor: workflowState === TECH_EVAL_WORKFLOW_STATES.COMPLETED
            ? '#d1e7dd'
            : workflowState === TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL
            ? '#fff3cd'
            : '#f8f9fa'
        }}
      >
        {/* Header Row */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            {getStatusIcon()}
            <h6 className="mb-0 fw-bold">Technical Evaluation Progress</h6>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Badge bg="secondary" className="px-2 py-1">
              Round {currentRound}
            </Badge>
            <Badge
              bg={getWorkflowStateBadgeVariant(workflowState)}
              className="px-2 py-1"
            >
              {getWorkflowStateLabel(workflowState)}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="d-flex justify-content-between mb-1">
            <small className="text-muted">
              Vendors Cleared: {totalPassedVerified} / {requiredPassedVendors}
            </small>
            <small className="text-muted">{progressPercent}%</small>
          </div>
          <ProgressBar
            now={progressPercent}
            variant={getProgressVariant()}
            style={{ height: '10px' }}
            animated={workflowState !== TECH_EVAL_WORKFLOW_STATES.COMPLETED}
          />
        </div>

        {/* Status Message */}
        <div className="mt-2">
          {workflowState === TECH_EVAL_WORKFLOW_STATES.COMPLETED && (
            <small className="text-success fw-medium">
              <BsCheckCircleFill className="me-1" />
              Evaluation complete! {requiredPassedVendors} vendors have been cleared and verified.
            </small>
          )}
          {workflowState === TECH_EVAL_WORKFLOW_STATES.PENDING_APPROVAL && (
            <small className="text-warning fw-medium">
              <BsClockFill className="me-1" />
              Round {currentRound} is pending approval. Waiting for approver action.
            </small>
          )}
          {workflowState === TECH_EVAL_WORKFLOW_STATES.EVALUATING && (
            <small className="text-primary fw-medium">
              <BsArrowRepeat className="me-1" />
              Evaluating vendors. {remainingNeeded} more vendor{remainingNeeded !== 1 ? 's' : ''} needed to complete.
            </small>
          )}
          {workflowState === TECH_EVAL_WORKFLOW_STATES.AWAITING_NEXT_ROUND && (
            <small className="text-dark fw-medium">
              <BsArrowRepeat className="me-1" />
              Awaiting replacement vendors for next round. {remainingNeeded} more needed.
            </small>
          )}
        </div>
      </div>

      {/* Insufficient Vendors Warning */}
      {blockedInsufficientVendors && (
        <Alert variant="warning" className="mt-2 mb-0 py-2">
          <div className="d-flex align-items-center gap-2">
            <BsExclamationTriangleFill size={18} />
            <div>
              <strong>Warning:</strong> No more replacement vendors available.
              The evaluation will continue with the available vendors.
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default TechEvalWorkflowStatus;
