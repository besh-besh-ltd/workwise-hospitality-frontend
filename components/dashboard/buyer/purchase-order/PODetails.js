import React, { useEffect, useState } from 'react';
import { Card, Button, Accordion, Badge } from "react-bootstrap";

import {
  MdEventNote,
  MdOutlineBusinessCenter,
  MdOutlinePersonOutline,
  MdTimeline
} from 'react-icons/md';
import { BsBoxSeam, BsPerson, BsExclamationCircleFill, BsCheckCircleFill, BsXCircleFill, BsArrowLeft, BsPencilSquare, BsPersonPlus, BsCalendar3, BsCurrencyRupee, BsBuilding, BsTruck, BsFileEarmarkText, BsShieldCheck } from 'react-icons/bs';
import { MdHistory } from "react-icons/md";
import { HiOutlineTrash, HiPencil } from "react-icons/hi";
import { BsFilePdf } from "react-icons/bs";
import { FiExternalLink } from "react-icons/fi";
import { TbFileInvoice, TbTruckDelivery } from "react-icons/tb";
import styles from "./PurchaseOrder.module.scss";
import CreateMilestoneModal from './CreateMilestoneModal';
import ApprovalProgressCard from './ApprovalProgressCard';
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
import AddSiteRepModal from './AddSiteRepModal';
import ApproveModal from './ApproveModal';

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
  dateStr ? formatDisplayDate(dateStr, { includeTime: true }) : 'N/A';

const elipsisToLimit = (text, limit = 45) => {
  return text.length > limit ? text.slice(0, limit).concat('...') : text;
}

const PurchaseOrderDetails = ({ data, handlePODecision, handleInitiatePO, handleBack, refetchPODetails, companyUsers, isEditing, setIsEditing, handleUpdatePO, canWrite = true, canApprove = false }) => {
  const {
    id,
    rfq_id,
    po_number,
    finalized_vendor_id,
    finalized_vendor_name,
    finalized_vendor_email,
    finalized_vendor_phone,
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
    documents = [],
    site_rep,
    payment_milestones,
    hsn_codes,
    gstin: fetchedGST,
    quotations,
    rfq_product_id,
    poPdfUrl,
    buyer_company_name,
    buyer_business_unit,
    buyer_gstin,
    buyer_address,
    initiated_by_email,
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
  const [showAddSiteRepModal, setShowAddSiteRepModal] = useState(false);
  const [showGRNUpdateModal, setShowGRNUpdateModal] = useState(false);
  
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
  const [actionLoading, setActionLoading] = useState(null); // 'initiate' | 'grn' | 'hsn' | 'gst' | null

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

  const restrictModifyPO = (status) => !(status == 'pending_approval' || status == 'rejected')

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
        {/* ── Hero Header Card (matches Tech Eval pattern) ── */}
        <div className={styles.detailsHeader}>
          <div className={styles.detailsHero}>
            <div className={styles.detailsHeroLeft}>
              <div className={styles.detailsHeroNumber}>
                <span>Purchase Order #{po_number}</span>
                <Badge bg={statusColors[status] || 'secondary'} style={{ fontSize: '0.7rem', padding: '4px 10px', textTransform: 'uppercase' }}>
                  {status.replace('_', ' ')}
                </Badge>
              </div>
              <p className={styles.detailsHeroSub}>
                Initiated by {initiated_by_name || '-'} &middot; {formatIST(created_at)}
                {rfq_no && <> &middot; RFQ #{rfq_no}{rfq_title ? ` — ${rfq_title}` : ''}</>}
              </p>
            </div>
            <div className={styles.detailsHeroActions}>
              <button className={styles.heroBtn} onClick={handleBack} id="back_button-po_details-purchase_order_page">
                <BsArrowLeft size={14} /> Back
              </button>
              {canWrite && !restrictModifyPO(status) && (
                <button className={`${styles.heroBtn} ${styles.heroBtnSolid}`} onClick={() => setShowEditConfirmModal(true)} id="edit_button-po_details-purchase_order_page">
                  <BsPencilSquare size={13} /> Edit
                </button>
              )}
              {canWrite && (
                <button className={styles.heroBtn} onClick={() => setShowAddSiteRepModal(true)} id="add-site-rep-po_details-purchase_order_page">
                  <BsPersonPlus size={14} /> Site Rep
                </button>
              )}
              {canWrite && status === 'draft' && handleInitiatePO && (
                <button className={`${styles.heroBtn} ${styles.heroBtnApprove}`} onClick={() => handleInitiatePO(id)}>
                  Initiate PO
                </button>
              )}
              {canWrite && status === 'dispatched' && (
                <button className={`${styles.heroBtn} ${styles.heroBtnApprove}`} onClick={() => setShowGRNUpdateModal(true)}>
                  <BsTruck size={14} /> Update to GRN
                </button>
              )}
              {canApprove && is_approver && (
                <>
                  <button className={`${styles.heroBtn} ${styles.heroBtnApprove}`} onClick={() => setShowApproveConfirmModal(true)} id="approve_po-po_approval-po_details">
                    Approve
                  </button>
                  <button className={`${styles.heroBtn} ${styles.heroBtnReject}`} onClick={() => {
                    if (handlePODecision) handlePODecision(id, { decision: "rejected", type: "approval" });
                  }} id="reject_po-po_approval-po_details">
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Meta Grid ── */}
          <div className={styles.detailsMetaGrid}>
            <div className={styles.detailsMetaItem}>
              <div className={styles.detailsMetaIcon}><BsCurrencyRupee size={15} /></div>
              <div>
                <div className={styles.detailsMetaLabel}>Total Value</div>
                <div className={styles.detailsMetaValue}>₹{addCommasToNumber(total_value)}</div>
              </div>
            </div>
            <div className={styles.detailsMetaItem}>
              <div className={styles.detailsMetaIcon}><BsBoxSeam size={15} /></div>
              <div>
                <div className={styles.detailsMetaLabel}>Quantity</div>
                <div className={styles.detailsMetaValue}>{quantity}</div>
              </div>
            </div>
            <div className={styles.detailsMetaItem}>
              <div className={styles.detailsMetaIcon}><BsCurrencyRupee size={15} /></div>
              <div>
                <div className={styles.detailsMetaLabel}>Unit Price</div>
                <div className={styles.detailsMetaValue}>₹{addCommasToNumber(unit_price)}</div>
              </div>
            </div>
            {project_details && (
              <div className={styles.detailsMetaItem}>
                <div className={styles.detailsMetaIcon}><BsFileEarmarkText size={15} /></div>
                <div>
                  <div className={styles.detailsMetaLabel}>Project</div>
                  <div className={styles.detailsMetaValue}>{project_details.name}</div>
                </div>
              </div>
            )}
            <div className={styles.detailsMetaItem}>
              <div className={styles.detailsMetaIcon}><BsCalendar3 size={14} /></div>
              <div>
                <div className={styles.detailsMetaLabel}>Created</div>
                <div className={styles.detailsMetaValue}>{formatIST(created_at)}</div>
              </div>
            </div>
            <div className={styles.detailsMetaItem}>
              <div className={styles.detailsMetaIcon}><BsShieldCheck size={15} /></div>
              <div>
                <div className={styles.detailsMetaLabel}>Status</div>
                <div className={styles.detailsMetaValue} style={{ textTransform: 'capitalize' }}>{status.replace('_', ' ')}</div>
              </div>
            </div>
            {budgetInfo && (
              <>
                <div className={styles.detailsMetaItem}>
                  <div className={styles.detailsMetaIcon}><BsCurrencyRupee size={15} /></div>
                  <div>
                    <div className={styles.detailsMetaLabel}>Total Budget</div>
                    <div className={styles.detailsMetaValue}>₹{formatToINRShort(budgetInfo.total_budget)}</div>
                  </div>
                </div>
                <div className={styles.detailsMetaItem}>
                  <div className={styles.detailsMetaIcon}><BsCurrencyRupee size={15} /></div>
                  <div>
                    <div className={styles.detailsMetaLabel}>Available Budget</div>
                    <div className={styles.detailsMetaValue}>₹{formatToINRShort(budgetInfo.available_budget)}</div>
                  </div>
                </div>
                <div className={styles.detailsMetaItem}>
                  <div className={styles.detailsMetaIcon}><BsCurrencyRupee size={15} /></div>
                  <div>
                    <div className={styles.detailsMetaLabel}>After Approval</div>
                    <div className={styles.detailsMetaValue}>₹{formatToINRShort(budgetInfo.available_budget - total_value)}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── PO PDF ── */}
        {poPdfUrl && (
          <div className={styles.sectionCard} style={{ marginBottom: 16 }}>
            <div className={styles.sectionBody}>
              <div className="d-flex align-items-center gap-3">
                <BsFilePdf size={28} className="text-danger" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2730' }}>PO_{po_number}.pdf</div>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Purchase Order Document</div>
                </div>
                <a className={styles.heroBtn} href={poPdfUrl} target="__blank" style={{ textDecoration: 'none', color: '#2E5BA8', background: 'rgba(46,91,168,0.06)', borderColor: 'rgba(46,91,168,0.2)' }}>
                  View Document <FiExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── Vendor & Buyer (compact inline) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Link href={`/vendor/vendor-profile?id=${finalized_vendor_id}`} target="__blank" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, transition: 'all 0.15s', cursor: 'pointer' }}>
              <div className={styles.detailsMetaIcon} style={{ width: 36, height: 36, flexShrink: 0 }}><BsPerson size={16} /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2730', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{finalized_vendor_name}</div>
                <div style={{ fontSize: 11.5, color: '#6c757d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {finalized_vendor_email || ''}{finalized_vendor_phone ? ` · +91 ${finalized_vendor_phone}` : ''}
                </div>
              </div>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
            <div className={styles.detailsMetaIcon} style={{ width: 36, height: 36, flexShrink: 0, background: '#e8f5e8', color: '#428B41' }}><BsBuilding size={16} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2730', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{buyer_company_name || '-'}{buyer_business_unit ? ` · ${buyer_business_unit}` : ''}</div>
              <div style={{ fontSize: 11.5, color: '#6c757d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {buyer_gstin ? `GSTIN: ${buyer_gstin}` : ''}{initiated_by_name ? `${buyer_gstin ? ' · ' : ''}${initiated_by_name}` : ''}
              </div>
            </div>
          </div>
        </div>
  
        <div className="mb-3">
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h5 className={styles.sectionTitle}><BsBoxSeam size={16} /> Product Details</h5>
              <Link
                href={`/dashboard/buyer/quote-compare?rfq=${rfq_id}&rfq_product_id=${rfq_product_id}&source=PO&tab=category`}
                style={{ fontSize: 12, fontWeight: 600, color: '#2E5BA8', textDecoration: 'none' }}
              >
                Compare Quotes &rarr;
              </Link>
            </div>
            <div className={styles.sectionBody}>
  
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
            </div>
          </div>
        </div>

        <div className={`${styles.sectionCard} mb-3`}>
          <div className={styles.sectionHeader}>
            <h5 className={styles.sectionTitle}><TbFileInvoice size={16} /> Documents</h5>
          </div>
          <div className={styles.sectionBody}>

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
          </div>
        </div>

        <div className="mb-3 d-flex gap-3">
          <div className={`${styles.sectionCard} w-100`}>
            <div className={styles.sectionHeader}>
              <h5 className={styles.sectionTitle}>HSN Codes</h5>
            </div>
            <div className={`${styles.sectionBody} d-flex flex-column gap-2`}>
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
                      disabled={!canWrite || status == 'pending_approval' || restrictModifyPO(status)}
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
                  {canWrite && !restrictModifyPO(status) && (
                    <button className="btn btn-sm p-2 px-3" disabled={actionLoading === 'hsn'} style={{ fontSize: 12, fontWeight: 600, background: '#2E5BA8', color: '#fff', border: 'none', borderRadius: 8, opacity: actionLoading === 'hsn' ? 0.7 : 1 }}
                      onClick={async () => { setActionLoading('hsn'); try { await handleSaveHSN(); } finally { setActionLoading(null); } }}>
                      {actionLoading === 'hsn' ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12 }} /> Saving...</> : 'Save Changes'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles.sectionCard} w-100`}>
            <div className={styles.sectionHeader}>
              <h5 className={styles.sectionTitle}>GSTIN</h5>
            </div>
            <div className={`${styles.sectionBody} d-flex flex-column gap-2`}>
              <div className="d-flex flex-column gap-1">
                <CommonFormInput
                  type="simple-text"
                  label={"GSTIN ( To be printed in the PO )"}
                  placeholder={`Enter GSTIN here...`}
                  disabled={!canWrite || status == 'pending_approval' || restrictModifyPO(status)}
                  values={gstin || ""}
                  onChange={(change) => {
                    setGstin(change.target.value);
                  }}
                />
                {canWrite && !restrictModifyPO(status) && (
                  <button className="btn btn-sm p-2 px-3" disabled={actionLoading === 'gst'} style={{ fontSize: 12, fontWeight: 600, background: '#2E5BA8', color: '#fff', border: 'none', borderRadius: 8, opacity: actionLoading === 'gst' ? 0.7 : 1 }}
                    onClick={async () => { setActionLoading('gst'); try { await handleSaveGST(); } finally { setActionLoading(null); } }}>
                    {actionLoading === 'gst' ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12 }} /> Saving...</> : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
  
        {/* New Multi-Step Approval Progress Card */}
        {approval_status?.type === 'new' && (
          <ApprovalProgressCard approvalStatus={approval_status} />
        )}

        {/* Approval Timeline */}
        <div className={`${styles.sectionCard} mb-3`}>
          <div className={styles.sectionHeader}>
            <h5 className={styles.sectionTitle}><MdEventNote size={16} /> Approval Timeline</h5>
          </div>
          <div className={`${styles.sectionBody} d-flex flex-column gap-3`}>
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
            {approval_history.map((entry, index) => {
              // Normalize action to lowercase for comparison (handles both old and new format)
              const actionLower = entry.action?.toLowerCase();
              const isApproved = actionLower === "approved" || actionLower === "approve";
              const isRejected = actionLower === "rejected" || actionLower === "reject";
              const isCancelled = actionLower === "cancelled" || actionLower === "cancel";
              const isEdited = actionLower === "edited" || actionLower === "edit";
              const isInvoice = actionLower === "invoice";
              const isGrn = actionLower === "grn";

              // Build title with step number for new format
              const getTitle = () => {
                let title = isApproved ? "Approved"
                  : isRejected ? "Rejected"
                  : isCancelled ? "Cancelled"
                  : isEdited ? "PO Edited"
                  : isInvoice ? "Invoice Raised"
                  : isGrn ? "GRN Marked"
                  : "Action Taken";

                // Add step info for new format
                if (entry.step_number) {
                  title += ` (Step ${entry.step_number})`;
                }
                return title;
              };

              // Get appropriate icon
              const getIcon = () => {
                if (isApproved) return <BsCheckCircleFill className="text-success" size={25} />;
                if (isRejected) return <BsXCircleFill className="text-danger" size={25} />;
                if (isEdited) return <MdHistory className="text-dark" size={25} />;
                if (isInvoice) return <TbFileInvoice className="text-dark" size={25} />;
                if (isGrn) return <TbTruckDelivery className="text-dark" size={25} />;
                if (isCancelled) return <BsXCircleFill className="text-secondary" size={25} />;
                return <BsCheckCircleFill className="text-primary" size={25} />;
              };

              return (
                <TimelineItem
                  key={index}
                  title={getTitle()}
                  name={entry.approved_by_name}
                  icon={getIcon()}
                  time={formatIST(entry.created_at)}
                  remarks={entry.remarks}
                />
              );
            })}
            {/* Legacy format pending status (only show if not using new format) */}
            {approval_status?.status == "pending" && approval_status?.type !== "new" && (
              <TimelineItem
                title={"Action Pending"}
                name={approval_status.current_approver_name}
                icon={
                  <BsExclamationCircleFill className="text-warning" size={25} />
                }
                time={formatIST(approval_status.created_at)}
              />
            )}
          </div>
        </div>

        {/* Payment Milestones */}
        <div className={`${styles.sectionCard} mb-3`}>
          <div className={styles.sectionHeader}>
            <h5 className={styles.sectionTitle}><MdOutlineBusinessCenter size={16} /> Payment Milestones</h5>
            {canWrite && (
              <button
                className="minimal-btn"
                onClick={() => setShowMilestoneModal(true)}
                id="add_milestone-payment_milestones-po_details"
                style={{ fontSize: 12, fontWeight: 600, color: '#2E5BA8' }}
              >
                + Add Milestone
              </button>
            )}
          </div>
          <div className="table-responsive p-0">
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
                        {canWrite && milestone.status != "deleted" ? (
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
          </div>
        </div>

        {/* Task Timelines */}
        <div className={`${styles.sectionCard} mb-3`}>
          <div className={styles.sectionHeader}>
            <h5 className={styles.sectionTitle}><MdTimeline size={16} /> Status Timeline</h5>
            {canWrite && (
              <button
                className="minimal-btn"
                onClick={() => setShowTaskModal(true)}
                id="add_task-status_timeline-po_details"
                style={{ fontSize: 12, fontWeight: 600, color: '#2E5BA8' }}
              >
                + Add Task
              </button>
            )}
          </div>
          <div className="table-responsive p-0">
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
                        {canWrite ? (
                          <>
                            <button
                              title="Edit this Task"
                              className="minimal-btn"
                              style={{ backgroundColor: "#fdeceb", borderColor: "#f5b5b5", color: "#dc3545" }}
                              onClick={() => handleTaskEdition(task)}
                              id={`edit_task_${task.id}-task_actions-po_details`}
                            >
                              <HiPencil size={25} />
                            </button>
                            <button
                              title="Delete this Task"
                              className="minimal-btn ms-2"
                              style={{ backgroundColor: "#fdeceb", borderColor: "#f5b5b5", color: "#dc3545" }}
                              onClick={() => { setDeleteTaskId(task.id); setShowDeleteTaskConfirmModal(true); }}
                              id={`delete_task_${task.id}-task_actions-po_details`}
                            >
                              <HiOutlineTrash size={25} />
                            </button>
                          </>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                        )}
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
          </div>
          {tasks?.data && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
              <Pagination
                page={filters.page}
                setPage={(page) => setFilters((prev) => ({ ...prev, page }))}
                limit={filters.limit}
                setLimit={(limit) => setFilters((prev) => ({ ...prev, limit }))}
                totalData={tasks.total}
              />
            </div>
          )}
        </div>
  
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
  
        <ApproveModal
          show={showApproveConfirmModal}
          onClose={() => setShowApproveConfirmModal(false)}
          onApprove={async (remarks) => {
            if (handlePODecision) await handlePODecision(id, { decision: "approved", type: "approval", remarks });
            setShowApproveConfirmModal(false);
          }}
          poNumber={po_number}
          poPdfUrl={poPdfUrl}
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

        <AddSiteRepModal
          show={showAddSiteRepModal}
          onClose={() => setShowAddSiteRepModal(false)}
          poId={id}
          siteRep={site_rep} // or null/undefined if none
          onAction={() => {
            refetchPODetails();
          }}
        />


        {/* PO Update Status to GRN */}
        <ConfirmationModal
          isOpen={showGRNUpdateModal}
          onClose={() => setShowGRNUpdateModal(false)}
          onConfirm={() => {
            if (handlePODecision) handlePODecision(id, { type: "grn_update" });
            setShowGRNUpdateModal(false);
          }}
          title="Mark GRN for this PO"
          description={`Are you sure you want to mark GRN for PO #${
            po_number || "this purchase order"
          }?\nThis action will mark the status for this PO as GRN ( Goods Reciept Note ),
          That will indicate that the goods has been delivered to the site.`}
          customFooter={`This Action Cannot be Reversed!`}
          confirmButtonColor="success"
          confirmButtonText="Yes, Go Ahead"
          cancelButtonText="No, Cancel It"
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