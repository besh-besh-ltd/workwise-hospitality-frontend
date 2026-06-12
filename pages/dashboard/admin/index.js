import React from "react";
import BuyerDashboard from "@/components/dashboard/buyer";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";

const Admin = () => {
    return (
        <AdminGuard>
            <Head>
                <title>Dashboard | Admin</title>
            </Head>
            <BuyerDashboard />
        </AdminGuard>
    )
}

export default Admin;
