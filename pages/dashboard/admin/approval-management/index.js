import React from "react";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";
import HierarchyOverview from "@/components/dashboard/admin/approval-management/approval-management";

const ManageAccounts = () => {
    return (
        <AdminGuard>
            <Head>
                <title>Workwise | Manage Hierarchy</title>
            </Head>
            <HierarchyOverview />
        </AdminGuard>
    )
}

export default ManageAccounts;
