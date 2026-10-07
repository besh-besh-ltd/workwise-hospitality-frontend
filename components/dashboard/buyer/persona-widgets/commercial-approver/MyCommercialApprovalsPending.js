import React from "react";
import { Briefcase } from "lucide-react";
import { getMyCommercialApprovalsPending } from "@/services/dashboard";
import ApprovalQueueCard from "../ApprovalQueueCard";

/** Negotiated quotes (NEGOTIATION_QUOTE) waiting on this user's approval. */
const MyCommercialApprovalsPending = ({ filters }) => (
  <ApprovalQueueCard
    code="my_commercial_approvals_pending"
    entityType="NEGOTIATION_QUOTE"
    fetcher={getMyCommercialApprovalsPending}
    icon={Briefcase}
    showValue
    emptyText="No negotiated quotes waiting on you."
    filters={filters}
  />
);

export default MyCommercialApprovalsPending;
