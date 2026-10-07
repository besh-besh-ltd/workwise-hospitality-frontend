import React from "react";
import { Award } from "lucide-react";
import { getMyAwardApprovalsPending } from "@/services/dashboard";
import ApprovalQueueCard from "../ApprovalQueueCard";

/** Purchase orders waiting on this user's approval. */
const MyAwardApprovalsPending = ({ filters }) => (
  <ApprovalQueueCard
    code="my_award_approvals_pending"
    entityType="PO"
    fetcher={getMyAwardApprovalsPending}
    icon={Award}
    showValue
    emptyText="No purchase orders waiting on you."
    filters={filters}
  />
);

export default MyAwardApprovalsPending;
