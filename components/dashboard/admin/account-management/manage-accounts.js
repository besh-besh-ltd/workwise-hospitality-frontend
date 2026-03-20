import React, { useState, useEffect, useRef, useCallback } from "react";
import Pagination from "@/components/shared/Pagination";
import CustomRolePermissionsModal from "@/components/modal/CustomRolePermissionsModal";
import { getCompanyUsersDetailed, updateUserAccount, getProfile } from "@/services/Auth";
import {
  getHospitalityCompanies,
  getHospitalityHotels,
  getUserMappings,
  mapHospitalityUsers,
  deleteUserMapping,
} from "@/services/hospitality";
import { getUserRoleScopes, getUserDepartments } from "@/services/rbac";
import { toast } from "react-toastify";

import StatsBar from "./manage-accounts/StatsBar";
import UserFilters from "./manage-accounts/UserFilters";
import UserTable from "./manage-accounts/UserTable";
import EditAccountModal from "./manage-accounts/EditAccountModal";
import styles from "./manage-accounts/ManageAccounts.module.css";

const roleOptions = [
  { value: 8, label: "Management", color: "#2E5BA8" },
  { value: 2, label: "Procurement", color: "#428B41" },
  { value: 9, label: "Engineering", color: "#FFE600" },
  { value: 10, label: "Finance", color: "#5b5b5b" },
];

const ManageAccountsPage = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [stats, setStats] = useState({ total_count: 0, active_count: 0, inactive_count: 0, mapped_count: 0 });
  const [filters, setFilters] = useState({ status: null, search: "", companyId: null, hotelId: null });

  const [isHospitalityCompany, setIsHospitalityCompany] = useState(false);
  const [hospitalityCompanies, setHospitalityCompanies] = useState([]);
  const [hotelsByCompany, setHotelsByCompany] = useState({});

  const [editModal, setEditModal] = useState({ open: false, account: null });
  const [editModalData, setEditModalData] = useState({ mappings: [], roleScopes: [], departments: [] });
  const [showCustomRolesModal, setShowCustomRolesModal] = useState(false);

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
    } catch {
      toast.error("Error fetching users");
    } finally {
      setLoading(false);
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
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await getProfile();
      const profile = response?.data;
      const hospitalityEnabled =
        profile?.is_hospitality === 1 || profile?.is_hospitality === "1";
      setIsHospitalityCompany(hospitalityEnabled);
      if (hospitalityEnabled) await loadHospitalityCompanies();
    } catch {
      setIsHospitalityCompany(false);
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
    fetchProfile();
  }, []);

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

  const handleEditAccount = async (account) => {
    setEditModal({ open: true, account });
    // Fetch full data for the edit modal (single user)
    const promises = [];
    if (isHospitalityCompany) {
      promises.push(
        getUserMappings(account.id).then((r) => r?.data?.data || r?.data || []).catch(() => []),
        getUserRoleScopes(account.id).then((r) => r?.data?.data || r?.data || []).catch(() => [])
      );
    } else {
      promises.push(Promise.resolve([]), Promise.resolve([]));
    }
    promises.push(
      getUserDepartments(account.id).then((r) => r?.data?.data || r?.data || []).catch(() => [])
    );
    const [mappings, roleScopes, departments] = await Promise.all(promises);
    setEditModalData({ mappings, roleScopes, departments });
  };

  const refreshCurrentPage = () => {
    const currentFilters = { ...filters, search: debouncedSearch };
    fetchUsers(currentFilters, pagination);
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

  const handleMapUser = async ({ companyId, mappingLevel, hotelId, autoMapProjects }) => {
    const user = editModal.account;
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
      toast.success("User mapped successfully");
      // Refresh edit modal mappings for the single user
      const mappingsRes = await getUserMappings(user.id).catch(() => ({ data: [] }));
      setEditModalData((prev) => ({
        ...prev,
        mappings: mappingsRes?.data?.data || mappingsRes?.data || []
      }));
      refreshCurrentPage();
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message || "Failed to map user"
      );
    }
  };

  const handleRemoveMapping = async (mapping) => {
    const userId = editModal.account?.id;
    if (!userId) return;
    try {
      await deleteUserMapping(userId, {
        company_id: mapping.hospitality_company_id,
        mapping_type: mapping.mapping_type,
        hotel_id: mapping.mapping_type === 1 ? mapping.hospitality_hotel_id : null,
      });
      toast.success("Mapping removed");
      // Refresh edit modal mappings for the single user
      const mappingsRes = await getUserMappings(userId).catch(() => ({ data: [] }));
      setEditModalData((prev) => ({
        ...prev,
        mappings: mappingsRes?.data?.data || mappingsRes?.data || []
      }));
      refreshCurrentPage();
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message || "Failed to remove mapping"
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
          hospitalityCompanies={hospitalityCompanies}
          hotelsByCompany={hotelsByCompany}
          userMappings={editModalData.mappings}
          initialRoleScopes={editModalData.roleScopes}
          userDepartments={editModalData.departments}
          onSave={handleSaveAccount}
          onMapUser={handleMapUser}
          onRemoveMapping={handleRemoveMapping}
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
