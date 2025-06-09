import React from "react";
import TopManagementPage from "@/components/dashboard/top-management";
import { TopManagementGuard } from "@/utils/authGuard";
import Head from "next/head";

const TopManagement = () => {
    return (
        <>
            <Head>
                <title>Top Management Dashboard | Workwise</title>
            </Head>
            <TopManagementGuard>
                <TopManagementPage />
            </TopManagementGuard>
        </>
    )
}

export default TopManagement; 