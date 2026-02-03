import { getCompanyUsers } from "@/services/Auth";
import { handlePOApproval } from "@/services/po";
import useDebounce, { addCommasToNumber } from "@/utils/sharedFunctions";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { MdNotificationsNone, MdEdit, MdCheck } from "react-icons/md";
import { IoMdEye } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import { BsFilePdf } from "react-icons/bs";
import { LiaShippingFastSolid } from "react-icons/lia";
import { FiExternalLink } from "react-icons/fi";
import Pagination from "@/components/shared/Pagination";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import POCard from "./POCard";
import ReadMore from "@/components/shared/ReadMore";

const statusVariants = {
  pending_approval: "warning",
  approved: "success",
  cancelled: "danger",
  rejected: "danger",
  invoice_raised: "success",
  dispatched: "success",
  GRN: "success"
};

const baseStyle = {
  border: "1px solid",
  borderRadius: "8px",
  padding: "7px 14px",
  marginRight: "10px",
  cursor: "pointer",
  fontSize: "1.05rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.2s",
};

const styles = {
  approve: {
    ...baseStyle,
    backgroundColor: "#e8f9ed",
    borderColor: "#b2e2c7",
    color: "#28a745",
  },
  reject: {
    ...baseStyle,
    backgroundColor: "#fdeceb",
    borderColor: "#f5b5b5",
    color: "#dc3545",
  },
  primary: {
    ...baseStyle,
    backgroundColor: "#f0f4ff",
    borderColor: "#d6e0f5",
    color: "#0d6efd",
  },
};

const formatISTDate = (utcString) => {
  const date = new Date(utcString);
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
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
}) => {
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [showRejectConfirmModal, setShowRejectConfirmModal] = useState(false);
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

  const debouncedPONumber = useDebounce(filters.poNumber, 700); // 👈 Debounced PO Number

  const handleApproveClick = (po) => {
    setPendingPO(po);
    setShowApproveConfirmModal(true);
  };

  const handleRejectClick = (po) => {
    setPendingPO(po);
    setShowRejectConfirmModal(true);
  };

  const handleApproveConfirm = async () => {
    if (pendingPO) {
      await handlePODecision(pendingPO.id, {
        type: "approval",
        decision: "approved",
      }, pendingPO);
      await refetchPOList({
        ...filters,
        poNumber: debouncedPONumber,
      });
      setShowApproveConfirmModal(false);
      setPendingPO(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (pendingPO) {
      await handlePODecision(pendingPO.id, {
        type: "approval",
        decision: "rejected",
      }, pendingPO);
      await refetchPOList({
        ...filters,
        poNumber: debouncedPONumber,
      });
      setShowRejectConfirmModal(false);
      setPendingPO(null);
    }
  };

  const handleMarkGRNConfirm = async () => {
    if (pendingPO) {
      await handlePODecision(pendingPO.id, {
        type: "grn_update",
      }, pendingPO);
      setShowGRNUpdateModal(false);
      setPendingPO(null);
      resetFilters();
    }
  };

  const handleMarkGRNClick = (po) => {
    setPendingPO(po);
    setShowGRNUpdateModal(true);
  };

  const handleApproveCancel = () => {
    setShowApproveConfirmModal(false);
    setPendingPO(null);
  };

  const handleRejectCancel = () => {
    setShowRejectConfirmModal(false);
    setPendingPO(null);
  };

  const handleMarkDispatchedCancel = () => {
    setShowGRNUpdateModal(false);
    setPendingPO(null);
  };

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

  const resetFilters = () =>
    setFilters({
      poNumber: "",
      initiatedBy: "",
      status: "",
      dateFrom: "",
      dateTo: "",
      page: 1,
      limit: 10,
    });

  useEffect(() => {
    refetchPOList({
      ...filters,
      poNumber: debouncedPONumber,
    });
  }, [
    debouncedPONumber,
    filters.initiatedBy,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.page,
    filters.limit,
  ]);

  return (
    <div className="details-table">
      <h4 className="mb-4">Purchase Orders for this RFQ</h4>

      {/* Filters */}
      <div className="mb-4 d-flex gap-3 justify-content-between">
        <div>
          <label>PO Number</label>
          <input
            type="text"
            className="form-control"
            value={filters.poNumber}
            style={{ maxWidth: 240 }}
            placeholder="Enter a PO Number"
            onChange={(e) =>
              setFilters({ ...filters, poNumber: e.target.value })
            }
          />
        </div>
        <div className="d-flex gap-3">
          <div>
            <label>Initiated By</label>
            <select
              className="form-select"
              value={filters.initiatedBy}
              style={{ maxWidth: 240 }}
              onChange={(e) =>
                setFilters({ ...filters, initiatedBy: e.target.value })
              }
            >
              <option value="">All</option>
              {companyUsers &&
                companyUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">All</option>
              {Object.keys(statusVariants).map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() +
                    status.slice(1).replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>From</label>
            <input
              type="date"
              className="form-control"
              style={{ minWidth: 200 }}
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters({ ...filters, dateFrom: e.target.value })
              }
            />
          </div>
          <div>
            <label>To</label>
            <input
              disabled={!filters.dateFrom}
              type="date"
              className="form-control"
              style={{ minWidth: 200 }}
              min={filters.dateFrom}
              value={filters.dateTo}
              onChange={(e) =>
                setFilters({ ...filters, dateTo: e.target.value })
              }
            />
          </div>
          <div className="mt-auto" style={{ marginBottom: 2 }}>
            <button
              onClick={resetFilters}
              className="btn btn-outline-primary p-1"
              style={{ maxWidth: 90 }}
              id="clear_filters-po_listing-purchase_order_page"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        {approvalLevel == -1 ? (
          <div className="d-flex flex-column">
            {poList.length === 0 ? (
              <p className="text-center text-muted">
                No purchase orders found.
              </p>
            ) : (
              poList.map((po) => {
                return (
                  <POCard
                    po={po}
                    onClick={() => onSelect(po.id)}
                    initiatePO={() => handleInitiatePO(po.id)}
                  />
                );
              })
            )}
          </div>
        ) : (
          <table className="table table-stripped table-hover align-middle">
            <thead className="table-light">
              <tr className="text-center">
                <th>PO Number</th>
                <th>Status</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Total Value</th>
                <th>Initiated By</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {poList.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center text-muted">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                poList.map((po) => {
                  const isPending = po.status === "pending_approval";
                  const isCurrentApprover = po.is_approver;
                  const isCancelled =
                    po.status === "cancelled" || po.status === "rejected";
                  const isDraft = po.status === "draft";

                  return (
                    <tr
                      key={po.id}
                      className="text-center"
                      style={{ cursor: "pointer" }}
                      onClick={() => onSelect(po.id)}
                    >
                      <td className="fs-6">
                        # <strong>{po.po_number}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge bg-${
                            statusVariants[po.status] || "secondary"
                          } text-capitalize`}
                        >
                          {po.status.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ maxWidth: "300px", wordBreak: "break-word" }}>
                        {po.product_details?.length > 0 ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <ReadMore
                              content={po.product_details.map(p => p.name).join("\n")}
                              maxLines={4}
                            />
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>{po.quantity}</td>
                      <td>₹ {addCommasToNumber(po.total_value)}</td>
                      <td>{po.initiated_by ?? "-"}</td>
                      <td>{formatISTDate(po.created_at)}</td>
                      <td>
                        {isPending && isCurrentApprover ? (
                          <div className="d-flex align-items-center justify-content-center">
                            <button
                              style={styles.approve}
                              title="Approve this PO"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveClick(po);
                              }}
                              id={`approve_po_${po.id}-po_actions-po_listing`}
                            >
                              <MdCheck />
                            </button>
                            <button
                              style={styles.reject}
                              title="Reject this PO"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectClick(po);
                              }}
                              id={`reject_po_${po.id}-po_actions-po_listing`}
                            >
                              <RxCross2 />
                            </button>
                          </div>
                        ) : isDraft ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInitiatePO(po.id);
                            }}
                            className="btn btn-outline-success btn-sm p-2"
                            style={{ width: 150 }}
                          >
                            Initiate PO
                          </button>
                        ) : isCancelled ? (
                          <Link
                            onClick={(e) => e.stopPropagation()}
                            href={`/dashboard/buyer/quote-compare?rfq=${rfq_id}`}
                            className="btn btn-outline-success btn-sm p-2"
                            style={{ width: 150 }}
                            id={`view_quotes_${po.id}-po_actions-po_listing`}
                          >
                            View Quotes
                          </Link>
                        ) : po.status == 'dispatched' ? (
                          <div className="d-flex align-items-center justify-content-center">
                            <button
                              style={styles.approve}
                              title="Update the status to GRN"
                              id={`update_to_grn_po_${po.id}-po_actions-po_listing`}
                              onClick={(e) => { e.stopPropagation(); handleMarkGRNClick(po); }}
                            >
                              <LiaShippingFastSolid />
                              <small className="ms-1 fw-medium">Update to GRN</small>
                            </button>
                          </div>
                        ) : !isPending ? (
                          <div className="d-flex align-items-center justify-content-center">
                            <button
                              style={styles.primary}
                              title="View This PO"
                              id={`view_po_${po.id}-po_actions-po_listing`}
                            >
                              <IoMdEye />
                              <small className="ms-1 fw-medium">View</small>
                            </button>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center justify-content-center">
                            <button
                              style={styles.primary}
                              title="Edit this PO"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(po.id);
                              }}
                              id={`edit_po_${po.id}-po_actions-po_listing`}
                            >
                              <MdEdit />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {poList.length > 0 && (
        <Pagination
          page={filters.page}
          setPage={(page) => setFilters((prev) => ({ ...prev, page }))}
          limit={filters.limit}
          setLimit={(limit) => setFilters((prev) => ({ ...prev, limit }))}
          totalData={totalData}
        />
      )}

      {/* PO Approve Confirmation Modal */}
      <ConfirmationModal
        isOpen={showApproveConfirmModal}
        onClose={handleApproveCancel}
        onConfirm={handleApproveConfirm}
        title="Approve Purchase Order"
        description={`Are you sure you want to approve PO #${
          pendingPO?.po_number || "this purchase order"
        }?\nThis action will approve the purchase order and notify relevant parties.`}
        confirmButtonColor="success"
        confirmButtonText="Approve"
        cancelButtonText="Cancel"
        customFooter={POReviewCompact(pendingPO)}
      />

      {/* PO Reject Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRejectConfirmModal}
        onClose={handleRejectCancel}
        onConfirm={handleRejectConfirm}
        title="Reject Purchase Order"
        description={`Are you sure you want to reject PO #${
          pendingPO?.po_number || "this purchase order"
        }?\nThis action will reject the purchase order, de-finalize the vendors and notify relevant parties.`}
        confirmButtonColor="danger"
        confirmButtonText="Reject"
        cancelButtonText="Cancel"
      />

      {/* PO Update Status to GRN */}
      <ConfirmationModal
        isOpen={showGRNUpdateModal}
        onClose={handleMarkDispatchedCancel}
        onConfirm={handleMarkGRNConfirm}
        title="Mark GRN for this PO"
        description={`Are you sure you want to mark GRN for PO #${
          pendingPO?.po_number || "this purchase order"
        }?\nThis action will mark the status for this PO as GRN ( Goods Reciept Note ),
        That will indicate that the goods has been delivered to the site.`}
        customFooter={`This Action Cannot be Reversed!`}
        confirmButtonColor="success"
        confirmButtonText="Yes, Go Ahead"
        cancelButtonText="No, Cancel It"
      />
    </div>
  );
};

export default POListing;