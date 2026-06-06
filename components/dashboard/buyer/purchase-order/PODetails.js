import React, { useEffect, useState } from 'react';
import { Accordion, Badge } from "react-bootstrap";

import {
  MdEventNote,
  MdOutlineBusinessCenter,
  MdTimeline
} from 'react-icons/md';
import { BsBoxSeam, BsPerson, BsExclamationCircleFill, BsCheckCircleFill, BsXCircleFill, BsArrowLeft, BsPencilSquare, BsPersonPlus, BsCalendar3, BsCurrencyRupee, BsBuilding, BsTruck, BsFileEarmarkText, BsShieldCheck, BsArrowRepeat } from 'react-icons/bs';
import { MdHistory } from "react-icons/md";
import { HiOutlineTrash, HiPencil } from "react-icons/hi";
import { BsFilePdf } from "react-icons/bs";
import { FiExternalLink } from "react-icons/fi";
import { TbFileInvoice, TbTruckDelivery } from "react-icons/tb";
import styles from "./PurchaseOrder.module.scss";
import CreateMilestoneModal from './CreateMilestoneModal';
import { toast } from 'react-toastify';
import { handleDeleteMilestone, handleDeleteTask, handleGetTasks, handleUpdateGST, handleUpdateHSN, handleRegeneratePO, handleUploadPODocument } from '@/services/po';
import CreateTaskModal from './CreateTaskModal';
import Pagination from '@/components/shared/Pagination';
import { getProjectAvailableBudget } from '@/services/project';
import { addCommasToNumber, formatDisplayDate, formatToINRShort } from '@/utils/sharedFunctions';
import useIsMobile from '@/hooks/useIsMobile';
import Link from 'next/link';
import ApprovalWorkflowSection from '@/components/dashboard/buyer/approval/ApprovalWorkflowSection';
import ConfirmationModal from '@/components/modal/ConfirmationModal';
import CommonFormInput from '@/components/shared/CommonFormInput';
import { useRouter } from 'next/navigation';
import PurchaseOrderEditView from './PurchaseOrderEditView';
import RegeneratePOModal from './RegeneratePOModal';
import AddSiteRepModal from './AddSiteRepModal';
import ApproveModal from './ApproveModal';
import NoTechClausesBanner from '@/components/shared/NoTechClausesBanner';
import useHasTechClauses from '@/hooks/useHasTechClauses';
import { FilesListModal, ProductFilesModal } from './AttachmentsModals';

const statusColors = {
  draft: 'secondary',
  pending_approval: 'warning',
  acceptance_pending: 'warning',
  approved: 'success',
  sent: 'primary',
  invoice_raised: 'success',
  dispatched: 'success',
  GRN: 'success',
  completed: 'dark',
  cancelled: 'danger',
  rejected: 'danger',
  rejected_by_vendor: 'danger',
};

const milestoneBadges = {
  pending: 'warning',
  achieved: 'success',
  cancelled: 'dark',
  deleted: 'danger'
}

const POStatusBadge = ({ status }) => {
  const labels = {
    acceptance_pending: 'Awaiting Vendor Acceptance',
    approved: 'Accepted',
    rejected_by_vendor: 'Rejected by Vendor',
  };
  return (
    <Badge bg={statusColors[status] || 'secondary'} className="fs-6 px-3 py-2 float-end text-uppercase">
      {labels[status] || (status || '').replace(/_/g, ' ')}
    </Badge>
  );
};

const PODetailItem = ({ label, value }) => (
  <div className="mb-2">
    <strong>{label}:</strong> {value}
  </div>
);

const TimelineItem = ({ title, name, icon, time, remarks }) => (
  <div className="d-flex align-items-start" style={{ gap: '0.7rem' }}>
    <div style={{ flexShrink: 0 }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: '0.8rem', color: '#6c757d', wordBreak: 'break-word' }}>{name} &bull; {time || 'N/A'}</div>
      {remarks && <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#6c757d', wordBreak: 'break-word', marginTop: 2 }}>"{remarks}"</div>}
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

const PurchaseOrderDetails = ({ data, currentRfqData, handlePODecision, handleInitiatePO, handleBack, refetchPODetails, companyUsers, isEditing, setIsEditing, handleUpdatePO, canWrite = true, canApprove = false, canRegenerate = false }) => {
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
    line_subtotal,
    global_charges = [],
    initiated_by_name,
    created_at,
    project_id,
    project_details,
    product_details,
    vendor_global_comment,
    is_approver,
    approval_status,
    approval_history = [],
    documents = [],
    vendor_quote_term_files = [],
    vendor_quote_product_files = [],
    vendor_tech_eval_files = [],
    buyer_tech_eval_files = [],
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
  const [showDeleteMilestoneConfirmModal, setShowDeleteMilestoneConfirmModal] = useState(false);
  const [showDeleteTaskConfirmModal, setShowDeleteTaskConfirmModal] = useState(false);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState(null);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // 'initiate' | 'grn' | 'hsn' | 'gst' | null
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [termsModal, setTermsModal] = useState({ open: false, title: '', files: [] });
  const [productAttachmentsModal, setProductAttachmentsModal] = useState({ open: false, product: null });
  const [regenerateLoading, setRegenerateLoading] = useState(false);

  const router = useRouter();
  const isMobile = useIsMobile();
  const { hasClauses, loading: clauseLoading } = useHasTechClauses({ rfq_id });

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

  const handleRegenerate = async () => {
    setRegenerateLoading(true);
    try {
      await handleRegeneratePO(id);
      toast.success("PO document regenerated successfully!");
      await refetchPODetails();
      setShowRegenerateModal(false);
    } catch (error) {
      toast.error(error.message || "Failed to regenerate PO document");
    } finally {
      setRegenerateLoading(false);
    }
  };

  const handleUploadPO = async (file) => {
    setRegenerateLoading(true);
    try {
      await handleUploadPODocument(id, file);
      toast.success("PO document uploaded successfully!");
      await refetchPODetails();
      setShowRegenerateModal(false);
    } catch (error) {
      toast.error(error.message || "Failed to upload PO document");
    } finally {
      setRegenerateLoading(false);
    }
  };

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
  const isNewApprovalWorkflow = approval_status?.type === 'new';
  const showMobileApprovalBar = isMobile && canApprove && is_approver && status === 'pending_approval';
  const showLegacyApprovalActions = canApprove && is_approver && status === 'pending_approval' && !isNewApprovalWorkflow;

  const handleWorkflowDecision = async (decision, remarks = '') => {
    if (!handlePODecision) {
      return { success: false, error: 'Approval action is not available.' };
    }

    const result = await handlePODecision(
      id,
      { decision, type: "approval", remarks, silent: true },
      data
    );

    return result?.success === false ? result : { success: true };
  };

  const handleWorkflowApprove = async (comment) => handleWorkflowDecision("approved", comment);
  const handleWorkflowReject = async (comment) => handleWorkflowDecision("rejected", comment);

  // ── Global-charge allocation per product line ────────────────────────────
  // Document-level global charges (TCS, document fee, convenience charge…)
  // live on the PO header (po.global_charges). For the per-product display
  // to reconcile to the grand total, allocate each global charge to product
  // lines proportionally to that line's contribution to the line subtotal:
  //
  //   percentage charge → exact: chargeRate% × line_subtotal_i
  //   absolute charge   → proportional: (line_i / Σline) × charge.amount
  //
  // Both schemes preserve Σ(allocated_share) === total global charge, so the
  // per-product totals always sum to the grand total even when applied as
  // a single document-level cost in the data model.
  const globalChargesNormalized = (() => {
    const arr = Array.isArray(global_charges)
      ? global_charges
      : (typeof global_charges === "string" && global_charges.trim()
          ? (() => { try { return JSON.parse(global_charges); } catch (_e) { return []; } })()
          : []);
    return arr
      .map((gc) => {
        if (!gc || typeof gc !== "object") return null;
        const value = Number(gc.amount ?? gc.tax) || 0;
        const mode = gc.amount_mode ?? gc.tax_mode ?? "percentage";
        if (!(value > 0)) return null;
        const comment = typeof gc.comment === "string" ? gc.comment.trim() : "";
        const additionalTax = Number(gc.additional_tax) || 0;
        const additionalTaxMode = gc.additional_tax_mode ?? "percentage";
        return {
          name: gc.name || gc.slug || "Global Charge",
          value,
          mode,
          comment: comment || null,
          additionalTax,
          additionalTaxMode,
        };
      })
      .filter(Boolean);
  })();
  const productLineSubtotalSum = (Array.isArray(product_details) ? product_details : [])
    .reduce((acc, p) => acc + (Number(p?.total_price) || 0), 0);

  // Recompute the headline grand total from line subtotal + document-level
  // global charges. The backend stores this on po.total_value at draft time,
  // but legacy POs drafted before pricingEngine.normalizeGlobalCharge existed
  // have a stale stored value that excludes global charges. Recomputing in
  // the FE makes the displayed total correct without requiring a one-time
  // DB backfill, and is a no-op for new POs where the stored value already
  // matches. The Product Details section's bottom summary computes the same
  // numbers, so the headline and the breakdown agree by construction.
  const totalGlobalChargesAcrossAllLines = globalChargesNormalized.reduce((sum, gc) => {
    const applied = gc.mode === "percentage"
      ? (productLineSubtotalSum * gc.value) / 100
      : gc.value;
    const taxOnApplied = gc.additionalTax > 0
      ? (gc.additionalTaxMode === "percentage" ? (applied * gc.additionalTax) / 100 : gc.additionalTax)
      : 0;
    return sum + applied + taxOnApplied;
  }, 0);
  const displayedTotalValue = globalChargesNormalized.length > 0
    ? Math.round((productLineSubtotalSum + totalGlobalChargesAcrossAllLines) * 100) / 100
    : Number(total_value) || 0;

  if(!isEditing) {
    return (
      <div style={showMobileApprovalBar ? { paddingBottom: 120 } : undefined}>
        {/* ── Hero Header Card ── */}
        <div className={styles.detailsHeader}>
          <div className={styles.detailsHero}>
            <div className={styles.detailsHeroNumber}>
              <button className={styles.heroBackBtn} onClick={handleBack} id="back_button-po_details-purchase_order_page">
                <BsArrowLeft size={14} />
              </button>
              <span>Purchase Order</span>
              <span className={styles.detailsHeroPONum}>#{po_number}</span>
              <Badge bg={statusColors[status] || 'secondary'} className={styles.heroStatusBadge}>
                {status === 'acceptance_pending' ? 'Awaiting' : status === 'rejected_by_vendor' ? 'Rejected' : status === 'approved' ? 'Accepted' : (status || '').replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className={styles.detailsHeroSub}>
              <BsPersonPlus size={12} style={{ opacity: 0.7, marginRight: 4 }} />
              {initiated_by_name || '-'} &middot; {formatIST(created_at)}
              {rfq_no && <> &middot; RFQ #{rfq_no}{rfq_title ? ` — ${rfq_title}` : ''}</>}
            </p>
            {status === 'approved' && data?.vendor_action_at && (
              <div style={{ backgroundColor: 'rgba(71, 195, 154, 0.26)', borderLeft: '4px solid #10B981', padding: '8px 12px', borderRadius: '4px', marginTop: 8, fontSize: '0.85rem' }}>
                <strong style={{ color: '#6affd5' }}>Vendor accepted this PO{data.vendor_action_at ? ` on ${formatIST(data.vendor_action_at)}` : ''}.</strong>
              </div>
            )}
            {status === 'acceptance_pending' && (
              <div style={{ backgroundColor: '#FEF3C7', borderLeft: '4px solid #F59E0B', padding: '8px 12px', borderRadius: '4px', marginTop: 8, fontSize: '0.85rem' }}>
                <strong style={{ color: '#92400E' }}>Vendor has not yet responded.</strong>
                <span style={{ color: '#92400E', marginLeft: 4 }}>The vendor has been notified and must accept or reject this PO.</span>
              </div>
            )}
            {status === 'rejected_by_vendor' && (
              <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #EF4444', padding: '8px 12px', borderRadius: '4px', marginTop: 8, fontSize: '0.85rem' }}>
                <strong style={{ color: '#991B1B' }}>Vendor rejected this PO{data?.vendor_action_at ? ` on ${formatIST(data.vendor_action_at)}` : ''}.</strong>
                {data?.vendor_rejection_reason && (
                  <span style={{ color: '#991B1B', display: 'block', marginTop: 4 }}>Reason: {data.vendor_rejection_reason}</span>
                )}
                <a href={`/dashboard/buyer/quote-compare?rfq=${data?.rfq_id}`} style={{ color: 'black', display: 'inline-block', marginTop: 6, fontWeight: 600 }}>
                  Go to Quote Compare to finalize another vendor
                </a>
              </div>
            )}
            <div className={styles.detailsHeroActions}>
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
              {canRegenerate && (
                <button className={styles.heroBtn} onClick={() => setShowRegenerateModal(true)} id="regenerate_po-po_details-purchase_order_page">
                  <BsArrowRepeat size={14} /> Regenerate PO Doc
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
              {showLegacyApprovalActions && (
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
                <div className={styles.detailsMetaValue}>₹{addCommasToNumber(displayedTotalValue)}</div>
              </div>
            </div>
            <div className={styles.detailsMetaItem}>
              <div className={styles.detailsMetaIcon}><BsBoxSeam size={15} /></div>
              <div>
                <div className={styles.detailsMetaLabel}>Quantity</div>
                <div className={styles.detailsMetaValue}>{parseFloat(Number(quantity).toFixed(2))}</div>
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
                <div className={styles.detailsMetaValue} style={{ textTransform: 'capitalize' }}>{status === 'approved' ? 'Accepted' : status === 'acceptance_pending' ? 'Awaiting Vendor' : status === 'rejected_by_vendor' ? 'Vendor Rejected' : (status || '').replace(/_/g, ' ')}</div>
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
                    <div className={styles.detailsMetaValue}>₹{formatToINRShort(budgetInfo.available_budget - displayedTotalValue)}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {!clauseLoading && hasClauses === false && rfq_id && (
          <NoTechClausesBanner entityLabel="RFQ" />
        )}

        {/* ── PO PDF ── */}
        {poPdfUrl && (
          <div className={styles.sectionCard} style={{ marginBottom: 16 }}>
            <div className={styles.sectionBody}>
              <div className="d-flex align-items-center gap-3">
                <BsFilePdf size={28} className="text-danger" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2730', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>PO_{po_number}.pdf</div>
                  <div style={{ fontSize: 12, color: '#6c757d' }}>Purchase Order Document</div>
                </div>
                {!isMobile && (
                  <a className={styles.heroBtn} href={poPdfUrl} target="__blank" style={{ textDecoration: 'none', color: '#2E5BA8', background: 'rgba(46,91,168,0.06)', borderColor: 'rgba(46,91,168,0.2)', whiteSpace: 'nowrap' }}>
                    View Document <FiExternalLink size={13} />
                  </a>
                )}
              </div>
              {isMobile && (
                <a className={styles.heroBtn} href={poPdfUrl} target="__blank"
                  style={{ textDecoration: 'none', color: '#2E5BA8', background: 'rgba(46,91,168,0.06)', borderColor: 'rgba(46,91,168,0.2)', display: 'flex', justifyContent: 'center', marginTop: 10, width: '100%' }}>
                  View Document <FiExternalLink size={13} style={{ marginLeft: 6 }} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── Vendor & Buyer (compact inline) ── */}
        <div className={styles.vendorBuyerGrid}>
          <Link href={`/vendor/vendor-profile?id=${finalized_vendor_id}`} target="__blank" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, transition: 'all 0.15s', cursor: 'pointer' }}>
              <div className={styles.detailsMetaIcon} style={{ width: 36, height: 36, flexShrink: 0 }}><BsPerson size={16} /></div>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2730', overflow: 'hidden', textOverflow: 'ellipsis' }}>{finalized_vendor_name}</div>
                <div style={{ fontSize: 11.5, color: '#6c757d', wordBreak: 'break-word' }}>
                  {finalized_vendor_email || ''}{finalized_vendor_phone ? ` · +91 ${finalized_vendor_phone}` : ''}
                </div>
              </div>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
            <div className={styles.detailsMetaIcon} style={{ width: 36, height: 36, flexShrink: 0, background: '#e8f5e8', color: '#428B41' }}><BsBuilding size={16} /></div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2730', overflow: 'hidden', textOverflow: 'ellipsis' }}>{buyer_company_name || '-'}{buyer_business_unit ? ` · ${buyer_business_unit}` : ''}</div>
              <div style={{ fontSize: 11.5, color: '#6c757d', wordBreak: 'break-word' }}>
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
            <div className={styles.sectionBody} style={{ paddingTop: 4 }}>
  
              {/* Modern minimal layout: each product is a flat row, no
                  accordion. Line total on the right, charge pills below the
                  metadata, single Subtotal + Globals + Grand Total summary
                  at the bottom. The math the buyer needs to verify is right
                  there: line totals add up to subtotal, plus global charges,
                  equals grand total. Same numbers as po.total_value and the
                  printed PDF. */}
              {!product_details || product_details.length === 0 ? (
                <p className="text-muted mb-0">
                  No product details available for this PO.
                </p>
              ) : (
                <div>
                  {product_details.map((prod, idx) => {
                    const baseValue =
                      Number(prod.unit_price || 0) * Number(prod.quantity || 0);
                    const lineSubtotal = Number(prod.total_price || 0);
                    const cm = prod.charges_meta || {};
                    const dynamic = Array.isArray(cm.other_charges) ? cm.other_charges : [];
                    const legacyFreight = parseFloat(cm.freight_price);
                    const legacyPackage = parseFloat(cm.package_price);
                    const synthetic = [];
                    if (dynamic.length === 0) {
                      if (Number.isFinite(legacyFreight) && legacyFreight > 0) {
                        synthetic.push({ name: "Freight", amount: legacyFreight, amount_mode: cm.freight_mode || "percentage" });
                      }
                      if (Number.isFinite(legacyPackage) && legacyPackage > 0) {
                        synthetic.push({ name: "Packaging", amount: legacyPackage, amount_mode: cm.package_mode || "percentage" });
                      }
                    }
                    const charges = dynamic.length ? dynamic : synthetic;
                    const baseTaxValue = parseFloat(cm.tax);
                    const baseTaxMode = cm.tax_mode || "percentage";
                    const hasBaseTax = Number.isFinite(baseTaxValue) && baseTaxValue > 0;
                    const baseTaxRateForInherit = baseTaxMode === "percentage" && hasBaseTax ? baseTaxValue : 0;
                    const formatChargeAmount = (charge) => {
                      const amount = parseFloat(charge.amount) || 0;
                      const mode = charge.amount_mode || "percentage";
                      return mode === "percentage" ? `${amount}%` : `₹${addCommasToNumber(amount)}`;
                    };
                    const formatChargeTax = (charge) => {
                      const ownTax = parseFloat(charge.tax);
                      if (Number.isFinite(ownTax) && ownTax > 0) {
                        const mode = charge.tax_mode || "percentage";
                        return mode === "percentage" ? `${ownTax}%` : `₹${addCommasToNumber(ownTax)}`;
                      }
                      if (baseTaxRateForInherit > 0) {
                        return `${baseTaxRateForInherit}% (base)`;
                      }
                      return null;
                    };
                    const isLast = idx === product_details.length - 1;
                    return (
                      <div
                        key={prod.id || prod.rfq_item_id || idx}
                        style={{
                          padding: "12px 0",
                          borderBottom: isLast ? "none" : "1px solid #eef0f3",
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#1a2730", letterSpacing: 0.2 }}>
                              {prod.name || "Unnamed Product"}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#8a96a3", marginTop: 2 }}>
                              {parseFloat(Number(prod.quantity).toFixed(3))} {prod.unit}
                              <span style={{ margin: "0 6px", color: "#cdd3da" }}>·</span>
                              ₹{addCommasToNumber(prod.unit_price)} each
                              <span style={{ margin: "0 6px", color: "#cdd3da" }}>·</span>
                              base ₹{addCommasToNumber(Math.round(baseValue * 100) / 100)}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a2730" }}>
                              ₹{addCommasToNumber(lineSubtotal)}
                            </div>
                            <div style={{ fontSize: 10.5, color: "#8a96a3", marginTop: 2 }}>
                              Line total
                            </div>
                          </div>
                        </div>
                        {(charges.length > 0 || hasBaseTax) && (
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {charges.map((charge, i) => {
                              const taxDisplay = formatChargeTax(charge);
                              const commentText = charge.comment ? String(charge.comment).trim() : "";
                              return (
                                <span
                                  key={`${charge.name || i}_${i}`}
                                  title={commentText || undefined}
                                  style={{
                                    fontSize: 11,
                                    padding: "3px 9px",
                                    background: "#f4f6f8",
                                    color: "#54616e",
                                    borderRadius: 999,
                                  }}
                                >
                                  {charge.name || "Other"} <strong style={{ color: "#1a2730" }}>{formatChargeAmount(charge)}</strong>
                                  {taxDisplay && (
                                    <span style={{ color: "#8a96a3", marginLeft: 4 }}>+ {taxDisplay} tax</span>
                                  )}
                                  {commentText && (
                                    <span style={{ color: "#8a96a3", fontStyle: "italic", marginLeft: 6 }}>
                                      - {commentText}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                            {hasBaseTax && (
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: "3px 9px",
                                  background: "#f4f6f8",
                                  color: "#54616e",
                                  borderRadius: 999,
                                }}
                              >
                                Tax <strong style={{ color: "#1a2730" }}>{baseTaxValue}{baseTaxMode === "percentage" ? "%" : " ₹"}</strong>
                              </span>
                            )}
                          </div>
                        )}
                        {prod.vendor_comment && String(prod.vendor_comment).trim() && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#54616e",
                              marginTop: 8,
                              padding: "8px 10px",
                              background: "#f8f9fa",
                              borderLeft: "2px solid #cdd3da",
                              borderRadius: 4,
                            }}
                          >
                            <span style={{ color: "#8a96a3", fontWeight: 600, marginRight: 6 }}>
                              Vendor note:
                            </span>
                            {String(prod.vendor_comment).trim()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Document totals: Subtotal + Global Charges + Grand Total ──
                  Modern, minimal summary block. Right-aligned amounts, clean
                  typography, prominent grand total. The math is verifiable
                  at a glance: Σ(line totals) + globals = grand total. */}
              {Array.isArray(product_details) && product_details.length > 0 && (() => {
                const subtotal = (product_details || [])
                  .reduce((s, p) => s + (Number(p.total_price) || 0), 0);
                const resolvedGlobals = globalChargesNormalized.map((gc) => {
                  const computed = gc.mode === "percentage"
                    ? (subtotal * gc.value) / 100
                    : gc.value;
                  const taxOnComputed = gc.additionalTax > 0
                    ? (gc.additionalTaxMode === "percentage" ? (computed * gc.additionalTax) / 100 : gc.additionalTax)
                    : 0;
                  return {
                    name: gc.name,
                    rate: gc.value,
                    mode: gc.mode,
                    comment: gc.comment || null,
                    computed: Math.round(computed * 100) / 100,
                    tax: Math.round(taxOnComputed * 100) / 100,
                    taxRate: gc.additionalTax,
                    taxMode: gc.additionalTaxMode,
                  };
                });
                const globalsTotal = resolvedGlobals.reduce((s, gc) => s + gc.computed + gc.tax, 0);
                const grandTotal = Math.round((subtotal + globalsTotal) * 100) / 100;
                const itemLabel = product_details.length === 1 ? "1 item" : `${product_details.length} items`;
                return (
                  <div style={{ paddingTop: 14, borderTop: "1px solid #eef0f3" }}>
                    <div className="d-flex justify-content-between" style={{ fontSize: 13, color: "#54616e", marginBottom: 8 }}>
                      <span>Subtotal <span style={{ color: "#8a96a3", marginLeft: 4 }}>({itemLabel})</span></span>
                      <span style={{ color: "#1a2730", fontWeight: 500 }}>₹{addCommasToNumber(Math.round(subtotal * 100) / 100)}</span>
                    </div>
                    {resolvedGlobals.map((gc, i) => (
                      <div
                        key={`${gc.name}_${i}`}
                        className="d-flex justify-content-between align-items-start"
                        style={{ fontSize: 13, color: "#54616e", marginBottom: 8 }}
                      >
                        <span>
                          {gc.name}
                          {gc.mode === "percentage" && (
                            <span style={{ color: "#8a96a3", marginLeft: 6 }}>({gc.rate}%)</span>
                          )}
                          {gc.comment && (
                            <span
                              style={{
                                display: "block",
                                color: "#8a96a3",
                                fontStyle: "italic",
                                fontSize: 11.5,
                                marginTop: 2,
                              }}
                            >
                              - {gc.comment}
                            </span>
                          )}
                        </span>
                        <span style={{ color: "#1a2730", fontWeight: 500 }}>
                          ₹{addCommasToNumber(gc.computed)}
                          {gc.tax > 0 && (
                            <span style={{ color: "#8a96a3", fontWeight: 400, marginLeft: 4 }}>
                              + ₹{addCommasToNumber(gc.tax)} (tax)
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                    <div
                      className="d-flex justify-content-between align-items-center"
                      style={{
                        marginTop: 12,
                        paddingTop: 14,
                        borderTop: "1px solid #eef0f3",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#1a2730" }}>Grand Total</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#1a2730" }}>
                        ₹{addCommasToNumber(grandTotal)}
                      </span>
                    </div>
                  </div>
                );
              })()}
              {vendor_global_comment && String(vendor_global_comment).trim() && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "12px 14px",
                    background: "#f8f9fa",
                    border: "1px solid #eef0f3",
                    borderRadius: 6,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#8a96a3", marginBottom: 4, letterSpacing: 0.3, textTransform: "uppercase" }}>
                    Vendor overall comment
                  </div>
                  <div style={{ fontSize: 13, color: "#1a2730", whiteSpace: "pre-wrap" }}>
                    {String(vendor_global_comment).trim()}
                  </div>
                </div>
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

        {(() => {
          const buyerTermFiles = Array.isArray(currentRfqData?.TERM_files) ? currentRfqData.TERM_files : [];
          const rfqProductsById = {};
          (currentRfqData?.products || []).forEach((p) => { rfqProductsById[p.id] = p; });

          const vendorTermFiles = Array.isArray(vendor_quote_term_files) ? vendor_quote_term_files : [];
          const vendorFilesByRfqProduct = {};
          (vendor_quote_product_files || []).forEach((f) => {
            const key = f.rfq_product_id;
            if (!vendorFilesByRfqProduct[key]) vendorFilesByRfqProduct[key] = { name: f.product_name, files: [] };
            vendorFilesByRfqProduct[key].files.push(f.file_url);
          });

          const techEvalByRfqProduct = {};
          (vendor_tech_eval_files || []).forEach((f) => {
            const key = f.rfq_product_id;
            if (!techEvalByRfqProduct[key]) techEvalByRfqProduct[key] = { name: f.product_name, clauses: {} };
            if (!techEvalByRfqProduct[key].clauses[f.clause_id]) {
              techEvalByRfqProduct[key].clauses[f.clause_id] = { text: f.clause_text, files: [] };
            }
            techEvalByRfqProduct[key].clauses[f.clause_id].files.push(f.file_url);
          });

          const buyerTechEvalByRfqProduct = {};
          (buyer_tech_eval_files || []).forEach((f) => {
            const key = f.rfq_product_id;
            if (!buyerTechEvalByRfqProduct[key]) buyerTechEvalByRfqProduct[key] = { name: f.product_name, clauses: {} };
            if (!buyerTechEvalByRfqProduct[key].clauses[f.clause_id]) {
              buyerTechEvalByRfqProduct[key].clauses[f.clause_id] = { text: f.clause_text, files: [] };
            }
            buyerTechEvalByRfqProduct[key].clauses[f.clause_id].files.push(f.file_url);
          });

          const productRows = (product_details || []).map((pp) => {
            const rfqId = pp.rfq_item_id;
            const rfqProduct = rfqProductsById[rfqId];
            return {
              rfq_product_id: rfqId,
              name: pp.name || rfqProduct?.name || vendorFilesByRfqProduct[rfqId]?.name || techEvalByRfqProduct[rfqId]?.name || buyerTechEvalByRfqProduct[rfqId]?.name || `Product #${rfqId}`,
              datasheet_file: rfqProduct?.datasheet_file || [],
              spec_file: rfqProduct?.spec_file || [],
              qap_file: rfqProduct?.qap_file || [],
              buyer_tech_eval_clauses: buyerTechEvalByRfqProduct[rfqId]?.clauses
                ? Object.entries(buyerTechEvalByRfqProduct[rfqId].clauses).map(([cid, c]) => ({ clause_id: cid, text: c.text, files: c.files }))
                : [],
              vendor_files: vendorFilesByRfqProduct[rfqId]?.files || [],
              tech_eval_clauses: techEvalByRfqProduct[rfqId]?.clauses
                ? Object.entries(techEvalByRfqProduct[rfqId].clauses).map(([cid, c]) => ({ clause_id: cid, text: c.text, files: c.files }))
                : [],
            };
          });

          const hasBuyerFiles = buyerTermFiles.length > 0
            || productRows.some(p => p.datasheet_file.length || p.spec_file.length || p.qap_file.length)
            || productRows.some(p => p.buyer_tech_eval_clauses.length);
          const hasVendorFiles = vendorTermFiles.length > 0
            || productRows.some(p => p.vendor_files.length)
            || productRows.some(p => p.tech_eval_clauses.length);

          const hasAnyProductFiles = productRows.some(p =>
            p.datasheet_file.length || p.spec_file.length || p.qap_file.length ||
            p.buyer_tech_eval_clauses.length || p.vendor_files.length || p.tech_eval_clauses.length
          );

          return (
            <div className={`${styles.sectionCard} ${styles.sectionCardHighlight} mb-3`}>
              <div className={styles.sectionHeader}>
                <h5 className={styles.sectionTitle}>
                  <BsFileEarmarkText size={18} color="#2E5BA8" />
                  <span>
                    Attachments from RFQ &amp; Quote
                    <span className={styles.sectionReviewBadge}>Review</span>
                    <span className={styles.sectionTitleSub}>Buyer &amp; vendor documents exchanged on this order — please review before approval.</span>
                  </span>
                </h5>
                {(buyerTermFiles.length > 0 || vendorTermFiles.length > 0) && (
                  <div className="d-flex flex-wrap gap-2">
                    {buyerTermFiles.length > 0 && (
                      <button
                        type="button"
                        style={{ background: '#2E5BA8', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600 }}
                        onClick={() => setTermsModal({ open: true, title: 'Buyer (RFQ) — Terms & Conditions', files: buyerTermFiles })}
                      >
                        Show Buyer T&amp;C Files ({buyerTermFiles.length})
                      </button>
                    )}
                    {vendorTermFiles.length > 0 && (
                      <button
                        type="button"
                        style={{ background: '#fff', color: '#2E5BA8', border: '1px solid #2E5BA8', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600 }}
                        onClick={() => setTermsModal({ open: true, title: 'Vendor (Quote) — Terms & Conditions', files: vendorTermFiles })}
                      >
                        Show Vendor T&amp;C Files ({vendorTermFiles.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.sectionBody}>
                {(!hasBuyerFiles && !hasVendorFiles) ? (
                  <p className="text-muted mb-0">
                    No attachments were exchanged on the RFQ or quote.
                  </p>
                ) : (
                  <>
                    {/* Product cards — clicking a card opens a modal with all categorised files */}
                    {hasAnyProductFiles ? (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                          Products
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {productRows.map((p) => {
                            const totalCount = p.datasheet_file.length + p.spec_file.length + p.qap_file.length
                              + p.buyer_tech_eval_clauses.reduce((acc, c) => acc + (c.files?.length || 0), 0)
                              + p.vendor_files.length
                              + p.tech_eval_clauses.reduce((acc, c) => acc + (c.files?.length || 0), 0);
                            return (
                              <button
                                key={`prod-card-${p.rfq_product_id}`}
                                type="button"
                                onClick={() => setProductAttachmentsModal({ open: true, product: p })}
                                style={{
                                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                                  padding: '10px 14px', minWidth: 180, textAlign: 'left',
                                  background: '#fafbfc', border: '1px solid #eef0f2', borderRadius: 10,
                                  cursor: 'pointer', transition: 'border-color 0.15s, transform 0.05s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2E5BA8'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#eef0f2'}
                              >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#1a2730' }}>
                                  <BsFileEarmarkText size={14} color="#2E5BA8" />
                                  {elipsisToLimit(p.name, 32)}
                                </span>
                                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                  {totalCount} document{totalCount === 1 ? '' : 's'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted mb-0">
                        No per-product attachments. Use the Terms &amp; Conditions buttons above to view T&amp;C files.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        <div className={`mb-0 ${styles.hsnGstRow}`}>
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
  
        {isNewApprovalWorkflow ? (
          <div className="mb-3">
            <ApprovalWorkflowSection
              entityType="PO"
              entityId={id}
              entityLabel={`Purchase Order #${po_number}`}
              onCustomApprove={handleWorkflowApprove}
              onCustomReject={handleWorkflowReject}
              hideTopButtons={showMobileApprovalBar}
              showMobileStickyActions={showMobileApprovalBar}
            />
          </div>
        ) : (approval_history.length > 0 || approval_status?.status == "pending") && (
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
                const actionLower = entry.action?.toLowerCase();
                const isApproved = actionLower === "approved" || actionLower === "approve";
                const isRejected = actionLower === "rejected" || actionLower === "reject";
                const isCancelled = actionLower === "cancelled" || actionLower === "cancel";
                const isEdited = actionLower === "edited" || actionLower === "edit";
                const isInvoice = actionLower === "invoice";
                const isGrn = actionLower === "grn";

                const getTitle = () => {
                  let title = isApproved ? "Approved"
                    : isRejected ? "Rejected"
                    : isCancelled ? "Cancelled"
                    : isEdited ? "PO Edited"
                    : isInvoice ? "Invoice Raised"
                    : isGrn ? "GRN Marked"
                    : "Action Taken";

                  if (entry.step_number) {
                    title += ` (Step ${entry.step_number})`;
                  }
                  return title;
                };

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
            </div>
          </div>
        )}

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
          {isMobile ? (
            <div className={styles.sectionBody} style={{ padding: 0 }}>
              {payment_milestones && payment_milestones.length > 0 ? (
                payment_milestones.map((milestone) => (
                  <div key={milestone.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>{milestone.milestone_name}</span>
                      <Badge bg={milestoneBadges[milestone.status]} className="text-capitalize" style={{ fontSize: '0.7rem' }}>{milestone.status}</Badge>
                    </div>
                    {milestone.milestone_description && (
                      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>{elipsisToLimit(milestone.milestone_description, 60)}</div>
                    )}
                    <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '0.78rem' }}>
                      <span className="text-muted">Due: <strong>{new Date(milestone.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                      {canWrite && milestone.status != "deleted" && (
                        <div className="d-flex gap-2">
                          <button className="minimal-btn" style={{ backgroundColor: '#fdeceb', borderColor: '#f5b5b5', color: '#dc3545', padding: '4px 8px' }}
                            onClick={() => handleMilestoneEdition(milestone)} id={`edit_milestone_${milestone.id}-milestone_actions-po_details`}>
                            <HiPencil size={16} />
                          </button>
                          <button className="minimal-btn" style={{ backgroundColor: '#fdeceb', borderColor: '#f5b5b5', color: '#dc3545', padding: '4px 8px' }}
                            onClick={() => { setDeleteMilestoneId(milestone.id); setShowDeleteMilestoneConfirmModal(true); }}
                            id={`delete_milestone_${milestone.id}-milestone_actions-po_details`}>
                            <HiOutlineTrash size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted p-3" style={{ fontSize: '0.85rem' }}>No payment milestones found.</div>
              )}
            </div>
          ) : (
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
          )}
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
          {isMobile ? (
            <div className={styles.sectionBody} style={{ padding: 0 }}>
              {tasks?.data && tasks.data.length > 0 ? (
                tasks.data.map((task) => (
                  <div key={task.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>{task.task_name}</span>
                      <Badge bg={milestoneBadges[task.status]} className="text-capitalize" style={{ fontSize: '0.7rem' }}>{task.status}</Badge>
                    </div>
                    {task.task_description && (
                      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>{elipsisToLimit(task.task_description, 60)}</div>
                    )}
                    <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '0.78rem' }}>
                      <span className="text-muted">Completion: <strong>{new Date(task.completion_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                      {canWrite && (
                        <div className="d-flex gap-2">
                          <button className="minimal-btn" style={{ backgroundColor: '#fdeceb', borderColor: '#f5b5b5', color: '#dc3545', padding: '4px 8px' }}
                            onClick={() => handleTaskEdition(task)} id={`edit_task_${task.id}-task_actions-po_details`}>
                            <HiPencil size={16} />
                          </button>
                          <button className="minimal-btn" style={{ backgroundColor: '#fdeceb', borderColor: '#f5b5b5', color: '#dc3545', padding: '4px 8px' }}
                            onClick={() => { setDeleteTaskId(task.id); setShowDeleteTaskConfirmModal(true); }}
                            id={`delete_task_${task.id}-task_actions-po_details`}>
                            <HiOutlineTrash size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted p-3" style={{ fontSize: '0.85rem' }}>No tasks found.</div>
              )}
            </div>
          ) : (
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
          )}
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

        <RegeneratePOModal
          show={showRegenerateModal}
          onClose={() => setShowRegenerateModal(false)}
          onRegenerate={handleRegenerate}
          onUpload={handleUploadPO}
          isProcessing={regenerateLoading}
        />

        <FilesListModal
          show={termsModal.open}
          onClose={() => setTermsModal({ open: false, title: '', files: [] })}
          title={termsModal.title}
          files={termsModal.files}
        />

        <ProductFilesModal
          show={productAttachmentsModal.open}
          onClose={() => setProductAttachmentsModal({ open: false, product: null })}
          productName={productAttachmentsModal.product?.name || ''}
          groups={productAttachmentsModal.product ? [
            {
              title: 'Buyer (RFQ)',
              variant: 'buyer',
              sections: [
                { label: 'Datasheet', files: productAttachmentsModal.product.datasheet_file },
                { label: 'Specification', files: productAttachmentsModal.product.spec_file },
                { label: 'QAP', files: productAttachmentsModal.product.qap_file },
              ],
              clauseSections: [
                { label: 'Technical Evaluation Clauses', clauses: productAttachmentsModal.product.buyer_tech_eval_clauses },
              ],
            },
            {
              title: 'Vendor (Quote)',
              variant: 'vendor',
              sections: [
                { label: 'Quote Documents', files: productAttachmentsModal.product.vendor_files },
              ],
              clauseSections: [
                { label: 'Technical Evaluation Evidence', clauses: productAttachmentsModal.product.tech_eval_clauses },
              ],
            },
          ] : []}
        />

        {/* Sticky mobile approval bar */}
        {showMobileApprovalBar && !isNewApprovalWorkflow && (
          <div className={styles.mobileApprovalBar}>
            <button className={styles.mobileApproveBtn} onClick={() => setShowApproveConfirmModal(true)}>
              Approve
            </button>
            <button className={styles.mobileRejectBtn} onClick={() => {
              if (handlePODecision) handlePODecision(id, { decision: "rejected", type: "approval" });
            }}>
              Reject
            </button>
          </div>
        )}
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
