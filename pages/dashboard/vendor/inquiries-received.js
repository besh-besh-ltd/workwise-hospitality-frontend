import React from "react";
import InquiriesReceivedPage from "@/components/dashboard/vendor/inquiries-received";
import Head from "next/head";
const InquiriesReceived = () => {
    return (
        <>
        <Head>
                <title>Workwise | Received Inquiries</title>
            </Head>
            <InquiriesReceivedPage />
        </>
    )
}

export default InquiriesReceived;