import React, { useMemo } from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { MdCheck, MdClose } from 'react-icons/md';
import { IoMdEye } from 'react-icons/io';
import { FiAlertTriangle, FiUser } from 'react-icons/fi';
import { BsFilePdf } from 'react-icons/bs';
import { addCommasToNumber } from '@/utils/sharedFunctions';
import useIsMobile from '@/hooks/useIsMobile';
import styles from './POCard.module.scss';

const POCard = ({
  po,
  onClick,
  onApprove,
  onReject,
  initiatePO
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

  if (isMobile) {
    return (
      <div className={`${styles.mobileCard} ${showApprovalActions ? styles.userAction : ''}`} onClick={handleRowClick}>
        <div className={styles.mobileCardTop}>
          <Badge bg={currentStatus.variant} className={styles.statusBadge}>{currentStatus.label}</Badge>
          <span className={styles.poNum}>#{po.po_number}</span>
        </div>
        <div className={styles.mobileCardMiddle}>
          <div className={styles.mobileVendor}>{po.finalized_vendor_name || 'No vendor'}</div>
          <div className={styles.mobileValueRow}>
            <span className={styles.mobileValue}>₹{addCommasToNumber(po.total_value)}</span>
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
            <button className={styles.viewBtn} onClick={handleView}>
              <IoMdEye size={14} /> View PO
            </button>
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
      <div className={styles.colStatus}>
        <Badge bg={currentStatus.variant} className={styles.statusBadge}>{currentStatus.label}</Badge>
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

      <div className={styles.colValue}>₹{addCommasToNumber(po.total_value)}</div>

      <OverlayTrigger placement="top" overlay={<Tooltip id={`initiator-${po.id}`}>{po.initiated_by || 'Unknown'}</Tooltip>}>
        <div className={styles.colInitiator}><FiUser size={14} /></div>
      </OverlayTrigger>

      <OverlayTrigger placement="top" overlay={<Tooltip id={`created-${po.id}`}>{createdInfo.fullDateTime}</Tooltip>}>
        <div className={styles.colDate}>{createdInfo.relative}</div>
      </OverlayTrigger>

      <div className={styles.colActions}>
        {showApprovalActions ? (
          <>
            <button className={styles.approveBtn} onClick={handleApprove} title="Approve this PO" id={`approve_po_${po.id}-po_actions-po_listing`}>
              <MdCheck size={14} /><span>Approve</span>
            </button>
            <button className={styles.rejectBtn} onClick={handleReject} title="Reject this PO" id={`reject_po_${po.id}-po_actions-po_listing`}>
              <MdClose size={14} /><span>Reject</span>
            </button>
          </>
        ) : isDraft ? (
          initiatePO ? (
            <button className={styles.initiateBtn} onClick={handleInitiate} title="Initiate this PO">Initiate Purchase Order</button>
          ) : (
            <OverlayTrigger placement="top" overlay={<Tooltip id={`initiate-disabled-${po.id}`}>Only members with write access can initiate a Purchase Order</Tooltip>}>
              <span>
                <button className={styles.initiateBtn} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Initiate Purchase Order</button>
              </span>
            </OverlayTrigger>
          )
        ) : (
          <>
            <button className={styles.viewBtn} onClick={handleView} title="View Details" id={`view_po_${po.id}-po_actions-po_listing`}>
              <IoMdEye size={14} /><span>View PO</span>
            </button>
            {po.poPdfUrl && (
              <a href={po.poPdfUrl} target="_blank" rel="noopener noreferrer" className={styles.pdfBtn} onClick={(e) => e.stopPropagation()} title="View PO PDF">
                <BsFilePdf size={14} /><span>View PDF</span>
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default POCard;
