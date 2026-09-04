import ChangePasswordPage from "@/components/changePassword";
import React from "react";
import Head from "next/head";


const ChangePassword = (props) => {
    return (
        <>
            <Head>
                <title>Workwise | Change Password</title>
            </Head>

            <ChangePasswordPage />
        </>
    )
}

export default ChangePassword;