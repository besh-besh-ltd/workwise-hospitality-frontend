
import ForgetPasswordPage from "@/components/forgetPassword";
import React from "react";
import Head from "next/head";


const ValidateOtp = (props) => {
    return (
        <>
        <Head>
                <title>Workwise | Validate OTP</title>
            </Head>
            <ForgetPasswordPage />
        </>
    )
}

export default ValidateOtp;