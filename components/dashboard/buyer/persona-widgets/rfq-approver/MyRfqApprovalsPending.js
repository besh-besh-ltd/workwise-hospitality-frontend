import React from "react";
import { FileCheck2 } from "lucide-react";
import { getMyRfqApprovalsPending } from "@/services/dashboard";
import ApprovalQueueCard from "../ApprovalQueueCard";

/** RFQs (and tenders) waiting on this user's approval before they go out. */
const MyRfqApprovalsPending = ({ filters }) => (
  <ApprovalQueueCard
    code="my_rfq_approvals_pending"
    entityType="RFQ"
    fetcher={getMyRfqApprovalsPending}
    icon={FileCheck2}
    emptyText="No RFQs waiting on your approval."
    filters={filters}
  />
);

export default MyRfqApprovalsPending;
