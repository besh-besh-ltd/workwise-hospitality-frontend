import React from "react";
import Head from "next/head";
import CompareVendorResponseTable from "@/components/dashboard/buyer/vendorResponseTable";
// import QuoteComparePage from "@/components/dashboard/buyer/quote-compare";

const TechEvaluation = () => {
    return (
        <>
            {/* <Head>
                <title>Workwise | Technicial Evaluation Vendor</title>
            </Head> */}
            <CompareVendorResponseTable vendorName={"vendor 1"} id="vendor"/>
        </>
    )
}

export default TechEvaluation;