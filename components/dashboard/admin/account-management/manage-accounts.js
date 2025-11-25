import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import Pagination from "@/components/shared/Pagination";
import FullLoader from "@/components/shared/FullLoader";
import Select from "react-select";
import DynamicFormModal from "@/components/modal/DynamicFormModal";
import { getCompanyUsers, updateUserAccount, getProfile } from "@/services/Auth";
import { getCountryCodes } from "@/services/cms";
import { toast } from "react-toastify";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons";
import SmartButton from "@/components/shared/SmartButton";
import Modal from "react-bootstrap/Modal";
import {
  getHospitalityCompanies,
  getHospitalityHotels,
  getUserMappings,
  mapHospitalityUsers,
  deleteUserMapping,
} from "@/services/hospitality";


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
    modals: { showEditModal: false, selectedAccount: null },
  });

  const [filters, setFilters] = useState({
    role: null,
    status: null,
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
  const [hospitalityModal, setHospitalityModal] = useState({
    open: false,
    user: null,
    selectedCompanyId: "",
    mappingLevel: "company",
    hotelId: "",
    autoMapProjects: true,
    submitting: false,
  });

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
        fetchAllUserHospitalityMappings(users);
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
        setHospitalityModal((prev) => ({
          ...prev,
          selectedCompanyId: prev.selectedCompanyId || list[0].id,
        }));
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
        [userId]: mappings,
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

  const handleOpenHospitalityModal = (account) => {
    if (!isHospitalityCompany) return;
    const fallbackCompanyId =
      hospitalityModal.selectedCompanyId ||
      hospitalityCompanies[0]?.id ||
      "";
    setHospitalityModal((prev) => ({
      ...prev,
      open: true,
      user: account,
      selectedCompanyId: fallbackCompanyId,
      mappingLevel: "company",
      hotelId: "",
      autoMapProjects: true,
    }));
    if (fallbackCompanyId) {
      loadCompanyHotels(fallbackCompanyId);
    }
    fetchUserMapping(account.id);
  };

  const handleCloseHospitalityModal = () => {
    setHospitalityModal((prev) => ({
      ...prev,
      open: false,
      user: null,
      submitting: false,
    }));
  };

  const handleHospitalityUserSubmit = async (event) => {
    event.preventDefault();
    if (!hospitalityModal.user || !hospitalityModal.selectedCompanyId) {
      toast.error("Select a hospitality company");
      return;
    }
    if (
      hospitalityModal.mappingLevel === "hotel" &&
      !hospitalityModal.hotelId
    ) {
      toast.error("Select a hotel for hotel-level mapping");
      return;
    }
    try {
      setHospitalityModal((prev) => ({ ...prev, submitting: true }));
      await mapHospitalityUsers(hospitalityModal.selectedCompanyId, {
        mapping_type: hospitalityModal.mappingLevel === "company" ? 0 : 1,
        hotel_id:
          hospitalityModal.mappingLevel === "hotel"
            ? parseInt(hospitalityModal.hotelId, 10)
            : null,
        user_ids: [hospitalityModal.user.id],
        auto_map_projects: hospitalityModal.autoMapProjects,
      });
      toast.success("User mapped successfully");
      await fetchUserMapping(hospitalityModal.user.id);
      fetchUsers();
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message ||
          "Failed to map user"
      );
    } finally {
      setHospitalityModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleRemoveUserHospitalityMapping = async (mapping) => {
    if (!hospitalityModal.user) return;
    try {
      await deleteUserMapping(hospitalityModal.user.id, {
        company_id: mapping.hospitality_company_id,
        mapping_type: mapping.mapping_type,
        hotel_id:
          mapping.mapping_type === 1 ? mapping.hospitality_hotel_id : null,
      });
      toast.success("Mapping removed");
      await fetchUserMapping(hospitalityModal.user.id);
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
    const mappings = userHospitalityMappings[userId] || [];
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
            key={`${userId}-${mapping.id}`}
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
    if (filters.role)
      filtered = filtered.filter((u) => u.role === filters.role.value);
    if (filters.status)
      filtered = filtered.filter((u) => u.status === filters.status.value);

    setData((prev) => ({ ...prev, filteredAccounts: filtered }));
    setUiState((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, totalData: filtered.length },
    }));
  }, [filters, data.accounts]);

  useEffect(() => {
    if (isHospitalityCompany && data.accounts.length) {
      fetchAllUserHospitalityMappings(data.accounts);
    }
  }, [isHospitalityCompany, data.accounts]);

  const modalUserMappings =
    (hospitalityModal.user &&
      userHospitalityMappings[hospitalityModal.user.id]) ||
    [];
  const modalHotels =
    (hospitalityModal.selectedCompanyId &&
      hotelsByCompany[hospitalityModal.selectedCompanyId]) ||
    [];

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
                        id="filter_by_role-account_filters-manage_accounts_page"
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
                        id="filter_by_status-account_filters-manage_accounts_page"
                      />
                    </div>

                    <div className="col-md-6 d-flex align-items-end justify-content-end">
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
                            <th>Role</th>
                            <th>Created</th>
                            {isHospitalityCompany && <th>Hospitality Scope</th>}
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
                                <td>{formatDate(account.created_at)}</td>
                                {isHospitalityCompany && (
                                  <td>{renderUserHospitalitySummary(account.id)}</td>
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
                                  {isHospitalityCompany && (
                                    <SmartButton
                                      label="Hospitality"
                                      theme="secondary"
                                      className="p-2 ms-2"
                                      onClick={() => handleOpenHospitalityModal(account)}
                                      id={`manage_hospitality_${account.id}-account_actions-manage_accounts_page`}
                                    />
                                  )}
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
        />
      )}

      {isHospitalityCompany && (
        <Modal
          centered
          size="lg"
          show={hospitalityModal.open}
          onHide={handleCloseHospitalityModal}
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Manage Hospitality Access{" "}
              {hospitalityModal.user && `- ${hospitalityModal.user.name}`}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {hospitalityModal.user ? (
              <>
                {modalUserMappings.length === 0 ? (
                  <p className="text-muted">
                    This user is not mapped to any hospitality scope yet.
                  </p>
                ) : (
                  <div className="table-responsive mb-4">
                    <table className="table table-striped align-middle">
                      <thead>
                        <tr>
                          <th>Scope</th>
                          <th>Company / Hotel</th>
                          <th>Auto Map Projects</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalUserMappings.map((mapping) => (
                          <tr key={`user-mapping-${mapping.id}`}>
                            <td>
                              <span
                                className={`badge ${
                                  mapping.mapping_type === 0
                                    ? "bg-primary"
                                    : "bg-success"
                                }`}
                              >
                                {mapping.mapping_type === 0
                                  ? "Company"
                                  : "Hotel"}
                              </span>
                            </td>
                            <td>
                              {mapping.mapping_type === 0
                                ? mapping.company_name || "N/A"
                                : mapping.hotel_name || "N/A"}
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  mapping.auto_map_projects
                                    ? "bg-success-subtle text-success"
                                    : "bg-light text-muted"
                                }`}
                              >
                                {mapping.auto_map_projects ? "Yes" : "No"}
                              </span>
                            </td>
                            <td className="text-end">
                              <SmartButton
                                label="Remove"
                                theme="red"
                                className="px-3 py-1"
                                onClick={() =>
                                  handleRemoveUserHospitalityMapping(mapping)
                                }
                                id={`remove_user_mapping_${mapping.id}-hospitality_actions-manage_accounts_page`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <form onSubmit={handleHospitalityUserSubmit} className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Hospitality Company</label>
                    <select
                      className="form-select"
                      value={hospitalityModal.selectedCompanyId}
                      onChange={(e) => {
                        const value = e.target.value;
                        setHospitalityModal((prev) => ({
                          ...prev,
                          selectedCompanyId: value,
                          hotelId: "",
                        }));
                        loadCompanyHotels(value);
                      }}
                    >
                      {hospitalityCompanies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Mapping Level</label>
                    <select
                      className="form-select"
                      value={hospitalityModal.mappingLevel}
                      onChange={(e) =>
                        setHospitalityModal((prev) => ({
                          ...prev,
                          mappingLevel: e.target.value,
                          hotelId:
                            e.target.value === "company" ? "" : prev.hotelId,
                        }))
                      }
                    >
                      <option value="company">Company</option>
                      <option value="hotel">Specific Hotel</option>
                    </select>
                  </div>
                  {hospitalityModal.mappingLevel === "hotel" && (
                    <div className="col-md-4">
                      <label className="form-label">Hotel</label>
                      <select
                        className="form-select"
                        value={hospitalityModal.hotelId}
                        onChange={(e) =>
                          setHospitalityModal((prev) => ({
                            ...prev,
                            hotelId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select Hotel</option>
                        {modalHotels.map((hotel) => (
                          <option key={hotel.id} value={hotel.id}>
                            {hotel.name}
                          </option>
                        ))}
                        {modalHotels.length === 0 && (
                          <option value="" disabled>
                            No hotels for this company
                          </option>
                        )}
                      </select>
                    </div>
                  )}
                  <div className="col-md-8">
                    <div className="form-check form-switch mt-4">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="autoMapProjects"
                        checked={hospitalityModal.autoMapProjects}
                        onChange={(e) =>
                          setHospitalityModal((prev) => ({
                            ...prev,
                            autoMapProjects: e.target.checked,
                          }))
                        }
                      />
                      <label className="form-check-label" htmlFor="autoMapProjects">
                        Auto add to active mapped projects
                      </label>
                    </div>
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={hospitalityModal.submitting}
                    >
                      {hospitalityModal.submitting ? "Mapping..." : "Map User"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <p className="text-muted mb-0">Select a user to manage hospitality access.</p>
            )}
          </Modal.Body>
        </Modal>
      )}
    </>
  );
};

export default ManageAccountsPage;
