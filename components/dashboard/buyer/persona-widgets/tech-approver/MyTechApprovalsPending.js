import React from "react";
import { ShieldCheck } from "lucide-react";
import { getMyTechApprovalsPending } from "@/services/dashboard";
import ApprovalQueueCard from "../ApprovalQueueCard";

/** Technical evaluations waiting on this user's approval, oldest first
 *  (absorbs the former "oldest pending" card). */
const MyTechApprovalsPending = ({ filters }) => (
  <ApprovalQueueCard
    code="my_tech_approvals_pending"
    entityType="TECHNICAL"
    fetcher={getMyTechApprovalsPending}
    icon={ShieldCheck}
    emptyText="No technical approvals waiting on you."
    filters={filters}
  />
);

export default MyTechApprovalsPending;
