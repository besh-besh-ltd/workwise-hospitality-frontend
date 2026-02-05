import React, { useState } from 'react';
import { Card, Badge, Button, Collapse, Spinner } from 'react-bootstrap';
import { BsCheckCircleFill, BsClockFill, BsXCircleFill, BsFileBreak, BsChevronDown, BsChevronUp, BsArrowCounterclockwise, BsArrowRepeat } from 'react-icons/bs';
import ApprovalWorkflowSection from '@/components/dashboard/buyer/approval/ApprovalWorkflowSection';

const statusConfig = {
  PENDING: {
    icon: BsClockFill,
    color: '#ffc107',
    bgColor: '#fff3cd',
    borderColor: '#ffc107',
    badgeVariant: 'warning',
    badgeText: 'dark',
    label: 'Pending Approval'
  },
  APPROVED: {
    icon: BsCheckCircleFill,
    color: '#198754',
    bgColor: '#d1e7dd',
    borderColor: '#198754',
    badgeVariant: 'success',
    badgeText: 'white',
    label: 'Approved'
  },
  REJECTED: {
    icon: BsXCircleFill,
    color: '#dc3545',
    bgColor: '#f8d7da',
    borderColor: '#dc3545',
    badgeVariant: 'danger',
    badgeText: 'white',
    label: 'Rejected'
  },
  CANCELLED: {
    icon: BsArrowCounterclockwise,
    color: '#6c757d',
    bgColor: '#e9ecef',
    borderColor: '#6c757d',
    badgeVariant: 'secondary',
    badgeText: 'white',
    label: 'Sent Back'
  }
};

const ProductArcCard = ({
  product,
  arcInstance,
  rfq,
  lifecycleData,
  onRefresh,
  arcHandlers,
  readOnly = false,
  refreshing = false
}) => {
  const [expanded, setExpanded] = useState(!readOnly);

  if (!product) return null;

  const productName = product.product_details?.[0]?.name || 'Unknown Product';
  const specs = product.product_specs || [];
  const qty = specs.find(s => s.title === 'Quantity')?.value;
  const unit = specs.find(s => s.title === 'Unit')?.value || '';
  const size = specs.find(s => s.title === 'Size')?.value;

  const status = arcInstance?.status || 'PENDING';
  const config = statusConfig[status] || statusConfig.PENDING;
  const StatusIcon = config.icon;
  const documentUrl = arcInstance?.metadata?.award_document_url;

  // For cancelled status, check if there's a target stage info
  const sentBackTo = arcInstance?.metadata?.sent_back_to || arcInstance?.metadata?.target_stage;
  const cancelledLabel = sentBackTo
    ? `Sent to ${sentBackTo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
    : 'Sent Back';

  // Custom handlers for ARC approval
  const handleArcApprove = async (comment, context = {}) => {
    if (arcHandlers?.onApprove) {
      return await arcHandlers.onApprove(product.id, comment, context);
    }
    return { success: false, error: 'No approve handler provided' };
  };

  const handleArcReject = async (comment, context = {}) => {
    if (arcHandlers?.onReject) {
      return await arcHandlers.onReject(product.id, comment, context);
    }
    return { success: false, error: 'No reject handler provided' };
  };

  return (
    <Card
      className="product-arc-card"
      style={{
        borderLeft: `4px solid ${config.borderColor}`,
        backgroundColor: expanded ? config.bgColor : '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Refreshing indicator bar */}
      {refreshing && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #0d6efd, #198754, #0d6efd)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite linear'
          }}
        />
      )}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <Card.Body className="p-0">
        {/* Header - Always visible */}
        <div
          className="d-flex justify-content-between align-items-center p-3"
          onClick={() => setExpanded(!expanded)}
          style={{ cursor: 'pointer' }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: 40,
                height: 40,
                backgroundColor: refreshing ? '#6c757d' : config.color,
                color: 'white',
                flexShrink: 0,
                transition: 'background-color 0.3s ease'
              }}
            >
              {refreshing ? (
                <Spinner animation="border" size="sm" variant="light" />
              ) : (
                <StatusIcon size={18} />
              )}
            </div>
            <div>
              <h6 className="mb-1">{productName}</h6>
              <div className="text-muted small">
                {qty && <>Qty: {qty} {unit}</>} {size && `| Size: ${size}`}
              </div>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <Badge bg={refreshing ? 'info' : config.badgeVariant} text={config.badgeText}>
              {refreshing ? (
                <><BsArrowRepeat className="me-1" style={{ animation: 'spin 1s linear infinite' }} />Updating...</>
              ) : (
                status === 'CANCELLED' ? cancelledLabel : config.label
              )}
            </Badge>

            {/* Document link for approved */}
            {status === 'APPROVED' && documentUrl && (
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-dark btn-sm p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <BsFileBreak className="me-1" />
                View Document
              </a>
            )}

            {/* Expand/Collapse button */}
            <div
              className="p-0 text-muted"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? <BsChevronUp size={20} /> : <BsChevronDown size={20} />}
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        <Collapse in={expanded}>
          <div>
            <div className="border-top p-3">
              {/* Approval Workflow Section */}
              <ApprovalWorkflowSection
                entityType="ARC"
                entityId={product.id}
                entityLabel={productName}
                hospitalityCompanyId={rfq?.hospitality_company_id}
                hotelId={rfq?.hotel_id}
                onCustomApprove={arcHandlers ? handleArcApprove : undefined}
                onCustomReject={arcHandlers ? handleArcReject : undefined}
                onActionComplete={onRefresh}
              />
            </div>
          </div>
        </Collapse>
      </Card.Body>
    </Card>
  );
};

export default ProductArcCard;
