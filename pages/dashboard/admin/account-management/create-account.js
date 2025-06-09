import React from "react";
import CreateAccountPage from "@/components/dashboard/admin/account-management/create-account";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";

const CreateAccount = () => {
    return (
        <AdminGuard>
            <Head>
                <title>Workwise | Create Account</title>
            </Head>
            <CreateAccountPage />
        </AdminGuard>
    )
}

export default CreateAccount;
