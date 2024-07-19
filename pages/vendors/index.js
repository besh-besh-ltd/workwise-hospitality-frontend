import React from "react";
import SearchPage from "@/components/dashboard/vendor/search";
import Head from "next/head";

const Vendors = () => {
  return (
    <>
      <Head>
        <title>Workwise | Preferred Vendors</title>
      </Head>
      <SearchPage title="Preferred Vendors" type="vendors" />
    </>
  );
};

export default Vendors;
