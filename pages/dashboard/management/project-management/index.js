import React from "react";
import Head from "next/head";
import ProjectManagement from "@/components/dashboard/buyer/project-management/project-management";
import { TopManagementGuard } from "@/utils/authGuard";

const ProjectManagementPage = () => {
    return (
        <>
            <Head>
                <title>Workwise | Project Management</title>
            </Head>
            <TopManagementGuard>
                <ProjectManagement />
            </TopManagementGuard>
        </>
    )
}

export default ProjectManagementPage;