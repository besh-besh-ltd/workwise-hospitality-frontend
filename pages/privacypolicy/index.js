import React from "react";
import PrivacyPolicyPage from "../../components/privacypolicy/index";
import Head from "next/head";

const PrivacyPolicy = (props) => {
  return (
    <>
      <Head>
        <title>Privacy Policy | Workwise</title>
      </Head>
      <PrivacyPolicyPage />
    </>
  );
};

export default PrivacyPolicy;
