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

const ProjectDetailsPage = () => {
    const router = useRouter();
    const { projectId } = router.query;

    const [loading, setLoading] = useState(false);
    const [project, setProject] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalData, setTotalData] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddTeamModal, setShowAddTeamModal] = useState(false);

    // Mock project data
    const mockProject = {
        id: 1,
        name: "Office Building Renovation",
        description: "Complete renovation of the corporate headquarters including structural repairs, electrical upgrades, and interior redesign.",
        location: "New York, NY",
        rfq_type: "firm",
        reverse_auction: 1,
        ended_at: "2024-12-31",
        total_rfqs: 15,
        open_rfqs: 5,
        closed_rfqs: 10,
        created_at: "2023-05-10T09:30:00Z",
        status: "active",
        team_members: [1, 3, 4] // IDs of team members assigned to the project
    };

    // Mock team members data
    const mockTeamMembers = [
        {
            id: 1,
            name: "John Doe",
            email: "john.doe@example.com",
            role: 8, // Top Management
            added_at: "2023-05-15T10:30:00Z"
        },
        {
            id: 2,
            name: "Jane Smith",
            email: "jane.smith@example.com",
            role: 2, // Procurement
            added_at: "2023-06-20T14:45:00Z"
        },
        {
            id: 3,
            name: "Robert Johnson",
            email: "robert.johnson@example.com",
            role: 9, // Engineering
            added_at: "2023-07-10T09:15:00Z"
        },
        {
            id: 4,
            name: "Emily Davis",
            email: "emily.davis@example.com",
            role: 10, // Finance
            added_at: "2023-08-05T16:20:00Z"
        }
    ];

    // Role options with color coding
    const roleOptions = [
        { value: 8, label: "Top Management", color: "#2E5BA8" }, // Primary color
        { value: 2, label: "Procurement", color: "#428B41" }, // Secondary color
        { value: 9, label: "Engineering", color: "#FFE600" }, // Yellow color
        { value: 10, label: "Finance", color: "#5b5b5b" }, // Text color
    ];

    // Load mock data
    useEffect(() => {
        if (projectId) {
            setLoading(true);
            // Simulate API call
            setTimeout(() => {
                setProject(mockProject);
                setTeamMembers(mockTeamMembers);
                setTotalData(mockTeamMembers.length);
                setLoading(false);
            }, 500);
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
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Get role label and color
    const getRoleInfo = (roleId) => {
        const role = roleOptions.find(r => r.value === roleId);
        return role || { label: "Unknown", color: "#000000" };
    };

    // Handle edit project
    const handleEditProject = (updatedProject) => {
        // In a real implementation, this would call an API

        // Update the project with the new data
        setProject({
            ...project,
            ...updatedProject
        });

        // If team members were updated, update the team members list
        if (updatedProject.team_members && updatedProject.team_members.length > 0) {
            // In a real app, this would be handled by the API
            // For this mock implementation, we'll update the team members list based on the IDs
            const updatedTeamMemberIds = updatedProject.team_members;

            // Filter out team members that are no longer assigned to the project
            const remainingTeamMembers = teamMembers.filter(member =>
                updatedTeamMemberIds.includes(member.id)
            );

            // Add any new team members that weren't previously assigned
            const existingIds = remainingTeamMembers.map(member => member.id);
            const newMemberIds = updatedTeamMemberIds.filter(id => !existingIds.includes(id));

            // For this mock implementation, we'll create new team member objects for any new IDs
            // In a real app, this data would come from the API
            const newTeamMembers = newMemberIds.map(id => {
                // Find the role based on the mock data pattern (1-4 are Top Management, 5-8 are Procurement, etc.)
                let role = 8; // Default to Top Management
                if (id % 4 === 2) role = 2; // Procurement
                if (id % 4 === 3) role = 9; // Engineering
                if (id % 4 === 0) role = 10; // Finance

                return {
                    id: id,
                    name: `Team Member ${id}`,
                    email: `member${id}@example.com`,
                    role: role,
                    added_at: new Date().toISOString()
                };
            });

            // Update the team members list
            const updatedTeamMembers = [...remainingTeamMembers, ...newTeamMembers];
            setTeamMembers(updatedTeamMembers);
            setTotalData(updatedTeamMembers.length);
        }

        toast.success("Project updated successfully!");
    };

    // Handle add team member
    const handleAddTeamMember = (newMember) => {
        // In a real implementation, this would call an API
        const teamMember = {
            id: teamMembers.length + 1,
            ...newMember,
            added_at: new Date().toISOString()
        };

        setTeamMembers([...teamMembers, teamMember]);
        setTotalData(teamMembers.length + 1);
        toast.success("Team member added successfully!");
    };

    // Handle remove team member
    const handleRemoveTeamMember = (memberId) => {
        // In a real implementation, this would call an API
        const updatedTeamMembers = teamMembers.filter(member => member.id !== memberId);
        setTeamMembers(updatedTeamMembers);
        setTotalData(updatedTeamMembers.length);
        toast.success("Team member removed successfully!");
    };

    if (!project && !loading) {
        return (
            <div className="container-fluid mt-5">
                <div className="alert alert-warning">
                    Project not found or invalid project ID.
                </div>
                <Link href="/dashboard/admin/project-management" className="btn btn-primary">
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
                            <Link href="/dashboard/admin/project-management" className="btn btn-outline-secondary">
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
                                                >
                                                    <FontAwesomeIcon icon={faEdit} className="me-2" />
                                                    Edit Project
                                                </button>
                                            </div>

                                            <div className="row">
                                                <div className="col-md-8">
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

                                                <div className="col-md-4">
                                                    <div className="card bg-light">
                                                        <div className="card-body">
                                                            <h5 className="card-title">RFQ Statistics</h5>
                                                            <div className="d-flex justify-content-between mb-2">
                                                                <span>Total RFQs:</span>
                                                                <strong>{project.total_rfqs}</strong>
                                                            </div>
                                                            <div className="d-flex justify-content-between mb-2">
                                                                <span>Open RFQs:</span>
                                                                <strong>{project.open_rfqs}</strong>
                                                            </div>
                                                            <div className="d-flex justify-content-between">
                                                                <span>Closed RFQs:</span>
                                                                <strong>{project.closed_rfqs}</strong>
                                                            </div>
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
                                                >
                                                    <FontAwesomeIcon icon={faUserPlus} className="me-2" />
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
                                                                            >
                                                                                <FontAwesomeIcon icon={faTrash} />
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
