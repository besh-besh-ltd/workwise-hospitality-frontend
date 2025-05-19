import React from "react";
import AdminDashboard from "@/components/dashboard/admin";
import Head from "next/head";

const Admin = () => {
    return (
        <>
            <Head>
                <title>Dashboard | Admin</title>
            </Head>
            <AdminDashboard />
        </>
    )
}

export default Admin;
