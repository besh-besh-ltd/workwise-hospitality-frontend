import React from "react";
import ProjectDetailsPage from "@/components/dashboard/admin/project-management/project-details";
import Head from "next/head";

const ProjectDetails = () => {
    return (
        <>
            <Head>
                <title>Workwise | Project Details</title>
            </Head>
            <ProjectDetailsPage />
        </>
    )
}

export default ProjectDetails;
