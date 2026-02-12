import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import Pagination from "@/components/shared/Pagination";
import FullLoader from "@/components/shared/FullLoader";
import Select from "react-select";
import DynamicFormModal from "@/components/modal/DynamicFormModal";
import CustomRolePermissionsModal from "@/components/modal/CustomRolePermissionsModal";
import { getCompanyUsers, updateUserAccount, getProfile, getMyDepartments } from "@/services/Auth";
import { getCountryCodes } from "@/services/cms";
import { toast } from "react-toastify";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons";
import SmartButton from "@/components/shared/SmartButton";
import {
  getHospitalityCompanies,
  getHospitalityHotels,
  getUserMappings,
  mapHospitalityUsers,
  deleteUserMapping,
} from "@/services/hospitality";
import { getUserRoleScopes, getUserDepartments } from "@/services/rbac";

const dedupeHospitalityMappings = (list = []) => {
  const seen = new Set();
  return list.filter((item) => {
    const key =
      item.mapping_type === 0
        ? `company-${item.hospitality_company_id}-${item.user_id}`
        : `hotel-${item.hospitality_company_id}-${item.hospitality_hotel_id}-${item.user_id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};


const roleOptions = [
  { value: 8, label: "Management", color: "#2E5BA8" },
  { value: 2, label: "Procurement", color: "#428B41" },
  { value: 9, label: "Engineering", color: "#FFE600" },
  { value: 10, label: "Finance", color: "#5b5b5b" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ManageAccountsPage = () => {
  const [uiState, setUiState] = useState({
    loading: false,
    pagination: { page: 1, limit: 10, totalData: 0 },
    modals: {
      showEditModal: false,
      selectedAccount: null,
      showCustomRolesModal: false,
    },
  });

  const [filters, setFilters] = useState({
    status: null,
    search: "",
    companyId: null,
    hotelId: null,
  });

  const [data, setData] = useState({
    accounts: [],
    filteredAccounts: [],
    countryCodes: [],
  });
  const [isHospitalityCompany, setIsHospitalityCompany] = useState(false);
  const [hospitalityCompanies, setHospitalityCompanies] = useState([]);
  const [hotelsByCompany, setHotelsByCompany] = useState({});
  const [userHospitalityMappings, setUserHospitalityMappings] = useState({});
  const [isFetchingUserMappings, setIsFetchingUserMappings] = useState(false);
  const [hospitalityForm, setHospitalityForm] = useState({
    selectedCompanyId: "",
    mappingLevel: "company",
    hotelId: "",
    autoMapProjects: true,
    submitting: false,
  });
  const [userRoleScopes, setUserRoleScopes] = useState({});
  const [userDepartments, setUserDepartments] = useState({});

  const fetchUsers = async () => {
    setUiState((prev) => ({ ...prev, loading: true }));
    try {
      const response = await getCompanyUsers();
      if (!response.status) return toast.error("Failed to fetch users");
      const users = response.data

      setData((prev) => ({
        ...prev,
        accounts: users,
        filteredAccounts: users,
      }));
      setUiState((prev) => ({
        ...prev,
        pagination: { ...prev.pagination, totalData: users.length },
      }));
      if (isHospitalityCompany) {
        await Promise.all([
          fetchAllUserHospitalityMappings(users),
          fetchAllUserRoleScopes(users),
          ...users.map((user) => fetchUserDepartments(user.id))
        ]);
      } else {
        // Fetch departments for all users even if not hospitality company
        await Promise.all(users.map((user) => fetchUserDepartments(user.id)));
      }
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

  const fetchProfile = async () => {
    try {
      const response = await getProfile();
      const profile = response?.data;
      const hospitalityEnabled =
        profile?.is_hospitality === 1 || profile?.is_hospitality === "1";
      setIsHospitalityCompany(hospitalityEnabled);
      if (hospitalityEnabled) {
        await loadHospitalityCompanies();
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
        const defaultCompanyId =
          hospitalityForm.selectedCompanyId || list[0].id;
        setHospitalityForm((prev) => ({
          ...prev,
          selectedCompanyId: defaultCompanyId,
        }));
        list.forEach((company) => loadCompanyHotels(company.id));
      }
    } catch (error) {
      setHospitalityCompanies([]);
    }
  };

  const loadCompanyHotels = async (companyId) => {
    if (!companyId) return;
    if (hotelsByCompany[companyId]) return;
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

  const fetchUserMapping = async (userId) => {
    if (!userId) return;
    try {
      const response = await getUserMappings(userId);
      const mappings = response?.data?.data || response?.data || [];
      setUserHospitalityMappings((prev) => ({
        ...prev,
        [userId]: dedupeHospitalityMappings(mappings),
      }));
    } catch (error) {
      setUserHospitalityMappings((prev) => ({
        ...prev,
        [userId]: [],
      }));
    }
  };

  const fetchAllUserHospitalityMappings = async (users = []) => {
    if (!users.length) {
      setUserHospitalityMappings({});
      return;
    }
    try {
      setIsFetchingUserMappings(true);
      await Promise.all(users.map((user) => fetchUserMapping(user.id)));
    } finally {
      setIsFetchingUserMappings(false);
    }
  };

  const fetchUserRoleScopes = async (userId) => {
    if (!userId) return;
    try {
      const response = await getUserRoleScopes(userId);
      const scopes = response?.data?.data || response?.data || [];
      setUserRoleScopes((prev) => ({
        ...prev,
        [userId]: scopes,
      }));
    } catch (error) {
      setUserRoleScopes((prev) => ({
        ...prev,
        [userId]: [],
      }));
    }
  };

  const fetchUserDepartments = async (userId) => {
    if (!userId) return;
    try {
      const response = await getUserDepartments(userId);
      const depts = response?.data?.data || response?.data || [];
      setUserDepartments((prev) => ({
        ...prev,
        [userId]: depts,
      }));
    } catch (error) {
      setUserDepartments((prev) => ({
        ...prev,
        [userId]: [],
      }));
    }
  };

  const fetchAllUserRoleScopes = async (users = []) => {
    if (!users.length) {
      setUserRoleScopes({});
      return;
    }
    await Promise.all(users.map((user) => fetchUserRoleScopes(user.id)));
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

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";

  const handleEditAccount = (account) => {
    if (isHospitalityCompany) {
      const fallbackCompanyId =
        hospitalityForm.selectedCompanyId ||
        hospitalityCompanies[0]?.id ||
        "";
      if (fallbackCompanyId) {
        setHospitalityForm((prev) => ({
          ...prev,
          selectedCompanyId: fallbackCompanyId,
          mappingLevel: "company",
          hotelId: "",
        }));
        loadCompanyHotels(fallbackCompanyId);
      }
      fetchUserMapping(account.id);
      fetchUserRoleScopes(account.id);
    }
    // Always fetch user departments for edit modal
    fetchUserDepartments(account.id);
    setUiState((prev) => ({
      ...prev,
      modals: { showEditModal: true, selectedAccount: account },
    }));
  };

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

  const handleHospitalityUserSubmit = async () => {
    const user = uiState.modals.selectedAccount;
    if (!user || !hospitalityForm.selectedCompanyId) {
      toast.error("Select a hospitality company");
      return;
    }
    if (
      hospitalityForm.mappingLevel === "hotel" &&
      !hospitalityForm.hotelId
    ) {
      toast.error("Select a hotel for hotel-level mapping");
      return;
    }
    try {
      setHospitalityForm((prev) => ({ ...prev, submitting: true }));
      await mapHospitalityUsers(hospitalityForm.selectedCompanyId, {
        mapping_type: hospitalityForm.mappingLevel === "company" ? 0 : 1,
        hotel_id:
          hospitalityForm.mappingLevel === "hotel"
            ? parseInt(hospitalityForm.hotelId, 10)
            : null,
        user_ids: [user.id],
        auto_map_projects: hospitalityForm.autoMapProjects,
      });
      toast.success("User mapped successfully");
      await fetchUserMapping(user.id);
      fetchUsers();
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to map user"
      );
    } finally {
      setHospitalityForm((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleRemoveUserHospitalityMapping = async (userId, mapping) => {
    if (!userId) return;
    try {
      await deleteUserMapping(userId, {
        company_id: mapping.hospitality_company_id,
        mapping_type: mapping.mapping_type,
        hotel_id:
          mapping.mapping_type === 1 ? mapping.hospitality_hotel_id : null,
      });
      toast.success("Mapping removed");
      await fetchUserMapping(userId);
      fetchUsers();
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to remove mapping"
      );
    }
  };

  const renderUserHospitalitySummary = (userId) => {
    if (!isHospitalityCompany) return "—";
    const mappings = dedupeHospitalityMappings(
      userHospitalityMappings[userId] || []
    );
    if (isFetchingUserMappings && !mappings.length) {
      return <span className="text-muted">Loading…</span>;
    }
    if (!mappings.length) {
      return <span className="text-muted">Not mapped</span>;
    }
    return (
      <div className="d-flex flex-column gap-1">
        {mappings.map((mapping) => (
          <span
            key={`${userId}-${mapping.mapping_type}-${mapping.hospitality_hotel_id || "company"}`}
            className={`badge ${
              mapping.mapping_type === 0 ? "bg-primary" : "bg-success"
            }`}
          >
            {mapping.mapping_type === 0
              ? `Company: ${mapping.company_name || "N/A"}`
              : `Hotel: ${mapping.hotel_name || "N/A"}`}
          </span>
        ))}
      </div>
    );
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
    fetchUsers();
    fetchCountryCodes();
    fetchProfile();
  }, []);

  useEffect(() => {
    let filtered = data.accounts;

    if (filters.status)
      filtered = filtered.filter((u) => u.status === filters.status.value);

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter((u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.employee_code || "").toLowerCase().includes(q)
      );
    }

    if (filters.companyId) {
      const companyId = filters.companyId.value;
      filtered = filtered.filter((u) => {
        const mappings = userHospitalityMappings[u.id] || [];
        return mappings.some((m) => m.hospitality_company_id == companyId);
      });
    }

    if (filters.hotelId) {
      const hotelId = filters.hotelId.value;
      filtered = filtered.filter((u) => {
        const mappings = userHospitalityMappings[u.id] || [];
        return mappings.some((m) => m.hospitality_hotel_id == hotelId);
      });
    }

    setData((prev) => ({ ...prev, filteredAccounts: filtered }));
    setUiState((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page: 1, totalData: filtered.length },
    }));
  }, [filters, data.accounts, userHospitalityMappings]);

  useEffect(() => {
    if (data.accounts.length) {
      if (isHospitalityCompany) {
        fetchAllUserHospitalityMappings(data.accounts);
        fetchAllUserRoleScopes(data.accounts);
      }
      // Always fetch departments for all users
      Promise.all(data.accounts.map((user) => fetchUserDepartments(user.id)));
    }
  }, [isHospitalityCompany, data.accounts]);

  const renderUserWorkflowRoles = (userId) => {
    const scopes = userRoleScopes[userId] || [];
    if (!scopes.length) {
      return <span className="text-muted">No workflow roles</span>;
    }
    const uniqueTitles = Array.from(
      new Set(scopes.map((s) => s.role_title).filter(Boolean))
    );
    return (
      <div className="d-flex flex-wrap gap-1">
        {uniqueTitles.map((title) => (
          <span key={title} className="badge bg-secondary">
            {title}
          </span>
        ))}
      </div>
    );
  };

  const renderUserDepartments = (userId) => {
    const depts = userDepartments[userId] || [];
    if (!depts.length) {
      return <span className="text-muted">—</span>;
    }
    return (
      <div className="d-flex flex-wrap gap-1">
        {depts.map((dept) => (
          <span key={dept.id} className="badge bg-info">
            {dept.title}
          </span>
        ))}
      </div>
    );
  };

  const companyOptions = hospitalityCompanies.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const hotelOptions = filters.companyId
    ? (hotelsByCompany[filters.companyId.value] || []).map((h) => ({
        value: h.id,
        label: h.name,
      }))
    : Object.values(hotelsByCompany).flat().map((h) => ({
        value: h.id,
        label: h.name,
      }));

  const selectedAccount = uiState.modals.selectedAccount;
  const selectedAccountId = selectedAccount?.id;
  const selectedCompanyHotels = hospitalityForm.selectedCompanyId
    ? hotelsByCompany[hospitalityForm.selectedCompanyId] || []
    : [];

  const hospitalityModalProps =
    isHospitalityCompany && selectedAccount
      ? {
          mappings: dedupeHospitalityMappings(
            userHospitalityMappings[selectedAccountId] || []
          ),
          companies: hospitalityCompanies,
          hotels: selectedCompanyHotels,
          formState: hospitalityForm,
          onCompanyChange: (value) => {
            setHospitalityForm((prev) => ({
              ...prev,
              selectedCompanyId: value,
              hotelId: "",
            }));
            if (value) {
              loadCompanyHotels(value);
            }
          },
          onMappingLevelChange: (value) =>
            setHospitalityForm((prev) => ({
              ...prev,
              mappingLevel: value,
              hotelId: value === "company" ? "" : prev.hotelId,
            })),
          onHotelChange: (value) =>
            setHospitalityForm((prev) => ({ ...prev, hotelId: value })),
          onToggleAutoMap: (checked) =>
            setHospitalityForm((prev) => ({
              ...prev,
              autoMapProjects: checked,
            })),
          onSubmit: handleHospitalityUserSubmit,
          onRemoveMapping: (mapping) =>
            handleRemoveUserHospitalityMapping(selectedAccountId, mapping),
        }
      : null;

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
                  <div className="row mb-3 text-sm">
                    <div className="col-md-3">
                      <label>Search</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Name, Email or Employee Code"
                        value={filters.search}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, search: e.target.value }))
                        }
                        id="search_users-account_filters-manage_accounts_page"
                      />
                    </div>
                    {isHospitalityCompany && (
                      <div className="col-md-3">
                        <label>Company Name</label>
                        <Select
                          options={companyOptions}
                          value={filters.companyId}
                          onChange={(val) =>
                            setFilters((prev) => ({
                              ...prev,
                              companyId: val,
                              hotelId: null,
                            }))
                          }
                          placeholder="All Companies"
                          isClearable
                          id="filter_by_company-account_filters-manage_accounts_page"
                        />
                      </div>
                    )}
                    {isHospitalityCompany && (
                      <div className="col-md-3">
                        <label>Business Unit</label>
                        <Select
                          options={hotelOptions}
                          value={filters.hotelId}
                          onChange={(val) =>
                            setFilters((prev) => ({ ...prev, hotelId: val }))
                          }
                          placeholder="All Hotels"
                          isClearable
                          id="filter_by_hotel-account_filters-manage_accounts_page"
                        />
                      </div>
                    )}
                    <div className="col-md-3">
                      <label>Filter by Status</label>
                      <Select
                        options={statusOptions}
                        value={filters.status}
                        onChange={(status) =>
                          setFilters((prev) => ({ ...prev, status }))
                        }
                        placeholder="Select Status"
                        isClearable
                        id="filter_by_status-account_filters-manage_accounts_page"
                      />
                    </div>
                  </div>
                  <div className="row mb-4 text-sm">
                    <div className="col-md-12 d-flex align-items-end justify-content-end">
                      <SmartButton
                        label="Custom Roles & Permissions"
                        theme="primary"
                        width="fit-content"
                        className="p-3 me-3"
                        onClick={() =>
                          setUiState((prev) => ({
                            ...prev,
                            modals: {
                              ...prev.modals,
                              showCustomRolesModal: true,
                            },
                          }))
                        }
                        id="open_custom_roles_modal-account_actions-manage_accounts_page"
                      />
                      <SmartButton
                        href="/dashboard/admin/account-management/create-account"
                        label=" Create New Account"
                        theme="secondary"
                        width="fit-content"
                        className="p-3"
                          icon={<FontAwesomeIcon icon={faUserPlus} />}
                        id="create_new_account-account_actions-manage_accounts_page"
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
                            {isHospitalityCompany && <th>Workflow Roles</th>}
                            <th>Department</th>
                            <th>Created</th>
                            {isHospitalityCompany && <th>Company & Hotel Access</th>}
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPaginatedData().map((account) => {
                            const isActive = account.status === "active";
                            return (
                              <tr
                                key={account.id}
                                style={{
                                  borderLeft: `3px solid ${isActive ? '#28a745' : '#6c757d'}`,
                                  backgroundColor: isActive ? 'transparent' : '#f8f9fa'
                                }}
                              >
                                <td style={{ opacity: isActive ? 1 : 0.65, }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                      style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: isActive ? '#28a745' : '#6c757d',
                                        display: 'inline-block',
                                        flexShrink: 0
                                      }}
                                      title={isActive ? 'Active' : 'Inactive'}
                                    />
                                    <span>{account.name}</span>
                                  </div>
                                </td>
                                <td style={{ opacity: isActive ? 1 : 0.65, }}>{account.email}</td>
                                <td style={{ opacity: isActive ? 1 : 0.65, }}>{account.mobile}</td>
                                {isHospitalityCompany && (
                                  <td>{renderUserWorkflowRoles(account.id)}</td>
                                )}
                                <td style={{ opacity: isActive ? 1 : 0.65, }}>{renderUserDepartments(account.id)}</td>
                                <td style={{ opacity: isActive ? 1 : 0.65, }}>{formatDate(account.created_at)}</td>
                                {isHospitalityCompany && (
                                  <td style={{ opacity: isActive ? 1 : 0.65, }}>{renderUserHospitalitySummary(account.id)}</td>
                                )}
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
                                    id={`edit_account_${account.id}-account_actions-manage_accounts_page`}
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
          hospitalityProps={hospitalityModalProps}
          initialRoleScopes={userRoleScopes[selectedAccountId] || []}
          userDepartments={userDepartments[selectedAccountId]}
        />
      )}

      {uiState.modals.showCustomRolesModal && (
        <CustomRolePermissionsModal
          isOpen={uiState.modals.showCustomRolesModal}
          onClose={() =>
            setUiState((prev) => ({
              ...prev,
              modals: { ...prev.modals, showCustomRolesModal: false },
            }))
          }
        />
      )}
    </>
  );
};

export default ManageAccountsPage;
