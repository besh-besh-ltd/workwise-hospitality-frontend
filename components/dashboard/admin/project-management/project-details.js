import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faEdit, faUserPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import FullLoader from "@/components/shared/FullLoader";
import Pagination from "@/components/shared/Pagination";
import { toast } from "react-toastify";
import EditProjectModal from "./EditProjectModal";
import AddTeamMemberModal from "./AddTeamMemberModal";
import { getProjectById, updateProject, getProjectTeamMembers, addTeamMember, removeTeamMember } from "@/services/project";

const ProjectDetailsPage = () => {
    const router = useRouter();
    const { projectId } = router.query;

    const [loading, setLoading] = useState(true);
    const [project, setProject] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalData, setTotalData] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddTeamModal, setShowAddTeamModal] = useState(false);

    // Role options with color coding
    const roleOptions = [
        { value: 8, label: "Top Management", color: "#2E5BA8" }, // Primary color
        { value: 2, label: "Procurement", color: "#428B41" }, // Secondary color
        { value: 9, label: "Engineering", color: "#FFE600" }, // Yellow color
        { value: 10, label: "Finance", color: "#5b5b5b" }, // Text color
    ];

    // Fetch project details
    const fetchProjectDetails = async () => {
        try {
            setLoading(true);
            const timestamp = new Date().getTime();
            const response = await getProjectById(projectId, { t: timestamp });
            if (response && response.data && response.data.status && response.data.data) {
                const projectData = Array.isArray(response.data.data) && response.data.data.length > 0 
                    ? response.data.data[0] 
                    : response.data.data;
                
                if (!projectData || (Array.isArray(projectData) && projectData.length === 0)) {
                    toast.error("Project not found or access denied");
                    setProject(null);
                } else {
                    setProject(projectData);
                    try {
                        setTeamMembers([]);
                        setTotalData(0);
                    } catch (teamError) {
                        toast.error("Failed to fetch team members");
                        setTeamMembers([]);
                        setTotalData(0);
                    }
                }
            } else {
                toast.error("Failed to fetch project details");
                setProject(null);
            }
        } catch (error) {
            toast.error(error?.message?.response?.data?.message || "Failed to fetch project details");
            setProject(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchProjectDetails();
        }
    }, [projectId]);

    // Get paginated data
    const getPaginatedData = () => {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        return teamMembers.slice(startIndex, endIndex);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "Not specified";
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    };

    // Get role label and color
    const getRoleInfo = (roleId) => {
        const role = roleOptions.find(r => r.value === roleId);
        return role || { label: "Unknown", color: "#000000" };
    };

    // Handle edit project
    const handleEditProject = async (updatedProject) => {
        try {
            setLoading(true);
            const response = await updateProject(projectId, updatedProject);
            if (response && response.data && response.data.status) {
                setProject({
                    ...project,
                    ...response.data.data
                });
                
                toast.success("Project updated successfully!");
            } else {
                toast.error("Failed to update project");
            }
        } catch (error) {
            toast.error(error?.message?.response?.data?.message || "Failed to update project");
        } finally {
            setLoading(false);
            setShowEditModal(false);
        }
    };

    // Handle add team member
    const handleAddTeamMember = async (newMember) => {
        try {
            setLoading(true);
            const teamMember = {
                id: teamMembers.length + 1,
                ...newMember,
                added_at: new Date().toISOString()
            };
            
            const updatedTeamMembers = [...teamMembers, teamMember];
            setTeamMembers(updatedTeamMembers);
            setTotalData(updatedTeamMembers.length);
            
            toast.success("Team member added successfully!");
        } catch (error) {
            toast.error("Failed to add team member");
        } finally {
            setLoading(false);
            setShowAddTeamModal(false);
        }
    };

    // Handle remove team member
    const handleRemoveTeamMember = async (memberId) => {
        try {
            setLoading(true);
            const updatedTeamMembers = teamMembers.filter(member => member.id !== memberId);
            setTeamMembers(updatedTeamMembers);
            setTotalData(updatedTeamMembers.length);
            
            toast.success("Team member removed successfully!");
        } catch (error) {
            toast.error("Failed to remove team member");
        } finally {
            setLoading(false);
        }
    };

    if (!project && !loading) {
        return (
            <div className="container-fluid mt-5">
                <div className="alert alert-warning">
                    Project not found or invalid project ID.
                </div>
                <Link href="/dashboard/admin/project-management/project-management" className="btn btn-primary">
                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                    Back to Projects
                </Link>
            </div>
        );
    }

    return (
        <>
            <section className="buyer-common-header sc-pt-80">
                <div className="container-fluid">
                    <h1 className="heading">Project Details</h1>
                </div>
            </section>

            <section className="buyer-sec-1">
                <div className="container-fluid">
                    <div className="row mb-4">
                        <div className="col-md-12">
                            <Link href="/dashboard/admin/project-management/project-management" className="btn btn-outline-secondary">
                                <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                Back to Projects
                            </Link>
                        </div>
                    </div>

                    {loading ? (
                        <div className="hasFullLoader">
                            <FullLoader />
                        </div>
                    ) : (
                        <>
                            {/* Project Details Card */}
                            <div className="row mb-4">
                                <div className="col-md-12">
                                    <div className="card shadow-sm">
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h3 className="card-title">{project.name}</h3>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => setShowEditModal(true)}
                                                    style={{
                                                        padding: "10px 20px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: "8px",
                                                        width: "auto",
                                                        minWidth: "180px"
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                    Edit Project
                                                </button>
                                            </div>

                                            <div className="row">
                                                <div className="col-md-12">
                                                    <p className="text-muted mb-4">{project.description}</p>

                                                    <div className="row mb-3">
                                                        <div className="col-md-4">
                                                            <strong>Location:</strong>
                                                        </div>
                                                        <div className="col-md-8">
                                                            {project.location}
                                                        </div>
                                                    </div>

                                                    <div className="row mb-3">
                                                        <div className="col-md-4">
                                                            <strong>RFQ Type:</strong>
                                                        </div>
                                                        <div className="col-md-8">
                                                            {project.rfq_type ? project.rfq_type.charAt(0).toUpperCase() + project.rfq_type.slice(1) : "Not specified"}
                                                        </div>
                                                    </div>

                                                    <div className="row mb-3">
                                                        <div className="col-md-4">
                                                            <strong>Reverse Auction:</strong>
                                                        </div>
                                                        <div className="col-md-8">
                                                            {project.reverse_auction ? "Enabled" : "Disabled"}
                                                        </div>
                                                    </div>

                                                    <div className="row mb-3">
                                                        <div className="col-md-4">
                                                            <strong>End Date:</strong>
                                                        </div>
                                                        <div className="col-md-8">
                                                            {project.ended_at ? formatDate(project.ended_at) : "Not specified"}
                                                        </div>
                                                    </div>

                                                    <div className="row mb-3">
                                                        <div className="col-md-4">
                                                            <strong>Created At:</strong>
                                                        </div>
                                                        <div className="col-md-8">
                                                            {formatDate(project.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Team Members Section */}
                            <div className="row">
                                <div className="col-md-12">
                                    <div className="card shadow-sm">
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-center mb-4">
                                                <h4 className="card-title">Project Team</h4>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => setShowAddTeamModal(true)}
                                                    style={{
                                                        padding: "10px 20px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: "8px",
                                                        width: "auto",
                                                        minWidth: "180px"
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={faUserPlus} />
                                                    Add Team Member
                                                </button>
                                            </div>

                                            {teamMembers.length === 0 ? (
                                                <p>No team members assigned to this project yet.</p>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-striped">
                                                        <thead>
                                                            <tr>
                                                                <th>Name</th>
                                                                <th>Email</th>
                                                                <th>Role</th>
                                                                <th>Added On</th>
                                                                <th>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {getPaginatedData().map((member) => {
                                                                const roleInfo = getRoleInfo(member.role);
                                                                return (
                                                                    <tr key={`member_${member.id}`}>
                                                                        <td>{member.name}</td>
                                                                        <td>{member.email}</td>
                                                                        <td>
                                                                            <span
                                                                                className="badge"
                                                                                style={{
                                                                                    backgroundColor: roleInfo.color,
                                                                                    color: roleInfo.color === "#FFE600" ? "#000" : "#fff",
                                                                                    padding: "6px 10px"
                                                                                }}
                                                                            >
                                                                                {roleInfo.label}
                                                                            </span>
                                                                        </td>
                                                                        <td>{formatDate(member.added_at)}</td>
                                                                        <td>
                                                                            <button
                                                                                className="btn btn-sm btn-danger"
                                                                                onClick={() => handleRemoveTeamMember(member.id)}
                                                                                style={{
                                                                                    padding: "3px 12px",
                                                                                    fontSize: "0.8rem",
                                                                                    width: "100px",
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "center",
                                                                                    gap: "5px"
                                                                                }}
                                                                            >
                                                                                <FontAwesomeIcon icon={faTrash} /> Delete
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {teamMembers.length > 0 && (
                                                <Pagination
                                                    page={page}
                                                    setPage={setPage}
                                                    limit={limit}
                                                    setLimit={setLimit}
                                                    totalData={totalData}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Edit Project Modal */}
            {showEditModal && project && (
                <EditProjectModal
                    project={project}
                    isOpen={showEditModal}
                    closeModal={() => setShowEditModal(false)}
                    onSave={handleEditProject}
                />
            )}

            {/* Add Team Member Modal */}
            {showAddTeamModal && (
                <AddTeamMemberModal
                    isOpen={showAddTeamModal}
                    closeModal={() => setShowAddTeamModal(false)}
                    onSave={handleAddTeamMember}
                    roleOptions={roleOptions}
                />
            )}
        </>
    );
};

export default ProjectDetailsPage;
