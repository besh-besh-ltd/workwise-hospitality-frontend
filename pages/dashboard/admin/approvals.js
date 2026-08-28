import React from "react";
import Head from "next/head";
import HospitalityAdminGate from "@/components/dashboard/admin/shared/HospitalityAdminGate";
import ApprovalsPage from "@/components/dashboard/admin/approvals/ApprovalsPage";

const ApprovalsRoute = () => (
  <HospitalityAdminGate what="approval workflows">
    <Head>
      <title>Approvals | Admin</title>
    </Head>
    <ApprovalsPage />
  </HospitalityAdminGate>
);

export default ApprovalsRoute;
