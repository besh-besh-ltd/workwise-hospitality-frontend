import React from "react";
import RFQCard from "./RFQCard";
import RFQListSkeleton from "./RFQListSkeleton";
import Pagination from "@/components/shared/Pagination";
import { AlertTriangle, CheckCircle } from "lucide-react";

const PendingApprovalsList = ({ filterData, setFilterData, pendingRFQs = [], totalRFQs = 0, loading = false }) => {

  return (
    <div>
      {/* Header Banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px", marginBottom: 12, borderRadius: 8,
        background: "#fffbeb", borderLeft: "3px solid #f59e0b",
        fontSize: 12.5,
      }}>
        <AlertTriangle size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
        <span>
          <strong>Action Required</strong>
          <span style={{ color: "#555", marginLeft: 4 }}>
            — These Tender / RFQs need your approval. Click to review.
          </span>
        </span>
      </div>

      <div>
        {loading && <RFQListSkeleton count={5} />}

        {!loading && pendingRFQs.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: "#ecfdf5",
              display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
            }}>
              <CheckCircle size={28} style={{ color: "#22c55e" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#22c55e", margin: "0 0 4px" }}>No Pending Approvals</p>
            <p style={{ fontSize: 13, color: "#999", margin: 0 }}>You're all caught up!</p>
          </div>
        )}

        {!loading && pendingRFQs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingRFQs.map((item) => (
              <RFQCard
                key={`pending_rfq_${item.id}`}
                data={item}
                isPendingApproval={true}
              />
            ))}
          </div>
        )}

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
