import { getCompanyUsers } from "@/services/Auth";
import { handlePOApproval, handlePOInitialization, handleRegeneratePO, handleUploadPODocument, mergeDraftPOs } from "@/services/po";
import RegeneratePOModal from "./RegeneratePOModal";
import { toast } from "react-toastify";
import useDebounce, { addCommasToNumber, formatDisplayDate } from "@/utils/sharedFunctions";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import Pagination from "@/components/shared/Pagination";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import POCard from "./POCard";
import ApproveModal from "./ApproveModal";
import useIsMobile from "@/hooks/useIsMobile";
import { BsFunnel, BsCheck2All, BsXLg } from "react-icons/bs";
import { MdCheck, MdPlayArrow, MdMergeType } from "react-icons/md";
import cardStyles from "./POCard.module.scss";

// Determine whether the current user can bulk-act on a PO from the listing,
// and which bulk mode that row belongs to. 'approve' covers awarding/comm-eval
// approvers whose step is currently pending; 'initiate' covers creators with
// write access who can move a draft into the approval pipeline.
const getRowBulkMode = (po, canWrite) => {
  if (po.status === 'pending_approval' && po.is_approver) return 'approve';
  if (po.status === 'draft' && canWrite) return 'initiate';
  return null;
};

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
  canRegenerate,
  canCreate = false,
}) => {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showGRNUpdateModal, setShowGRNUpdateModal] = useState(false);
  const [pendingPO, setPendingPO] = useState(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratePOId, setRegeneratePOId] = useState(null);
  const [regenerateLoading, setRegenerateLoading] = useState(false);

  // Bulk selection — Set of po.id; the active bulk mode is derived from the
  // mode of the first selected row. Mode-mismatched rows are blocked at
  // checkbox level so the set is always uniform-type.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [showBulkInitiateModal, setShowBulkInitiateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [bulkRejectRemarks, setBulkRejectRemarks] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);

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

  const handleRegenerateClick = (po) => {
    setRegeneratePOId(po.id);
    setShowRegenerateModal(true);
  };

  const handleRegenerate = async () => {
    setRegenerateLoading(true);
    try {
      await handleRegeneratePO(regeneratePOId);
      toast.success("PO document regenerated successfully!");
      setShowRegenerateModal(false);
      setRegeneratePOId(null);
      refetchPOList({ ...filters, poNumber: debouncedPONumber });
    } catch (error) {
      toast.error(error.message || "Failed to regenerate PO document");
    } finally {
      setRegenerateLoading(false);
    }
  };

  const handleUploadPO = async (file) => {
    setRegenerateLoading(true);
    try {
      await handleUploadPODocument(regeneratePOId, file);
      toast.success("PO document uploaded successfully!");
      setShowRegenerateModal(false);
      setRegeneratePOId(null);
      refetchPOList({ ...filters, poNumber: debouncedPONumber });
    } catch (error) {
      toast.error(error.message || "Failed to upload PO document");
    } finally {
      setRegenerateLoading(false);
    }
  };

  const handleApproveCancel = () => { setShowApproveModal(false); setPendingPO(null); };
  const handleMarkDispatchedCancel = () => { setShowGRNUpdateModal(false); setPendingPO(null); };

  const resetFilters = () => setFilters({ poNumber: "", initiatedBy: "", status: "", dateFrom: "", dateTo: "", page: 1, limit: 10 });

  // Map each visible PO to its row bulk-mode so we don't recompute per render.
  // Rows whose mode is null aren't selectable in this listing (e.g. acceptance_pending,
  // approved, rejected, cancelled, GRN, plus rows where this user isn't the approver).
  const rowModes = useMemo(() => {
    const map = new Map();
    for (const po of poList) map.set(po.id, getRowBulkMode(po, !!canWrite));
    return map;
  }, [poList, canWrite]);

  // Active bulk mode = mode of the first selected row that still exists in
  // the current page. If nothing is selected, mode is null and both groups
  // are individually eligible (user picks one by clicking).
  const activeMode = useMemo(() => {
    for (const po of poList) {
      if (selectedIds.has(po.id)) {
        const m = rowModes.get(po.id);
        if (m) return m;
      }
    }
    return null;
  }, [poList, rowModes, selectedIds]);

  const selectedPOs = useMemo(
    () => poList.filter(po => selectedIds.has(po.id)),
    [poList, selectedIds]
  );

  // Header "select all" only operates on rows matching activeMode (when a mode
  // is locked) or all rows of the dominant available mode (when nothing is
  // selected yet — approve takes precedence as it's the higher-stakes action).
  const headerSelectableMode = activeMode
    || (poList.some(po => rowModes.get(po.id) === 'approve') ? 'approve'
      : poList.some(po => rowModes.get(po.id) === 'initiate') ? 'initiate'
      : null);

  const headerEligibleIds = useMemo(() => {
    if (!headerSelectableMode) return [];
    return poList.filter(po => rowModes.get(po.id) === headerSelectableMode).map(po => po.id);
  }, [poList, rowModes, headerSelectableMode]);

  const allHeaderEligibleSelected =
    headerEligibleIds.length > 0 && headerEligibleIds.every(id => selectedIds.has(id));

  const clearSelection = () => setSelectedIds(new Set());

  const handleSelectRow = (po, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(po.id);
      else next.delete(po.id);
      return next;
    });
  };

  const handleHeaderSelectAll = (checked) => {
    if (!headerSelectableMode) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        for (const id of headerEligibleIds) next.add(id);
      } else {
        for (const id of headerEligibleIds) next.delete(id);
      }
      return next;
    });
  };

  // Wipe selection whenever the visible result set changes. Stale IDs from a
  // previous page/filter would silently linger in the Set otherwise — confusing
  // when the user clicks "Approve 5" but only 2 are currently visible.
  useEffect(() => {
    clearSelection();
  }, [debouncedPONumber, filters.initiatedBy, filters.status, filters.dateFrom, filters.dateTo, filters.page, filters.limit]);

  const summariseBulkResult = (results, verb) => {
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    if (failed === 0) {
      toast.success(`${succeeded} PO${succeeded === 1 ? '' : 's'} ${verb} successfully`);
    } else if (succeeded === 0) {
      toast.error(`Failed to ${verb} any of the ${failed} selected PO${failed === 1 ? '' : 's'}`);
    } else {
      toast.warning(`${succeeded} ${verb}, ${failed} failed — see the listing for the latest state`);
    }
  };

  const runBulkApprove = async (remarks) => {
    const targets = poList.filter(po => selectedIds.has(po.id) && rowModes.get(po.id) === 'approve');
    if (targets.length === 0) return;
    setBulkProcessing(true);
    try {
      const results = await Promise.allSettled(
        targets.map(po =>
          handlePOApproval(po.id, { type: 'approval', decision: 'approved', remarks: remarks || '' })
        )
      );
      summariseBulkResult(results, 'approved');
    } finally {
      setBulkProcessing(false);
      setShowBulkApproveModal(false);
      clearSelection();
      refetchPOList({ ...filters, poNumber: debouncedPONumber });
    }
  };

  const runBulkReject = async () => {
    const targets = poList.filter(po => selectedIds.has(po.id) && rowModes.get(po.id) === 'approve');
    if (targets.length === 0) return;
    const remarks = bulkRejectRemarks.trim();
    if (!remarks) {
      toast.error('Please add remarks before rejecting');
      return;
    }
    setBulkProcessing(true);
    try {
      const results = await Promise.allSettled(
        targets.map(po =>
          handlePOApproval(po.id, { type: 'approval', decision: 'rejected', remarks })
        )
      );
      summariseBulkResult(results, 'rejected');
    } finally {
      setBulkProcessing(false);
      setShowBulkRejectModal(false);
      setBulkRejectRemarks('');
      clearSelection();
      refetchPOList({ ...filters, poNumber: debouncedPONumber });
    }
  };

  const runBulkInitiate = async () => {
    const targets = poList.filter(po => selectedIds.has(po.id) && rowModes.get(po.id) === 'initiate');
    if (targets.length === 0) return;
    setBulkProcessing(true);
    try {
      const results = await Promise.allSettled(
        targets.map(po => handlePOInitialization(po.id))
      );
      summariseBulkResult(results, 'initiated');
    } finally {
      setBulkProcessing(false);
      setShowBulkInitiateModal(false);
      clearSelection();
      refetchPOList({ ...filters, poNumber: debouncedPONumber });
    }
  };

  // Merge eligibility: every selected PO is a draft AND all share the same
  // finalized_vendor_id. This is the gate for the Merge button.
  const mergeEligibility = useMemo(() => {
    if (activeMode !== 'initiate') return { eligible: false, reason: null };
    const targets = poList.filter(po => selectedIds.has(po.id) && rowModes.get(po.id) === 'initiate');
    if (targets.length < 2) return { eligible: false, reason: 'Select at least 2 drafts to combine into one' };
    const vendorId = targets[0].finalized_vendor_id;
    const allSameVendor = targets.every(po => String(po.finalized_vendor_id) === String(vendorId));
    if (!allSameVendor) {
      return { eligible: false, reason: 'You can only combine drafts of the same vendor' };
    }
    return { eligible: true, targets, vendorName: targets[0].finalized_vendor_name || 'this vendor' };
  }, [activeMode, poList, selectedIds, rowModes]);

  const runMerge = async (keepPoId) => {
    const targets = mergeEligibility.targets || [];
    if (!keepPoId || targets.length < 2) return;
    const allIds = targets.map(p => p.id);
    setBulkProcessing(true);
    try {
      await mergeDraftPOs({ keep_po_id: keepPoId, po_ids: allIds });
      const folded = targets.length - 1;
      const keptPo = targets.find(p => p.id === keepPoId);
      toast.success(
        `Combined ${folded} draft${folded === 1 ? '' : 's'} into PO #${keptPo?.po_number || ''}. The other PO${folded === 1 ? '' : 's'} ${folded === 1 ? 'was' : 'were'} deleted.`
      );
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Could not combine these POs';
      toast.error(msg);
    } finally {
      setBulkProcessing(false);
      setShowMergeModal(false);
      clearSelection();
      refetchPOList({ ...filters, poNumber: debouncedPONumber });
    }
  };

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

      {/* Bulk action bar — appears only when there's a selection. Action set
          adapts to the locked mode: approve/reject for approvers, initiate for
          creators. Disabled while a bulk request is in flight. */}
      {selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap', padding: '10px 14px', marginBottom: 12,
            background: '#1a56db', color: '#fff', borderRadius: 10,
            boxShadow: '0 2px 8px rgba(26, 86, 219, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BsCheck2All size={18} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {selectedIds.size} selected
              {activeMode === 'approve' ? ' for approval' : activeMode === 'initiate' ? ' for initiation' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {activeMode === 'approve' && (
              <>
                <button
                  type="button"
                  disabled={bulkProcessing}
                  onClick={() => setShowBulkApproveModal(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', fontSize: 13, fontWeight: 600,
                    background: '#16a34a', color: '#fff', border: 'none',
                    borderRadius: 8, cursor: bulkProcessing ? 'wait' : 'pointer',
                    opacity: bulkProcessing ? 0.7 : 1,
                  }}
                >
                  <MdCheck size={16} /> Approve {selectedIds.size}
                </button>
                <button
                  type="button"
                  disabled={bulkProcessing}
                  onClick={() => setShowBulkRejectModal(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', fontSize: 13, fontWeight: 600,
                    background: '#dc2626', color: '#fff', border: 'none',
                    borderRadius: 8, cursor: bulkProcessing ? 'wait' : 'pointer',
                    opacity: bulkProcessing ? 0.7 : 1,
                  }}
                >
                  <BsXLg size={13} /> Reject {selectedIds.size}
                </button>
              </>
            )}
            {activeMode === 'initiate' && (
              <>
                <button
                  type="button"
                  disabled={bulkProcessing}
                  onClick={() => setShowBulkInitiateModal(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', fontSize: 13, fontWeight: 600,
                    background: '#fff', color: '#1a56db', border: 'none',
                    borderRadius: 8, cursor: bulkProcessing ? 'wait' : 'pointer',
                    opacity: bulkProcessing ? 0.7 : 1,
                  }}
                >
                  <MdPlayArrow size={16} /> Initiate {selectedIds.size}
                </button>
                {canCreate && selectedIds.size >= 2 && (
                  <button
                    type="button"
                    disabled={bulkProcessing || !mergeEligibility.eligible}
                    onClick={() => setShowMergeModal(true)}
                    title={mergeEligibility.eligible
                      ? `Combine ${selectedIds.size} drafts into one purchase order`
                      : (mergeEligibility.reason || 'Combine is only available when all drafts are for the same vendor')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', fontSize: 13, fontWeight: 600,
                      background: mergeEligibility.eligible ? '#7c3aed' : 'rgba(255,255,255,0.15)',
                      color: '#fff',
                      border: mergeEligibility.eligible ? 'none' : '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 8,
                      cursor: bulkProcessing
                        ? 'wait'
                        : (mergeEligibility.eligible ? 'pointer' : 'not-allowed'),
                      opacity: bulkProcessing || !mergeEligibility.eligible ? 0.65 : 1,
                    }}
                  >
                    <MdMergeType size={16} /> Combine {selectedIds.size} into one
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={clearSelection}
              disabled={bulkProcessing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', fontSize: 12, fontWeight: 600,
                background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 8, cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* PO Table Rows */}
      <div className={cardStyles.rowContainer}>
        {/* Header Row */}
        <div className={cardStyles.headerRow}>
          <div className={cardStyles.colSelect}>
            {headerSelectableMode ? (
              <input
                type="checkbox"
                checked={allHeaderEligibleSelected}
                onChange={(e) => handleHeaderSelectAll(e.target.checked)}
                aria-label={`Select all ${headerSelectableMode === 'approve' ? 'approvable' : 'initiatable'} POs on this page`}
                title={`Select all ${headerSelectableMode === 'approve' ? 'approvable' : 'initiatable'} POs on this page`}
              />
            ) : null}
          </div>
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
          poList.map((po) => {
            const rowMode = rowModes.get(po.id);
            // Compute select-mode prop for the row. Rows with no bulk mode get
            // null (empty cell). Rows whose mode matches activeMode (or no mode
            // is locked yet) get 'eligible'. Rows in the other mode while a
            // mode is locked get 'disabled-mismatch'.
            let selectMode = null;
            let disabledReason;
            if (rowMode) {
              if (!activeMode || rowMode === activeMode) {
                selectMode = 'eligible';
              } else {
                selectMode = 'disabled-mismatch';
                disabledReason = activeMode === 'approve'
                  ? 'Currently approving POs — clear selection to initiate drafts'
                  : 'Currently initiating drafts — clear selection to approve';
              }
            }
            return (
              <POCard
                key={po.id}
                po={po}
                onClick={() => onSelect(po.id)}
                onApprove={canWrite ? handleApproveClick : undefined}
                onReject={canWrite ? handleRejectClick : undefined}
                initiatePO={canWrite && handleInitiatePO ? () => handleInitiatePO(po.id) : undefined}
                onRegenerate={canRegenerate ? handleRegenerateClick : undefined}
                selectMode={selectMode}
                isSelected={selectedIds.has(po.id)}
                onSelectChange={handleSelectRow}
                disabledReason={disabledReason}
              />
            );
          })
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
      <RegeneratePOModal
        show={showRegenerateModal}
        onClose={() => { setShowRegenerateModal(false); setRegeneratePOId(null); }}
        onRegenerate={handleRegenerate}
        onUpload={handleUploadPO}
        isProcessing={regenerateLoading}
      />

      {/* Bulk Approve — confirmation with optional remarks. Remarks are applied
          to every PO in the batch (per-PO remarks would defeat the time-saving
          purpose of bulk action). */}
      <BulkApproveModal
        show={showBulkApproveModal}
        count={selectedPOs.filter(p => rowModes.get(p.id) === 'approve').length}
        previewNumbers={selectedPOs.filter(p => rowModes.get(p.id) === 'approve').map(p => p.po_number)}
        isProcessing={bulkProcessing}
        onCancel={() => setShowBulkApproveModal(false)}
        onConfirm={runBulkApprove}
      />

      {/* Bulk Reject — remarks required (matches single-PO reject UX). */}
      <BulkRejectModal
        show={showBulkRejectModal}
        count={selectedPOs.filter(p => rowModes.get(p.id) === 'approve').length}
        previewNumbers={selectedPOs.filter(p => rowModes.get(p.id) === 'approve').map(p => p.po_number)}
        remarks={bulkRejectRemarks}
        setRemarks={setBulkRejectRemarks}
        isProcessing={bulkProcessing}
        onCancel={() => { setShowBulkRejectModal(false); setBulkRejectRemarks(''); }}
        onConfirm={runBulkReject}
      />

      {/* Bulk Initiate — simple confirm; initiate is one-click in single mode too. */}
      <ConfirmationModal
        isOpen={showBulkInitiateModal}
        onClose={() => setShowBulkInitiateModal(false)}
        onConfirm={runBulkInitiate}
        title={`Initiate ${selectedIds.size} Purchase Order${selectedIds.size === 1 ? '' : 's'}?`}
        description={`Each selected PO will be moved into the approval pipeline. Approvers will be notified.\n\nPO numbers: ${selectedPOs.filter(p => rowModes.get(p.id) === 'initiate').map(p => `#${p.po_number}`).join(', ')}`}
        confirmButtonColor="primary"
        confirmButtonText={bulkProcessing ? 'Initiating…' : `Yes, initiate ${selectedIds.size}`}
        cancelButtonText="Cancel"
      />

      {/* Merge Drafts — user picks which PO to KEEP; rest fold into it. */}
      <MergeDraftsModal
        show={showMergeModal}
        targets={mergeEligibility.targets || []}
        vendorName={mergeEligibility.vendorName}
        isProcessing={bulkProcessing}
        onCancel={() => setShowMergeModal(false)}
        onConfirm={runMerge}
      />
    </div>
  );
};

// Inline bulk-approve confirmation modal. Mirrors the look of ApproveModal but
// scoped to a count + optional batch-wide remarks instead of a single PO.
const BulkApproveModal = ({ show, count, previewNumbers = [], isProcessing, onCancel, onConfirm }) => {
  const [remarks, setRemarks] = useState('');
  useEffect(() => { if (!show) setRemarks(''); }, [show]);
  if (!show) return null;
  const preview = previewNumbers.slice(0, 6).map(n => `#${n}`).join(', ');
  const more = previewNumbers.length > 6 ? ` (+${previewNumbers.length - 6} more)` : '';
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 24 }}
      onClick={isProcessing ? undefined : onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', width: '100%', maxWidth: 480, padding: 22, boxShadow: '0 18px 50px rgba(15, 23, 42, 0.22)' }}
      >
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a2730' }}>Approve {count} Purchase Order{count === 1 ? '' : 's'}?</h4>
        <p style={{ marginTop: 8, fontSize: 13, color: '#54616e', lineHeight: 1.5 }}>
          The same approval decision will be recorded against each PO. POs already actioned by someone else
          in the meantime will be skipped automatically.
        </p>
        <div style={{ marginTop: 10, padding: '8px 10px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, color: '#475569' }}>
          {preview}{more}
        </div>
        <label style={{ display: 'block', marginTop: 14, fontSize: 12, fontWeight: 600, color: '#475569' }}>
          Remarks (optional, applied to all)
        </label>
        <textarea
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={isProcessing}
          placeholder="Add a note for the audit trail…"
          style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#475569', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, cursor: isProcessing ? 'wait' : 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(remarks)}
            disabled={isProcessing}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#16a34a', border: 'none', borderRadius: 8, cursor: isProcessing ? 'wait' : 'pointer' }}
          >
            {isProcessing ? 'Approving…' : `Approve ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Merge confirmation modal — radio list of selected drafts so the buyer
// picks which PO is "the one we keep". All other POs are merged into it
// and then DELETED. Copy is written in plain, non-technical language —
// users may not understand "line items", "global charges", "HSN mappings",
// so we describe the effect, not the schema.
const MergeDraftsModal = ({ show, targets = [], vendorName, isProcessing, onCancel, onConfirm }) => {
  const [keepId, setKeepId] = useState(null);

  useEffect(() => {
    if (show && targets.length > 0) {
      setKeepId(targets[0].id);
    }
    if (!show) setKeepId(null);
  }, [show, targets]);

  if (!show) return null;

  const otherCount = targets.length - 1;
  const selectedTarget = targets.find(t => t.id === keepId);
  const otherTargets = targets.filter(t => t.id !== keepId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 24 }}
      onClick={isProcessing ? undefined : onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', width: '100%', maxWidth: 560, padding: 22, boxShadow: '0 18px 50px rgba(15, 23, 42, 0.22)' }}
      >
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a2730' }}>
          Combine {targets.length} draft purchase orders into one
        </h4>
        <p style={{ marginTop: 8, fontSize: 13, color: '#54616e', lineHeight: 1.55 }}>
          All {targets.length} drafts are for <strong>{vendorName}</strong>. Choose which one
          you want to keep. Items from the other {otherCount} draft{otherCount === 1 ? '' : 's'}
          {' '}will be added to it.
        </p>

        <div style={{ marginTop: 14, maxHeight: 260, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          {targets.map((po) => {
            const selected = po.id === keepId;
            return (
              <label
                key={po.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
                  cursor: isProcessing ? 'wait' : 'pointer',
                  background: selected ? '#f5f3ff' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="merge-keep-po"
                  checked={selected}
                  onChange={() => setKeepId(po.id)}
                  disabled={isProcessing}
                  style={{ marginTop: 3, accentColor: '#7c3aed' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2730' }}>
                    PO #{po.po_number}
                    {selected && (
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '2px 8px', borderRadius: 999, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                        Keep this one
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                    {(po.product_details?.length || 0)} item{po.product_details?.length === 1 ? '' : 's'}
                    {po.total_value != null && (
                      <> · ₹{addCommasToNumber(Number(po.total_value) || 0)}</>
                    )}
                    {po.created_at && (
                      <> · created {formatDisplayDate(po.created_at)}</>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* What stays / what goes — plain words, no jargon. Red callout
            because deletion is irreversible. */}
        <div style={{ marginTop: 14, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <BsXLg size={11} style={{ color: '#b91c1c' }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', letterSpacing: 0.3, textTransform: 'uppercase' }}>
              The other {otherCount} draft{otherCount === 1 ? '' : 's'} will be deleted
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: '#7f1d1d', lineHeight: 1.55 }}>
            {selectedTarget ? (
              <>
                Only <strong>PO #{selectedTarget.po_number}</strong> will remain. Its PO number, extra
                charges, taxes, and terms will be used.
                {otherTargets.length > 0 && (
                  <> The PO number{otherTargets.length === 1 ? '' : 's'}{' '}
                    <strong>{otherTargets.map(t => `#${t.po_number}`).join(', ')}</strong>{' '}
                    will be permanently removed.</>
                )}
              </>
            ) : (
              <>Pick which PO to keep above.</>
            )}
          </div>
        </div>

        {/* Plain-words explainer of how charges behave. We chose to keep
            ONLY the kept PO's globals applied once over the combined
            subtotal — same-vendor merge invariant means they're the right
            authority, and source POs' globals are dropped with the source. */}
        <div style={{ marginTop: 10, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11.5, color: '#475569', lineHeight: 1.5 }}>
          <strong>Note:</strong> Extra charges (like freight, GST, packaging) from the kept PO
          will be applied <strong>once</strong> on the new combined total. The same vendor's charges
          shouldn't be charged twice.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#475569', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, cursor: isProcessing ? 'wait' : 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(keepId)}
            disabled={isProcessing || !keepId}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: '#7c3aed', border: 'none', borderRadius: 8, cursor: isProcessing || !keepId ? 'not-allowed' : 'pointer', opacity: isProcessing || !keepId ? 0.7 : 1 }}
          >
            {isProcessing ? 'Combining…' : `Yes, combine into #${selectedTarget?.po_number || '…'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const BulkRejectModal = ({ show, count, previewNumbers = [], remarks, setRemarks, isProcessing, onCancel, onConfirm }) => {
  if (!show) return null;
  const preview = previewNumbers.slice(0, 6).map(n => `#${n}`).join(', ');
  const more = previewNumbers.length > 6 ? ` (+${previewNumbers.length - 6} more)` : '';
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 24 }}
      onClick={isProcessing ? undefined : onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', width: '100%', maxWidth: 480, padding: 22, boxShadow: '0 18px 50px rgba(15, 23, 42, 0.22)' }}
      >
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a2730' }}>Reject {count} Purchase Order{count === 1 ? '' : 's'}?</h4>
        <p style={{ marginTop: 8, fontSize: 13, color: '#54616e', lineHeight: 1.5 }}>
          Each PO will be rejected. The remarks below will be recorded against every PO in the batch.
        </p>
        <div style={{ marginTop: 10, padding: '8px 10px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, color: '#475569' }}>
          {preview}{more}
        </div>
        <label style={{ display: 'block', marginTop: 14, fontSize: 12, fontWeight: 600, color: '#475569' }}>
          Remarks (required)
        </label>
        <textarea
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={isProcessing}
          placeholder="Explain why these POs are being rejected…"
          style={{ width: '100%', marginTop: 4, padding: '8px 10px', fontSize: 13, border: '1px solid #cbd5e1', borderRadius: 6, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#475569', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, cursor: isProcessing ? 'wait' : 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing || !remarks.trim()}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: !remarks.trim() ? '#fca5a5' : '#dc2626', border: 'none', borderRadius: 8, cursor: isProcessing || !remarks.trim() ? 'not-allowed' : 'pointer' }}
          >
            {isProcessing ? 'Rejecting…' : `Reject ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POListing;
