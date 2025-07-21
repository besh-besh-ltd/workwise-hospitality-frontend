import React from 'react';
import { Badge, Card } from 'react-bootstrap';
import {
  MdCancel,
  MdCheckCircle,
  MdEventNote,
  MdOutlineBusinessCenter
} from 'react-icons/md';
import { BsBoxSeam } from 'react-icons/bs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

const statusColors = {
  draft: 'secondary',
  pending_approval: 'warning',
  approved: 'success',
  sent: 'primary',
  GRN: 'info',
  completed: 'dark',
  cancelled: 'danger',
  rejected: 'danger',
};

const POStatusBadge = ({ status }) => (
  <Badge bg={statusColors[status] || 'secondary'} className="fs-6 px-3 py-2 float-end text-uppercase">
    {status.replace('_', ' ')}
  </Badge>
);

const PODetailItem = ({ label, value }) => (
  <div className="mb-2">
    <strong>{label}:</strong> {value}
  </div>
);

const TimelineItem = ({ title, name, icon, time, remarks }) => (
  <div className="d-flex align-items-start">
    <div style={{ fontSize: '1.5rem', color: '#0d6efd', marginRight: '0.8rem' }}>{icon}</div>
    <div>
      <h6 className='fw-semibold mb-0'>{title}</h6>
      <small className="text-muted">{name} • {time || 'N/A'}</small>
      {remarks && <div className="fst-italic text-muted text-sm">"{remarks}"</div>}
    </div>
  </div>
);

const renderDueDateCell = (dueDateStr) => {
  const today = new Date();
  const dueDate = new Date(dueDateStr);
  const timeDiff = dueDate - today;
  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  const formattedDate = dueDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });

  const statusText =
    dayDiff > 0
      ? `Due in ${dayDiff} day${dayDiff > 1 ? "s" : ""}`
      : dayDiff === 0
      ? "Due Today"
      : `Past ${Math.abs(dayDiff)} day${Math.abs(dayDiff) > 1 ? "s" : ""}`;

  const textColor = dayDiff < 0 ? "text-danger" : dayDiff < 5 ? "text-warning" : "text-success";

  return (
    <td className={`fw-semibold ${textColor}`}>
      {formattedDate}
      <br />
      <small className="text-muted">{statusText}</small>
    </td>
  );
};


const formatIST = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';

const PurchaseOrderDetails = ({ data, handleBack }) => {
  const {
    po_number,
    status,
    quantity,
    unit_price,
    total_value,
    initiated_by_name,
    created_at,
    product_details,
    approval_history = [],
  } = data;

  return (
    <div>
      {/* Header */}
      <button onClick={handleBack} className="btn btn-primary p-2 mb-3 px-3" style={{width: 'fit-content'}}>
        <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
        Back
      </button>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h3 className="mb-1">Purchase Order #{po_number}</h3>
          <div className="text-muted">
            Initiated by: <strong>{initiated_by_name}</strong> on{" "}
            <strong>{formatIST(created_at)}</strong>
          </div>
        </div>
        <POStatusBadge status={status} />
      </div>

      {/* PO Overview */}
      <Card className="mb-4 shadow-sm">
        <Card.Body
          style={{ padding: "0.8rem 1.25rem", paddingBottom: "0.4rem" }}
        >
          <div className="row">
            <div className="col-md-6">
              <PODetailItem label="Quantity" value={quantity} />
              <PODetailItem label="Unit Price" value={`₹ ${unit_price}`} />
              <PODetailItem label="Total Value" value={`₹ ${total_value}`} />
            </div>
            <div className="col-md-6">
              <PODetailItem label="Created At" value={formatIST(created_at)} />
              <PODetailItem label="Initiated By" value={initiated_by_name} />
              <PODetailItem label="Status" value={status.toUpperCase()} />
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Product Details */}
      <Card className="mb-4 shadow-sm">
        <Card.Body className="d-flex align-items-center">
          <BsBoxSeam className="me-3 fs-2 text-primary" />
          <div>
            <strong>{product_details?.name}</strong>
            <div className="text-muted">
              Product ID: {product_details?.product_id}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Approval Timeline */}
      <h5 className="mb-3">
        <MdEventNote className="me-2" />
        Approval Timeline
      </h5>
      <Card className="mb-4">
        <Card.Body className='d-flex gap-2'>
          {approval_history.length === 0 ? (
            <p className="text-muted mb-0">No approval history available.</p>
          ) : (
            approval_history.map((entry, index) => (
              <TimelineItem
                key={index}
                title={
                  entry.action === "approved"
                    ? "Approved"
                    : entry.action === "rejected"
                    ? "Rejected"
                    : "Action Taken"
                }
                name={entry.approved_by_name}
                icon={
                  entry.action === "approved" ? (
                    <MdCheckCircle className="text-success" size={30} />
                  ) : (
                    <MdCancel className="text-danger" size={30} />
                  )
                }
                time={formatIST(entry.created_at)}
                remarks={entry.remarks}
              />
            ))
          )}
        </Card.Body>
      </Card>

      {/* Payment Milestones */}
      <h5 className="mb-3">
        <MdOutlineBusinessCenter className="me-2" />
        Payment Milestones
      </h5>

      <Card className="overflow-hidden">
        <Card.Body className="table-responsive p-0">
          <table className="table table-stripped align-middle m-0 text-center">
            <thead className="table-light">
              <tr>
                <th>PO No</th>
                <th>Vendor</th>
                <th>Project</th>
                <th>Status</th>
                <th>Milestone Summary</th>
                <th>Due Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>PO123</td>
                <td>ABC Pvt Ltd</td>
                <td>Green Hydrogen Plant</td>
                <td>
                  <Badge bg="warning">Pending</Badge>
                </td>
                <td>GRN Pending (PM)</td>
                {renderDueDateCell("2025-07-14")}
                <td>
                  📥 Upload GRN <br />
                  🔔 Remind PM
                </td>
              </tr>
              <tr>
                <td>PO124</td>
                <td>XYZ Pumps</td>
                <td>Bitumen Tank Yard</td>
                <td>
                  <Badge bg="success">Achieved</Badge>
                </td>
                <td>Raise Invoice to Client (Accounts)</td>
                {renderDueDateCell("2025-07-21")}
                <td>
                  🧾 Raise Invoice <br />
                  🔔 Remind Accounts
                </td>
              </tr>
            </tbody>
          </table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PurchaseOrderDetails;