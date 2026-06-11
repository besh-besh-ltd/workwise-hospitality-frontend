import React from 'react';
import { Badge, Table, Alert } from 'react-bootstrap';
import moment from 'moment';
import { BsClipboardCheck } from 'react-icons/bs';
import ApprovalWorkflowSection from '@/components/dashboard/buyer/approval/ApprovalWorkflowSection';
import StageEventHistory from '../StageEventHistory';

const StageTechnicalEval = ({ stage, rfq, lifecycleData, onRefresh }) => {
  const { details } = stage;
  const evaluations = details.evaluations || lifecycleData?.techEvaluation || [];

  // Flatten all vendor evaluations
  const allEvaluations = evaluations.flatMap(techEval =>
    (techEval.vendor_evaluations || []).map(v => ({
      ...v,
      productId: techEval.rfq_product_id,
      productName: rfq?.products?.find(p => p.id === techEval.rfq_product_id)?.product_details?.[0]?.name || `Product ${techEval.rfq_product_id}`
    }))
  );

  // Count stats
  const acceptedCount = allEvaluations.filter(e => e.is_accepted).length;
  const rejectedCount = allEvaluations.filter(e => !e.is_accepted).length;

  return (
    <div className="stage-tech-eval">
      <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
        Technical evaluation was conducted to assess vendor capabilities and product compliance.
      </p>

      {/* Stats */}
      {allEvaluations.length > 0 && (
        <div className="d-flex gap-4 mb-3">
          <div className="d-flex align-items-center gap-2">
            <Badge bg="success" className="px-2 py-1">{acceptedCount}</Badge>
            <span className="text-muted small">Accepted</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Badge bg="danger" className="px-2 py-1">{rejectedCount}</Badge>
            <span className="text-muted small">Rejected</span>
          </div>
        </div>
      )}

      {/* Approval Workflow for Tech Eval */}
      {details.approvalData?.entity_id && (
        <div className="mb-3">
          <ApprovalWorkflowSection
            entityType="TECHNICAL"
            entityId={details.approvalData.entity_id}
            entityLabel="Technical Evaluation"
            hospitalityCompanyId={rfq?.hospitality_company_id}
            hotelId={rfq?.hotel_id}
            onActionComplete={onRefresh}
          />
        </div>
      )}

      {/* Evaluations Table */}
      {allEvaluations.length > 0 ? (
        <Table size="sm" bordered hover className="mb-0">
          <thead className="table-light">
            <tr>
              <th>Product</th>
              <th>Vendor</th>
              <th>Status</th>
              <th>Score</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {allEvaluations.map((item, idx) => (
              <tr key={idx}>
                <td className="small">{item.productName}</td>
                <td className="fw-semibold">{item.vendor_name}</td>
                <td>
                  <Badge bg={item.is_accepted ? 'success' : 'danger'}>
                    {item.is_accepted ? 'Accepted' : 'Rejected'}
                  </Badge>
                </td>
                <td>{item.score}</td>
                <td className="small text-muted">{item.remarks}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Alert variant="info" className="mb-0">
          <BsClipboardCheck className="me-2" />
          No technical evaluation data available
        </Alert>
      )}

      {/* Full Event History */}
      {stage.history && stage.history.length > 1 && (
        <div className="mt-3 pt-3 border-top">
          <StageEventHistory
            events={stage.history}
            title="Technical Evaluation History"
          />
        </div>
      )}

      {/* Actor info (single event fallback) */}
      {stage.actor && stage.status === 'completed' && (!stage.history || stage.history.length <= 1) && (
        <div className="pt-3 mt-3 border-top">
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              <strong>Completed by:</strong> {stage.actor}
            </div>
            {stage.timestamp && (
              <div className="text-muted small">
                {moment(stage.timestamp).format('DD-MM-YYYY hh:mm A')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StageTechnicalEval;
