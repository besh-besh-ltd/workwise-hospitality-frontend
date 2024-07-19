import React from "react";
import TermsOfUsePage from "../../components/terms-of-use/index";
import Head from "next/head";

const TermsOfUse = (props) => {
  return (
    <>
      <Head>
        <title>Terms of Use | Workwise</title>
      </Head>
      <TermsOfUsePage />
    </>
  );
};

export default TermsOfUse;
