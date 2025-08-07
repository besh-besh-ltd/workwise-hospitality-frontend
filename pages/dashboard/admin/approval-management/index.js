import React from "react";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";
import ApprovalHierarchyPage from "@/components/dashboard/admin/approval-management/ApprovalHierarchyPage";

const ManageAccounts = () => {
    return (
        <AdminGuard>
            <Head>
                <title>Workwise | Manage Hierarchy</title>
            </Head>
            <ApprovalHierarchyPage />
        </AdminGuard>
    )
}

export default ManageAccounts;
