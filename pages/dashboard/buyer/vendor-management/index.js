import React from "react";
import Head from "next/head";
import VendorMasterPage from "@/components/dashboard/buyer/vendor-management/VendorMasterPage";

const VendorManagement = () => (
  <>
    <Head>
      <title>Buyer | Vendor Management</title>
    </Head>
    <VendorMasterPage />
  </>
);

export default VendorManagement;
