import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faEdit,
  faUserPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import FullLoader from "@/components/shared/FullLoader";
import Pagination from "@/components/shared/Pagination";
import { toast } from "react-toastify";
import DynamicFormModal from "@/components/modal/DynamicFormModal";
import {
  getProjectById,
  updateProject,
  getProjectTeamMembers,
  addTeamMember,
  removeTeamMember,
  getProjectBudget,
} from "@/services/project";
import { getCountryCodes } from "@/services/cms";
import { getCompanyUsers, getProfile } from "@/services/Auth";
import {
  getHospitalityCompanies,
  getHospitalityHotels,
  mapHospitalityProjects,
  deleteProjectMapping,
  getProjectMappings,
} from "@/services/hospitality";
import SmartButton from "@/components/shared/SmartButton";
import { addCommasToNumber, formatDisplayDate } from "@/utils/sharedFunctions";

// Role options with color coding
const roleOptions = [
  { value: 1, label: "Admin", color: "#2E5BA8" }, // Primary color
  { value: 8, label: "Management", color: "#2E5BA8" }, // Primary color
  { value: 2, label: "Procurement", color: "#428B41" }, // Secondary color
  { value: 9, label: "Engineering", color: "#FFE600" }, // Yellow color
  { value: 10, label: "Finance", color: "#5b5b5b" }, // Text color
];

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
  const [countryCodes, setCountryCodes] = useState([]);
  const [teamMemberUsers, setTeamMemberUsers] = useState([]);
  const [projectDetails, setProjectDetails] = useState(null);
  const [projectBudget, setProjectBudget] = useState([]);
  const [openEditProject, setOpenEditProject] = useState(false); 
  const [avlBudget , setAvlBudget] = useState(0);
  const [isHospitalityCompany, setIsHospitalityCompany] = useState(false);
  const [hospitalityCompanies, setHospitalityCompanies] = useState([]);
  const [selectedHospitalityCompany, setSelectedHospitalityCompany] = useState("");
  const [hotelsByCompany, setHotelsByCompany] = useState({});
  const [hospitalityForm, setHospitalityForm] = useState({
    mappingLevel: "company",
    hotelId: "",
  });
  const [projectHospitalityMappings, setProjectHospitalityMappings] = useState([]);
  const [isLoadingHospitalityData, setIsLoadingHospitalityData] = useState(false);
  const [isSavingHospitality, setIsSavingHospitality] = useState(false);



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

  const fetchHospitalityProfile = async () => {
    try {
      const response = await getProfile();
      const profile = response?.data;
      const hospitalityEnabled =
        profile?.is_hospitality === 1 || profile?.is_hospitality === "1";
      setIsHospitalityCompany(hospitalityEnabled);
      if (hospitalityEnabled) {
        await Promise.all([loadHospitalityCompanies(), loadProjectHospitalityMappings()]);
      }
    } catch (error) {
      setIsHospitalityCompany(false);
    }
  };

  const loadHospitalityCompanies = async () => {
    try {
      const response = await getHospitalityCompanies();
      const list = response?.data ?? response ?? [];
      setHospitalityCompanies(list);
      if (list.length) {
        setSelectedHospitalityCompany((prev) =>
          prev && list.some((company) => company.id === parseInt(prev, 10))
            ? prev
            : list[0].id
        );
      }
    } catch (error) {
      setHospitalityCompanies([]);
    }
  };

  const loadCompanyHotels = async (companyId) => {
    if (!companyId) return;
    if (hotelsByCompany[companyId]) {
      return;
    }
    try {
      const response = await getHospitalityHotels(companyId);
      const hotels = response?.data ?? response ?? [];
      setHotelsByCompany((prev) => ({
        ...prev,
        [companyId]: hotels,
      }));
    } catch (error) {
      setHotelsByCompany((prev) => ({
        ...prev,
        [companyId]: [],
      }));
    }
  };

  const loadProjectHospitalityMappings = async () => {
    if (!projectId) return;
    try {
      setIsLoadingHospitalityData(true);
      const response = await getProjectMappings(projectId);
      const data = response?.data?.data || response?.data || [];
      setProjectHospitalityMappings(data);
    } catch (error) {
      setProjectHospitalityMappings([]);
    } finally {
      setIsLoadingHospitalityData(false);
    }
  };

  // Fetch team member users
  const fetchTeamMemberUsers = async () => {
    try {
      const response = await getCompanyUsers();
      if (response.status) {
        const formattedUsers = response.data.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        }));

        // Only show active users
        const activeUsers = formattedUsers.filter(
          (user) => user.status === "active"
        );
        setTeamMemberUsers(activeUsers);
      } else {
        toast.error("Failed to fetch users");
        setTeamMemberUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
      setTeamMemberUsers([]);
    }
  };

  // Fetch project details
  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const timestamp = new Date().getTime();
      const response = await getProjectById(projectId, { t: timestamp });
      if (
        response &&
        response.data &&
        response.data.status &&
        response.data.data
      ) {
        const projectData =
          Array.isArray(response.data.data) && response.data.data.length > 0
            ? response.data.data[0]
            : response.data.data;

        if (
          !projectData ||
          (Array.isArray(projectData) && projectData.length === 0)
        ) {
          toast.error("Project not found or access denied");
          setProject(null);
        } else {
          setProject(projectData);
          try {
            // setTeamMembers([]);
            // setTotalData(0);
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
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to fetch project details"
      );
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch team members
  const fetchTeamMembers = async () => {
    try {
      if (!projectId) return;

      const response = await getProjectTeamMembers(projectId);

      if (response && response.data && response.data.status) {
        // Ensure data is an array
        let teamData = response.data.data || [];
        if (!Array.isArray(teamData)) {
          teamData = teamData ? [teamData] : [];
        }

        setTeamMembers(teamData);
        setTotalData(teamData.length);
      } else {
        setTeamMembers([]);
        setTotalData(0);
      }
    } catch (error) {
      setTeamMembers([]);
      setTotalData(0);
    }
  };

  const getProjectBudgetData = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const res = await getProjectBudget(projectId);
      let avlAmount = 0;
      const processedData = (res || []).map((item) => {
        avlAmount += parseFloat(item.total_value) || 0;
        return {
          ...item,
          total_value: parseFloat(item.total_value) || 0,
        };
      });
      setAvlBudget(avlAmount);

      setProjectBudget(processedData);
      // Handle different response structures
      if (res) {
        setProjectBudget(res);
      } else {
        setProjectBudget([]);
      }
    } catch (error) {
      setProjectBudget([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (projectId && projectId !== "undefined") {
      getProjectBudgetData();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchTeamMembers();
      fetchCountryCodes();
      fetchTeamMemberUsers();
      fetchHospitalityProfile();
    }
  }, [projectId]);   

  useEffect(() => {
    if (isHospitalityCompany && selectedHospitalityCompany) {
      loadCompanyHotels(selectedHospitalityCompany);
    }
  }, [isHospitalityCompany, selectedHospitalityCompany]);

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
      return formatDisplayDate(dateString);
    } catch (error) {
      return dateString;
    }
  };

  // Get role label and color
  const getRoleInfo = (roleId) => {
    const role = roleOptions.find((r) => r.value === roleId);
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
          ...response.data.data,
        });

        toast.success("Project updated successfully!");
      } else {
        toast.error("Failed to update project");
      }
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message || "Failed to update project"
      );
    } finally {
      setLoading(false);
      setShowEditModal(false);
    }
  };

  // Handle add team member
  const handleAddTeamMember = async (newMember, resetForm) => {
    try {
      setLoading(true);

      const response = await addTeamMember(projectId, newMember);

      if (response && response.data && response.data.status) {
        // Wait a moment before fetching the updated team members to ensure backend has processed the addition
        await fetchTeamMembers();
        setLoading(false);
        toast.success("Team member added successfully!");
        setShowAddTeamModal(false);
        if (resetForm) resetForm();
      } else {
        toast.error(response?.data?.message || "Failed to add team member");
        setLoading(false);
        setShowAddTeamModal(false);
      }
    } catch (error) {
      // Try to extract a meaningful error message
      let errorMessage = "Failed to add team member";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message?.response?.data?.message) {
        errorMessage = error.message.response.data.message;
      }

      toast.error(errorMessage);
      setLoading(false);
      setShowAddTeamModal(false);

      // If the error might be because the user is already a team member but UI isn't showing it,
      // refresh the team members list anyway
      await fetchTeamMembers();
    }
  };

  // Handle remove team member
  const handleRemoveTeamMember = async (userId) => {
    try {
      setLoading(true);
      const response = await removeTeamMember(projectId, userId);

      if (response && response.data && response.data.status) {
        // Wait a moment before fetching the updated team members to ensure backend has processed the removal
        await fetchTeamMembers();
        setLoading(false);
        toast.success("Team member removed successfully!");
      } else {
        toast.error(response?.data?.message || "Failed to remove team member");

        // Still try to refresh the team members list in case the backend succeeded but returned an unexpected response
        await fetchTeamMembers();
        setLoading(false);
      }
    } catch (error) {
      // Try to extract a meaningful error message
      let errorMessage = "Failed to remove team member";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message?.response?.data?.message) {
        errorMessage = error.message.response.data.message;
      }

      toast.error(errorMessage);

      // Still try to refresh the team members list in case the backend succeeded but returned an error
      await fetchTeamMembers();
      setLoading(false);
    }
  };

  const handleHospitalityMappingSubmit = async (event) => {
    event.preventDefault();
    if (!selectedHospitalityCompany) {
      toast.error("Select a hospitality company");
      return;
    }
    if (
      hospitalityForm.mappingLevel === "hotel" &&
      !hospitalityForm.hotelId
    ) {
      toast.error("Select a business unit for business unit-level mapping");
      return;
    }
    try {
      setIsSavingHospitality(true);
      await mapHospitalityProjects(selectedHospitalityCompany, {
        mapping_type: hospitalityForm.mappingLevel === "company" ? 0 : 1,
        hotel_id:
          hospitalityForm.mappingLevel === "hotel"
            ? parseInt(hospitalityForm.hotelId, 10)
            : null,
        project_ids: [parseInt(projectId, 10)],
      });
      toast.success("Project mapped successfully");
      setHospitalityForm({
        mappingLevel: "company",
        hotelId: "",
      });
      await loadProjectHospitalityMappings();
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to map project"
      );
    } finally {
      setIsSavingHospitality(false);
    }
  };

  const handleRemoveHospitalityMapping = async (mapping) => {
    try {
      setIsLoadingHospitalityData(true);
      await deleteProjectMapping(projectId, {
        company_id: mapping.hospitality_company_id,
        mapping_type: mapping.mapping_type,
        hotel_id:
          mapping.mapping_type === 1
            ? mapping.hospitality_hotel_id
            : null,
      });
      toast.success("Mapping removed");
      await loadProjectHospitalityMappings();
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to remove mapping"
      );
    } finally {
      setIsLoadingHospitalityData(false);
    }
  };

  const currentCompanyHotels =
    (selectedHospitalityCompany &&
      hotelsByCompany[selectedHospitalityCompany]) ||
    [];

  if (!project && !loading) {
    return (
      <div className="container-fluid mt-5">
        <div className="alert alert-warning">
          Project not found or invalid project ID.
        </div>
        <Link
          href="/dashboard/admin/project-management/project-management"
          className="btn btn-primary"
        >
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
          {loading ? (
            <div className="hasFullLoader">
              <FullLoader />
            </div>
          ) : (
            <>
              {/* Project Details Card */}
              <div className="row">
                {/* Project Info Column */}
                <div className="col-md-6 mb-4">
                  <div className="card h-100 shadow-sm border-primary">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3 className="card-title">{project.name}</h3>
                        <SmartButton
                          label="Edit Project"
                          icon={<FontAwesomeIcon icon={faEdit} />}
                          iconPosition="left"
                          theme="primary"
                          onClick={() => setShowEditModal(true)}
                          width="fit-content"
                          className="p-3"
                          id="edit_project-project_actions-project_details_page"
                        />
                      </div>

                      <p className="text-muted mb-4">{project.description}</p>

                      <div className="row mb-3">
                        <div className="col-md-4">
                          <strong>Location:</strong>
                        </div>
                        <div className="col-md-8">{project.location}</div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-4">
                          <strong>RFQ Type:</strong>
                        </div>
                        <div className="col-md-8">
                          {project.rfq_type
                            ? project.rfq_type.charAt(0).toUpperCase() +
                              project.rfq_type.slice(1)
                            : "Not specified"}
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
                          {project.ended_at
                            ? formatDate(project.ended_at)
                            : "Not specified"}
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

                      <div className="row mb-3">
                        <div className="col-md-4">
                          <strong>Budget:</strong>
                        </div>
                        <div className="col-md-8">
                          {project?.budget || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Budget Column */}
                <div className="col-md-6 mb-4">
                  <div className="card h-100 shadow-sm border-success">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h3 className="card-title">Project Procurement Budget</h3>
                        {!project?.budget || project?.budget == 0 ? (
                          <button
                            type="button"
                            className="btn btn-primary text-sm px-3"
                            onClick={() => setOpenEditProject(true)}
                            id="add_budget-project_budget-project_details_page"
                          >
                            <FontAwesomeIcon icon={faEdit} className="me-2" />
                            Add Budget
                          </button>
                        ) : (
                          <div className="text-end">
                            <p className="fw-bold m-0">
                              Budget: ₹{addCommasToNumber(project?.budget)}
                            </p>
                            <p className="fw-bold m-0">
                              Available Budget: ₹
                              {addCommasToNumber(Math.max(project?.budget - avlBudget, 0))}
                            </p>
                          </div>
                        )}
                      </div>

                      <hr />

                      <div className="budget-header d-flex justify-content-between mb-2 p-2 bg-light rounded fw-bold">
                        <span>RFQ NO</span>
                        <span style={{ width: "150px", textAlign: "center" }}>
                          Vendor
                        </span>
                        <span style={{ width: "150px", textAlign: "center" }}>
                          Date
                        </span>
                        <span className="text-end">Amount</span>
                      </div>

                      <div
                        className="budget-items"
                        style={{ maxHeight: "180px", overflowY: "auto" }}
                      >
                        {projectBudget?.length > 0 ? (
                          projectBudget.map((item) => (
                            <div
                              key={item.id}
                              className="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom"
                            >
                              <span className="text-muted">{item.rfq_no}</span>
                              <span style={{ width: "150px" }}>
                                {item.vendor_name}
                              </span>
                              <span style={{ width: "150px" }}>
                                {new Date(item.updated_at).toLocaleDateString()}
                              </span>
                              <span className="text-danger fw-bold text-end">
                                ₹{addCommasToNumber(parseFloat(item.total_value).toFixed(2))}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-3 text-muted">
                            No budget data available
                          </div>
                        )}
                      </div>

                      {projectBudget?.length > 0 && (
                        <div className="mt-4 pt-3 border-top">
                          <div className="d-flex justify-content-between">
                            <span className="fw-bold">Total Items:</span>
                            <span className="fw-bold">
                              {projectBudget.length}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between mt-2">
                            <span className="fw-bold">Total Expenditure:</span>
                            <span className="text-danger fw-bold">
                              ₹
                              {addCommasToNumber(projectBudget
                                .reduce(
                                  (sum, item) =>
                                    sum + parseFloat(item.total_value),
                                  0
                                )
                                .toFixed(2))}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between mt-2">
                            <span className="fw-bold">Budget:</span>
                            <span className="text-danger fw-bold">
                              ₹{addCommasToNumber(project?.budget || 0)}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between mt-2">
                            <span className="fw-bold">Available Budget:</span>
                            <span className="text-danger fw-bold">
                              ₹
                              {addCommasToNumber(Math.max(
                                project?.budget - (avlBudget || 0),
                                0
                              ))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {isHospitalityCompany && (
                <div className="row">
                  <div className="col-md-12 mb-4">
                    <div className="card shadow-sm border-0">
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <h3 className="card-title mb-1">Hospitality Mapping</h3>
                            <small className="text-muted">
                              Map this project to hospitality companies or business units
                            </small>
                          </div>
                        </div>

                        {isLoadingHospitalityData ? (
                          <p className="text-muted mb-4">Loading mappings…</p>
                        ) : projectHospitalityMappings.length === 0 ? (
                          <p className="text-muted mb-4">This project is not mapped to any hospitality scope yet.</p>
                        ) : (
                          <div className="table-responsive mb-4">
                            <table className="table table-striped align-middle">
                              <thead>
                                <tr>
                                  <th>Scope</th>
                                  <th>Company / Business Unit</th>
                                  <th>Mapped On</th>
                                  <th className="text-end">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {projectHospitalityMappings.map((mapping) => (
                                  <tr key={`mapping-${mapping.id}`}>
                                    <td>
                                      <span
                                        className={`badge ${
                                          mapping.mapping_type === 0
                                            ? "bg-primary"
                                            : "bg-success"
                                        }`}
                                      >
                                        {mapping.mapping_type === 0 ? "Company" : "Business Unit"}
                                      </span>
                                    </td>
                                    <td>
                                      {mapping.mapping_type === 0
                                        ? mapping.company_name || "N/A"
                                        : mapping.hotel_name || "N/A"}
                                    </td>
                                    <td>{formatDate(mapping.created_at)}</td>
                                    <td className="text-end">
                                      <SmartButton
                                        label="Remove"
                                        theme="red"
                                        className="px-3 py-1"
                                        onClick={() => handleRemoveHospitalityMapping(mapping)}
                                        id={`remove_mapping_${mapping.id}-hospitality_actions-project_details_page`}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <hr className="mb-4" />

                        {hospitalityCompanies.length === 0 ? (
                          <p className="text-muted mb-0">
                            No hospitality companies available. Create one from the Hospitality Manager.
                          </p>
                        ) : (
                          <form onSubmit={handleHospitalityMappingSubmit} className="row g-3">
                            <div className="col-md-4">
                              <label className="form-label">Hospitality Company</label>
                              <select
                                className="form-select"
                                value={selectedHospitalityCompany}
                                onChange={(e) => {
                                  setSelectedHospitalityCompany(e.target.value);
                                  setHospitalityForm((prev) => ({
                                    ...prev,
                                    hotelId: "",
                                  }));
                                }}
                              >
                                {hospitalityCompanies.map((company) => (
                                  <option key={company.id} value={company.id}>
                                    {company.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label">Mapping Level</label>
                              <select
                                className="form-select"
                                value={hospitalityForm.mappingLevel}
                                onChange={(e) =>
                                  setHospitalityForm((prev) => ({
                                    ...prev,
                                    mappingLevel: e.target.value,
                                    hotelId: e.target.value === "company" ? "" : prev.hotelId,
                                  }))
                                }
                              >
                                <option value="company">Company</option>
                                <option value="hotel">Specific Business Unit</option>
                              </select>
                            </div>
                            {hospitalityForm.mappingLevel === "hotel" && (
                              <div className="col-md-3">
                                <label className="form-label">Business Unit</label>
                                <select
                                  className="form-select"
                                  value={hospitalityForm.hotelId}
                                  onChange={(e) =>
                                    setHospitalityForm((prev) => ({
                                      ...prev,
                                      hotelId: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Select Business Unit</option>
                                  {currentCompanyHotels.map((hotel) => (
                                    <option key={hotel.id} value={hotel.id}>
                                      {hotel.name}
                                    </option>
                                  ))}
                                  {currentCompanyHotels.length === 0 && (
                                    <option value="" disabled>
                                      No business units for this company
                                    </option>
                                  )}
                                </select>
                              </div>
                            )}
                            <div className="col-md-2 d-flex align-items-end">
                              <button
                                type="submit"
                                className="btn btn-primary w-100"
                                disabled={isSavingHospitality}
                              >
                                {isSavingHospitality ? "Mapping..." : "Map Project"}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Members Section */}
              <div className="row">
                <div className="col-md-12">
                  <div className="card shadow-sm">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h3 className="card-title">Project Team</h3>

                        <SmartButton
                          label=" Add Team Member"
                          icon={<FontAwesomeIcon icon={faUserPlus} />}
                          iconPosition="left" // "left" or "right"
                          theme="primary" // "primary" or "secondary"
                          onClick={() => setShowAddTeamModal(true)}
                          width="fit-content"
                          className="p-3"
                          id="add_team_member-team_management-project_details_page"
                        />
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
                                          color:
                                            roleInfo.color === "#FFE600"
                                              ? "#000"
                                              : "#fff",
                                          padding: "6px 10px",
                                        }}
                                      >
                                        {roleInfo.label}
                                      </span>
                                    </td>
                                    <td>{formatDate(member.created_at)}</td>
                                    <td>
                                      <SmartButton
                                        label="Delete"
                                        icon={
                                          <FontAwesomeIcon
                                            icon={faTrash}
                                            className="me-1"
                                          />
                                        }
                                        iconPosition="left" // "left" or "right"
                                        theme="red"
                                        onClick={() => {
                                          handleRemoveTeamMember(
                                            member.user_id
                                          );
                                        }}
                                        width="fit-content"
                                        className="px-3 py-1 "
                                        id={`delete_team_member_${member.user_id}-team_actions-project_details_page`}
                                      />
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
        <DynamicFormModal
          type="edit-project"
          projectData={project}
          openModal={showEditModal}
          closeModal={() => setShowEditModal(false)}
          handleEditProject={handleEditProject}
          countryCodes={countryCodes}
        />
      )}

      {openEditProject && (
        <DynamicFormModal
          type={"edit-project"}
          projectData={project}
          openModal={openEditProject}
          closeModal={() => setOpenEditProject(false)}
          handleEditProject={handleEditProject}
        />
      )}

      {/* Add Team Member Modal */}
      {showAddTeamModal && (
        <DynamicFormModal
          type="add-team-member"
          teamMemberUsers={teamMemberUsers}
          currentTeamMembers={teamMembers}
          openModal={showAddTeamModal}
          closeModal={() => setShowAddTeamModal(false)}
          handleAddTeamMember={handleAddTeamMember}
          roleOptions={roleOptions}
        />
      )}
    </>
  );
};

export default ProjectDetailsPage;
