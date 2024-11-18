import React from "react";
import Head from "next/head";
import CompareVendorResponse from "@/components/dashboard/buyer/vendor-response";
// import QuoteComparePage from "@/components/dashboard/buyer/quote-compare";

const TechEvaluation = () => {
    return (
        <>
            <Head>
                <title>Workwise | Technicial Evaluation</title>
            </Head>
            <CompareVendorResponse/>
        </>
    )
}

export default TechEvaluation;