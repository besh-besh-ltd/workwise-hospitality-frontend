import React from "react";
import Head from "next/head";
import CompareVendorResponseTable from "@/components/dashboard/vendor/technical-evaluation/vendorResponseTable";


const TechEvaluation = () => {
    return (
        <>
            <Head>
                <title>Workwise | Technicial Evaluation Vendor</title>
            </Head>
            <CompareVendorResponseTable type={"vendor"} />
        </>
    )
}

export default TechEvaluation;