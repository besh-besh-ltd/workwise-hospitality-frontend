import React from "react";
import ManageAccountsPage from "@/components/dashboard/admin/account-management/manage-accounts";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";

const ManageAccounts = () => {
    return (
        <AdminGuard>
            <Head>
                <title>Workwise | Manage Accounts</title>
            </Head>
            <ManageAccountsPage />
        </AdminGuard>
    )
}

export default ManageAccounts;
