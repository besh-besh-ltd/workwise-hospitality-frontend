import React from "react";
import SearchPage from "@/components/dashboard/vendor/search";
import Head from "next/head";

const Vendors = () => {
  return (
    <>
      <Head>
        <title>Explore Verified Industrial Vendors | Workwise Vendor Directory</title>
        <meta name="description" content="Discover top vendors for EPC, infrastructure, and industrial projects. Workwise helps you find verified suppliers and manage vendor relationships easily." />
      </Head>
      <SearchPage title="Preferred Vendors" type="vendors" />
    </>
  );
};

export default Vendors;
