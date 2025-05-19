import React from "react";
import ProjectManagementPage from "@/components/dashboard/admin/project-management/project-management";
import Head from "next/head";

const ProjectManagement = () => {
    return (
        <>
            <Head>
                <title>Workwise | Project Management</title>
            </Head>
            <ProjectManagementPage />
        </>
    )
}

export default ProjectManagement;
