import React from "react";
import Head from "next/head";
import HospitalityManager from "@/components/dashboard/admin/HospitalityManager";
import HospitalityAdminGate from "@/components/dashboard/admin/shared/HospitalityAdminGate";

const HospitalityManagerPage = () => (
  <HospitalityAdminGate what="business unit networks">
    <Head>
      <title>Organisation | Admin</title>
    </Head>
    <HospitalityManager />
  </HospitalityAdminGate>
);

export default HospitalityManagerPage;
