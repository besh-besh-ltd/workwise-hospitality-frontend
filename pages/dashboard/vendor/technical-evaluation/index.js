import React from "react";
import Head from "next/head";
import VendorTechnicalEvaluation from "@/components/dashboard/vendor/technical-evaluation";


const TechEvaluation = () => {
    return (
        <>
            <Head>
                <title>Workwise | Technicial Evaluation Vendor</title>
            </Head>
            <VendorTechnicalEvaluation />
        </>
    )
}

export default TechEvaluation;