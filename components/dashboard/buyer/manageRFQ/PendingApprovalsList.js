import FullLoader from "@/components/shared/FullLoader";
import React from "react";
import RFQCard from "./RFQCard";
import Pagination from "@/components/shared/Pagination";
import { Alert } from "react-bootstrap";
import { BsCheckCircleFill, BsExclamationTriangleFill } from "react-icons/bs";

const PendingApprovalsList = ({ filterData, setFilterData, pendingRFQs = [], totalRFQs = 0, loading = false }) => {

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

        {/* Card List */}
        {!loading && pendingRFQs.length > 0 && (
          <div className="d-flex flex-column gap-2 my-3">
            {pendingRFQs.map((item) => (
              <RFQCard
                key={`pending_rfq_${item.id}`}
                data={item}
                isPendingApproval={true}
              />
            ))}
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
