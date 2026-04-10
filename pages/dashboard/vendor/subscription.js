import React from "react";
import SubscriptionPage from "@/components/dashboard/vendor/subscription";
import Head from "next/head";

const Subscription = () => {
  return (
    <>
      <Head>
        <title>Workwise | Subscription</title>
      </Head>
      <SubscriptionPage />
    </>
  );
};

export default Subscription;
