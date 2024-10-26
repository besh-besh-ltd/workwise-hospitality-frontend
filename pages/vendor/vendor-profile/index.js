import React from "react";
import VendorProfileComp from "@/components/dashboard/vendor/vendor-editprofile";
import Head from "next/head";

const VendorProfile = () => {
    return (
        <>
            <Head>
                <title>Workwise | Vendor Profile</title>
                <meta name="description" content="Workwise saves 5% on costs and 90% on time in procurement, and helps you win double the tenders. Work wisely with master vendor database, automate RFQs & rate comparisons" />        
            
                <meta property="og:title" content="Workwise | Find Approved Vendors, Automate RFQs, Compare Rates" />
                <meta property="og:description" content="A brief description of vendor-profile page's content." />
                <meta property="og:url" content="https://letsworkwise.com/vendor/vendor-profile" />
            </Head>
            <VendorProfileComp />
        </>
    )
}

export default VendorProfile;