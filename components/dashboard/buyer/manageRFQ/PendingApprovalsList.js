import FullLoader from "@/components/shared/FullLoader";
import { getPendingApprovalRFQs } from "@/services/rfq";
import React, { useEffect, useState } from "react";
import RFQItem from "./Item";
import Pagination from "@/components/shared/Pagination";
import { Alert } from "react-bootstrap";
import { BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";

const PendingApprovalsList = ({ filterData, setFilterData, onCountChange }) => {
  const [loading, setLoading] = useState(false);
  const [pendingRFQs, setPendingRFQs] = useState([]);
  const [totalRFQs, setTotalRFQs] = useState(0);

  const fetchPendingApprovals = () => {
    setLoading(true);

    getPendingApprovalRFQs({ ...filterData })
      .then((res) => {
        setLoading(false);
        setPendingRFQs(res.data || []);
        setTotalRFQs(res.total_items || 0);
        // Notify parent of count change for badge
        if (onCountChange) {
          onCountChange(res.total_items || 0);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.log(err);
      });
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, [filterData]);

  return (
    <div className="pending-approvals-list">
      {/* Header Banner */}
      <Alert
        variant="warning"
        className="mb-2 py-2 border-0 d-flex align-items-center gap-2"
        style={{
          background: "#fff8e6",
          borderLeft: "3px solid #ffc107",
        }}
      >
        <BsExclamationTriangleFill size={16} className="text-warning flex-shrink-0" />
        <small>
          <strong>Action Required:</strong>
          <span className="ms-1 text-dark">
            The following Tender / RFQ require your approval. Click "View & Approve" to take action.
          </span>
        </small>
      </Alert>

      <div className="details-table hasFullLoader mt-0">
        {/* Loading State */}
        {loading && <FullLoader />}

        {/* Empty State */}
        {!loading && pendingRFQs.length === 0 && (
          <div className="text-center py-5">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
              style={{
                width: 64,
                height: 64,
                backgroundColor: "#d1e7dd",
              }}
            >
              <BsCheckCircleFill size={36} className="text-success" />
            </div>
            <h5 className="text-success fw-semibold m-2 fs-5">No Pending Approvals</h5>
            <p className="text-muted text-sm">
              You're all caught up! There's nothing waiting for your approval.
            </p>
          </div>
        )}

        {/* Table Data */}
        {!loading && pendingRFQs.length > 0 && (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Tender / RFQ No & Project</th>
                  <th>Products</th>
                  <th>Timeline</th>
                  <th>Initiated By</th>
                  <th>Tender / RFQ Type</th>
                  <th>Reverse Auction</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingRFQs.map((item) => (
                  <RFQItem
                    key={`pending_rfq_${item.id}`}
                    data={item}
                    showReminder={false}
                    isPendingApproval={true}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pendingRFQs.length > 0 && (
          <Pagination
            page={filterData.page}
            setPage={(newPage) =>
              setFilterData((prev) => ({ ...prev, page: newPage }))
            }
            limit={filterData.limit}
            setLimit={(newLimit) =>
              setFilterData((prev) => ({ ...prev, limit: newLimit }))
            }
            totalData={totalRFQs}
          />
        )}
      </div>
    </div>
  );
};

export default PendingApprovalsList;
