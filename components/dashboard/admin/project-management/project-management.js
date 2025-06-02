import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderPlus, faEye } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import Pagination from "@/components/shared/Pagination";
import FullLoader from "@/components/shared/FullLoader";
import ReadMore from "@/components/shared/ReadMore";
import DynamicFormModal from "@/components/modal/DynamicFormModal";
import { toast } from "react-toastify";
import { getAllProjects, createProject } from "@/services/project";
import { getCountryCodes } from "@/services/cms";

const ProjectManagementPage = () => {
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalData, setTotalData] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [countryCodes, setCountryCodes] = useState([]);

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

    // Fetch country codes
    const fetchCountryCodes = async () => {
        try {
            const response = await getCountryCodes();
            if (response?.data) {
                setCountryCodes(response.data);
            }
        } catch (error) {
            console.error("Error fetching country codes:", error);
        }
    };

    // Handle create project
    const handleCreateProject = async (projectData) => {
        try {
            setLoading(true);
            const response = await createProject(projectData);
            if (response && respons.status === true) {
                setShowCreateModal(false);
                toast.success("Project created successfully!");
                await fetchProjects();
            } else {
                toast.error("Failed to create project");
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to create project");
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
                if (Array.isArray(projectsData)) {
                    setProjects(projectsData);
                    setTotalData(projectsData.length);
                } else {
                    setProjects([]);
                    setTotalData(0);
                }
            } else {
                toast.error("Failed to fetch projects");
                setProjects([]);
                setTotalData(0);
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to fetch projects");
            setProjects([]);
            setTotalData(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
        fetchCountryCodes();
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
                <DynamicFormModal
                    type="create-project"
                    openModal={showCreateModal}
                    closeModal={() => setShowCreateModal(false)}
                    handleCreateProject={handleCreateProject}
                    countryCodes={countryCodes}
                />
            )}
        </>
    );
};

export default ProjectManagementPage;
