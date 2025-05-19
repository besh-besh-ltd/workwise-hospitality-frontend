import React from "react";
import { ManageAccountsPage } from "@/components/dashboard/admin/account-management";
import Head from "next/head";

const ManageAccounts = () => {
    return (
        <>
            <Head>
                <title>Workwise | Manage Accounts</title>
            </Head>
            <ManageAccountsPage />
        </>
    )
}

export default ManageAccounts;
