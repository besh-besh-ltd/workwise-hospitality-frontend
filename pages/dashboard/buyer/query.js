import React from "react";
import Head from "next/head";
import QueryComponent from "@/components/dashboard/buyer/QueryComponent";

const Query = () => {
  return (
    <>
      <Head>
        <title>Workwise | Query Against The RFQ</title>
      </Head>

      <QueryComponent />
    </>
  );
};

export default Query;
