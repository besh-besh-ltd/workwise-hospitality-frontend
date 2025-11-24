import React, { useEffect, useState } from 'react';
import { Card, Button, Accordion, Badge } from "react-bootstrap";

import {
  MdEventNote,
  MdOutlineBusinessCenter,
  MdTimeline
} from 'react-icons/md';
import { BsBoxSeam, BsPerson, BsExclamationCircleFill, BsCheckCircleFill, BsXCircleFill } from 'react-icons/bs';
import { MdHistory } from "react-icons/md";
import { HiOutlineTrash, HiPencil } from "react-icons/hi";
import { BsFilePdf } from "react-icons/bs";
import { FiDownload, FiExternalLink } from "react-icons/fi";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faPencil
} from "@fortawesome/free-solid-svg-icons";
import CreateMilestoneModal from './CreateMilestoneModal';
import { toast } from 'react-toastify';
import { handleDeleteMilestone, handleDeleteTask, handleGetTasks, handleUpdateGST, handleUpdateHSN } from '@/services/po';
import CreateTaskModal from './CreateTaskModal';
import Pagination from '@/components/shared/Pagination';
import { getProjectAvailableBudget } from '@/services/project';
import { addCommasToNumber, formatToINRShort } from '@/utils/sharedFunctions';
import Link from 'next/link';
import ConfirmationModal from '@/components/modal/ConfirmationModal';
import CommonFormInput from '@/components/shared/CommonFormInput';
import { useRouter } from 'next/navigation';
import PurchaseOrderEditView from './PurchaseOrderEditView';

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

const milestoneBadges = {
  pending: 'warning',
  achieved: 'success',
  cancelled: 'dark',
  deleted: 'danger'
}

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

const renderDueDateCell = (dueDateStr, isTask = false) => {
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
      ? isTask ? "Completed Today" : "Due Today"
      : `${isTask ? "Completed" : "Past"} ${Math.abs(dayDiff)} day${Math.abs(dayDiff) > 1 ? "s" : ""} ${isTask ? "ago" : ""}`;

  const textColor = dayDiff < 0 ? isTask ? "text-success" : "text-danger" : dayDiff < 5 ? isTask ? "text-success" : "text-warning" : "text-success";

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

const elipsisToLimit = (text, limit = 45) => {
  return text.length > limit ? text.slice(0, limit).concat('...') : text;
}

const PurchaseOrderDetails = ({ data, handlePODecision, handleInitiatePO, handleBack, refetchPODetails, companyUsers, isEditing, setIsEditing, handleUpdatePO }) => {
  const {
    id,
    rfq_id,
    po_number,
    finalized_vendor_id,
    finalized_vendor_name,
    finalized_vendor_email,
    status,
    quantity,
    unit_price,
    total_value,
    initiated_by_name,
    created_at,
    project_id,
    project_details,
    product_details,
    is_approver,
    logged_in_user,
    approval_status,
    approval_history = [],
    payment_milestones,
    hsn_codes,
    gstin: fetchedGST,
    quotations,
    rfq_product_id,
    poPdfUrl
  } = data;

  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [budgetInfo, setBudgetInfo] = useState(null);
  const [hsnCodeInfo, setHSNCodeInfo] = useState({
    loadMore: false,
    hsnCodes: []
  })
  const [gstin, setGstin] = useState(fetchedGST);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  
  const [tasks, setTasks] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [showRejectConfirmModal, setShowRejectConfirmModal] = useState(false);
  const [showDeleteMilestoneConfirmModal, setShowDeleteMilestoneConfirmModal] = useState(false);
  const [showDeleteTaskConfirmModal, setShowDeleteTaskConfirmModal] = useState(false);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);

  const router = useRouter();

  const handleMilestoneDeletion = async (id) => {
    try {
      const res = await handleDeleteMilestone(id);
      if(res) {
        toast.info("Milestone deleted successfully!")
        await refetchPODetails();
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? "Something went wrong while deleting the milestone!");
    }
  }

  const handleTaskDeletion = async (id) => {
    try {
      const res = await handleDeleteTask(id);
      if(res) {
        toast.info("Milestone deleted successfully!")
        await refetchPODetails();
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? "Something went wrong while deleting the milestone!");
    }
  }

  const handleFetchTasks = async () => {
    try {
      const res = await handleGetTasks(id, filters);
      if(res) {
        setTasks(res);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message ?? "Something went wrong while deleting the milestone!");
    }
  }

  const handleFetchBudget = async () => {
    try {
      if(!project_id) return;
      
      const res = await getProjectAvailableBudget(project_id);
      if(res) {
        setBudgetInfo(res);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const handleSaveHSN = async () => {
    try {
      const res = await handleUpdateHSN(id, hsnCodeInfo.hsnCodes);
      if(res) {
        toast.success("HSN Codes has been saved successfully!")
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save HSN Codes, please try again!")
    }
  }

  const handleSaveGST = async () => {
    try {
      const res = await handleUpdateGST(id, gstin);
      if(res) {
        toast.success("GSTIN has been saved successfully!")
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save GSTIN, please try again!")
    }
  }

  const POReviewCompact = (poData) => {
      if(!poData) return null;
  
      const pdfUrl = poData.poPdfUrl;
      const fileName = `PO_${poData.po_number}.pdf`;
  
      return (
        <div className="card border-0">
          <div className="card-body">
            <div className="flex align-items-center gap-2">
              <div>
                <BsFilePdf size={32} className="text-danger" />
              </div>
              <div className="mt-1">
                <div className="fw-semibold">{fileName}</div>
                <small className="text-muted">Purchase Order Document</small>
              </div>
              <div className="mt-2">
                <a 
                  className="btn p-2 btn-outline-secondary"
                  href={pdfUrl}
                  target="__blank"
                >
                  View
                  <FiExternalLink className="ms-1" size={12} />
                </a>
              </div>
            </div>
            <div className="mt-2">
              <small className="text-muted">
                Click to preview the formal PO document that will be emailed to the vendor.
              </small>
            </div>
          </div>
        </div>
      );
    };

  const handleMilestoneEdition = (milestone) => {
    setSelectedMilestone(milestone);
    setShowMilestoneModal(true);
  }

  const handleTaskEdition = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  }

  const restrictModifyPO = (status) => status == 'rejected' || status == 'cancelled' || status == 'approved'

  useEffect(() => {
    handleFetchTasks();
  }, [filters])

  useEffect(() => {
    handleFetchBudget();
  }, [])

  useEffect(() => {
    if(data) {
      setHSNCodeInfo((info) => ({
        ...info,
        hsnCodes: hsn_codes.map((hsn) => ({
          rfq_item_id: hsn.rfq_item_id,
          code: hsn.hsn_code,
        })),
      }));
      setGstin(fetchedGST);
    }
  }, [data]);

  // === NON-EDIT VIEW ===
  if(!isEditing) {
    return (
      <div>
        {/* Header */}
        <div className="d-flex align-items-center gap-2">
          <button
            onClick={handleBack}
            className="btn btn-primary p-2 mb-3 px-3"
            style={{ width: "fit-content" }}
            id="back_button-po_details-purchase_order_page"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
            Back
          </button>
          <button
            onClick={() => setShowEditConfirmModal(true)}
            className="btn btn-primary p-2 mb-3 px-3"
            style={{ width: "fit-content" }}
            id="edit_button-po_details-purchase_order_page"
            disabled={restrictModifyPO(status)}
          >
            <FontAwesomeIcon icon={faPencil} className="me-2" />
            Edit This PO
          </button>
        </div>
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h3 className="mb-1">Purchase Order #{po_number}</h3>
            <div className="text-muted">
              Initiated by: <strong>{initiated_by_name || "-"}</strong> on{" "}
              <strong>{formatIST(created_at)}</strong>
            </div>
          </div>
          <div className="d-flex gap-2 flex-column">
            <POStatusBadge status={status} />
            {status === "draft" && (
              <div className="d-flex gap-1 justify-content-between">
                <Badge
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleInitiatePO(id);
                    await refetchPODetails();
                  }}
                  bg={"success"}
                  className="fs-6 px-2 py-1 float-end text-uppercase"
                  style={{ cursor: "pointer" }}
                >
                  Initiate
                </Badge>
              </div>
            )}
            {is_approver && (
              <div className="d-flex gap-1 justify-content-between">
                <Badge
                  onClick={() => setShowApproveConfirmModal(true)}
                  bg={"success"}
                  className="fs-6 px-2 py-1 float-end text-uppercase"
                  style={{ cursor: "pointer" }}
                  id="approve_po-po_approval-po_details"
                >
                  Approve
                </Badge>
                <Badge
                  onClick={() => setShowRejectConfirmModal(true)}
                  bg={"danger"}
                  className="fs-6 px-3 py-1 float-end text-uppercase"
                  style={{ cursor: "pointer" }}
                  id="reject_po-po_approval-po_details"
                >
                  Reject
                </Badge>
              </div>
            )}
          </div>
        </div>
        {poPdfUrl && (
          <div className='mb-4'>
            <div className="d-flex align-items-center gap-2">
              <div>
                <BsFilePdf size={36} className="text-danger" />
              </div>
              <div className="d-flex flex-column">
                <div className="fw-semibold">PO_{po_number}.pdf</div>
                <small className="text-muted">Purchase Order Document</small>
              </div>
              <a 
                className="btn btn-sm p-2 btn-outline-secondary ms-3"
                href={poPdfUrl}
                target="__blank"
              >
                View the doc
                <FiExternalLink className="ms-2" size={14} />
              </a>
            </div>
          </div>
        )}
  
        {/* PO Overview */}
        <div className="d-flex gap-2 align-items-center justify-content-between">
          <Card className="mb-3 shadow-sm" style={{ width: "100%" }}>
            <Card.Body
              style={{ padding: "0.8rem 1.25rem", paddingBottom: "0.4rem" }}
            >
              <div className="row">
                <div className="col-md-6">
                  <PODetailItem label="Quantity" value={quantity} />
                  <PODetailItem
                    label="Unit Price"
                    value={`₹ ${addCommasToNumber(unit_price)}`}
                  />
                  <PODetailItem
                    label="Total Value"
                    value={`₹ ${addCommasToNumber(total_value)}`}
                  />
                  {project_details && (
                    <PODetailItem
                      label="Project Name"
                      value={project_details.name}
                    />
                  )}
                </div>
                <div className="col-md-6">
                  <PODetailItem
                    label="Created At"
                    value={formatIST(created_at)}
                  />
                  <PODetailItem
                    label="Initiated By"
                    value={initiated_by_name ?? "-"}
                  />
                  <PODetailItem
                    label="Status"
                    value={status.replace("_", " ").toUpperCase()}
                  />
                </div>
              </div>
            </Card.Body>
          </Card>
          {budgetInfo && (
            <Card
              className="mb-3 shadow-sm"
              style={{ width: "100%", maxWidth: "30%" }}
            >
              <Card.Body
                style={{ padding: "0.8rem 1.25rem", paddingBottom: "0.4rem" }}
                className="d-flex flex-column"
              >
                <PODetailItem
                  label="Total Assigned Budget"
                  value={`₹${formatToINRShort(budgetInfo.total_budget)}`}
                />
                <PODetailItem
                  label="Available Budget"
                  value={`₹${formatToINRShort(budgetInfo.available_budget)}`}
                />
                <PODetailItem
                  label="PO Value"
                  value={`₹${formatToINRShort(total_value)}`}
                />
                <PODetailItem
                  label="Budget if PO approves"
                  value={`₹${formatToINRShort(
                    budgetInfo.available_budget - total_value
                  )}`}
                />
              </Card.Body>
            </Card>
          )}
        </div>
  
        {/* Product Details */}
        <Link
          className="w-100"
          href={`/vendor/vendor-profile?id=${finalized_vendor_id}`}
          target="__blank"
        >
          <Card className="shadow-sm">
            <Card.Body className="d-flex align-items-center">
              <BsPerson className="me-3 fs-2 text-primary" />
              <div>
                <strong>{finalized_vendor_name}</strong>{" "}
                <small className="text-muted">(Finalized Vendor)</small>
                <div className="text-muted">{finalized_vendor_email}</div>
              </div>
            </Card.Body>
          </Card>
        </Link>
  
        <div className="my-3 d-flex gap-3">
          <Card className="shadow-sm w-100">
            <Card.Body>
              {/* Header row (same as before) */}
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center">
                  <div className="d-flex gap-2 align-items-center">
                    <BsBoxSeam className="me-2 fs-3 text-primary" />
                    <div className="d-flex flex-column">
                      <strong>Product Details</strong>
                      <span className="small text-muted">
                        Details are from the time of finalization
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/dashboard/buyer/quote-compare?rfq=${rfq_id}&rfq_product_id=${rfq_product_id}&source=PO&tab=category`}
                  className="btn p-2 btn-primary"
                >
                  Compare Quotes
                </Link>
              </div>
  
              {/* Product accordion */}
              {!product_details || product_details.length === 0 ? (
                <p className="text-muted mb-0">
                  No product details available for this PO.
                </p>
              ) : (
                <Accordion alwaysOpen>
                  {product_details.map((prod, idx) => {
                    const baseValue =
                      Number(prod.unit_price || 0) * Number(prod.quantity || 0);
  
                    return (
                      <Accordion.Item
                        eventKey={String(idx)}
                        key={prod.id || prod.rfq_item_id || idx}
                      >
                        {/* Accordion header: main outer details (same as above hr earlier) */}
                        <Accordion.Header>
                          <div className="w-100 d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div className="d-flex flex-column gap-1">
                              <div className="fw-semibold">
                                {prod.name || "Unnamed Product"}
                              </div>
                              <div className="small text-muted">
                                RFQ Item: <strong>{prod.rfq_item_id}</strong>
                                {prod.product_id && (
                                  <>
                                    {" "}
                                    • Product ID:{" "}
                                    <strong>{prod.product_id}</strong>
                                  </>
                                )}
                              </div>
                            </div>
  
                            <div className="text-end me-3">
                              <div className="small text-muted">Total Amount</div>
                              <div className="fw-semibold fs-6">
                                ₹
                                {typeof addCommasToNumber === "function"
                                  ? addCommasToNumber(prod.total_price)
                                  : prod.total_price}
                              </div>
                            </div>
                          </div>
                        </Accordion.Header>
  
                        {/* Accordion body: expanded details (qty, unit price, etc.) */}
                        <Accordion.Body>
                          {/* Quantities / prices */}
                          <div className="d-flex flex-wrap gap-4 mb-3">
                            <div className="small">
                              <div className="text-muted">Quantity</div>
                              <div className="fw-semibold">
                                {prod.quantity} {prod.unit}
                              </div>
                            </div>
  
                            <div className="small">
                              <div className="text-muted">Unit Price</div>
                              <div className="fw-semibold">
                                ₹
                                {typeof addCommasToNumber === "function"
                                  ? addCommasToNumber(prod.unit_price)
                                  : prod.unit_price}
                              </div>
                            </div>
  
                            <div className="small">
                              <div className="text-muted">Base Value</div>
                              <div className="fw-semibold">
                                ₹
                                {typeof addCommasToNumber === "function"
                                  ? addCommasToNumber(baseValue)
                                  : baseValue}
                              </div>
                            </div>
                          </div>
  
                          {/* Charges summary */}
                          {prod.charges_meta && (
                            <>
                              <div className="small text-muted mb-1">Charges</div>
                              <div className="d-flex flex-wrap gap-2">
                                {/* Freight */}
                                {prod.charges_meta.freight_price != null && (
                                  <span className="badge bg-light text-dark border">
                                    Freight:{" "}
                                    <strong>
                                      {prod.charges_meta.freight_price}
                                      {prod.charges_meta.freight_mode ===
                                      "percentage"
                                        ? "%"
                                        : " ₹"}
                                    </strong>
                                  </span>
                                )}
  
                                {/* Packing */}
                                {prod.charges_meta.package_price != null && (
                                  <span className="badge bg-light text-dark border">
                                    Packing:{" "}
                                    <strong>
                                      {prod.charges_meta.package_price}
                                      {prod.charges_meta.package_mode ===
                                      "percentage"
                                        ? "%"
                                        : " ₹"}
                                    </strong>
                                  </span>
                                )}
  
                                {/* Tax */}
                                {prod.charges_meta.tax != null && (
                                  <span className="badge bg-light text-dark border">
                                    Tax:{" "}
                                    <strong>
                                      {prod.charges_meta.tax}
                                      {prod.charges_meta.tax_mode === "percentage"
                                        ? "%"
                                        : " ₹"}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </Accordion.Body>
                      </Accordion.Item>
                    );
                  })}
                </Accordion>
              )}
            </Card.Body>
          </Card>
        </div>
  
        <div className="mb-3 d-flex gap-3">
          <Card className="shadow-sm w-100">
            <Card.Body className="d-flex flex-column gap-2">
              <span className="fw-semibold">HSN Codes</span>
              <div className="d-flex flex-column gap-1">
                {(hsnCodeInfo.loadMore
                  ? product_details
                  : product_details.slice(0, 1)
                )?.map((product) => {
                  const hsnCode = hsnCodeInfo.hsnCodes.find(
                    (code) => code.rfq_item_id == product.rfq_item_id
                  );
  
                  return (
                    <CommonFormInput
                      type="simple-text"
                      label={product.name}
                      placeholder={`Enter ${product.name} HSN Code here...`}
                      disabled={status == 'pending_approval' || restrictModifyPO(status)}
                      values={hsnCode?.code || ""}
                      onChange={(change) => {
                        setHSNCodeInfo((info) => {
                          if (hsnCode) {
                            return {
                              ...info,
                              hsnCodes: info.hsnCodes.map((hsn) =>
                                hsn.rfq_item_id == product.rfq_item_id
                                  ? { ...hsn, code: change.target.value }
                                  : hsn
                              ),
                            };
                          } else {
                            return {
                              ...info,
                              hsnCodes: [
                                ...info.hsnCodes,
                                {
                                  rfq_item_id: product.rfq_item_id,
                                  code: change.target.value,
                                },
                              ],
                            };
                          }
                        });
                      }}
                    />
                  );
                })}
                <div className="d-flex gap-2">
                  {product_details.length > 1 && (
                    <button
                      className="btn btn-success p-2"
                      onClick={() =>
                        setHSNCodeInfo((info) => ({
                          ...info,
                          loadMore: !info.loadMore,
                        }))
                      }
                    >
                      {hsnCodeInfo.loadMore
                        ? "Load Less"
                        : `Load ${product_details.length - 1} More`}
                    </button>
                  )}
                  {!restrictModifyPO(status) || status == 'pending_approval' && (
                    <button className="btn btn-dark p-2" onClick={handleSaveHSN}>
                      Save Changes
                    </button>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
          <Card className="shadow-sm w-100">
            <Card.Body className="d-flex flex-column gap-2">
              <div className="d-flex flex-column gap-1">
                <CommonFormInput
                  type="simple-text"
                  label={"GSTIN ( To be printed in the PO )"}
                  placeholder={`Enter GSTIN here...`}
                  disabled={status == 'pending_approval' || restrictModifyPO(status)}
                  values={gstin || ""}
                  onChange={(change) => {
                    setGstin(change.target.value);
                  }}
                />
                {!restrictModifyPO(status) || status == 'pending_approval' && (
                  <button className="btn btn-dark p-2" onClick={handleSaveGST}>
                    Save Changes
                  </button>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
  
        {/* Approval Timeline */}
        <h5 className="mb-3">
          <MdEventNote className="me-2" />
          Approval Timeline
        </h5>
        <Card className="mb-4">
          <Card.Body className="d-flex flex-column gap-3">
            <TimelineItem
              title={status == "draft" ? "Drafted" : "Initiated"}
              name={initiated_by_name}
              icon={
                <BsCheckCircleFill
                  className={
                    status == "draft" ? "text-secondary" : "text-primary"
                  }
                  size={25}
                />
              }
              time={formatIST(created_at)}
            />
            {approval_history.map((entry, index) => (
              <TimelineItem
                key={index}
                title={
                  entry.action === "approved"
                    ? "Approved"
                    : entry.action === "rejected"
                    ? "Rejected"
                    : entry.action === "cancelled"
                    ? "Cancelled"
                    : entry.action === "edited"
                    ? "PO Edited" :
                    "Action Taken"
                }
                name={entry.approved_by_name}
                icon={
                  entry.action === "approved" ? (
                    <BsCheckCircleFill className="text-success" size={25} />
                  ) : entry.action === "edited" ? (
                    <MdHistory className="text-dark" size={25} />
                  ) : (
                    <BsXCircleFill className="text-danger" size={25} />
                  )
                }
                time={formatIST(entry.created_at)}
                remarks={entry.remarks}
              />
            ))}
            {approval_status?.status == "pending" && (
              <TimelineItem
                title={"Action Pending"}
                name={approval_status.current_approver_name}
                icon={
                  <BsExclamationCircleFill className="text-warning" size={25} />
                }
                time={formatIST(approval_status.created_at)}
              />
            )}
          </Card.Body>
        </Card>
  
        {/* Payment Milestones */}
        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
          <h5 className="mb-0">
            <MdOutlineBusinessCenter className="me-2" />
            Payment Milestones
          </h5>
  
          <button
            className="minimal-btn"
            onClick={() => setShowMilestoneModal(true)}
            id="add_milestone-payment_milestones-po_details"
          >
            Add Milestone
          </button>
        </div>
  
        <Card className="overflow-hidden mb-3">
          <Card.Body className="table-responsive p-0">
            <table className="table table-stripped align-middle m-0 text-center">
              <thead className="table-light">
                <tr>
                  <th>Reminder</th>
                  <th>PO No</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Milestone Summary</th>
                  <th>Due Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payment_milestones && payment_milestones.length > 0 ? (
                  payment_milestones.map((milestone) => (
                    <tr key={milestone.id}>
                      <td
                        className={`fw-semibold ${
                          milestone.is_reminded ? "text-success" : "text-warning"
                        }`}
                      >
                        {milestone.status == "deleted"
                          ? "Deleted"
                          : milestone.is_reminded
                          ? "Reminded"
                          : "Pending"}
                      </td>
                      <td>
                        #<strong>{po_number}</strong>
                      </td>
                      <td style={{ maxWidth: 140 }}>
                        {milestone.milestone_name}
                      </td>
                      <td>
                        <Badge
                          bg={milestoneBadges[milestone.status]}
                          className="text-capitalize"
                        >
                          {milestone.status}
                        </Badge>
                      </td>
                      <td
                        style={{ maxWidth: 200 }}
                        title={milestone.milestone_description}
                      >
                        {elipsisToLimit(milestone.milestone_description, 45)}
                      </td>
                      {renderDueDateCell(
                        new Date(milestone.due_date).toDateString()
                      )}
                      <td>
                        {milestone.status != "deleted" ? (
                          <>
                            <button
                              title="Edit this Milestone"
                              className="minimal-btn"
                              style={{
                                backgroundColor: "#fdeceb",
                                borderColor: "#f5b5b5",
                                color: "#dc3545",
                              }}
                              onClick={() => handleMilestoneEdition(milestone)}
                              id={`edit_milestone_${milestone.id}-milestone_actions-po_details`}
                            >
                              <HiPencil size={25} />
                            </button>
                            <button
                              title="Delete this Milestone"
                              className="minimal-btn ms-2"
                              style={{
                                backgroundColor: "#fdeceb",
                                borderColor: "#f5b5b5",
                                color: "#dc3545",
                              }}
                              onClick={() => {
                                setDeleteMilestoneId(milestone.id);
                                setShowDeleteMilestoneConfirmModal(true);
                              }}
                              id={`delete_milestone_${milestone.id}-milestone_actions-po_details`}
                            >
                              <HiOutlineTrash size={25} />
                            </button>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="text-center text-muted">
                      No payment milestones found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card.Body>
        </Card>
  
        {/* Task Timelines */}
        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
          <h5 className="mb-0">
            <MdTimeline className="me-2" />
            Status Timeline
          </h5>
  
          <button
            className="minimal-btn"
            onClick={() => setShowTaskModal(true)}
            id="add_task-status_timeline-po_details"
          >
            Add Task
          </button>
        </div>
  
        <Card className="overflow-hidden">
          <Card.Body className="table-responsive p-0">
            <table className="table table-stripped align-middle m-0 text-center">
              <thead className="table-light">
                <tr>
                  <th>Completion Date</th>
                  <th>PO No</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Task Summary</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks?.data && tasks.data.length > 0 ? (
                  tasks.data.map((task) => (
                    <tr key={task.id}>
                      {renderDueDateCell(
                        new Date(task.completion_date).toDateString(),
                        true
                      )}
                      <td>
                        #<strong>{po_number}</strong>
                      </td>
                      <td style={{ maxWidth: 140 }}>{task.task_name}</td>
                      <td>
                        <Badge
                          bg={milestoneBadges[task.status]}
                          className="text-capitalize"
                        >
                          {task.status}
                        </Badge>
                      </td>
                      <td style={{ maxWidth: 200 }} title={task.task_description}>
                        {elipsisToLimit(task.task_description, 45)}
                      </td>
                      <td>
                        <button
                          title="Edit this Task"
                          className="minimal-btn"
                          style={{
                            backgroundColor: "#fdeceb",
                            borderColor: "#f5b5b5",
                            color: "#dc3545",
                          }}
                          onClick={() => handleTaskEdition(task)}
                          id={`edit_task_${task.id}-task_actions-po_details`}
                        >
                          <HiPencil size={25} />
                        </button>
                        <button
                          title="Delete this Task"
                          className="minimal-btn ms-2"
                          style={{
                            backgroundColor: "#fdeceb",
                            borderColor: "#f5b5b5",
                            color: "#dc3545",
                          }}
                          onClick={() => {
                            setDeleteTaskId(task.id);
                            setShowDeleteTaskConfirmModal(true);
                          }}
                          id={`delete_task_${task.id}-task_actions-po_details`}
                        >
                          <HiOutlineTrash size={25} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="text-center text-muted">
                      No tasks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card.Body>
          <Card.Footer className="pt-3">
            {tasks?.data && (
              <Pagination
                page={filters.page}
                setPage={(page) => setFilters((prev) => ({ ...prev, page }))}
                limit={filters.limit}
                setLimit={(limit) => setFilters((prev) => ({ ...prev, limit }))}
                totalData={tasks.total}
              />
            )}
          </Card.Footer>
        </Card>
  
        <CreateMilestoneModal
          show={showMilestoneModal}
          selectedMilestone={selectedMilestone}
          isEdit={selectedMilestone}
          onClose={() => {
            setShowMilestoneModal(false);
            setSelectedMilestone(null);
          }}
          onSuccess={async () => await refetchPODetails()}
          companyUsers={companyUsers}
          rfqId={rfq_id}
          poId={id}
        />
  
        <CreateTaskModal
          show={showTaskModal}
          selectedTask={selectedTask}
          isEdit={selectedTask}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onSuccess={async () => await handleFetchTasks()}
          rfqId={rfq_id}
          poId={id}
        />
  
        <ConfirmationModal
          isOpen={showApproveConfirmModal}
          onClose={() => setShowApproveConfirmModal(false)}
          onConfirm={async () => {
            await handlePODecision(id, { decision: "approved" });
            await refetchPODetails();
            setShowApproveConfirmModal(false);
          }}
          title={"Approve Purchase Order"}
          description={`Are you sure you want to approve PO #${
            po_number || "this purchase order"
          }?\nThis action will approve the purchase order and notify relevant parties.`}
          confirmButtonColor="success"
          confirmButtonText="Approve"
          cancelButtonText="Cancel"
          customFooter={POReviewCompact(data)}
        />
  
        <ConfirmationModal
          isOpen={showRejectConfirmModal}
          onClose={() => setShowRejectConfirmModal(false)}
          onConfirm={async () => {
            await handlePODecision(id, { decision: "rejected" });
            await refetchPODetails();
            setShowRejectConfirmModal(false);
          }}
          title={"Reject Purchase Order"}
          description={`Are you sure you want to reject PO #${
            po_number || "this purchase order"
          }?\nThis action will reject the purchase order, de-finalize the vendors and notify relevant parties.`}
          confirmButtonColor="danger"
          confirmButtonText="Reject"
          cancelButtonText="Cancel"
        />
  
        <ConfirmationModal
          isOpen={showDeleteMilestoneConfirmModal}
          onClose={() => setShowDeleteMilestoneConfirmModal(false)}
          onConfirm={async () => {
            if (deleteMilestoneId) {
              await handleMilestoneDeletion(deleteMilestoneId);
            }
            setDeleteMilestoneId(null);
            setShowDeleteMilestoneConfirmModal(false);
          }}
          title={"Delete Milestone"}
          description={"Are you sure you want to delete this milestone?"}
          confirmButtonColor="danger"
          confirmButtonText="Delete"
          cancelButtonText="Cancel"
        />
  
        <ConfirmationModal
          isOpen={showDeleteTaskConfirmModal}
          onClose={() => setShowDeleteTaskConfirmModal(false)}
          onConfirm={async () => {
            if (deleteTaskId) {
              await handleTaskDeletion(deleteTaskId);
            }
            setDeleteTaskId(null);
            setShowDeleteTaskConfirmModal(false);
          }}
          title={"Delete Task"}
          description={"Are you sure you want to delete this task?"}
          confirmButtonColor="danger"
          confirmButtonText="Delete"
          cancelButtonText="Cancel"
        />
  
        <ConfirmationModal
          isOpen={showEditConfirmModal}
          onClose={() => setShowEditConfirmModal(false)}
          onConfirm={async () => {
            router.push(`/dashboard/buyer/purchase-order?rfq=${rfq_id}&po=${id}&edit=true`)
            setShowEditConfirmModal(false);
          }}
          title={"Are you sure you want to edit this Purchase Order?"}
          description={
           `Any changes you make will
              reset the approval flow for this PO. All existing
              approvals will become Invalid, and the PO will need
              to go through approval again from the beginning.`
          }
          confirmButtonColor="warning"
          confirmButtonText="Yes, go ahead"
          cancelButtonText="No, cancel it"
        />
      </div>
    );
  }

  // === EDIT VIEW (new) ===
  return (
    <PurchaseOrderEditView
      data={data}
      onCancel={() => {
        setIsEditing(false);
        router.push(`/dashboard/buyer/purchase-order?rfq=${rfq_id}&po=${id}`);
      }}
      onSaved={async () => {
        setIsEditing(false);
        await refetchPODetails?.(); // refresh data from backend
        router.push(`/dashboard/buyer/purchase-order?rfq=${rfq_id}&po=${id}`)
      }}
      handleUpdatePO={handleUpdatePO} // or inline service call in child
      handleBack={() => {
        router.push(`/dashboard/buyer/purchase-order?rfq=${rfq_id}&po=${id}`)
      }}
    />
  );
};

export default PurchaseOrderDetails;