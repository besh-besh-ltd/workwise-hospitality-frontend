import React, { useEffect, useState } from 'react';
import { Accordion, Badge } from "react-bootstrap";
import {
  BsBoxSeam, BsPerson, BsBuilding, BsCalendar3,
  BsCurrencyRupee, BsShieldCheck, BsFilePdf, BsFileEarmarkText,
  BsArrowLeft, BsCheck, BsXLg
} from 'react-icons/bs';
import { MdClose } from "react-icons/md";
import { FiExternalLink } from "react-icons/fi";
import { TbFileInvoice } from 'react-icons/tb';
import { FiSend } from "react-icons/fi";
import { FaTruckRampBox } from "react-icons/fa6";
import { toast } from 'react-toastify';
import { handleDeleteMilestone, handleDeleteTask, handleGetTasks, handleUpdateGST, handleUpdateHSN } from '@/services/po';
import Pagination from '@/components/shared/Pagination';
import { getProjectAvailableBudget } from '@/services/project';
import { addCommasToNumber, formatDisplayDate, formatToINRShort } from '@/utils/sharedFunctions';
import Link from 'next/link';
import ConfirmationModal from '@/components/modal/ConfirmationModal';
import useIsMobile from '@/hooks/useIsMobile';
import styles from "@/components/dashboard/buyer/purchase-order/PurchaseOrder.module.scss";

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

const statusLabels = {
  acceptance_pending: 'Awaiting',
  approved: 'Accepted',
  rejected_by_vendor: 'Rejected',
};

const formatIST = (dateStr) => {
  if (!dateStr) return 'N/A';
  let input = dateStr;
  // If the value has no timezone info, assume UTC (server stores NOW() in UTC)
  if (typeof input === 'string' && !input.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(input) && !/[+-]\d{4}$/.test(input)) {
    input = input.replace(' ', 'T') + 'Z';
  }
  const date = new Date(input);
  if (isNaN(date.getTime())) return String(dateStr);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const PurchaseOrderDetails = ({ data, handlePODecision, handleInitiatePO, handleBack, refetchPODetails, companyUsers, onAcceptPO, onRejectPO }) => {
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

  const [budgetInfo, setBudgetInfo] = useState(null);
  const [showRaiseInvoiceModal, setShowRaiseInvoiceModal] = useState(false);
  const [showMarkDispatchedModal, setShowMarkDispatchedModal] = useState(false);

  const [tasks, setTasks] = useState(null);
  const [filters, setFilters] = useState({ page: 1, limit: 10 });

  const isMobile = useIsMobile();
  const showMobileAcceptanceBar = isMobile && status === 'acceptance_pending';

  const handleFetchTasks = async () => {
    try {
      const res = await handleGetTasks(id, filters);
      if (res) setTasks(res);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFetchBudget = async () => {
    try {
      if (!project_id) return;
      const res = await getProjectAvailableBudget(project_id);
      if (res) setBudgetInfo(res);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { handleFetchTasks(); }, [filters]);
  useEffect(() => { handleFetchBudget(); }, []);

  return (
    <div style={showMobileAcceptanceBar ? { paddingBottom: 96 } : undefined}>
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
              {statusLabels[status] || status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className={styles.detailsHeroSub}>
            {initiated_by_name || '-'} &middot; {formatIST(created_at)}
            {rfq_no && <> &middot; RFQ #{rfq_no}{rfq_title ? ` — ${rfq_title}` : ''}</>}
          </p>

          {/* Accepted banner */}
          {status === 'approved' && data?.vendor_action_at && (
            <div style={{ backgroundColor: '#065F46', borderLeft: '4px solid #34D399', padding: '8px 12px', borderRadius: '4px', fontSize: '0.85rem' }}>
              <strong style={{ color: '#ECFDF5' }}>You accepted this PO{data.vendor_action_at ? ` on ${formatIST(data.vendor_action_at)}` : ''}.</strong>
            </div>
          )}

          {/* Acceptance pending banner */}
          {status === 'acceptance_pending' && (
            <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderLeft: '4px solid #F59E0B', padding: '8px 12px', borderRadius: '4px', fontSize: '0.85rem' }}>
              <strong>Your action is required.</strong>
              <span style={{ marginLeft: 4, opacity: 0.9 }}>Please accept or reject this Purchase Order.</span>
            </div>
          )}

          {/* Rejected by vendor banner */}
          {status === 'rejected_by_vendor' && (
            <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderLeft: '4px solid #EF4444', padding: '8px 12px', borderRadius: '4px', fontSize: '0.85rem' }}>
              <strong>You rejected this PO{data?.vendor_action_at ? ` on ${formatIST(data.vendor_action_at)}` : ''}.</strong>
              {data?.vendor_rejection_reason && (
                <span style={{ display: 'block', marginTop: 4, opacity: 0.85 }}>Reason: {data.vendor_rejection_reason}</span>
              )}
            </div>
          )}

          <div className={styles.detailsHeroActions}>
            {status === 'acceptance_pending' && (
              <>
                <button className={`${styles.heroBtn} ${styles.heroBtnApprove}`} onClick={() => onAcceptPO && onAcceptPO(data)}>
                  <BsCheck size={16} /> Accept PO
                </button>
                <button className={`${styles.heroBtn} ${styles.heroBtnReject}`} onClick={() => onRejectPO && onRejectPO(data)}>
                  <MdClose size={15} /> Reject PO
                </button>
              </>
            )}
            {status === 'approved' && (
              <button className={`${styles.heroBtn} ${styles.heroBtnSolid}`} onClick={() => setShowRaiseInvoiceModal(true)}>
                <FiSend size={13} /> Raise Invoice
              </button>
            )}
            {status === 'invoice_raised' && (
              <button className={`${styles.heroBtn} ${styles.heroBtnSolid}`} onClick={() => setShowMarkDispatchedModal(true)}>
                <FaTruckRampBox size={13} /> Mark Dispatched
              </button>
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
              <div className={styles.detailsMetaValue} style={{ textTransform: 'capitalize' }}>
                {statusLabels[status] || status.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <a className={styles.heroBtn} href={poPdfUrl} target="__blank" style={{ textDecoration: 'none', color: '#2E5BA8', background: 'rgba(46,91,168,0.06)', borderColor: 'rgba(46,91,168,0.2)', whiteSpace: 'nowrap' }}>
                View Document <FiExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Buyer & Vendor (compact grid) ── */}
      <div className={styles.vendorBuyerGrid}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <div className={styles.detailsMetaIcon} style={{ width: 36, height: 36, flexShrink: 0, background: '#e8f5e8', color: '#428B41' }}><BsBuilding size={16} /></div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2730', overflow: 'hidden', textOverflow: 'ellipsis' }}>{buyer_company_name || '-'}{buyer_business_unit ? ` · ${buyer_business_unit}` : ''}</div>
            <div style={{ fontSize: 11.5, color: '#6c757d', wordBreak: 'break-word' }}>
              {buyer_gstin ? `GSTIN: ${buyer_gstin}` : ''}{initiated_by_name ? `${buyer_gstin ? ' · ' : ''}Contact: ${initiated_by_name}` : ''}
              {initiated_by_email ? ` (${initiated_by_email})` : ''}{initiated_by_phone ? ` · +91 ${initiated_by_phone}` : ''}
            </div>
            {buyer_address && <div style={{ fontSize: 11.5, color: '#6c757d' }}>{buyer_address}</div>}
          </div>
        </div>
        {rfq_no && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
            <div className={styles.detailsMetaIcon} style={{ width: 36, height: 36, flexShrink: 0 }}><BsFileEarmarkText size={16} /></div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2730' }}>RFQ #{rfq_no}</div>
              {rfq_title && <div style={{ fontSize: 11.5, color: '#6c757d' }}>{rfq_title}</div>}
            </div>
          </div>
        )}
      </div>

      {/* ── Product Details ── */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h5 className={styles.sectionTitle}><BsBoxSeam size={16} /> Product Details</h5>
        </div>
        <div className={styles.sectionBody}>
          {!product_details || product_details.length === 0 ? (
            <p className="text-muted mb-0">No product details available for this PO.</p>
          ) : (
            <Accordion alwaysOpen>
              {product_details.map((prod, idx) => {
                const baseValue = Number(prod.unit_price || 0) * Number(prod.quantity || 0);
                return (
                  <Accordion.Item eventKey={String(idx)} key={prod.id || prod.rfq_item_id || idx}>
                    <Accordion.Header>
                      <div className="w-100 d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <div className="d-flex flex-column gap-1" style={{ minWidth: 0, flex: 1 }}>
                          <div className="fw-semibold" style={{ wordBreak: 'break-word' }}>
                            {prod.name || "Unnamed Product"}
                          </div>
                          <div className="small text-muted">
                            RFQ Item: <strong>{prod.rfq_item_id}</strong>
                            {prod.product_id && <> &middot; Product ID: <strong>{prod.product_id}</strong></>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div className="small text-muted">Total Amount</div>
                          <div className="fw-semibold" style={{ fontSize: '0.95rem' }}>
                            ₹{addCommasToNumber(prod.total_price)}
                          </div>
                        </div>
                      </div>
                    </Accordion.Header>
                    <Accordion.Body>
                      <div className="d-flex flex-wrap gap-4 mb-3">
                        <div className="small">
                          <div className="text-muted">Quantity</div>
                          <div className="fw-semibold">{parseFloat(Number(prod.quantity).toFixed(2))} {prod.unit}</div>
                        </div>
                        <div className="small">
                          <div className="text-muted">Unit Price</div>
                          <div className="fw-semibold">₹{addCommasToNumber(prod.unit_price)}</div>
                        </div>
                        <div className="small">
                          <div className="text-muted">Base Value</div>
                          <div className="fw-semibold">₹{addCommasToNumber(baseValue)}</div>
                        </div>
                      </div>
                      {(() => {
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
                        // Charges inherit base tax rate when they have no
                        // explicit tax AND base tax_mode is percentage.
                        const baseTaxRateForInherit = baseTaxMode === "percentage" && hasBaseTax ? baseTaxValue : 0;
                        if (charges.length === 0 && !hasBaseTax) return null;

                        const formatChargeAmount = (charge) => {
                          const amount = parseFloat(charge.amount) || 0;
                          const mode = charge.amount_mode || "percentage";
                          return mode === "percentage" ? `${amount}%` : `₹ ${addCommasToNumber(amount)}`;
                        };
                        const formatChargeTax = (charge) => {
                          const ownTax = parseFloat(charge.tax);
                          if (Number.isFinite(ownTax) && ownTax > 0) {
                            const mode = charge.tax_mode || "percentage";
                            return mode === "percentage" ? `${ownTax}%` : `₹ ${addCommasToNumber(ownTax)}`;
                          }
                          if (baseTaxRateForInherit > 0) {
                            return `${baseTaxRateForInherit}% (base)`;
                          }
                          return null;
                        };

                        return (
                          <>
                            <div className="small text-muted mb-1">Charges</div>
                            <div className="d-flex flex-wrap gap-2">
                              {charges.map((charge, i) => {
                                const taxDisplay = formatChargeTax(charge);
                                return (
                                  <span key={`${charge.name || i}_${i}`} className="badge bg-light text-dark border">
                                    {charge.name || "Other"}: <strong>{formatChargeAmount(charge)}</strong>
                                    {taxDisplay && (
                                      <span style={{ color: "#888", fontWeight: 400, marginLeft: 4 }}>
                                        + {taxDisplay} tax
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                              {hasBaseTax && (
                                <span className="badge bg-light text-dark border">
                                  Tax: <strong>{baseTaxValue}{baseTaxMode === "percentage" ? "%" : " ₹"}</strong>
                                </span>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </Accordion.Body>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>

      {/* ── Documents ── */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h5 className={styles.sectionTitle}><TbFileInvoice size={16} /> Documents</h5>
        </div>
        <div className={styles.sectionBody}>
          {(!documents || documents.length === 0) ? (
            <p className="text-muted mb-0">No documents uploaded yet for this Purchase Order.</p>
          ) : (
            <div className="d-flex flex-column gap-2">
              {documents.map((doc, idx) => {
                const uploadedAt = new Date(doc.created_at);
                const typeLabel = doc.document_type?.replace(/_/g, " ")?.toUpperCase() || "DOCUMENT";
                const uploadedByLabel = doc.uploaded_by === finalized_vendor_id ? "You" : "Buyer";

                return (
                  <div key={doc.id} className="d-flex justify-content-between align-items-center border rounded px-3 py-2">
                    <div className="d-flex flex-column">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fw-semibold small">#{idx + 1}</span>
                        <span className="badge bg-secondary text-uppercase small">{typeLabel}</span>
                      </div>
                      <div className="small text-muted">
                        Uploaded by <strong>{uploadedByLabel}</strong> &middot; {uploadedAt.toLocaleString()}
                      </div>
                    </div>
                    <a href={doc.document_url} target="_blank" rel="noreferrer"
                      className="btn btn-outline-dark btn-sm p-2 px-3">
                      View Document
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <ConfirmationModal
        isOpen={showRaiseInvoiceModal}
        onClose={() => setShowRaiseInvoiceModal(false)}
        onConfirm={async () => {
          await handlePODecision(id, { type: "invoice" });
          await refetchPODetails();
          setShowRaiseInvoiceModal(false);
        }}
        title="Raise Invoice for this PO"
        description={`Are you sure you want to raise invoice for PO #${po_number || "this purchase order"}?`}
        confirmButtonColor="success"
        confirmButtonText="Yes, Raise Invoice"
        cancelButtonText="Cancel"
      />

      <ConfirmationModal
        isOpen={showMarkDispatchedModal}
        onClose={() => setShowMarkDispatchedModal(false)}
        onConfirm={async () => {
          await handlePODecision(id, { type: "dispatch" });
          await refetchPODetails();
          setShowMarkDispatchedModal(false);
        }}
        title="Mark Dispatched"
        description={`Are you sure you want to mark PO #${po_number || "this purchase order"} as dispatched?`}
        confirmButtonColor="success"
        confirmButtonText="Yes, Mark Dispatched"
        cancelButtonText="Cancel"
      />

      {/* Sticky mobile acceptance bar (vendor) */}
      {showMobileAcceptanceBar && (
        <div className={styles.mobileApprovalBar}>
          <button
            className={styles.mobileApproveBtn}
            onClick={() => onAcceptPO && onAcceptPO(data)}
          >
            Accept PO
          </button>
          <button
            className={styles.mobileRejectBtn}
            onClick={() => onRejectPO && onRejectPO(data)}
          >
            Reject PO
          </button>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderDetails;
