import React from "react";
import VendorManagement from "@/components/dashboard/buyer/vendor-management";
import Head from "next/head";

const VendorManagementPage = () => {
    return (
        <>
            <Head>
                <title>Workwise | Vendor Management</title>
            </Head>
            <VendorManagement />
        </>
    )
}

export default VendorManagementPage;