import React from 'react';
import { Card, Row, Col, Badge, Button, ProgressBar } from 'react-bootstrap';
import { Calendar, User, Package, Building, Eye, CheckCircle, Upload, AlertTriangle } from 'lucide-react';
import { addCommasToNumber } from '@/utils/sharedFunctions';
import Link from 'next/link';

const POCard = ({ po, onClick, initiatePO, onAccept, onReject }) => {
  // Status text mapping
  const getStatusText = (status) => {
    const statusTextMap = {
      'approved': 'Approved',
      'acceptance_pending': 'Acceptance Pending',
      'rejected_by_vendor': 'Rejected by You',
      'invoice_raised': 'Invoice Raised',
      'dispatched': 'Dispatched',
      'grn': 'Goods Received Note',
      'overdue': 'Overdue',
      'draft': 'Draft'
    };
    return statusTextMap[status.toLowerCase()] || status;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric', 
      year: 'numeric'
    });
  };

  // Determine milestone progress and text
  const getMilestoneInfo = () => {
    const status = po.status.toLowerCase();
    
    if (status === 'acceptance_pending') {
      return {
        text: 'Your Action Required',
        progress: 20,
        color: 'warning',
        badge: 'Accept or Reject'
      };
    } else if (status === 'rejected_by_vendor') {
      return {
        text: 'Rejected',
        progress: 0,
        color: 'danger',
        badge: 'Rejected'
      };
    } else if (status === 'approved') {
      return {
        text: 'Vendor Confirmation',
        progress: 35,
        color: 'success',
        badge: 'On track'
      };
    } else if (status === 'dispatched') {
      return {
        text: 'Delivery Expected',
        progress: 65,
        color: 'primary',
        badge: 'Due in 3 days'
      };
    } else if (status === 'overdue') {
      return {
        text: 'Invoice Receipt',
        progress: 80,
        color: 'danger',
        badge: '5 days overdue'
      };
    }
    
    return {
      text: 'Processing',
      progress: 10,
      color: 'secondary',
      badge: 'Pending'
    };
  };

  // Get action button based on status
  const getActionButton = () => {
    const status = po.status.toLowerCase();
    
    if (status === 'acceptance_pending') {
      return (
        <div className="d-flex flex-column gap-2">
          <button onClick={onAccept} className="btn btn-success btn-sm p-2 px-4" style={{width: "250px"}}>
            <CheckCircle size={16} className="me-1" />
            Accept PO
          </button>
          <button onClick={onReject} className="btn btn-outline-danger btn-sm p-2 px-4" style={{width: "250px"}}>
            <AlertTriangle size={16} className="me-1" />
            Reject PO
          </button>
        </div>
      );
    } else if (status === 'rejected_by_vendor') {
      return null;
    } else if (status === 'dispatched') {
      return (
        <button className="btn btn-success btn-sm p-2 px-4 mb-2" style={{width: "250px"}}>
          <Upload size={16} className="me-1" />
          Mark as Delivered
        </button>
      );
    } else if (status === 'approved') {
      return (
        <button className="btn btn-primary btn-sm p-2 px-4 mb-2" style={{width: "250px"}}>
          <Upload size={16} className="me-1" />
          Mark as Dispatched
        </button>
      );
    } else if (status === 'overdue') {
      return (
        <button className="btn btn-secondary btn-sm p-2 px-4 mb-2" style={{width: "250px"}}>
          <AlertTriangle size={16} className="me-1" />
          Follow Up Vendor
        </button>
      );
    }
    
    return null;
  };

  const milestoneInfo = getMilestoneInfo();

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <Row>
          {/* Left Column - PO Details */}
          <Col md={7}>
            <div className="d-flex justify-content-between align-items-start">
              <div className="d-flex flex-column gap-2">
                <div>
                  <h5 className="mb-1 fw-bold">#{po.po_number}</h5>
                  <small className="text-muted">
                    <Calendar size={14} className="me-1" />
                    Initiated: {formatDate(po.created_at)}
                  </small>
                </div>
                <div className="d-flex gap-4">
                  <div className="mb-3">
                    <div className="fw-semibold text-dark mb-1">Product(s)</div>
                    <div className="text-muted d-flex flex-column">
                      {po.product_details.map(p => (
                        <span>{p.name}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="fw-semibold text-dark mb-1">Vendor</div>
                    <div className="text-muted">
                      <Building size={14} className="me-1" />
                      {po.finalized_vendor_name}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-3" style={{width: "40%"}}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted small">
                    {po.status.toLowerCase() === "overdue"
                      ? "Overdue Milestone"
                      : "Next Milestone"}
                  </span>
                  <Badge
                    bg={
                      po.status.toLowerCase() === "overdue"
                        ? "danger"
                        : "success"
                    }
                    className="px-2"
                  >
                    Due: 04 Sept 2025
                  </Badge>
                </div>
                <div className="fw-semibold mb-1">{milestoneInfo.text}</div>

                <ProgressBar
                  now={milestoneInfo.progress}
                  variant={milestoneInfo.color}
                  style={{ height: "6px" }}
                  className="mb-1"
                />
                <small className="text-muted">
                  {milestoneInfo.progress}% Complete
                  {po.status.toLowerCase() === "overdue" &&
                    " - Action Required"}
                </small>
              </div>
            </div>
          </Col>

          {/* Middle Column - Financial & Milestone Info */}
          <Col md={2}>
            <div className="text-end mb-3">
              <div className="text-muted small">PO Value</div>
              <div className="h4 fw-bold text-dark mb-0">
                ₹{addCommasToNumber(po.total_value)}
              </div>
            </div>

            <div className="text-end mb-3">
              <div className="text-muted small">Current Status</div>
              <div className="fw-semibold">{getStatusText(po.status)}</div>
            </div>
          </Col>

          {/* Right Column - Actions */}
          <Col md={3}>
            <div className="d-flex flex-column align-items-end">
              {getActionButton()}

              {po.status === 'draft' && (
                <button onClick={initiatePO} className="btn btn-success btn-sm p-2 px-4 mb-2" style={{width: "250px"}}>
                  Initiate this PO
                </button>
              )}

              {po.status.toLowerCase() === "overdue" && (
                <button className="btn btn-success btn-sm p-2 px-4 mb-2" style={{width: "250px"}}>
                  <Upload size={16} className="me-2" />
                  Mark Invoice Received
                </button>
              )}

              <button className="btn btn-success btn-sm p-2 px-4 mb-2" style={{width: "250px"}}>
                <CheckCircle size={16} className="me-2" />
                Complete Milestone
              </button>
              <button onClick={onClick} className="btn btn-outline-dark btn-sm p-2 px-4" style={{width: "250px"}}>
                View More Details
              </button>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default POCard;