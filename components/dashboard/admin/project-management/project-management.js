import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderPlus, faEye } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import Pagination from "@/components/shared/Pagination";
import FullLoader from "@/components/shared/FullLoader";
import ReadMore from "@/components/shared/ReadMore";
import CreateProjectModal from "./CreateProjectModal";
import { toast } from "react-toastify";
import { getAllProjects, createProject } from "@/services/project";

const ProjectManagementPage = () => {
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalData, setTotalData] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Get paginated data
    const getPaginatedData = () => {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        return projects.slice(startIndex, endIndex);
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    // Handle create project
    const handleCreateProject = async (projectData) => {
        try {
            setLoading(true);
            const response = await createProject(projectData);
            if (response && response.data && response.data.status === true) {
                // Close modal first
                setShowCreateModal(false);
                toast.success("Project created successfully!");
                await fetchProjects();
            } else {
                toast.error("Failed to create project: Unknown error");
            }
        } catch (error) {
            let errorMessage = "Failed to create project";
            if (error.details) {
                if (error.details.errors && Object.keys(error.details.errors).length > 0) {
                    const firstError = Object.values(error.details.errors)[0];
                    errorMessage = `Failed to create project: ${firstError}`;
                } else if (error.details.message) {
                    errorMessage = `Failed to create project: ${error.details.message}`;
                }
            } else if (error.message && error.message.response && error.message.response.data) {
                // Fallback to the old error format
                errorMessage = error.message.response.data.message || errorMessage;
            }
            
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Fetch projects from API
    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await getAllProjects();
            if (response && response.data) {
                const projectsData = response.data.data;
                if (Array.isArray(projectsData) && projectsData.length > 0) {
                    setProjects(projectsData);
                    setTotalData(projectsData.length);
                } else if (Array.isArray(projectsData)) {
                    setProjects([]);
                    setTotalData(0);
                } else {
                    setProjects([]);
                    setTotalData(0);
                    toast.error("Invalid project data format received");
                }
            } else {
                toast.error("Failed to fetch projects");
                setProjects([]);
                setTotalData(0);
            }
        } catch (error) {
            if (error.data && error.data.message) {
                toast.error(error.data.message);
            } else if (error.message?.response?.data) {
                toast.error(error.message?.response?.data?.message || "Failed to fetch projects");
            } else {
                toast.error("Failed to fetch projects. Please try again.");
            }
            
            setProjects([]);
            setTotalData(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    return (
        <>
            <section className="buyer-common-header sc-pt-80">
                <div className="container-fluid">
                    <h1 className="heading">Project Management</h1>
                </div>
            </section>

            <section className="buyer-sec-1">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="vendor-mngt-con">
                                <div className="d-flex justify-content-end mb-4">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        <FontAwesomeIcon icon={faFolderPlus} className="me-2" />
                                        Create New Project
                                    </button>
                                </div>

                                <div className="details-table hasFullLoader mt-0">
                                    {loading && <FullLoader />}
                                    {!loading && projects.length === 0 && (
                                        <p>No projects found.</p>
                                    )}
                                    {!loading && projects.length > 0 && (
                                        <div className="table-responsive">
                                            <table className="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Project Name</th>
                                                        <th>Description</th>
                                                        <th>Total RFQs</th>
                                                        <th>Open RFQs</th>
                                                        <th>Closed RFQs</th>
                                                        <th>Created Date</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getPaginatedData().map((project, index) => (
                                                        <tr key={`project_${project.id}`}>
                                                            <td>{(page - 1) * limit + index + 1}</td>
                                                            <td>{project.name}</td>
                                                            <td style={{ maxWidth: "450px" }}>
                                                                {project.description ? (
                                                                    <ReadMore content={project.description} maxLines={2} />
                                                                ) : (
                                                                    "---"
                                                                )}
                                                            </td>
                                                            <td>{project.total_rfqs || "0"}</td>
                                                            <td>{project.open_rfqs || "0"}</td>
                                                            <td>{project.closed_rfqs || "0"}</td>
                                                            <td>{formatDate(project.created_at)}</td>
                                                            <td>
                                                                <Link
                                                                    href={`/dashboard/admin/project-management/${project.id}`}
                                                                    className="btn btn-sm btn-primary"
                                                                >
                                                                    <FontAwesomeIcon icon={faEye} className="me-1" />
                                                                    View
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <Pagination
                                        page={page}
                                        setPage={setPage}
                                        limit={limit}
                                        setLimit={setLimit}
                                        totalData={totalData}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Create Project Modal */}
            {showCreateModal && (
                <CreateProjectModal
                    isOpen={showCreateModal}
                    closeModal={() => setShowCreateModal(false)}
                    onSave={handleCreateProject}
                />
            )}
        </>
    );
};

export default ProjectManagementPage;
