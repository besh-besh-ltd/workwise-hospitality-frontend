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
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 14px", marginBottom: 12, borderRadius: 10,
        background: "#fef7ed", border: "1px solid rgba(180, 83, 9, 0.18)",
        fontSize: 12.5, lineHeight: 1.5, color: "#3f3f46", letterSpacing: "-0.005em",
      }}>
        <span style={{
          display: "grid", placeItems: "center", width: 22, height: 22,
          borderRadius: 6, background: "#ffffff",
          border: "1px solid rgba(180, 83, 9, 0.18)", flexShrink: 0, color: "#b45309",
        }}>
          <AlertTriangle size={13} />
        </span>
        <span>
          <strong style={{ color: "#18181b", fontWeight: 600 }}>Action Required</strong>
          <span style={{ color: "#71717a", marginLeft: 4 }}>
            — These Tender / RFQs need your approval. Click to review.
          </span>
        </span>
      </div>

      <div>
        {loading && <RFQListSkeleton count={12} />}

        {!loading && pendingRFQs.length === 0 && (
          <div style={{
            textAlign: "center", padding: "48px 20px",
            background: "#ffffff", border: "1px solid #ebebe6", borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", background: "#ecfdf5",
              border: "1px solid rgba(21, 128, 61, 0.18)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
            }}>
              <CheckCircle size={22} style={{ color: "#15803d" }} />
            </div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "#18181b", margin: "0 0 4px", letterSpacing: "-0.01em" }}>No Pending Approvals</p>
            <p style={{ fontSize: 12.5, color: "#a1a1aa", margin: 0 }}>You're all caught up!</p>
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
