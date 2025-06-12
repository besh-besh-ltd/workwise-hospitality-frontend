import React from "react";
import Head from "next/head";
import ProjectManagement from "@/components/dashboard/buyer/project-management/project-management";
import ProjectDetails from "@/components/dashboard/buyer/project-management/project-details";
import { TopManagementGuard } from "@/utils/authGuard";

const ProjectDetailsPage = () => {
    return (
        <>
            <Head>
                <title>Workwise | Project Details</title>
            </Head>
            <TopManagementGuard>
                <ProjectDetails />
            </TopManagementGuard>
        </>
    )
}

export default ProjectDetailsPage;