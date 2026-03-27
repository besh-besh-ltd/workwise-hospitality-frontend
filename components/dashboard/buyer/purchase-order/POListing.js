import { getCompanyUsers } from "@/services/Auth";
import { handlePOApproval } from "@/services/po";
import useDebounce, { addCommasToNumber, formatDisplayDate } from "@/utils/sharedFunctions";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import Pagination from "@/components/shared/Pagination";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import POCard from "./POCard";
import ApproveModal from "./ApproveModal";
import useIsMobile from "@/hooks/useIsMobile";
import { BsFunnel } from "react-icons/bs";
import cardStyles from "./POCard.module.scss";

const statusVariants = {
  pending_approval: "warning",
  approved: "success",
  cancelled: "danger",
  rejected: "danger",
  invoice_raised: "success",
  dispatched: "success",
  GRN: "success"
};

const filterInputStyle = { padding: '7px 12px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#1a2730', outline: 'none', width: '100%' };
const filterLabelStyle = { fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' };

const FilterBar = ({ filters, setFilters, resetFilters, companyUsers, statusVariants }) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const filterFields = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
        <span style={filterLabelStyle}>PO Number</span>
        <input type="text" value={filters.poNumber} placeholder="Search..." style={filterInputStyle}
          onChange={(e) => setFilters({ ...filters, poNumber: e.target.value })} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
        <span style={filterLabelStyle}>Initiated By</span>
        <select value={filters.initiatedBy} style={filterInputStyle}
          onChange={(e) => setFilters({ ...filters, initiatedBy: e.target.value })}>
          <option value="">All</option>
          {companyUsers && companyUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
        <span style={filterLabelStyle}>Status</span>
        <select value={filters.status} style={filterInputStyle}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All</option>
          {Object.keys(statusVariants).map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
        <span style={filterLabelStyle}>From</span>
        <input type="date" value={filters.dateFrom} style={filterInputStyle}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
        <span style={filterLabelStyle}>To</span>
        <input disabled={!filters.dateFrom} type="date" min={filters.dateFrom} value={filters.dateTo}
          style={{ ...filterInputStyle, background: !filters.dateFrom ? '#f1f5f9' : '#fff' }}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setOpen(!open)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#495057', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}>
            <BsFunnel size={13} /> Filters {open ? '▲' : '▼'}
          </button>
          <button onClick={resetFilters} id="clear_filters-po_listing-purchase_order_page"
            style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, color: '#6c757d', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
            Clear
          </button>
        </div>
        {open && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, padding: 12, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            {filterFields}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: '14px 16px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 16 }}>
      {filterFields}
      <button onClick={resetFilters} id="clear_filters-po_listing-purchase_order_page"
        style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#6c757d', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
        Clear
      </button>
    </div>
  );
};

const POListing = ({
  poList = [],
  totalData = 0,
  refetchPOList,
  rfq_id,
  handlePODecision,
  handleInitiatePO,
  onSelect,
  onEdit,
  companyUsers,
  approvalLevel,
  canWrite,
  canApprove,
}) => {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showGRNUpdateModal, setShowGRNUpdateModal] = useState(false);
  const [pendingPO, setPendingPO] = useState(null);

  const [filters, setFilters] = useState({
    poNumber: "",
    initiatedBy: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    page: 1,
    limit: 10,
  });

  const debouncedPONumber = useDebounce(filters.poNumber, 700);

  const handleApproveClick = (po) => {
    setPendingPO(po);
    setShowApproveModal(true);
  };

  const handleRejectClick = (po) => {
    // Skip confirmation modal, go directly to remarks modal via parent
    if (handlePODecision) handlePODecision(po.id, { type: "approval", decision: "rejected" }, po);
  };

  const handleMarkGRNConfirm = async () => {
    if (pendingPO) {
      await handlePODecision(pendingPO.id, { type: "grn_update" }, pendingPO);
      setShowGRNUpdateModal(false);
      setPendingPO(null);
      resetFilters();
    }
  };

  const handleMarkGRNClick = (po) => {
    setPendingPO(po);
    setShowGRNUpdateModal(true);
  };

  const handleApproveCancel = () => { setShowApproveModal(false); setPendingPO(null); };
  const handleMarkDispatchedCancel = () => { setShowGRNUpdateModal(false); setPendingPO(null); };

  const resetFilters = () => setFilters({ poNumber: "", initiatedBy: "", status: "", dateFrom: "", dateTo: "", page: 1, limit: 10 });

  useEffect(() => {
    refetchPOList({ ...filters, poNumber: debouncedPONumber });
  }, [debouncedPONumber, filters.initiatedBy, filters.status, filters.dateFrom, filters.dateTo, filters.page, filters.limit]);

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0" style={{ fontSize: '16px', fontWeight: 700, color: '#1a2730' }}>
          Purchase Orders
          <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 400, marginLeft: 8 }}>({totalData})</span>
        </h4>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        resetFilters={resetFilters}
        companyUsers={companyUsers}
        statusVariants={statusVariants}
      />

      {/* PO Table Rows */}
      <div className={cardStyles.rowContainer}>
        {/* Header Row */}
        <div className={cardStyles.headerRow}>
          <div className={cardStyles.colStatus}>Status</div>
          <div className={cardStyles.colPoNumber}>PO #</div>
          <div className={cardStyles.colPending}>Waiting</div>
          <div className={cardStyles.colVendor}>Vendor</div>
          <div className={cardStyles.colProducts}>Items</div>
          <div className={cardStyles.colQuantity}>Qty</div>
          <div className={cardStyles.colValue}>Value</div>
          <div className={cardStyles.colInitiator}>By</div>
          <div className={cardStyles.colDate}>Created</div>
          <div className={cardStyles.colActions}>Actions</div>
        </div>

        {poList.length === 0 ? (
          <div className={cardStyles.emptyRow}>No purchase orders found.</div>
        ) : (
          poList.map((po) => (
            <POCard
              key={po.id}
              po={po}
              onClick={() => onSelect(po.id)}
              onApprove={canWrite ? handleApproveClick : undefined}
              onReject={canWrite ? handleRejectClick : undefined}
              initiatePO={canWrite && handleInitiatePO ? () => handleInitiatePO(po.id) : undefined}
            />
          ))
        )}
      </div>

      {poList.length > 0 && (
        <div style={{ marginTop: 16 }}>
        <Pagination
          page={filters.page}
          setPage={(page) => setFilters((prev) => ({ ...prev, page }))}
          limit={filters.limit}
          setLimit={(limit) => setFilters((prev) => ({ ...prev, limit }))}
          totalData={totalData}
        />
        </div>
      )}

      {/* Modals */}
      <ApproveModal
        show={showApproveModal}
        onClose={handleApproveCancel}
        onApprove={async (remarks) => {
          if (pendingPO && handlePODecision) {
            await handlePODecision(pendingPO.id, { type: "approval", decision: "approved", remarks }, pendingPO);
          }
          setShowApproveModal(false);
          setPendingPO(null);
        }}
        poNumber={pendingPO?.po_number}
        poPdfUrl={pendingPO?.poPdfUrl}
      />
      <ConfirmationModal
        isOpen={showGRNUpdateModal} onClose={handleMarkDispatchedCancel} onConfirm={handleMarkGRNConfirm}
        title="Mark GRN for this PO"
        description={`Are you sure you want to mark GRN for PO #${pendingPO?.po_number || "this purchase order"}?\nThis action will mark the status for this PO as GRN ( Goods Reciept Note ), That will indicate that the goods has been delivered to the site.`}
        customFooter={`This Action Cannot be Reversed!`}
        confirmButtonColor="success" confirmButtonText="Yes, Go Ahead" cancelButtonText="No, Cancel It"
      />
    </div>
  );
};

export default POListing;
