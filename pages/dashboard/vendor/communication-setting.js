import React from "react";
import CommunicationSettingPage from "@/components/dashboard/vendor/communication-setting";
import Head from "next/head";
const CommunicationSetting = () => {
  return (
    <>
      <Head>
        <title>Workwise | Communication Setting</title>
      </Head>
      <CommunicationSettingPage />
    </>
  );
};

export default CommunicationSetting;
