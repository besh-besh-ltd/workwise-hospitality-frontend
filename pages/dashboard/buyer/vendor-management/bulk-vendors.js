import React from "react";
import Head from "next/head";
import BulkVendors from "@/components/dashboard/buyer/vendor-management/bulk-vendors";


// mukul 05-06-2025
//  THIS page is not in use, cross check and remove

const BulkVendorPage = () => {
    return (
        <>
            <Head>
                <title>Workwise | Vendor Management - Bulk Add</title>
            </Head>
            <BulkVendors />
        </>
    )
}

export default BulkVendorPage;