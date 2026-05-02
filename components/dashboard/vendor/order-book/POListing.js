import useDebounce, { addCommasToNumber, formatDisplayDate } from "@/utils/sharedFunctions";
import React, { useEffect, useState } from "react";
import Pagination from "@/components/shared/Pagination";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import { Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import { IoMdEye } from "react-icons/io";
import { FiSend } from "react-icons/fi";
import { FaTruckRampBox } from "react-icons/fa6";
import { BsFilePdf } from "react-icons/bs";
import { MdCheck, MdClose } from "react-icons/md";
import { toast } from "react-toastify";
import cardStyles from "@/components/dashboard/buyer/purchase-order/POCard.module.scss";
import styles from "@/components/dashboard/buyer/purchase-order/PurchaseOrder.module.scss";

const statusVariants = {
  acceptance_pending: "warning",
  approved: "success",
  sent: "primary",
  invoice_raised: "success",
  dispatched: "success",
  GRN: "success",
  rejected_by_vendor: "danger"
};

const statusLabels = {
  acceptance_pending: "Awaiting",
  approved: "Accepted",
  sent: "Sent",
  invoice_raised: "Invoice",
  dispatched: "Dispatched",
  GRN: "GRN",
  rejected_by_vendor: "Rejected",
};

const filterInputStyle = { padding: '7px 12px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#1a2730', outline: 'none', width: '100%' };
const filterLabelStyle = { fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' };

const formatISTDate = (utcString) => formatDisplayDate(utcString, { includeTime: true });

const getRelativeTime = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
};

const POListing = ({
  poList = [],
  totalData = 0,
  refetchPOList,
  rfq_id,
  handleProgressStatus,
  handleInitiatePO,
  onSelect,
  companyUsers,
  approvalLevel,
  onAcceptPO,
  onRejectPO,
}) => {
  const [showRaiseInvoiceModal, setShowRaiseInvoiceModal] = useState(false);
  const [showMarkDispatchedModal, setShowMarkDispatchedModal] = useState(false);
  const [pendingPO, setPendingPO] = useState(null);

  const [filters, setFilters] = useState({
    poNumber: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    page: 1,
    limit: 10,
  });

  const debouncedPONumber = useDebounce(filters.poNumber, 700);

  const handleRaiseInvoiceClick = (po) => {
    setPendingPO(po);
    setShowRaiseInvoiceModal(true);
  };

  const handleMarkDispatchClick = (po) => {
    setPendingPO(po);
    setShowMarkDispatchedModal(true);
  };

  const handleApproveConfirm = async () => {
    if (pendingPO) {
      await handleProgressStatus(pendingPO.id, { type: "invoice" }, pendingPO);
      setShowRaiseInvoiceModal(false);
      setPendingPO(null);
      resetFilters();
    }
  };

  const handleMarkDispatchedConfirm = async () => {
    if (pendingPO) {
      await handleProgressStatus(pendingPO.id, { type: "dispatch" }, pendingPO);
      setShowMarkDispatchedModal(false);
      setPendingPO(null);
      resetFilters();
    }
  };

  const resetFilters = () =>
    setFilters({ poNumber: "", status: "", dateFrom: "", dateTo: "", page: 1, limit: 10 });

  useEffect(() => {
    refetchPOList({ ...filters, poNumber: debouncedPONumber });
  }, [debouncedPONumber, filters.status, filters.dateFrom, filters.dateTo, filters.page, filters.limit]);

  return (
    <div>
      <div className={styles.listingHeader}>
        <h4 className={styles.listingTitle}>
          Order Book
          <span className={styles.listingCount}>({totalData})</span>
        </h4>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup} style={{ flex: 1, minWidth: 0 }}>
          <span style={filterLabelStyle}>PO Number</span>
          <input type="text" value={filters.poNumber} placeholder="Search..." style={filterInputStyle}
            onChange={(e) => setFilters({ ...filters, poNumber: e.target.value })} />
        </div>
        <div className={styles.filterGroup} style={{ flex: 1, minWidth: 0 }}>
          <span style={filterLabelStyle}>Status</span>
          <select value={filters.status} style={filterInputStyle}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All</option>
            {Object.keys(statusVariants).map((s) => (
              <option key={s} value={s}>{statusLabels[s] || s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup} style={{ flex: 1, minWidth: 0 }}>
          <span style={filterLabelStyle}>From</span>
          <input type="date" value={filters.dateFrom} style={filterInputStyle}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
        </div>
        <div className={styles.filterGroup} style={{ flex: 1, minWidth: 0 }}>
          <span style={filterLabelStyle}>To</span>
          <input type="date" value={filters.dateTo} style={filterInputStyle}
            min={filters.dateFrom} disabled={!filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <button onClick={resetFilters} className={styles.filterClearBtn}>Clear</button>
        </div>
      </div>

      {/* Table-Row Layout (matches buyer POCard.module.scss) */}
      <div className={cardStyles.rowContainer}>
        {/* Header */}
        <div className={cardStyles.headerRow}>
          <div className={cardStyles.colStatus}>Status</div>
          <div className={cardStyles.colPoNumber}>PO #</div>
          <div className={cardStyles.colVendor} style={{ flex: 1 }}>Buyer</div>
          <div className={cardStyles.colProducts}>Items</div>
          <div className={cardStyles.colQuantity}>Qty</div>
          <div className={cardStyles.colValue}>Value</div>
          <div className={cardStyles.colDate} style={{ width: 90 }}>Created</div>
          <div className={cardStyles.colActions}>Actions</div>
        </div>

        {/* Rows */}
        {poList.length === 0 ? (
          <div className={cardStyles.emptyRow}>No purchase orders found.</div>
        ) : (
          poList.map((po) => {
            const isAcceptancePending = po.status === 'acceptance_pending';
            const isRejectedByVendor = po.status === 'rejected_by_vendor';
            const showRaiseInvoice = po.status === 'approved';
            const showDispatch = po.status === 'invoice_raised';

            const rowClass = [
              cardStyles.poRow,
              isAcceptancePending ? cardStyles.userAction : '',
              isRejectedByVendor ? cardStyles.isRejected : '',
              po.status === 'approved' ? cardStyles.isApproved : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={po.id}
                className={rowClass}
                onClick={() => onSelect(po.id)}
              >
                <div className={cardStyles.colStatus}>
                  <Badge bg={statusVariants[po.status] || 'secondary'} className={cardStyles.statusBadge}>
                    {statusLabels[po.status] || po.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className={cardStyles.colPoNumber}>
                  <span className={cardStyles.poNum}>{po.po_number}</span>
                </div>
                <div className={cardStyles.colVendor} style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 700, color: '#212529' }}>{po.initiated_by || '-'}</span>
                  {po.buyer_company_name && (
                    <span style={{ color: '#6c757d' }}> on behalf of <span style={{ fontWeight: 600, color: '#495057' }}>{po.buyer_company_name}</span></span>
                  )}
                </div>
                <div className={cardStyles.colProducts}>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip>
                        {po.product_details?.map(p => p.name).join(', ') || 'N/A'}
                      </Tooltip>
                    }
                  >
                    <span>{po.product_details?.length || 0} item{(po.product_details?.length || 0) !== 1 ? 's' : ''}</span>
                  </OverlayTrigger>
                </div>
                <div className={cardStyles.colQuantity}>
                  <span className={cardStyles.qtyNumber}>{po.quantity}</span>
                  <span className={cardStyles.qtyUnit}>{po.unit || 'nos'}</span>
                </div>
                <div className={cardStyles.colValue}>
                  ₹{addCommasToNumber(po.total_value)}
                </div>
                <div className={cardStyles.colDate} style={{ width: 90 }}>
                  <OverlayTrigger placement="top" overlay={<Tooltip>{formatISTDate(po.created_at)}</Tooltip>}>
                    <span>{getRelativeTime(po.created_at)}</span>
                  </OverlayTrigger>
                </div>
                <div className={cardStyles.colActions}>
                  {isAcceptancePending ? (
                    <>
                      <OverlayTrigger placement="top" overlay={<Tooltip id={`accept-tip-${po.id}`}>Accept PO</Tooltip>}>
                        <button className={`${cardStyles.iconBtn} ${cardStyles.iconBtnSuccess}`}
                          onClick={(e) => { e.stopPropagation(); onAcceptPO(po); }}>
                          <MdCheck size={18} />
                        </button>
                      </OverlayTrigger>
                      <OverlayTrigger placement="top" overlay={<Tooltip id={`reject-tip-${po.id}`}>Reject PO</Tooltip>}>
                        <button className={`${cardStyles.iconBtn} ${cardStyles.iconBtnDanger}`}
                          onClick={(e) => { e.stopPropagation(); onRejectPO(po); }}>
                          <MdClose size={18} />
                        </button>
                      </OverlayTrigger>
                    </>
                  ) : showRaiseInvoice ? (
                    <OverlayTrigger placement="top" overlay={<Tooltip id={`invoice-tip-${po.id}`}>Raise Invoice</Tooltip>}>
                      <button className={`${cardStyles.iconBtn} ${cardStyles.iconBtnSuccess}`}
                        onClick={(e) => { e.stopPropagation(); handleRaiseInvoiceClick(po); }}>
                        <FiSend size={16} />
                      </button>
                    </OverlayTrigger>
                  ) : showDispatch ? (
                    <OverlayTrigger placement="top" overlay={<Tooltip id={`dispatch-tip-${po.id}`}>Mark Dispatched</Tooltip>}>
                      <button className={`${cardStyles.iconBtn} ${cardStyles.iconBtnSuccess}`}
                        onClick={(e) => { e.stopPropagation(); handleMarkDispatchClick(po); }}>
                        <FaTruckRampBox size={16} />
                      </button>
                    </OverlayTrigger>
                  ) : (
                    <OverlayTrigger placement="top" overlay={<Tooltip id={`view-tip-${po.id}`}>View PO</Tooltip>}>
                      <button className={cardStyles.iconBtn}
                        onClick={(e) => { e.stopPropagation(); onSelect(po.id); }}>
                        <IoMdEye size={18} />
                      </button>
                    </OverlayTrigger>
                  )}
                  {po.poPdfUrl && (
                    <OverlayTrigger placement="top" overlay={<Tooltip id={`pdf-tip-${po.id}`}>View PDF</Tooltip>}>
                      <a href={po.poPdfUrl} target="_blank" rel="noopener noreferrer"
                        className={`${cardStyles.iconBtn} ${cardStyles.iconBtnDanger}`}
                        onClick={(e) => e.stopPropagation()}>
                        <BsFilePdf size={16} />
                      </a>
                    </OverlayTrigger>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3">
        {poList.length > 0 && (
          <Pagination
            page={filters.page}
            setPage={(page) => setFilters((prev) => ({ ...prev, page }))}
            limit={filters.limit}
            setLimit={(limit) => setFilters((prev) => ({ ...prev, limit }))}
            totalData={totalData}
          />
        )}
      </div>

      {/* Raise Invoice Confirmation */}
      <ConfirmationModal
        isOpen={showRaiseInvoiceModal}
        onClose={() => { setShowRaiseInvoiceModal(false); setPendingPO(null); }}
        onConfirm={handleApproveConfirm}
        title="Raise Invoice"
        description={`Are you sure you want to raise invoice for PO #${pendingPO?.po_number || ''}?`}
        confirmButtonColor="success"
        confirmButtonText="Yes, Raise Invoice"
        cancelButtonText="Cancel"
      />

      {/* Mark Dispatched Confirmation */}
      <ConfirmationModal
        isOpen={showMarkDispatchedModal}
        onClose={() => { setShowMarkDispatchedModal(false); setPendingPO(null); }}
        onConfirm={handleMarkDispatchedConfirm}
        title="Mark as Dispatched"
        description={`Are you sure you want to mark PO #${pendingPO?.po_number || ''} as dispatched?`}
        confirmButtonColor="success"
        confirmButtonText="Yes, Mark Dispatched"
        cancelButtonText="Cancel"
      />
    </div>
  );
};

export default POListing;
