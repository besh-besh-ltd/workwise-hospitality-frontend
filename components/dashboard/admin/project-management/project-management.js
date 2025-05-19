import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderPlus, faEye } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import Pagination from "@/components/shared/Pagination";
import FullLoader from "@/components/shared/FullLoader";
import ReadMore from "@/components/shared/ReadMore";
import CreateProjectModal from "./CreateProjectModal";
import { toast } from "react-toastify";

const ProjectManagementPage = () => {
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalData, setTotalData] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Mock project data
    const mockProjects = [ 
        {
            id: 1,
            name: "Office Building Renovation",
            description: "Complete renovation of the corporate headquarters including structural repairs, electrical upgrades, and interior redesign.",
            total_rfqs: 15,
            open_rfqs: 5,
            closed_rfqs: 10,
            created_at: "2023-05-10T09:30:00Z",
            status: "active"
        },
        {
            id: 2,
            name: "IT Infrastructure Upgrade",
            description: "Upgrading the company's IT infrastructure including servers, networking equipment, and cybersecurity systems.",
            total_rfqs: 8,
            open_rfqs: 3,
            closed_rfqs: 5,
            created_at: "2023-06-15T14:45:00Z",
            status: "active"
        },
        {
            id: 3,
            name: "Manufacturing Plant Expansion",
            description: "Expansion of the manufacturing facility to increase production capacity by 50%.",
            total_rfqs: 20,
            open_rfqs: 8,
            closed_rfqs: 12,
            created_at: "2023-07-20T11:15:00Z",
            status: "active"
        },
        {
            id: 4,
            name: "Supply Chain Optimization",
            description: "Project to optimize the supply chain processes and reduce logistics costs.",
            total_rfqs: 12,
            open_rfqs: 4,
            closed_rfqs: 8,
            created_at: "2023-08-05T10:00:00Z",
            status: "active"
        },
        {
            id: 5,
            name: "Green Energy Initiative",
            description: "Implementation of solar panels and other renewable energy sources across company facilities.",
            total_rfqs: 10,
            open_rfqs: 6,
            closed_rfqs: 4,
            created_at: "2023-09-12T13:30:00Z",
            status: "active"
        },
        {
            id: 6,
            name: "Product Line Expansion",
            description: "Development and launch of a new product line targeting the consumer market.",
            total_rfqs: 18,
            open_rfqs: 7,
            closed_rfqs: 11,
            created_at: "2023-10-18T09:45:00Z",
            status: "active"
        },
        {
            id: 7,
            name: "Employee Training Program",
            description: "Comprehensive training program for all employees on new technologies and processes.",
            total_rfqs: 5,
            open_rfqs: 2,
            closed_rfqs: 3,
            created_at: "2023-11-22T15:20:00Z",
            status: "active"
        },
        {
            id: 8,
            name: "Quality Control Enhancement",
            description: "Implementation of advanced quality control systems in the production process.",
            total_rfqs: 9,
            open_rfqs: 3,
            closed_rfqs: 6,
            created_at: "2023-12-10T11:10:00Z",
            status: "active"
        }
    ];

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
    const handleCreateProject = (projectData) => {
        // In a real implementation, this would call an API
        const newProject = {
            id: projects.length + 1,
            ...projectData,
            total_rfqs: 0,
            open_rfqs: 0,
            closed_rfqs: 0,
            created_at: new Date().toISOString(),
            status: "active"
        };
        
        setProjects([newProject, ...projects]);
        setTotalData(projects.length + 1);
        toast.success("Project created successfully!");
    };

    // Load mock data
    useEffect(() => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setProjects(mockProjects);
            setTotalData(mockProjects.length);
            setLoading(false);
        }, 500);
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
                                                            <td>{project.total_rfqs || "---"}</td>
                                                            <td>{project.open_rfqs || "---"}</td>
                                                            <td>{project.closed_rfqs || "---"}</td>
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
