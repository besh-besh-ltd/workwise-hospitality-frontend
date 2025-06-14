import React from "react";
// import TopManagementPage from "@/components/dashboard/management";
import { TopManagementGuard } from "@/utils/authGuard";
import BuyerPage from "@/components/dashboard/buyer";

import Head from "next/head";

const TopManagement = () => {
    return (
        <>
            <Head>
                <title>Management Dashboard | Workwise</title>
            </Head>
            <TopManagementGuard>
                {/* <TopManagementPage /> */}
                        <BuyerPage />
            </TopManagementGuard>

        </>
    )
}

export default TopManagement; 