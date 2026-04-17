import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import ApprovalWorkflowSection from '../approval/ApprovalWorkflowSection';
import { approveNegotiationRound, rejectNegotiationRound } from '@/services/negotiation';
import { formatDisplayDate } from "@/utils/sharedFunctions";

const NegotiationWorkflowModal = ({
  show,
  onHide,
  round,
  hospitalityCompanyId,
  hotelId,
  departmentId,
  onActionComplete
}) => {
  const [submitting, setSubmitting] = useState(false);

  if (!round) return null;

  // Custom approve handler using negotiation API
  const handleApprove = async (comment) => {
    setSubmitting(true);
    try {
      await approveNegotiationRound(round.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to approve' };
    } finally {
      setSubmitting(false);
    }
  };

  // Custom reject handler using negotiation API
  const handleReject = async (comment) => {
    setSubmitting(true);
    try {
      await rejectNegotiationRound(round.id, comment);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to reject' };
    } finally {
      setSubmitting(false);
    }
  };

  const productName = round.product_name || `Product ${round.rfq_product_id}`;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className='py-2 px-3 pb-0'>
        <Modal.Title>
          Negotiation Round {round.round_number} - Approval Workflow
          <div className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>
            {productName}
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3 p-3 bg-light rounded">
          <div className="row">
            <div className="col-md-4">
              <small className="text-muted">Target Price</small>
              <div className="fw-bold">₹{parseFloat(round.target_price || 0).toLocaleString()}</div>
            </div>
            <div className="col-md-4">
              <small className="text-muted">End Date</small>
              <div className="fw-bold">
                {round.end_date ? formatDisplayDate(round.end_date, { includeTime: true }) : 'N/A'}
              </div>
            </div>
            <div className="col-md-4">
              <small className="text-muted">Status</small>
              <div className="fw-bold">{round.status}</div>
            </div>
          </div>
        </div>

        <ApprovalWorkflowSection
          entityType="NEGOTIATION"
          entityId={round.id}
          allEntityIds={[round.id, round.rfq_product_id].filter(Boolean)}
          entityLabel={`Negotiation Round ${round.round_number}`}
          hospitalityCompanyId={hospitalityCompanyId}
          hotelId={hotelId}
          departmentId={departmentId}
          onCustomApprove={handleApprove}
          onCustomReject={handleReject}
          onActionComplete={() => {
            onHide();
            if (onActionComplete) onActionComplete();
          }}
        />
      </Modal.Body>
    </Modal>
  );
};

export default NegotiationWorkflowModal;
