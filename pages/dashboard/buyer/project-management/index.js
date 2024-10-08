import React from "react";
import Head from "next/head";
import ProjectManagement from "@/components/dashboard/buyer/project-management/project-management";

const ProjectManagementPage = () => {
    return (
        <>
            <Head>
                <title>Workwise | Project Management</title>
            </Head>
            <ProjectManagement />
        </>
    )
}

export default ProjectManagementPage;