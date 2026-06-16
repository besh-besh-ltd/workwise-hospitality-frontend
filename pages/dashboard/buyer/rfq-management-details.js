import React from "react";
import RfqLifecycleShell from "@/components/dashboard/buyer/rfq/RfqLifecycleShell";

// Single-page RFQ workspace (ARC-style lifecycle). Replaces the previous
// scattered detail view; old per-stage routes deep-link in via ?stage=.
const RfqManagementDetails = () => {
  return <RfqLifecycleShell />;
};

export default RfqManagementDetails;
