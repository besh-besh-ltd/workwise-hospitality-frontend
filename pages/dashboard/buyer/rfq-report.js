import React from "react";
import RfqReportPage from "@/components/dashboard/buyer/rfq-report";
// import RfqReportPage from "@/components/dashboard/vendor/product-management";
import Head from "next/head";

const EditProfile = () => {
  return (
    <>
      <Head>
        <title>Workwise | RFQ Report</title>
      </Head>
      <RfqReportPage />
    </>
  );
};

export default EditProfile;
