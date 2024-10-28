import React from "react";
import VendorProfileComp from "@/components/dashboard/vendor/vendor-editprofile";
import Head from "next/head";

const VendorProfile = () => {
    return (
        <>
            <Head>
                <title>Workwise | Vendor Profile</title>
                <meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />        
            </Head>
            <VendorProfileComp />
        </>
    )
}

export default VendorProfile;