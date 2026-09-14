import React from "react";
import Head from "next/head";
import HospitalityAdminGate from "@/components/dashboard/admin/shared/HospitalityAdminGate";
import AdminOverview from "@/components/dashboard/admin/overview/AdminOverview";

/**
 * This route used to render <BuyerDashboard /> verbatim: an administrator
 * landed on a buyer's procurement report, and a blank one — every widget there
 * requires an `rfq.read`-style role scope that administrators do not hold, so
 * it returned zeros with nothing to explain why.
 */
const Admin = () => (
  <HospitalityAdminGate what="the company overview">
    <Head>
      <title>Overview | Admin</title>
    </Head>
    <AdminOverview />
  </HospitalityAdminGate>
);

export default Admin;
