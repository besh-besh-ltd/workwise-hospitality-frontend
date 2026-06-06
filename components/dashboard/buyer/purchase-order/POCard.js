import React, { useMemo } from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { MdCheck, MdClose } from 'react-icons/md';
import { IoMdEye } from 'react-icons/io';
import { FiAlertTriangle, FiUser } from 'react-icons/fi';
import { BsArrowRepeat, BsFilePdf } from 'react-icons/bs';
import { addCommasToNumber } from '@/utils/sharedFunctions';
import useIsMobile from '@/hooks/useIsMobile';
import styles from './POCard.module.scss';

const POCard = ({
  po,
  onClick,
  onApprove,
  onReject,
  initiatePO,
  onRegenerate,
  // Bulk-select wiring. The parent (POListing) computes selectability and the
  // current bulk mode; the row only renders the checkbox and forwards changes.
  // `selectMode` is one of:
  //   'eligible'        — row matches the active bulk mode, normal checkbox
  //   'disabled-mismatch' — row is selectable in principle but a different
  //                         mode is currently locked, so block selection
  //   null              — row not selectable in this listing context at all
  selectMode = null,
  isSelected = false,
  onSelectChange,
  disabledReason,
}) => {
  const statusConfig = {
    pending_approval: { label: 'Pending', variant: 'warning', requiresAction: true },
    acceptance_pending: { label: 'Awaiting', variant: 'warning', requiresAction: false },
    approved: { label: 'Accepted', variant: 'success', requiresAction: false },
    cancelled: { label: 'Cancelled', variant: 'danger', requiresAction: false },
    rejected: { label: 'Rejected', variant: 'danger', requiresAction: false },
    rejected_by_vendor: { label: 'Rejected', variant: 'danger', requiresAction: false, isVendorRejected: true },
    invoice_raised: { label: 'Invoice', variant: 'info', requiresAction: false },
    dispatched: { label: 'Dispatched', variant: 'success', requiresAction: false },
    GRN: { label: 'GRN', variant: 'info', requiresAction: false },
    draft: { label: 'Draft', variant: 'secondary', requiresAction: true }
  };

  const currentStatus = statusConfig[po.status] || statusConfig.draft;
  const showApprovalActions = po.status === 'pending_approval' && po.is_approver;
  const isDraft = po.status === 'draft';
  const isApproved = po.status === 'approved';
  const isPendingApproval = po.status === 'pending_approval';

  // Surface the current pending approver(s) so the user can see who's blocking
  // each PO without opening it. Supports both the new (multi-approver per
  // step) and legacy (single approver) workflows. Step labelling uses
  // current_step / total_steps when available.
  const pendingApproverInfo = useMemo(() => {
    if (!isPendingApproval) return null;
    const a = po.approval_status;
    if (!a) return null;
    let names = [];
    if (a.type === 'new' && Array.isArray(a.pending_approvers)) {
      names = a.pending_approvers.map(p => p?.name).filter(Boolean);
    } else if (a.type === 'legacy' && a.current_approver_name) {
      names = [a.current_approver_name];
    }
    if (names.length === 0) return null;
    const stepLabel = a.type === 'new' && a.current_step && a.total_steps
      ? `Level ${a.current_step}${a.total_steps > 1 ? `/${a.total_steps}` : ''}`
      : null;
    return { names, stepLabel };
  }, [isPendingApproval, po.approval_status]);

  const pendingAtCaption = useMemo(() => {
    if (!pendingApproverInfo) return null;
    const { names } = pendingApproverInfo;
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, ${names[1]}`;
    return `${names[0]} +${names.length - 1}`;
  }, [pendingApproverInfo]);

  const pendingAtTooltip = useMemo(() => {
    if (!pendingApproverInfo) return null;
    const { names, stepLabel } = pendingApproverInfo;
    const list = names.length === 1
      ? names[0]
      : names.length === 2
        ? `${names[0]} & ${names[1]}`
        : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
    return stepLabel ? `${stepLabel} — pending at ${list}` : `Pending at ${list}`;
  }, [pendingApproverInfo]);

  // Display total = line subtotal + document-level global charges. The
  // backend stores the grand total on po.total_value at draft, but legacy
  // POs drafted before pricingEngine.normalizeGlobalCharge existed have a
  // stale stored value. Recomputing from po.line_subtotal + po.global_charges
  // here makes the listing display correct for both new and legacy POs and
  // is a no-op when the stored total already includes globals.
  const displayedTotal = useMemo(() => {
    const gcArr = Array.isArray(po.global_charges)
      ? po.global_charges
      : (typeof po.global_charges === 'string' && po.global_charges.trim()
          ? (() => { try { return JSON.parse(po.global_charges); } catch (_e) { return []; } })()
          : []);
    if (!gcArr.length) return Number(po.total_value) || 0;
    const subtotal = Number(po.line_subtotal ?? po.total_value) || 0;
    let gcTotal = 0;
    for (const gc of gcArr) {
      if (!gc || typeof gc !== 'object') continue;
      const value = Number(gc.amount ?? gc.tax) || 0;
      const mode = gc.amount_mode ?? gc.tax_mode ?? 'percentage';
      if (!(value > 0)) continue;
      gcTotal += mode === 'percentage' ? (subtotal * value) / 100 : value;
    }
    return Math.round((subtotal + gcTotal) * 100) / 100;
  }, [po.total_value, po.line_subtotal, po.global_charges]);

  const waitInfo = useMemo(() => {
    if (!isPendingApproval) return null;
    const lastApproval = po.approval_history
      ?.filter(h => h.action === 'approved')
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const referenceDate = lastApproval?.created_at || po.created_at;
    const ref = new Date(referenceDate);
    const now = new Date();
    const diffMs = now.getTime() - ref.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    let urgency = 'Normal';
    if (diffDays >= 5) urgency = 'Critical';
    else if (diffDays >= 2) urgency = 'Warning';
    let displayText = diffHours < 24 ? (diffHours < 1 ? 'Now' : `${diffHours}h`) : `${diffDays}d`;
    const fullDateTime = ref.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });
    return { displayText, urgency, fullDateTime, isCritical: diffDays >= 5 };
  }, [po.approval_history, po.created_at, isPendingApproval]);

  const createdInfo = useMemo(() => {
    if (!po.created_at) return { relative: '—', fullDateTime: 'Unknown' };
    const date = new Date(po.created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let relative;
    if (diffMins < 60) relative = diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else if (diffDays < 30) relative = `${Math.floor(diffDays / 7)}w ago`;
    else relative = `${Math.floor(diffDays / 30)}mo ago`;
    const fullDateTime = date.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });
    return { relative, fullDateTime };
  }, [po.created_at]);

  const productCount = po.product_details?.length || 0;
  const productsDisplay = productCount === 0 ? '—' : productCount === 1 ? '1 item' : `${productCount} items`;
  const productsFullText = useMemo(() => {
    if (!po.product_details || po.product_details.length === 0) return 'No products';
    return po.product_details.map(p => p.name).join(', ');
  }, [po.product_details]);

  const totalQuantity = useMemo(() => {
    if (po.quantity) return po.quantity;
    if (!po.product_details || po.product_details.length === 0) return 0;
    return po.product_details.reduce((sum, p) => sum + (p.quantity || 0), 0);
  }, [po.quantity, po.product_details]);

  const unit = po.unit || po.product_details?.[0]?.unit || 'pcs';

  const upcomingMilestone = useMemo(() => {
    if (!po.upcoming_milestones || po.upcoming_milestones.length === 0) return null;
    const sorted = [...po.upcoming_milestones].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    const milestone = sorted[0];
    if (!milestone) return null;
    const dueDate = new Date(milestone.due_date);
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    let urgency = 'normal';
    if (diffDays < 0) urgency = 'critical';
    else if (diffDays <= 3) urgency = 'warning';
    else if (diffDays <= 7) urgency = 'upcoming';
    return { ...milestone, urgency, isOverdue: diffDays < 0, daysUntilDue: diffDays, formattedDate: dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) };
  }, [po.upcoming_milestones]);

  const isMobile = useIsMobile();

  const handleRowClick = () => onClick?.(po);
  const handleApprove = (e) => { e.stopPropagation(); onApprove?.(po); };
  const handleReject = (e) => { e.stopPropagation(); onReject?.(po); };
  const handleInitiate = (e) => { e.stopPropagation(); initiatePO?.(); };
  const handleView = (e) => { e.stopPropagation(); onClick?.(po); };
  const handleRegenerate = (e) => { e.stopPropagation(); onRegenerate?.(po); };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onSelectChange?.(po, e.target.checked);
  };

  const checkboxCell = selectMode ? (
    <div className={styles.colSelect} onClick={(e) => e.stopPropagation()}>
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id={`select-tip-${po.id}`}>
            {selectMode === 'disabled-mismatch'
              ? (disabledReason || 'Mixed selection — clear current selection to switch')
              : 'Select for bulk action'}
          </Tooltip>
        }
      >
        <input
          type="checkbox"
          checked={isSelected}
          disabled={selectMode === 'disabled-mismatch'}
          onChange={handleCheckboxChange}
          aria-label={`Select PO ${po.po_number}`}
        />
      </OverlayTrigger>
    </div>
  ) : (
    <div className={styles.colSelect} aria-hidden="true" />
  );

  if (isMobile) {
    return (
      <div className={`${styles.mobileCard} ${showApprovalActions ? styles.userAction : ''}`} onClick={handleRowClick}>
        <div className={styles.mobileCardTop}>
          {selectMode && (
            <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6 }}>
              <input
                type="checkbox"
                checked={isSelected}
                disabled={selectMode === 'disabled-mismatch'}
                onChange={handleCheckboxChange}
                style={{ width: 16, height: 16, accentColor: '#1a56db', cursor: selectMode === 'disabled-mismatch' ? 'not-allowed' : 'pointer' }}
                aria-label={`Select PO ${po.po_number}`}
              />
            </span>
          )}
          <Badge bg={currentStatus.variant} className={styles.statusBadge}>{currentStatus.label}</Badge>
          <span className={styles.poNum}>#{po.po_number}</span>
        </div>
        {pendingAtCaption && (
          <div
            className={styles.pendingAtCaption}
            style={{ padding: '2px 0 4px' }}
            title={pendingAtTooltip}
          >
            <span className={styles.pendingAtLabel}>Pending at:</span>{' '}
            <span className={styles.pendingAtName}>{pendingAtCaption}</span>
          </div>
        )}
        <div className={styles.mobileCardMiddle}>
          <div className={styles.mobileVendor}>{po.finalized_vendor_name || 'No vendor'}</div>
          <div className={styles.mobileValueRow}>
            <span className={styles.mobileValue}>₹{addCommasToNumber(displayedTotal)}</span>
            {totalQuantity > 0 && <span className={styles.mobileQty}>{parseFloat(Number(totalQuantity).toFixed(2))} {unit}</span>}
          </div>
        </div>
        <div className={styles.mobileCardActions}>
          {showApprovalActions ? (
            <>
              <button className={styles.approveBtn} onClick={handleApprove}>
                <MdCheck size={16} /> Approve
              </button>
              <button className={styles.rejectBtn} onClick={handleReject}>
                <MdClose size={16} /> Reject
              </button>
            </>
          ) : isDraft && initiatePO ? (
            <button className={styles.initiateBtn} onClick={handleInitiate}>Initiate PO</button>
          ) : (
            <>
              <button className={styles.viewBtn} onClick={handleView}>
                <IoMdEye size={14} /> View PO
              </button>
              {onRegenerate && !isDraft && (
                <button className={styles.viewBtn} onClick={handleRegenerate}>
                  <BsArrowRepeat size={14} /> Regenerate
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.poRow} ${currentStatus.requiresAction ? styles.requiresAction : ''} ${isDraft ? styles.isDraft : ''} ${isApproved ? styles.isApproved : ''} ${showApprovalActions ? styles.userAction : ''} ${currentStatus.isVendorRejected ? styles.isRejected : ''}`}
      onClick={handleRowClick}
    >
      {checkboxCell}
      <div className={styles.colStatus}>
        <Badge bg={currentStatus.variant} className={styles.statusBadge}>{currentStatus.label}</Badge>
        {pendingAtCaption && (
          <OverlayTrigger placement="top" overlay={<Tooltip id={`pending-at-${po.id}`}>{pendingAtTooltip}</Tooltip>}>
            <div className={styles.pendingAtCaption}>
              <span className={styles.pendingAtLabel}>Pending at:</span>{' '}
              <span className={styles.pendingAtName}>{pendingAtCaption}</span>
            </div>
          </OverlayTrigger>
        )}
      </div>

      <div className={styles.colPoNumber}>
        <div className={styles.poNum}>{po.po_number}</div>
        {po.project_details?.name && <div className={styles.projectName} title={po.project_details.name}>{po.project_details.name}</div>}
      </div>

      <div className={styles.colPending}>
        {waitInfo ? (
          <OverlayTrigger placement="top" overlay={<Tooltip id={`wait-${po.id}`}>Since: {waitInfo.fullDateTime}</Tooltip>}>
            <span className={styles[`urgency${waitInfo.urgency}`]}>
              {waitInfo.displayText}
              {waitInfo.isCritical && <FiAlertTriangle size={12} className={styles.alertIcon} />}
            </span>
          </OverlayTrigger>
        ) : <span className={styles.waitEmpty}>—</span>}
      </div>

      <div className={styles.colVendor} title={po.finalized_vendor_name || 'No vendor'}>{po.finalized_vendor_name || 'No vendor'}</div>

      <OverlayTrigger placement="top" overlay={<Tooltip id={`products-${po.id}`}>{productsFullText}</Tooltip>}>
        <div className={styles.colProducts}>
          {productsDisplay}
          {upcomingMilestone && (
            <OverlayTrigger placement="top" overlay={
              <Tooltip id={`milestone-${po.id}`}>
                {upcomingMilestone.isOverdue ? 'OVERDUE: ' : 'Due: '}{upcomingMilestone.milestone_name} ({upcomingMilestone.formattedDate})
                {upcomingMilestone.isOverdue ? ` - ${Math.abs(upcomingMilestone.daysUntilDue)}d overdue` : upcomingMilestone.daysUntilDue <= 7 ? ` - ${upcomingMilestone.daysUntilDue}d left` : ''}
              </Tooltip>
            }>
              <span className={`${styles.milestoneIndicator} ${styles[`milestone${upcomingMilestone.urgency.charAt(0).toUpperCase() + upcomingMilestone.urgency.slice(1)}`]}`}>
                {upcomingMilestone.isOverdue ? '⚠️' : upcomingMilestone.urgency === 'warning' ? '🔔' : '📅'}
              </span>
            </OverlayTrigger>
          )}
        </div>
      </OverlayTrigger>

      <div className={styles.colQuantity}>
        {totalQuantity > 0 ? (<><span className={styles.qtyNumber}>{parseFloat(Number(totalQuantity).toFixed(2))}</span><span className={styles.qtyUnit}>{unit}</span></>) : '—'}
      </div>

      <div className={styles.colValue}>₹{addCommasToNumber(displayedTotal)}</div>

      <OverlayTrigger placement="top" overlay={<Tooltip id={`initiator-${po.id}`}>{po.initiated_by || 'Unknown'}</Tooltip>}>
        <div className={styles.colInitiator}><FiUser size={14} /></div>
      </OverlayTrigger>

      <OverlayTrigger placement="top" overlay={<Tooltip id={`created-${po.id}`}>{createdInfo.fullDateTime}</Tooltip>}>
        <div className={styles.colDate}>{createdInfo.relative}</div>
      </OverlayTrigger>

      <div className={styles.colActions}>
        {showApprovalActions ? (
          <>
            <OverlayTrigger placement="top" overlay={<Tooltip id={`approve-tip-${po.id}`}>Approve</Tooltip>}>
              <button className={`${styles.iconBtn} ${styles.iconBtnSuccess}`} onClick={handleApprove} id={`approve_po_${po.id}-po_actions-po_listing`}>
                <MdCheck size={18} />
              </button>
            </OverlayTrigger>
            <OverlayTrigger placement="top" overlay={<Tooltip id={`reject-tip-${po.id}`}>Reject</Tooltip>}>
              <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={handleReject} id={`reject_po_${po.id}-po_actions-po_listing`}>
                <MdClose size={18} />
              </button>
            </OverlayTrigger>
          </>
        ) : isDraft ? (
          initiatePO ? (
            <OverlayTrigger placement="top" overlay={<Tooltip id={`initiate-tip-${po.id}`}>Initiate Purchase Order</Tooltip>}>
              <button className={styles.iconBtn} onClick={handleInitiate}>
                <BsArrowRepeat size={15} />
              </button>
            </OverlayTrigger>
          ) : (
            <OverlayTrigger placement="top" overlay={<Tooltip id={`initiate-disabled-${po.id}`}>Only members with write access can initiate a Purchase Order</Tooltip>}>
              <span>
                <button className={styles.iconBtn} disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                  <BsArrowRepeat size={15} />
                </button>
              </span>
            </OverlayTrigger>
          )
        ) : (
          <>
            <OverlayTrigger placement="top" overlay={<Tooltip id={`view-tip-${po.id}`}>View PO</Tooltip>}>
              <button className={styles.iconBtn} onClick={handleView} id={`view_po_${po.id}-po_actions-po_listing`}>
                <IoMdEye size={18} />
              </button>
            </OverlayTrigger>
            {po.poPdfUrl && (
              <OverlayTrigger placement="top" overlay={<Tooltip id={`pdf-tip-${po.id}`}>View PDF</Tooltip>}>
                <a href={po.poPdfUrl} target="_blank" rel="noopener noreferrer" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={(e) => e.stopPropagation()}>
                  <BsFilePdf size={16} />
                </a>
              </OverlayTrigger>
            )}
            {onRegenerate && (
              <OverlayTrigger placement="top" overlay={<Tooltip id={`regen-tip-${po.id}`}>Regenerate PO</Tooltip>}>
                <button className={`${styles.iconBtn} ${styles.iconBtnSuccess}`} onClick={handleRegenerate} id={`regenerate_po_${po.id}-po_actions-po_listing`}>
                  <BsArrowRepeat size={16} />
                </button>
              </OverlayTrigger>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default POCard;
