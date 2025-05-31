import React from "react";
import FinancePage from "@/components/dashboard/finance";
import Head from "next/head";
import { FinanceGuard } from "@/utils/authGuard";

const Finance = () => {
    return (
        <>
            <Head>
                <title>Finance Dashboard | Workwise</title>
            </Head>
            <FinanceGuard>
                <FinancePage />
            </FinanceGuard>
        </>
    )
}

export default Finance; 