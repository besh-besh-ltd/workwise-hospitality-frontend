import React from "react";
import ProjectDetailsPage from "@/components/dashboard/admin/project-management/project-details";
import Head from "next/head";
import { AdminGuard } from "@/utils/authGuard";

const ProjectDetails = () => {
    return (
        <AdminGuard>
            <Head>
                <title>Workwise | Project Details</title>
            </Head>
            <ProjectDetailsPage />
        </AdminGuard>
    )
}

export default ProjectDetails;
