import React from "react";
import { ClarificationManagement } from "@/components/dashboard/buyer/clarification";
import Head from "next/head";

const ClarificationManagementPage = () => {
  return (
    <>
      <Head>
        <title>Buyer | Clarification Management</title>
      </Head>
      <ClarificationManagement />
    </>
  );
};

export default ClarificationManagementPage;
