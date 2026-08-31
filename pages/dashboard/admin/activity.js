import React from "react";
import Head from "next/head";
import HospitalityAdminGate from "@/components/dashboard/admin/shared/HospitalityAdminGate";
import ActivityPage from "@/components/dashboard/admin/activity/ActivityPage";

const ActivityRoute = () => (
  <HospitalityAdminGate what="the company activity trail">
    <Head>
      <title>Activity | Admin</title>
    </Head>
    <ActivityPage />
  </HospitalityAdminGate>
);

export default ActivityRoute;
