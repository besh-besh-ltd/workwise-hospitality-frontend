import React from "react";
import AdminDashboard from "@/components/dashboard/admin";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";

const Admin = () => {
    return (
        <AdminGuard>
            <Head>
                <title>Dashboard | Admin</title>
            </Head>
            <AdminDashboard />
        </AdminGuard>
    )
}

export default Admin;
