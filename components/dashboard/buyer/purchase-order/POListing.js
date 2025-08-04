import { getCompanyUsers } from '@/services/Auth';
import { handlePOApproval } from '@/services/po';
import useDebounce, { addCommasToNumber } from '@/utils/sharedFunctions';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import {
  MdNotificationsNone,
  MdEdit,
  MdCheck,
} from 'react-icons/md';
import { IoMdEye } from "react-icons/io";
import { RxCross2 } from 'react-icons/rx';
import { toast } from 'react-toastify';
import Pagination from '@/components/shared/Pagination';

const statusVariants = {
  pending_approval: 'warning',
  approved: 'success',
  cancelled: 'danger',
  rejected: 'danger',
};

const baseStyle = {
  border: '1px solid',
  borderRadius: '8px',
  padding: '8px 10px',
  marginRight: '10px',
  cursor: 'pointer',
  fontSize: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
};

const styles = {
  approve: {
    ...baseStyle,
    backgroundColor: '#e8f9ed',
    borderColor: '#b2e2c7',
    color: '#28a745',
  },
  reject: {
    ...baseStyle,
    backgroundColor: '#fdeceb',
    borderColor: '#f5b5b5',
    color: '#dc3545',
  },
  primary: {
    ...baseStyle,
    backgroundColor: '#f0f4ff',
    borderColor: '#d6e0f5',
    color: '#0d6efd',
  },
};

const formatISTDate = (utcString) => {
  const date = new Date(utcString);
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};

const POListing = ({ poList = [], totalData = 0, refetchPOList, rfq_id, handlePODecision, onSelect, onEdit, companyUsers }) => {
  const [filters, setFilters] = useState({
    poNumber: '',
    initiatedBy: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 10,
  });

  const debouncedPONumber = useDebounce(filters.poNumber, 700); // 👈 Debounced PO Number

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
            style={{maxWidth: 240}}
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
              style={{maxWidth: 240}}
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
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
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
          <div className='mt-auto' style={{marginBottom: 2}}>
            <button onClick={resetFilters} className='btn btn-outline-primary p-1' style={{maxWidth: 90}}>Clear</button>
          </div>
        </div>
      </div>

      <div className="table-responsive">
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
                const isPending = po.status === 'pending_approval';
                const isCurrentApprover =
                  po.is_approver;
                const isCancelled = (po.status === 'cancelled' || po.status === 'rejected');

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
                    <td>{po.product_details.name}</td>
                    <td>{po.quantity}</td>
                    <td>₹ {addCommasToNumber(po.total_value)}</td>
                    <td>{po.initiated_by}</td>
                    <td>{formatISTDate(po.created_at)}</td>
                    <td>
                      {isPending && isCurrentApprover ? (
                        <div className="d-flex align-items-center justify-content-center">
                          <button
                            style={styles.approve}
                            title="Approve this PO"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handlePODecision(po.id, {
                                decision: "approved",
                              });
                              await getPOData(filters);
                            }}
                          >
                            <MdCheck />
                          </button>
                          <button
                            style={styles.reject}
                            title="Reject this PO"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handlePODecision(po.id, {
                                decision: "rejected",
                              });
                              await refetchPOList({
                                ...filters,
                                poNumber: debouncedPONumber,
                              });
                            }}
                          >
                            <RxCross2 />
                          </button>
                        </div>
                      ) : isCancelled ? (
                        <Link
                          onClick={(e) => e.stopPropagation()}
                          href={`/dashboard/buyer/quote-compare?rfq=${rfq_id}`}
                          className="btn btn-outline-success btn-sm p-2"
                          style={{ width: 150 }}
                        >
                          View Quotes
                        </Link>
                      ) : !isPending ? (
                        <div className="d-flex align-items-center justify-content-center">
                          <button
                            style={styles.primary}
                            title="View This PO"
                            >
                              <IoMdEye />
                              <small className='ms-1 fw-medium'>View</small>
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
      </div>

      {poList.length > 0 && (
            <Pagination
              page={filters.page}
              setPage={(page) => setFilters(prev => ({...prev, page}))}
              limit={filters.limit}
              setLimit={(limit) => setFilters(prev => ({...prev, limit}))}
              totalData={totalData}
            />
          )}
    </div>
  );
};

export default POListing;
