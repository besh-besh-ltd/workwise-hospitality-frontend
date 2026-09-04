import React from "react";
import RfqReportPage from "@/components/dashboard/buyer/rfq-report";
// import RfqReportPage from "@/components/dashboard/vendor/product-management";
import Head from "next/head";


// mukul 05-06-2025
//  THIS page is not needed, if required create a small component for edit product

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
