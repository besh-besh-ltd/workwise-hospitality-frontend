import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faToggleOn, faToggleOff } from "@fortawesome/free-solid-svg-icons";
import Pagination from "@/components/shared/Pagination";
import FullLoader from "@/components/shared/FullLoader";
import Select from 'react-select';
import EditAccountModal from "./EditAccountModal";

const ManageAccountsPage = () => {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [filteredAccounts, setFilteredAccounts] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalData, setTotalData] = useState(0);
    const [filterRole, setFilterRole] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterProject, setFilterProject] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // Role options with color coding
    const roleOptions = [
        { value: 8, label: "Top Management", color: "#2E5BA8" }, // Primary color
        { value: 2, label: "Procurement", color: "#428B41" }, // Secondary color
        { value: 9, label: "Engineering", color: "#FFE600" }, // Yellow color
        { value: 10, label: "Finance", color: "#5b5b5b" }, // Text color
    ];

    const statusOptions = [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
    ];

    const projectOptions = [
        { value: 1, label: "Project 1" },
        { value: 2, label: "Project 2" },
        { value: 3, label: "Project 3" },
    ];

    // Mock data for accounts
    const mockAccounts = [
        {
            id: 1,
            name: "John Doe",
            email: "john.doe@example.com",
            mobile: "+91 9876543210",
            role: 8, // Top Management
            projects: [1, 2],
            status: "active",
            createdAt: "2023-05-15T10:30:00Z"
        },
        {
            id: 2,
            name: "Jane Smith",
            email: "jane.smith@example.com",
            mobile: "+91 9876543211",
            role: 2, // Procurement
            projects: [1],
            status: "active",
            createdAt: "2023-06-20T14:45:00Z"
        },
        {
            id: 3,
            name: "Robert Johnson",
            email: "robert.johnson@example.com",
            mobile: "+91 9876543212",
            role: 9, // Engineering
            projects: [2, 3],
            status: "inactive",
            createdAt: "2023-07-10T09:15:00Z"
        },
        {
            id: 4,
            name: "Emily Davis",
            email: "emily.davis@example.com",
            mobile: "+91 9876543213",
            role: 10, // Finance
            projects: [3],
            status: "active",
            createdAt: "2023-08-05T16:20:00Z"
        },
        {
            id: 5,
            name: "Michael Wilson",
            email: "michael.wilson@example.com",
            mobile: "+91 9876543214",
            role: 8, // Top Management
            projects: [1, 3],
            status: "active",
            createdAt: "2023-09-12T11:10:00Z"
        },
        {
            id: 6,
            name: "Sarah Brown",
            email: "sarah.brown@example.com",
            mobile: "+91 9876543215",
            role: 2, // Procurement
            projects: [2],
            status: "inactive",
            createdAt: "2023-10-18T13:25:00Z"
        },
        {
            id: 7,
            name: "David Miller",
            email: "david.miller@example.com",
            mobile: "+91 9876543216",
            role: 9, // Engineering
            projects: [1, 2, 3],
            status: "active",
            createdAt: "2023-11-22T08:40:00Z"
        },
        {
            id: 8,
            name: "Jennifer Taylor",
            email: "jennifer.taylor@example.com",
            mobile: "+91 9876543217",
            role: 10, // Finance
            projects: [3],
            status: "active",
            createdAt: "2023-12-30T15:55:00Z"
        },
        {
            id: 9,
            name: "Thomas Anderson",
            email: "thomas.anderson@example.com",
            mobile: "+91 9876543218",
            role: 8, // Top Management
            projects: [1],
            status: "inactive",
            createdAt: "2024-01-14T10:05:00Z"
        },
        {
            id: 10,
            name: "Lisa White",
            email: "lisa.white@example.com",
            mobile: "+91 9876543219",
            role: 2, // Procurement
            projects: [2, 3],
            status: "active",
            createdAt: "2024-02-28T12:15:00Z"
        },
        {
            id: 11,
            name: "James Martin",
            email: "james.martin@example.com",
            mobile: "+91 9876543220",
            role: 9, // Engineering
            projects: [1, 3],
            status: "active",
            createdAt: "2024-03-17T09:30:00Z"
        },
        {
            id: 12,
            name: "Patricia Harris",
            email: "patricia.harris@example.com",
            mobile: "+91 9876543221",
            role: 10, // Finance
            projects: [2],
            status: "inactive",
            createdAt: "2024-04-05T14:20:00Z"
        }
    ];

    // Load mock data
    useEffect(() => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setAccounts(mockAccounts);
            setTotalData(mockAccounts.length);
            setLoading(false);
        }, 500);
    }, []);

    // Apply filters
    useEffect(() => {
        let filtered = [...accounts];

        if (filterRole) {
            filtered = filtered.filter(account => account.role === filterRole.value);
        }

        if (filterStatus) {
            filtered = filtered.filter(account => account.status === filterStatus.value);
        }

        if (filterProject && filterProject.length > 0) {
            filtered = filtered.filter(account =>
                filterProject.some(fp => account.projects.includes(fp.value))
            );
        }

        setFilteredAccounts(filtered);
        setTotalData(filtered.length);
    }, [accounts, filterRole, filterStatus, filterProject]);

    // Get paginated data
    const getPaginatedData = () => {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        return filteredAccounts.slice(startIndex, endIndex);
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

    // Get project names
    const getProjectNames = (projectIds) => {
        return projectIds.map(id => {
            const project = projectOptions.find(p => p.value === id);
            return project ? project.label : `Project ${id}`;
        }).join(", ");
    };

    // Handle edit account
    const handleEditAccount = (account) => {
        setSelectedAccount(account);
        setShowEditModal(true);
    };

    // Handle toggle status
    const handleToggleStatus = (accountId) => {
        // In a real implementation, this would call an API
        const updatedAccounts = accounts.map(account => {
            if (account.id === accountId) {
                return {
                    ...account,
                    status: account.status === 'active' ? 'inactive' : 'active'
                };
            }
            return account;
        });
        setAccounts(updatedAccounts);
    };

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
                                {/* Filter Section */}
                                <div className="filter-section">
                                    <div className="row mb-4 text-sm">
                                        <div className="col-md-3 col-lg-3">
                                            <label>Filter by Role</label>
                                            <Select
                                                options={roleOptions}
                                                onChange={setFilterRole}
                                                name="role"
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

                                        <div className="col-md-3 col-lg-3">
                                            <label>Filter by Status</label>
                                            <Select
                                                options={statusOptions}
                                                onChange={setFilterStatus}
                                                name="status"
                                                placeholder="Select Status"
                                                isClearable
                                            />
                                        </div>

                                        <div className="col-md-3 col-lg-3">
                                            <label>Filter by Project</label>
                                            <Select
                                                options={projectOptions}
                                                onChange={setFilterProject}
                                                name="project"
                                                placeholder="Select Project(s)"
                                                isClearable
                                                isMulti
                                                closeMenuOnSelect={false}
                                                value={filterProject}
                                                classNamePrefix="react-select"
                                            />
                                        </div>

                                        <div className="col-md-3 col-lg-3 d-flex align-items-end">
                                            <Link
                                                href="/dashboard/admin/account-management/create-account"
                                                className="btn btn-secondary"
                                            >
                                                Create New Account
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                {/* Table Section */}
                                <div className="details-table hasFullLoader mt-0">
                                    {loading && <FullLoader />}
                                    {!loading && filteredAccounts.length === 0 && (
                                        <p>No accounts found.</p>
                                    )}
                                    {!loading && filteredAccounts.length > 0 && (
                                        <div className="table-responsive">
                                            <table className="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Email</th>
                                                        <th>Mobile</th>
                                                        <th>Role</th>
                                                        <th>Projects Assigned</th>
                                                        <th>Created At</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getPaginatedData().map((account) => {
                                                        const roleInfo = getRoleInfo(account.role);
                                                        return (
                                                            <tr key={`account_${account.id}`}>
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
                                                                <td>{getProjectNames(account.projects)}</td>
                                                                <td>{formatDate(account.createdAt)}</td>
                                                                <td>
                                                                    <div className="d-flex flex-column" style={{ gap: "5px" }}>
                                                                        <button
                                                                            className="btn btn-sm btn-primary"
                                                                            onClick={() => handleEditAccount(account)}
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
                                                                            <FontAwesomeIcon icon={faEdit} /> Edit
                                                                        </button>
                                                                        <button
                                                                            className={`btn btn-sm ${account.status === 'active' ? 'btn-success' : 'btn-danger'}`}
                                                                            onClick={() => handleToggleStatus(account.id)}
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
                                                                            <FontAwesomeIcon
                                                                                icon={account.status === 'active' ? faToggleOn : faToggleOff}
                                                                            /> {account.status === 'active' ? 'Active' : 'Inactive'}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
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

            {/* Edit Account Modal */}
            {showEditModal && selectedAccount && (
                <EditAccountModal
                    account={selectedAccount}
                    isOpen={showEditModal}
                    closeModal={() => setShowEditModal(false)}
                    roleOptions={roleOptions}
                    projectOptions={projectOptions}
                    onSave={(updatedAccount) => {
                        // In a real implementation, this would call an API
                        const updatedAccounts = accounts.map(account => {
                            if (account.id === updatedAccount.id) {
                                // Preserve the original createdAt date
                                return {
                                    ...updatedAccount,
                                    createdAt: account.createdAt
                                };
                            }
                            return account;
                        });
                        setAccounts(updatedAccounts);
                        setShowEditModal(false);
                    }}
                />
            )}
        </>
    );
};

export default ManageAccountsPage;
