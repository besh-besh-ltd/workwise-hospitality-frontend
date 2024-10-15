import React from "react";
import Head from "next/head";
import BulkVendors from "@/components/dashboard/buyer/vendor-management/bulk-vendors";

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