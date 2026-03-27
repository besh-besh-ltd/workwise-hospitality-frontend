import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import Pagination from "@/components/shared/Pagination";
import CustomRolePermissionsModal from "@/components/modal/CustomRolePermissionsModal";
import { getCompanyUsersDetailed, updateUserAccount, getProfile } from "@/services/Auth";
import {
  getHospitalityCompanies,
  getHospitalityHotels,
  mapHospitalityUsers,
  deleteUserMapping,
} from "@/services/hospitality";
import { getUserRoleScopes, getUserDepartments } from "@/services/rbac";
import { toast } from "react-toastify";

import StatsBar from "./manage-accounts/StatsBar";
import UserFilters from "./manage-accounts/UserFilters";
import UserTable from "./manage-accounts/UserTable";
import EditAccountModal from "./manage-accounts/EditAccountModal";
import AssignAccessModal from "./manage-accounts/AssignAccessModal";
import styles from "./manage-accounts/ManageAccounts.module.scss";

const roleOptions = [
  { value: 8, label: "Management", color: "#2E5BA8" },
  { value: 2, label: "Procurement", color: "#428B41" },
  { value: 9, label: "Engineering", color: "#FFE600" },
  { value: 10, label: "Finance", color: "#5b5b5b" },
];

const ManageAccountsPage = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [stats, setStats] = useState({ total_count: 0, active_count: 0, inactive_count: 0, mapped_count: 0 });
  const [filters, setFilters] = useState({ status: null, search: "", companyId: null, hotelId: null });

  const [isHospitalityCompany, setIsHospitalityCompany] = useState(false);
  const [hospitalityCompanies, setHospitalityCompanies] = useState([]);
  const [hotelsByCompany, setHotelsByCompany] = useState({});

  const [editModal, setEditModal] = useState({ open: false, account: null });
  const [editModalData, setEditModalData] = useState({ roleScopes: [], departments: [], mappings: [] });
  const [showCustomRolesModal, setShowCustomRolesModal] = useState(false);

  // Access modal state
  const [accessModal, setAccessModal] = useState({ open: false, account: null });
  const [accessModalMappings, setAccessModalMappings] = useState([]);

  // Progressive loading state
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState({
    profile: "active",
    companies: "pending",
    users: "pending",
  });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [filters.search]);

  // ── API calls ──────────────────────────────────────────────

  const fetchUsers = useCallback(async (currentFilters, currentPagination) => {
    setLoading(true);
    setLoadingSteps((prev) => ({ ...prev, users: "active" }));
    try {
      const params = {
        page: currentPagination.page,
        limit: currentPagination.limit,
      };
      if (currentFilters.search && currentFilters.search.trim()) {
        params.search = currentFilters.search.trim();
      }
      if (currentFilters.status) {
        params.status = currentFilters.status.value;
      }
      if (currentFilters.companyId) {
        params.company_id = currentFilters.companyId.value;
      }
      if (currentFilters.hotelId) {
        params.hotel_id = currentFilters.hotelId.value;
      }

      const response = await getCompanyUsersDetailed(params);
      if (!response.status) return toast.error("Failed to fetch users");

      const data = response.data;
      setUsers(data.users);
      setPagination((prev) => ({ ...prev, total: data.pagination.total }));
      setStats(data.stats);
      setLoadingSteps((prev) => ({ ...prev, users: "complete" }));
    } catch {
      toast.error("Error fetching users");
      setLoadingSteps((prev) => ({ ...prev, users: "complete" }));
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  const loadCompanyHotels = async (companyId) => {
    if (!companyId || hotelsByCompany[companyId]) return;
    try {
      const response = await getHospitalityHotels(companyId);
      const hotels = response?.data ?? response ?? [];
      setHotelsByCompany((prev) => ({ ...prev, [companyId]: hotels }));
    } catch {
      setHotelsByCompany((prev) => ({ ...prev, [companyId]: [] }));
    }
  };

  const loadHospitalityCompanies = async () => {
    setLoadingSteps((prev) => ({ ...prev, companies: "active" }));
    try {
      const response = await getHospitalityCompanies({ include: 'hotels' });
      const list = response?.data ?? response ?? [];
      setHospitalityCompanies(list);
      const hotelsMap = {};
      list.forEach((company) => {
        hotelsMap[company.id] = company.hotels || [];
      });
      setHotelsByCompany(hotelsMap);
    } catch {
      setHospitalityCompanies([]);
    } finally {
      setLoadingSteps((prev) => ({ ...prev, companies: "complete" }));
    }
  };

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("refresh") === "true") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const initLoad = async () => {
      setLoadingSteps((prev) => ({ ...prev, profile: "active" }));
      try {
        const hospitalityEnabled =
          userProfile?.is_hospitality === 1 || userProfile?.is_hospitality === "1";
        setIsHospitalityCompany(hospitalityEnabled);
        setLoadingSteps((prev) => ({ ...prev, profile: "complete" }));
        if (hospitalityEnabled) await loadHospitalityCompanies();
      } catch {
        setIsHospitalityCompany(false);
        setLoadingSteps((prev) => ({ ...prev, profile: "complete" }));
      }
    };

    if (userProfile) initLoad();
  }, [userProfile]);

  // Fetch users whenever debounced search, filters, or pagination page/limit change
  useEffect(() => {
    const currentFilters = { ...filters, search: debouncedSearch };
    fetchUsers(currentFilters, pagination);
  }, [debouncedSearch, filters.status, filters.companyId, filters.hotelId, pagination.page, pagination.limit]);

  // Reset page to 1 when filters change
  const handleFilterChange = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPagination((prev) => prev.page === 1 ? prev : { ...prev, page: 1 });
  };

  // ── Derived values ─────────────────────────────────────────

  const companyOptions = hospitalityCompanies.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const hotelOptions = filters.companyId
    ? (hotelsByCompany[filters.companyId.value] || []).map((h) => ({
        value: h.id,
        label: h.name,
      }))
    : Object.values(hotelsByCompany)
        .flat()
        .map((h) => ({ value: h.id, label: h.name }));

  // ── Handlers ───────────────────────────────────────────────

  const refreshCurrentPage = () => {
    const currentFilters = { ...filters, search: debouncedSearch };
    fetchUsers(currentFilters, pagination);
  };

  const handleEditAccount = async (account) => {
    setEditModal({ open: true, account });
    const promises = [];
    if (isHospitalityCompany) {
      promises.push(
        getUserRoleScopes(account.id).then((r) => r?.data?.data || r?.data || []).catch(() => []),
        getProfile().then((r) => r?.data?.hospitality_mappings || []).catch(() => [])
      );
    } else {
      promises.push(Promise.resolve([]), Promise.resolve([]));
    }
    promises.push(
      getUserDepartments(account.id).then((r) => r?.data?.data || r?.data || []).catch(() => [])
    );
    const [roleScopes, mappings, departments] = await Promise.all(promises);
    setEditModalData({ roleScopes, departments, mappings });
  };

  const handleSaveAccount = async (accountData) => {
    setLoading(true);
    try {
      await updateUserAccount(accountData.id, accountData);
      toast.success("User updated successfully");
      setEditModal({ open: false, account: null });
      refreshCurrentPage();
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  // ── Access Modal Handlers ────────────────────────────────

  const handleManageAccess = async (account) => {
    setAccessModal({ open: true, account });
    try {
      const mappingsRes = await getProfile();
      setAccessModalMappings(mappingsRes?.data?.hospitality_mappings || []);
    } catch {
      setAccessModalMappings([]);
    }
  };

  const handleAccessMapUser = async ({ companyId, mappingLevel, hotelId, autoMapProjects }) => {
    const user = accessModal.account;
    if (!user || !companyId) {
      toast.error("Select a hospitality company");
      return;
    }
    if (mappingLevel === "hotel" && !hotelId) {
      toast.error("Select a business unit for business unit-level mapping");
      return;
    }
    try {
      await mapHospitalityUsers(companyId, {
        mapping_type: mappingLevel === "company" ? 0 : 1,
        hotel_id: mappingLevel === "hotel" ? parseInt(hotelId, 10) : null,
        user_ids: [user.id],
        auto_map_projects: autoMapProjects,
      });
      toast.success("Access added successfully");
      const mappingsRes = await getProfile().catch(() => ({ data: {} }));
      setAccessModalMappings(mappingsRes?.data?.hospitality_mappings || []);
      refreshCurrentPage();
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message || "Failed to add access"
      );
    }
  };

  const handleAccessRemoveMapping = async (mapping) => {
    const userId = accessModal.account?.id;
    if (!userId) return;
    try {
      await deleteUserMapping(userId, {
        company_id: mapping.hospitality_company_id,
        mapping_type: mapping.mapping_type,
        hotel_id: mapping.mapping_type === 1 ? mapping.hospitality_hotel_id : null,
      });
      toast.success("Access removed");
      const mappingsRes = await getProfile().catch(() => ({ data: {} }));
      setAccessModalMappings(mappingsRes?.data?.hospitality_mappings || []);
      refreshCurrentPage();
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message || "Failed to remove access"
      );
    }
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className={styles.pageWrap}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Manage Accounts</h1>
        <p className={styles.pageSubtitle}>
          Overview of all users in your organization
        </p>
      </div>

      <StatsBar
        totalUsers={stats.total_count}
        activeCount={stats.active_count}
        inactiveCount={stats.inactive_count}
        mappedCount={stats.mapped_count}
        isHospitality={isHospitalityCompany}
        isLoading={initialLoad}
      />

      <UserFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        companyOptions={companyOptions}
        hotelOptions={hotelOptions}
        isHospitality={isHospitalityCompany}
        onCustomRoles={() => setShowCustomRolesModal(true)}
      />

      <UserTable
        users={users}
        isLoading={loading}
        isHospitality={isHospitalityCompany}
        onEdit={handleEditAccount}
        onManageAccess={handleManageAccess}
        loadingSteps={[
          { label: "Verifying profile...", status: loadingSteps.profile },
          { label: "Loading companies & business units...", status: loadingSteps.companies },
          { label: "Fetching users...", status: loadingSteps.users },
        ]}
      />

      {pagination.total > 0 && (
        <div className="mt-4">
          <Pagination
            page={pagination.page}
            setPage={(page) => setPagination((prev) => ({ ...prev, page }))}
            limit={pagination.limit}
            setLimit={(limit) => setPagination((prev) => ({ ...prev, limit, page: 1 }))}
            totalData={pagination.total}
          />
        </div>
      )}

      {editModal.open && editModal.account && (
        <EditAccountModal
          isOpen={editModal.open}
          onClose={() => setEditModal({ open: false, account: null })}
          account={editModal.account}
          isHospitality={isHospitalityCompany}
          roleOptions={roleOptions}
          initialRoleScopes={editModalData.roleScopes}
          userDepartments={editModalData.departments}
          userMappings={editModalData.mappings}
          onSave={handleSaveAccount}
        />
      )}

      {accessModal.open && accessModal.account && (
        <AssignAccessModal
          isOpen={accessModal.open}
          onClose={() => setAccessModal({ open: false, account: null })}
          user={accessModal.account}
          hospitalityCompanies={hospitalityCompanies}
          hotelsByCompany={hotelsByCompany}
          userMappings={accessModalMappings}
          onMapUser={handleAccessMapUser}
          onRemoveMapping={handleAccessRemoveMapping}
          onLoadHotels={loadCompanyHotels}
        />
      )}

      {showCustomRolesModal && (
        <CustomRolePermissionsModal
          isOpen={showCustomRolesModal}
          onClose={() => setShowCustomRolesModal(false)}
        />
      )}
    </div>
  );
};

export default ManageAccountsPage;
