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
import { addCommasToNumber, formatDisplayDate, formatToINRShort } from '@/utils/sharedFunctions';
import Link from 'next/link';
import ConfirmationModal from '@/components/modal/ConfirmationModal';
import CommonFormInput from '@/components/shared/CommonFormInput';
import { useRouter } from 'next/navigation';
import PurchaseOrderEditView from './PurchaseOrderEditView';
import { TbFileInvoice } from 'react-icons/tb';

const statusColors = {
  draft: 'secondary',
  pending_approval: 'warning',
  approved: 'success',
  sent: 'primary',
  invoice_raised: 'success',
  dispatched: 'success',
  GRN: 'success',
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
  dateStr ? formatDisplayDate(dateStr, { includeTime: true }) : 'N/A';

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
    initiated_by_email,
    created_at,
    project_id,
    project_details,
    product_details,
    documents = [],
    hsn_codes,
    gstin: fetchedGST,
    quotations,
    rfq_product_id,
    poPdfUrl,
    buyer_company_name,
    buyer_business_unit,
    buyer_gstin,
    buyer_address,
    initiated_by_phone,
    rfq_no,
    rfq_title
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

  const [showRaiseInvoiceModal, setShowRaiseInvoiceModal] = useState(false);
  const [showMarkDispatchedModal, setShowMarkDispatchedModal] = useState(false);

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
            {status == 'approved' && (
              <Badge
                onClick={() => setShowRaiseInvoiceModal(true)}
                bg={"secondary"}
                className="fs-6 px-2 py-1 float-end text-uppercase"
                style={{ cursor: "pointer" }}
                id="raise_invoice_for_po-po_invoice-po_details"
              >
                Raise Invoice
              </Badge>
            )}
            {status == 'invoice_raised' && (
              <Badge
                onClick={() => setShowMarkDispatchedModal(true)}
                bg={"secondary"}
                className="fs-6 px-2 py-1 float-end text-uppercase"
                style={{ cursor: "pointer" }}
                id="raise_invoice_for_po-po_invoice-po_details"
              >
                Mark Dispatched
              </Badge>
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
  
        {/* Buyer Details */}
        <Card className="shadow-sm mb-3">
          <Card.Body className="d-flex align-items-start">
            <MdOutlineBusinessCenter className="me-3 fs-2 text-success" />
            <div>
              <strong>{buyer_company_name || '-'}</strong>{" "}
              <small className="text-muted">(Buyer)</small>
              {buyer_business_unit && (
                <div className="text-muted">Business Unit: {buyer_business_unit}</div>
              )}
              {buyer_address && (
                <div className="text-muted">{buyer_address}</div>
              )}
              {buyer_gstin && (
                <div className="text-muted">GSTIN: {buyer_gstin}</div>
              )}
              {initiated_by_name && (
                <div className="text-muted">Contact: {initiated_by_name}{initiated_by_email ? ` (${initiated_by_email})` : ''}{initiated_by_phone ? ` | +91 ${initiated_by_phone}` : ''}</div>
              )}
              {rfq_no && (
                <div className="text-muted">RFQ: #{rfq_no}{rfq_title ? ` - ${rfq_title}` : ''}</div>
              )}
            </div>
          </Card.Body>
        </Card>

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
                <strong className='text-capitalize'>{initiated_by_name}</strong>{" "}
                <small className="text-muted">(Respective Buyer)</small>
                <div className="text-muted">{initiated_by_email}</div>
              </div>
            </Card.Body>
          </Card>
        </Link>
  
        <div className="my-3 mb-0 d-flex gap-3 mb-3">
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

        <Card className="shadow-sm w-100">
          <Card.Body>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center">
                <div className="d-flex gap-2 align-items-center">
                  <TbFileInvoice size={28} className="me-2 fs-3 text-primary" />
                  <div className="d-flex flex-column">
                    <strong>Documents</strong>
                    <span className="small text-muted">
                      Files uploaded by Vendor and Buyer for this PO
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {(!documents || documents.length === 0) ? (
              <p className="text-muted mb-0">
                No documents uploaded yet for this Purchase Order.
              </p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {documents.map((doc, idx) => {
                  const uploadedAt = new Date(doc.created_at);
                  const typeLabel =
                    doc.document_type?.replace(/_/g, " ")?.toUpperCase() || "DOCUMENT";
                  const uploadedByLabel =
                    doc.uploaded_by === finalized_vendor_id
                      ? "Vendor"
                      : "Buyer / Internal User";

                  return (
                    <div
                      key={doc.id}
                      className="d-flex justify-content-between align-items-center border rounded px-3 py-2"
                    >
                      <div className="d-flex flex-column">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="fw-semibold small">#{idx + 1}</span>
                          <span className="badge bg-secondary text-uppercase small">
                            {typeLabel}
                          </span>
                        </div>
                        <div className="small text-muted">
                          Uploaded by <strong>{uploadedByLabel}</strong>{" "}
                          • {uploadedAt.toLocaleString()}
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline-dark btn-sm p-2 px-3"
                        >
                          View Document
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card.Body>
        </Card>
  
        <ConfirmationModal
          isOpen={showRaiseInvoiceModal}
          onClose={() => setShowRaiseInvoiceModal(false)}
          onConfirm={async () => {
            await handlePODecision(id, { type: "invoice" });
            await refetchPODetails();
            setShowRaiseInvoiceModal(false);
          }}
          title={"Raise Invoice for this PO"}
          description={`Are you sure you want to raise invoice for PO #${
            po_number || "this purchase order"
          }?\nThis action will upload and send the invoice to the relevant parties.`}
          confirmButtonColor="success"
          confirmButtonText="Yes, Go Ahead"
          cancelButtonText="No, Cancel It"
          customFooter={POReviewCompact(data)}
        />

        <ConfirmationModal
          isOpen={showMarkDispatchedModal}
          onClose={() => setShowMarkDispatchedModal(false)}
          onConfirm={async () => {
            await handlePODecision(id, { type: "dispatch" });
            await refetchPODetails();
            setShowMarkDispatchedModal(false);
          }}
          title="Mark Dispatched for this PO"
          description={`Are you sure you want to mark Dispatched for PO #${
            po_number || "this purchase order"
          }?\nThis action will notify the relevant parties.`}
          confirmButtonColor="success"
          confirmButtonText="Yes, Go Ahead"
          cancelButtonText="No, Cancel It"
        />
      </div>
    );
  }
};

export default PurchaseOrderDetails;