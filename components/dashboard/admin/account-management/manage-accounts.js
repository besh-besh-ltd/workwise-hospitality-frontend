import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import Pagination from "@/components/shared/Pagination";
import FullLoader from "@/components/shared/FullLoader";
import Select from 'react-select';
import DynamicFormModal from "@/components/modal/DynamicFormModal";
import { getCompanyUsers } from "@/services/Auth";
import { toast } from "react-toastify";
import { getAllProjects, getUserProjectsByUserId } from "@/services/project";
import { getCountryCodes } from "@/services/cms";
import { updateUserAccount } from "@/services/Auth";

const ManageAccountsPage = () => {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    
    // Grouped states
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalData: 0 });
    const [filters, setFilters] = useState({ role: null, status: null, project: [] });
    const [modals, setModals] = useState({ showEditModal: false, selectedAccount: null });
    const [projectState, setProjectState] = useState({ options: [], loading: false });
    const [countryCodes, setCountryCodes] = useState([]);

    // Static options
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

    // Fetch projects
    const fetchProjects = async () => {
        setProjectState(prev => ({ ...prev, loading: true }));
        try {
            const response = await getAllProjects();
            const projects = response?.data?.data || [];
            const formattedProjects = projects.map(project => ({
                value: project.id,
                label: project.name || project.project_name
            }));
            setProjectState(prev => ({ ...prev, options: formattedProjects }));
        } catch (error) {
            toast.error("Failed to fetch projects");
            setProjectState(prev => ({ ...prev, options: [] }));
        } finally {
            setProjectState(prev => ({ ...prev, loading: false }));
        }
    };

    // Fetch users with their projects
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await getCompanyUsers();
            if (!response.status) {
                toast.error("Failed to fetch users");
                return;
            }

            const users = await Promise.all(
                response.data.map(async (user) => {
                    try {
                        const projectsResponse = await getUserProjectsByUserId(user.id);
                        const projects = projectsResponse?.data?.data || [];
                        return {
                            ...user,
                            projects: projects.map(p => p.id),
                            projectsData: projects
                        };
                    } catch {
                        return { ...user, projects: [], projectsData: [] };
                    }
                })
            );

            setAccounts(users);
            setFilteredAccounts(users);
            setPagination(prev => ({ ...prev, totalData: users.length }));
        } catch (error) {
            toast.error("Error fetching users");
        } finally {
            setLoading(false);
        }
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

    // Utility functions
    const getPaginatedData = () => {
        const start = (pagination.page - 1) * pagination.limit;
        return filteredAccounts.slice(start, start + pagination.limit);
    };

    const getRoleInfo = (roleId) => roleOptions.find(r => r.value === roleId) || { label: "Unknown", color: "#000000" };

    const getProjectNames = (account) => {
        if (account.projectsData?.length) {
            return account.projectsData.map(p => p.name).join(", ");
        }
        return account.projects?.length ? 
            account.projects.map(id => projectState.options.find(p => p.value === id)?.label || `Project ${id}`).join(", ") : 
            'None';
    };

    const formatDate = (dateString) => {
        return dateString ? new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        }) : '';
    };

    // Event handlers
    const handleEditAccount = (account) => {
        setModals({ showEditModal: true, selectedAccount: account });
    };

    // Update user data
    const updateUserData = async (updatedAccount) => {
        try {
            setLoading(true);
            
            // Prepare data for API call
            const apiData = {
                name: updatedAccount.name,
                email: updatedAccount.email,
                mobile: updatedAccount.mobile,
            };

            // Make API call to update user
            const response = await updateUserAccount(updatedAccount.id, apiData);
            
            if (response && response.status === 1) {
                // Update local state with the new data
                setAccounts(prev => prev.map(account => 
                    account.id === updatedAccount.id ? 
                        { ...account, ...updatedAccount } : 
                        account
                ));
                setModals(prev => ({ ...prev, showEditModal: false }));
                toast.success("Account updated successfully!");
                
                // Refresh the users list to get latest data
                await fetchUsers();
            } else {
                toast.error("Failed to update account");
            }
            
        } catch (error) {
            console.error("Error updating account:", error);
            toast.error(error?.response?.data?.message || "Failed to update account");
        } finally {
            setLoading(false);
        }
    };

    // Effects
    useEffect(() => {
        fetchProjects();
        fetchUsers();
        fetchCountryCodes();
    }, []);

    // Handle URL refresh parameter
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('refresh') === 'true') {
                window.history.replaceState({}, document.title, window.location.pathname);
                fetchUsers();
            }
        }
    }, []);

    // Apply filters
    useEffect(() => {
        let filtered = accounts;
        
        if (filters.role) filtered = filtered.filter(account => account.role === filters.role.value);
        if (filters.status) filtered = filtered.filter(account => account.status === filters.status.value);
        if (filters.project?.length) {
            filtered = filtered.filter(account =>
                filters.project.some(fp => account.projects?.includes(fp.value))
            );
        }

        setFilteredAccounts(filtered);
        setPagination(prev => ({ ...prev, totalData: filtered.length }));
    }, [accounts, filters]);

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
                                {/* Filters */}
                                <div className="filter-section">
                                    <div className="row mb-4 text-sm">
                                        <div className="col-md-3">
                                            <label>Filter by Role</label>
                                            <Select
                                                options={roleOptions}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, role: selected }))}
                                                placeholder="Select Role"
                                                isClearable
                                                styles={{
                                                    option: (provided, state) => ({
                                                        ...provided,
                                                        color: state.data.color,
                                                        fontWeight: 'bold'
                                                    })
                                                }}
                                            />
                                        </div>

                                        <div className="col-md-3">
                                            <label>Filter by Status</label>
                                            <Select
                                                options={statusOptions}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, status: selected }))}
                                                placeholder="Select Status"
                                                isClearable
                                            />
                                        </div>

                                        <div className="col-md-3">
                                            <label>Filter by Project</label>
                                            <Select
                                                options={projectState.options}
                                                onChange={(selected) => setFilters(prev => ({ ...prev, project: selected }))}
                                                placeholder={projectState.loading ? "Loading..." : "Select Project(s)"}
                                                isClearable
                                                isMulti
                                                value={filters.project}
                                                isLoading={projectState.loading}
                                            />
                                        </div>

                                        <div className="col-md-3 d-flex align-items-end">
                                            <Link href="/dashboard/admin/account-management/create-account" className="btn btn-secondary">
                                                Create New Account
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="details-table hasFullLoader mt-0">
                                    {loading && <FullLoader />}
                                    {!loading && filteredAccounts.length === 0 && <p>No accounts found.</p>}
                                    {!loading && filteredAccounts.length > 0 && (
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
                                                                            color: roleInfo.color === "#FFE600" ? "#000" : "#fff",
                                                                            padding: "6px 10px"
                                                                        }}
                                                                    >
                                                                        {roleInfo.label}
                                                                    </span>
                                                                </td>
                                                                <td>{getProjectNames(account)}</td>
                                                                <td>{formatDate(account.created_at)}</td>
                                                                <td>
                                                                    <button
                                                                        className="btn btn-sm btn-primary"
                                                                        onClick={() => handleEditAccount(account)}
                                                                        style={{ padding: "3px 12px", fontSize: "0.8rem", width: "80px" }}
                                                                    >
                                                                        <FontAwesomeIcon icon={faEdit} /> Edit
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <Pagination
                                        page={pagination.page}
                                        setPage={(newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
                                        limit={pagination.limit}
                                        setLimit={(newLimit) => setPagination(prev => ({ ...prev, limit: newLimit }))}
                                        totalData={pagination.totalData}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Edit Modal */}
            {modals.showEditModal && modals.selectedAccount && (
                <DynamicFormModal
                    type="edit-account"
                    accountData={modals.selectedAccount}
                    openModal={modals.showEditModal}
                    closeModal={() => setModals(prev => ({ ...prev, showEditModal: false }))}
                    handleEditAccount={updateUserData}
                    countryCodes={countryCodes}
                    roleOptions={roleOptions}
                    projectOptions={projectState.options}
                />
            )}
        </>
    );
};

export default ManageAccountsPage;
