import React from "react";
import RfqManagementPage from "@/components/dashboard/buyer/rfq-management";
import Head from "next/head";

const RfqManagement = () => {
    return (
        <>
        <Head>
            <title>Buyer | RFQ Management</title>
        </Head>
            <RfqManagementPage />
        </>
    )
}

export default RfqManagement;