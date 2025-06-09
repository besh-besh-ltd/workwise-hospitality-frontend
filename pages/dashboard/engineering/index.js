import React from "react";
import EngineeringPage from "@/components/dashboard/engineering";
import { EngineeringGuard } from "@/utils/authGuard";
import Head from "next/head";

const Engineering = () => {
    return (
        <>
            <Head>
                <title>Engineering Dashboard | Workwise</title>
            </Head>
            <EngineeringGuard>
                <EngineeringPage />
            </EngineeringGuard>
        </>
    )
}

export default Engineering; 