import React from "react";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";
import HierarchyBuilder from "@/components/dashboard/admin/approval-management/hierarchy-builder";

const ManageAccounts = () => {
    return (
        <AdminGuard>
            <Head>
                <title>Workwise | Manage Hierarchy</title>
            </Head>
            <HierarchyBuilder />
        </AdminGuard>
    )
}

export default ManageAccounts;
