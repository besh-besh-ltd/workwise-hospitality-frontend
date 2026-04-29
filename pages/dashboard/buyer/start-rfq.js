import React from "react";
import Head from "next/head";
import StartRFQ from "@/components/dashboard/buyer/startRFQ/StartRFQ";

const StartRFQPage = () => {
  return (
    <>
      <Head>
        <title>Workwise | Start a New Procurement</title>
      </Head>
      <StartRFQ />
    </>
  );
};

export default StartRFQPage;
