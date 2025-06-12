import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import Pagination from "@/components/shared/Pagination";
import FullLoader from "@/components/shared/FullLoader";
import Select from "react-select";
import DynamicFormModal from "@/components/modal/DynamicFormModal";
import { getCompanyUsers, updateUserAccount } from "@/services/Auth";
import { getAllProjects, getUserProjectsByUserId, addTeamMember, removeTeamMember } from "@/services/project";
import { getCountryCodes } from "@/services/cms";
import { toast } from "react-toastify";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons";
import SmartButton from "@/components/shared/SmartButton";


const roleOptions = [
  { value: 7, label: "Admin", color: "#007bff" },
  { value: 8, label: "Top Management", color: "#2E5BA8" },
  { value: 2, label: "Procurement", color: "#428B41" },
  { value: 9, label: "Engineering", color: "#FFE600" },
  { value: 10, label: "Finance", color: "#5b5b5b" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// here in this comonent we are fetching all projects and then applying paganition etc, no to remove this ASAP

const ManageAccountsPage = () => {
  const [uiState, setUiState] = useState({
    loading: false,
    pagination: { page: 1, limit: 10, totalData: 0 },
    modals: { showEditModal: false, selectedAccount: null },
  });

  const [filters, setFilters] = useState({
    role: null,
    status: null,
    project: [],
  });

  const [data, setData] = useState({
    accounts: [],
    filteredAccounts: [],
    projects: { options: [], loading: false },
    countryCodes: [],
  });

  const fetchProjects = async () => {
    setData((prev) => ({
      ...prev,
      projects: { ...prev.projects, loading: true },
    }));
    try {
      const response = await getAllProjects();
      const options = (response?.data?.data || []).map((project) => ({
        value: project.id,
        label: project.name || project.project_name,
      }));
      setData((prev) => ({ ...prev, projects: { loading: false, options } }));
    } catch {
      toast.error("Failed to fetch projects");
      setData((prev) => ({
        ...prev,
        projects: { loading: false, options: [] },
      }));
    }
  };

  const fetchUsers = async () => {
    setUiState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await getCompanyUsers();
      if (!response.status) return toast.error("Failed to fetch users");

      const users = await Promise.all(
        response.data.map(async (user) => {
          try {
            const res = await getUserProjectsByUserId(user.id);
            const projects = res?.data?.data || [];
            return {
              ...user,
              projects: projects.map((p) => p.id),
              projectsData: projects,
            };
          } catch {
            return { ...user, projects: [], projectsData: [] };
          }
        })
      );

      setData((prev) => ({
        ...prev,
        accounts: users,
        filteredAccounts: users,
      }));
      setUiState((prev) => ({
        ...prev,
        pagination: { ...prev.pagination, totalData: users.length },
      }));
    } catch {
      toast.error("Error fetching users");
    } finally {
      setUiState((prev) => ({ ...prev, loading: false }));
    }
  };

  const fetchCountryCodes = async () => {
    try {
      const res = await getCountryCodes();
      if (res?.data) setData((prev) => ({ ...prev, countryCodes: res.data }));
    } catch (err) {
      console.error("Error fetching country codes:", err);
    }
  };

  const getPaginatedData = () => {
    const start = (uiState.pagination.page - 1) * uiState.pagination.limit;
    return data.filteredAccounts.slice(start, start + uiState.pagination.limit);
  };

  const getRoleInfo = (id) =>
    roleOptions.find((r) => r.value === id) || {
      label: "Unknown",
      color: "#000000",
    };

  const getProjectNames = (account) => {
    if (account.projectsData?.length)
      return account.projectsData.map((p) => p.name).join(", ");
    return account.projects?.length
      ? account.projects
          .map(
            (id) =>
              data.projects.options.find((p) => p.value === id)?.label ||
              `Project ${id}`
          )
          .join(", ")
      : "None";
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";

  const handleEditAccount = (account) =>
    setUiState((prev) => ({
      ...prev,
      modals: { showEditModal: true, selectedAccount: account },
    }));

  const updateUserData = async (updatedAccount) => {
    setUiState((prev) => ({ ...prev, loading: true }));
    try {
      await updateUserAccount(updatedAccount.id, updatedAccount);

      await fetchUsers();
      toast.success("User updated successfully");
      setUiState((prev) => ({
        ...prev,
        modals: { showEditModal: false, selectedAccount: null },
      }));
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("Failed to update user");
    } finally {
      setUiState((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("refresh") === "true") {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        fetchUsers();
      }
    }
    fetchProjects();
    fetchUsers();
    fetchCountryCodes();
  }, []);

  useEffect(() => {
    let filtered = data.accounts;
    if (filters.role)
      filtered = filtered.filter((u) => u.role === filters.role.value);
    if (filters.status)
      filtered = filtered.filter((u) => u.status === filters.status.value);
    if (filters.project.length)
      filtered = filtered.filter((u) =>
        filters.project.some((f) => u.projects.includes(f.value))
      );

    setData((prev) => ({ ...prev, filteredAccounts: filtered }));
    setUiState((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, totalData: filtered.length },
    }));
  }, [filters, data.accounts]);

  return (
    <>
      <section className="buyer-common-header sc-pt-80">
        <div className="container-fluid">
          <h1 className="heading">Manage Accounts</h1>
        </div>
      </section>

      <section className="buyer-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <div className="vendor-mngt-con">
                <div className="filter-section">
                  <div className="row mb-4 text-sm">
                  
                    <div className="col-md-3">
                      <label>Filter by Role</label>
                      <Select
                        options={roleOptions}
                        onChange={(role) =>
                          setFilters((prev) => ({ ...prev, role }))
                        }
                        placeholder="Select Role"
                        isClearable
                      />
                    </div>

                    <div className="col-md-3">
                      <label>Filter by Status</label>
                      <Select
                        options={statusOptions}
                        onChange={(status) =>
                          setFilters((prev) => ({ ...prev, status }))
                        }
                        placeholder="Select Status"
                        isClearable
                      />
                    </div>

                    <div className="col-md-3">
                      <label>Filter by Project</label>
                      <Select
                        options={data.projects.options}
                        value={filters.project}
                        isMulti
                        onChange={(project) =>
                          setFilters((prev) => ({ ...prev, project }))
                        }
                        placeholder={
                          data.projects.loading
                            ? "Loading..."
                            : "Select Project(s)"
                        }
                        isLoading={data.projects.loading}
                      />
                    </div>

                    <div className="col-md-3 d-flex align-items-end justify-content-end">
                      <SmartButton
                        href="/dashboard/admin/account-management/create-account"
                        label=" Create New Account"
                        theme="secondary"
                        width="fit-content"
                        className="p-3"
                          icon={<FontAwesomeIcon icon={faUserPlus} />}
                      />
                    </div>
                  </div>
                </div>

                <div className="details-table hasFullLoader mt-0">
                  {uiState.loading && <FullLoader />}
                  {!uiState.loading && data.filteredAccounts.length === 0 && (
                    <p>No accounts found.</p>
                  )}

                  {!uiState.loading && data.filteredAccounts.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Mobile</th>
                            <th>Role</th>
                            <th>Projects</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPaginatedData().map((account) => {
                            const roleInfo = getRoleInfo(account.role);
                            return (
                              <tr key={account.id}>
                                <td>{account.name}</td>
                                <td>{account.email}</td>
                                <td>{account.mobile}</td>
                                <td>
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor: roleInfo.color,
                                      color:
                                        roleInfo.color === "#FFE600"
                                          ? "#000"
                                          : "#fff",
                                    }}
                                  >
                                    {roleInfo.label}
                                  </span>
                                </td>
                                <td>{getProjectNames(account)}</td>
                                <td>{formatDate(account.created_at)}</td>
                                <td>
                                  <SmartButton
                                    label="Edit"
                                    icon={<FontAwesomeIcon icon={faEdit} />}
                                    iconPosition="right"
                                    theme="primary"
                                    className="p-2"
                                    onClick={() => {
                                      handleEditAccount(account);
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <Pagination
                    page={uiState.pagination.page}
                    setPage={(page) =>
                      setUiState((prev) => ({
                        ...prev,
                        pagination: { ...prev.pagination, page },
                      }))
                    }
                    limit={uiState.pagination.limit}
                    setLimit={(limit) =>
                      setUiState((prev) => ({
                        ...prev,
                        pagination: { ...prev.pagination, limit },
                      }))
                    }
                    totalData={uiState.pagination.totalData}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {uiState.modals.showEditModal && uiState.modals.selectedAccount && (
        <DynamicFormModal
          type="edit-account"
          accountData={uiState.modals.selectedAccount}
          openModal={uiState.modals.showEditModal}
          closeModal={() =>
            setUiState((prev) => ({
              ...prev,
              modals: { ...prev.modals, showEditModal: false },
            }))
          }
          handleEditAccount={updateUserData}
          countryCodes={data.countryCodes}
          roleOptions={roleOptions}
          projectOptions={data.projects.options}
        />
      )}
    </>
  );
};

export default ManageAccountsPage;
