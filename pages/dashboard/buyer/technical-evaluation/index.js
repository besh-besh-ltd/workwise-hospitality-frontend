import React from "react";
import Head from "next/head";
import BuyerTechnicalEvaluation from "@/components/dashboard/buyer/technical-evaluation";

const TechEvaluation = () => {
    return (
        <>
            <Head>
                <title>Workwise | Technicial Evaluation</title>
            </Head>
            <BuyerTechnicalEvaluation />
        </>
    )
}

export default TechEvaluation;