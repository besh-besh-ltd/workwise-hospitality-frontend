import React from "react";
import Head from "next/head";
import CompareVendorResponse from "@/components/dashboard/buyer/technical-evaluation/vendor-response";

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