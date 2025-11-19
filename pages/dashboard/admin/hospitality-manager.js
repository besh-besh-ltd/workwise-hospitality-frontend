import React from "react";
import Head from "next/head";
import HospitalityManager from "@/components/dashboard/admin/HospitalityManager";
import { AdminGuard } from "@/utils/authGuard";

const HospitalityManagerPage = () => {
  return (
    <AdminGuard>
      <Head>
        <title>Hospitality Manager | Admin</title>
      </Head>
      <HospitalityManager />
    </AdminGuard>
  );
};

export default HospitalityManagerPage;



