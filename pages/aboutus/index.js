import React from "react";
import AboutusPage from "../../components/aboutus/index";
import Head from "next/head";

const Aboutus = (props) => {
  return (
    <>
      <Head>
        <title>About us | Workwise</title>
      </Head>
      <AboutusPage />
    </>
  );
};

export default Aboutus;
