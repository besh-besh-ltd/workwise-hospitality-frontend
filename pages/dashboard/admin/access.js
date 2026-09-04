import React from "react";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";
import AccessPage from "@/components/dashboard/admin/access/AccessPage";

const AccessRoute = () => (
  <AdminGuard>
    <Head>
      <title>Access | Admin</title>
    </Head>
    <AccessPage />
  </AdminGuard>
);

export default AccessRoute;
