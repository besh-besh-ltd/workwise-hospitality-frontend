
import ForgetPasswordPage from "@/components/forgetPassword";
import React from "react";
import Head from "next/head";


const ChangePassword = (props) => {
    return (
        <>
            <Head>
                <title>Workwise | Forget Password</title>
            </Head>
            <ForgetPasswordPage />
        </>
    )
}

export default ChangePassword;