import React from "react";
import InquiriesDetailsPage from "@/components/dashboard/vendor/inquiries-details";
import Head from "next/head";
const InquiriesDetails = () => {
    return (
        <>
        <Head>
                <title>Workwise | Inquiries Details</title>
            </Head>
            <InquiriesDetailsPage />
        </>
    )
}

export default InquiriesDetails;