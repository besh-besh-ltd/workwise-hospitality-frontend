import React from "react";
import CreateAccountPage from "@/components/dashboard/admin/account-management/create-account";
import Head from "next/head";

const CreateAccount = () => {
    return (
        <>
            <Head>
                <title>Workwise | Create Account</title>
            </Head>
            <CreateAccountPage />
        </>
    )
}

export default CreateAccount;
