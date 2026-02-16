import { getCompanyUsers } from "@/services/Auth";
import { handlePOApproval } from "@/services/po";
import useDebounce, { addCommasToNumber, formatDisplayDate } from "@/utils/sharedFunctions";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { IoMdEye } from "react-icons/io";
import { FaTruckRampBox } from "react-icons/fa6";
import { BsFilePdf } from "react-icons/bs";
import { FiExternalLink, FiSend } from "react-icons/fi";
import { toast } from "react-toastify";
import Pagination from "@/components/shared/Pagination";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import POCard from "./POCard";

const statusVariants = {
  approved: "success",
  sent: "primary",
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
  warning: {
    ...baseStyle,
    backgroundColor: "rgba(252, 255, 240, 1)",
    borderColor: "#efeb95ff",
    color: "#a79f28ff",
  },
};

const formatISTDate = (utcString) => {
  return formatDisplayDate(utcString, { includeTime: true });
};

const POListing = ({
  poList = [],
  totalData = 0,
  refetchPOList,
  rfq_id,
  handleProgressStatus,
  handleInitiatePO,
  onSelect,
  onEdit,
  companyUsers,
  approvalLevel,
}) => {
  const [showRaiseInvoiceModal, setShowRaiseInvoiceModal] = useState(false);
  const [showMarkDispatchedModal, setShowMarkDispatchedModal] = useState(false);
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
      await handleProgressStatus(pendingPO.id, {
        type: "invoice",
      }, pendingPO);
      setShowRaiseInvoiceModal(false);
      setPendingPO(null);
      resetFilters();
    }
  };

  const handleMarkDispatchedConfirm = async () => {
    if (pendingPO) {
      await handleProgressStatus(pendingPO.id, {
        type: "dispatch",
      }, pendingPO);
      setShowMarkDispatchedModal(false);
      setPendingPO(null);
      resetFilters();
    }
  };

  const handleApproveCancel = () => {
    setShowRaiseInvoiceModal(false);
    setPendingPO(null);
  };

  const handleMarkDispatchedCancel = () => {
    setShowMarkDispatchedModal(false);
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
              Click to preview the formal PO document.
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
      <h4 className="mb-4">Order Book for this RFQ</h4>

      {/* Filters */}
      <div className="mb-4 d-flex gap-1 justify-content-between">
        <div>
          <label>PO Number</label>
          <input
            type="text"
            className="form-control w-100"
            value={filters.poNumber}
            placeholder="Enter a PO Number"
            onChange={(e) =>
              setFilters({ ...filters, poNumber: e.target.value })
            }
          />
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
                  const showRaiseInvoice = po.status === "approved";
                  const showDispatch = po.status === "invoice_raised";

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
                      <td>
                        <div className="d-flex flex-column">
                          {po.product_details.map(p => (
                            <span>{p.name}</span>
                          ))}
                        </div>
                      </td>
                      <td>{po.quantity}</td>
                      <td>₹ {addCommasToNumber(po.total_value)}</td>
                      <td>{po.initiated_by ?? "-"}</td>
                      <td>{formatISTDate(po.created_at)}</td>
                      <td>
                        {showRaiseInvoice ? (
                          <div className="d-flex align-items-center justify-content-center">
                            <button
                              style={styles.warning}
                              title="Raise Invoice"
                              id={`raise_invoice_${po.id}-po_actions-po_listing_vendor`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRaiseInvoiceClick(po);
                              }}
                            >
                              <FiSend />
                              <small className="ms-1 fw-medium">Raise Invoice</small>
                            </button>
                          </div>
                        ) : showDispatch ? (
                          <div className="d-flex align-items-center justify-content-center">
                            <button
                              style={styles.approve}
                              title="Mark as Dispatched"
                              id={`view_po_${po.id}-po_actions-po_listing`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkDispatchClick(po);
                              }}
                            >
                              <FaTruckRampBox />
                              <small className="ms-1 fw-medium">Mark Dispatched</small>
                            </button>
                          </div>
                        ) : (
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
        isOpen={showRaiseInvoiceModal}
        onClose={handleApproveCancel}
        onConfirm={handleApproveConfirm}
        title="Raise Invoice for this PO"
        description={`Are you sure you want to raise invoice for PO #${
          pendingPO?.po_number || "this purchase order"
        }?\nThis action will upload and send the invoice to the relevant parties.`}
        confirmButtonColor="success"
        confirmButtonText="Yes, Go Ahead"
        cancelButtonText="No, Cancel It"
        customFooter={POReviewCompact(pendingPO)}
      />

      <ConfirmationModal
        isOpen={showMarkDispatchedModal}
        onClose={handleMarkDispatchedCancel}
        onConfirm={handleMarkDispatchedConfirm}
        title="Mark Dispatched for this PO"
        description={`Are you sure you want to mark Dispatched for PO #${
          pendingPO?.po_number || "this purchase order"
        }?\nThis action will notify the relevant parties.`}
        confirmButtonColor="success"
        confirmButtonText="Yes, Go Ahead"
        cancelButtonText="No, Cancel It"
      />
    </div>
  );
};

export default POListing;