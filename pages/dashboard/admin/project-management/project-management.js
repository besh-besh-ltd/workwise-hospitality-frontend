import React from "react";
import ProjectManagementPage from "@/components/dashboard/admin/project-management/project-management";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";

const ProjectManagement = () => {
    return (
        <AdminGuard>
            <Head>
                <title>Workwise | Project Management</title>
            </Head>
            <ProjectManagementPage />
        </AdminGuard>
    )
}

export default ProjectManagement;
