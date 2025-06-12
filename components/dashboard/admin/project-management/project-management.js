import React, { useEffect, useState } from "react";
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
import SmartButton from "@/components/shared/SmartButton";

const ProjectManagementPage = () => {
  const [state, setState] = useState({
    loading: false,
    projects: [],
    page: 1,
    limit: 10,
    totalData: 0,
    showCreateModal: false,
    countryCodes: [],
  });

  const getPaginatedData = () => {
    const startIndex = (state.page - 1) * state.limit;
    const endIndex = startIndex + state.limit;
    return state.projects.slice(startIndex, endIndex);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const fetchCountryCodes = async () => {
    try {
      const response = await getCountryCodes();
      if (response?.data) {
        setState((prev) => ({ ...prev, countryCodes: response.data }));
      }
    } catch (error) {
      console.error("Error fetching country codes:", error);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const response = await createProject(projectData);
      if (response && response.status === true) {
        setState((prev) => ({ ...prev, showCreateModal: false }));
        toast.success("Project created successfully!");
        await fetchProjects();
      } else {
        toast.error("Failed to create project");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create project");
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const fetchProjects = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const response = await getAllProjects();
      if (response && response.data) {
        const projectsData = response.data.data;
        setState((prev) => ({
          ...prev,
          projects: Array.isArray(projectsData) ? projectsData : [],
          totalData: Array.isArray(projectsData) ? projectsData.length : 0,
          loading: false,
        }));
      } else {
        toast.error("Failed to fetch projects");
        setState((prev) => ({
          ...prev,
          projects: [],
          totalData: 0,
          loading: false,
        }));
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch projects");
      setState((prev) => ({
        ...prev,
        projects: [],
        totalData: 0,
        loading: false,
      }));
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
                  <SmartButton
                    label=" Create New Project"
                    icon=<FontAwesomeIcon icon={faFolderPlus}/>
                    iconPosition="left" // "left" or "right"
                    theme="primary" // "primary" or "secondary"
                    onClick={() =>
                      setState((prev) => ({ ...prev, showCreateModal: true }))
                    }
                    width="fit-content"
                    className="p-3"
                  />
                </div>

                <div className="details-table hasFullLoader mt-0">
                  {state.loading && <FullLoader />}
                  {!state.loading && state.projects.length === 0 && (
                    <p>No projects found.</p>
                  )}
                  {!state.loading && state.projects.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Project Name</th>
                            <th>Description</th>
                            <th>Total RFQs</th>
                            <th>Open RFQs</th>
                            <th>Closed RFQs</th>
                            <th>Created Date</th>
                            <th>Created By</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPaginatedData().map((project, index) => (
                            <tr key={`project_${project.id}`}>
                              <td>{project.name}</td>
                              <td style={{ maxWidth: "450px" }}>
                                {project.description ? (
                                  <ReadMore
                                    content={project.description}
                                    maxLines={2}
                                  />
                                ) : (
                                  "---"
                                )}
                              </td>
                              <td>{project.total_rfqs || "0"}</td>
                              <td>{project.open_rfqs || "0"}</td>
                              <td>{project.closed_rfqs || "0"}</td>
                              <td>{formatDate(project.created_at)}</td>
                              <td>{project.created_by_name || ''}</td>
                              <td>
                                <SmartButton
                                  href={`/dashboard/admin/project-management/${project.id}`}
                                  label="View"
                                  icon=<FontAwesomeIcon
                                    icon={faEye}
                                    className="me-1"
                                  />
                                  iconPosition="left" // "left" or "right"
                                  theme="primary" // "primary" or "secondary"
                                  width="120px"
                                  className="p-1"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <Pagination
                    page={state.page}
                    setPage={(page) => setState((prev) => ({ ...prev, page }))}
                    limit={state.limit}
                    setLimit={(limit) =>
                      setState((prev) => ({ ...prev, limit }))
                    }
                    totalData={state.totalData}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {state.showCreateModal && (
        <DynamicFormModal
          type="create-project"
          openModal={state.showCreateModal}
          closeModal={() =>
            setState((prev) => ({ ...prev, showCreateModal: false }))
          }
          handleCreateProject={handleCreateProject}
          countryCodes={state.countryCodes}
        />
      )}
    </>
  );
};

export default ProjectManagementPage;
