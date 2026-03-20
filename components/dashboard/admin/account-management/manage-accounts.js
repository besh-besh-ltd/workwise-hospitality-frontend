import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import Pagination from "@/components/shared/Pagination";
import CustomRolePermissionsModal from "@/components/modal/CustomRolePermissionsModal";
import { getCompanyUsers, updateUserAccount } from "@/services/Auth";
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

const dedupeHospitalityMappings = (list = []) => {
  const seen = new Set();
  return list.filter((item) => {
    const key =
      item.mapping_type === 0
        ? `company-${item.hospitality_company_id}-${item.user_id}`
        : `hotel-${item.hospitality_company_id}-${item.hospitality_hotel_id}-${item.user_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const ManageAccountsPage = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  const [filters, setFilters] = useState({
    status: null,
    search: "",
    companyId: null,
    hotelId: null,
  });

  const [isHospitalityCompany, setIsHospitalityCompany] = useState(false);
  const [hospitalityCompanies, setHospitalityCompanies] = useState([]);
  const [hotelsByCompany, setHotelsByCompany] = useState({});
  const [userHospitalityMappings, setUserHospitalityMappings] = useState({});
  const [userRoleScopes, setUserRoleScopes] = useState({});
  const [userDepartments, setUserDepartments] = useState({});

  const [editModal, setEditModal] = useState({ open: false, account: null });
  const [showCustomRolesModal, setShowCustomRolesModal] = useState(false);

  // Debounced search to prevent input thrashing
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [filters.search]);

  // Stable ref for mappings to avoid filter re-triggers during async loading
  const mappingsRef = useRef(userHospitalityMappings);
  const [mappingsReady, setMappingsReady] = useState(false);
  useEffect(() => {
    mappingsRef.current = userHospitalityMappings;
  }, [userHospitalityMappings]);

  // ── API calls ──────────────────────────────────────────────

  const fetchUserMapping = async (userId) => {
    if (!userId) return;
    try {
      const response = await getUserMappings(userId);
      const mappings = response?.data?.data || response?.data || [];
      setUserHospitalityMappings((prev) => ({
        ...prev,
        [userId]: dedupeHospitalityMappings(mappings),
      }));
    } catch {
      setUserHospitalityMappings((prev) => ({ ...prev, [userId]: [] }));
    }
  };

  const fetchUserRoleScopesForUser = async (userId) => {
    if (!userId) return;
    try {
      const response = await getUserRoleScopes(userId);
      const scopes = response?.data?.data || response?.data || [];
      setUserRoleScopes((prev) => ({ ...prev, [userId]: scopes }));
    } catch {
      setUserRoleScopes((prev) => ({ ...prev, [userId]: [] }));
    }
  };

  const fetchUserDepartmentsForUser = async (userId) => {
    if (!userId) return;
    try {
      const response = await getUserDepartments(userId);
      const depts = response?.data?.data || response?.data || [];
      setUserDepartments((prev) => ({ ...prev, [userId]: depts }));
    } catch {
      setUserDepartments((prev) => ({ ...prev, [userId]: [] }));
    }
  };

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
      const response = await getHospitalityCompanies();
      const list = response?.data ?? response ?? [];
      setHospitalityCompanies(list);
      list.forEach((company) => loadCompanyHotels(company.id));
    } catch {
      setHospitalityCompanies([]);
    }
  };

  useEffect(() => {
    const hospitalityEnabled =
      userProfile?.is_hospitality === 1 || userProfile?.is_hospitality === "1";
    setIsHospitalityCompany(!!hospitalityEnabled);
    if (hospitalityEnabled) loadHospitalityCompanies();
  }, [userProfile]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await getCompanyUsers();
      if (!response.status) return toast.error("Failed to fetch users");
      const users = response.data;
      setAccounts(users);
      setFilteredAccounts(users);

      const userIds = users.map((u) => u.id);
      await Promise.all(userIds.map((id) => fetchUserDepartmentsForUser(id)));
    } catch {
      toast.error("Error fetching users");
    } finally {
      setLoading(false);
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
    fetchUsers();
  }, []);

  useEffect(() => {
    if (accounts.length && isHospitalityCompany) {
      setMappingsReady(false);
      Promise.all(accounts.map((u) => fetchUserMapping(u.id)))
        .then(() => setMappingsReady(true));
      Promise.all(accounts.map((u) => fetchUserRoleScopesForUser(u.id)));
    }
  }, [isHospitalityCompany, accounts]);

  // Filtering — uses debounced search and stable mappings ref
  useEffect(() => {
    let filtered = accounts;

    if (filters.status)
      filtered = filtered.filter((u) => u.status === filters.status.value);

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      filtered = filtered.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.employee_code || "").toLowerCase().includes(q)
      );
    }

    if (filters.companyId) {
      const companyId = filters.companyId.value;
      filtered = filtered.filter((u) => {
        const mappings = mappingsRef.current[u.id] || [];
        return mappings.some((m) => m.hospitality_company_id == companyId);
      });
    }

    if (filters.hotelId) {
      const hotelId = filters.hotelId.value;
      filtered = filtered.filter((u) => {
        const mappings = mappingsRef.current[u.id] || [];
        return mappings.some((m) => m.hospitality_hotel_id == hotelId);
      });
    }

    setFilteredAccounts(filtered);
    setPagination((prev) => prev.page === 1 ? prev : { ...prev, page: 1 });
  }, [debouncedSearch, filters.status, filters.companyId, filters.hotelId, accounts, mappingsReady]);

  // ── Derived values ─────────────────────────────────────────

  const activeCount = accounts.filter((a) => a.status === "active").length;
  const inactiveCount = accounts.length - activeCount;
  const mappedCount = accounts.filter(
    (a) => (userHospitalityMappings[a.id] || []).length > 0
  ).length;

  const totalData = filteredAccounts.length;
  const start = (pagination.page - 1) * pagination.limit;
  const paginatedUsers = filteredAccounts.slice(start, start + pagination.limit);

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

  const handleFilterChange = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const handleEditAccount = (account) => {
    if (isHospitalityCompany) {
      fetchUserMapping(account.id);
      fetchUserRoleScopesForUser(account.id);
    }
    fetchUserDepartmentsForUser(account.id);
    setEditModal({ open: true, account });
  };

  const handleSaveAccount = async (accountData) => {
    setLoading(true);
    try {
      await updateUserAccount(accountData.id, accountData);
      toast.success("User updated successfully");
      setEditModal({ open: false, account: null });
      await fetchUsers();
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
      await fetchUserMapping(user.id);
      fetchUsers();
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
      await fetchUserMapping(userId);
      fetchUsers();
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
        totalUsers={accounts.length}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        mappedCount={mappedCount}
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
        users={paginatedUsers}
        isLoading={loading}
        isHospitality={isHospitalityCompany}
        userMappings={userHospitalityMappings}
        userRoleScopes={userRoleScopes}
        userDepartments={userDepartments}
        onEdit={handleEditAccount}
      />

      {totalData > 0 && (
        <div className="mt-4">
          <Pagination
            page={pagination.page}
            setPage={(page) => setPagination((prev) => ({ ...prev, page }))}
            limit={pagination.limit}
            setLimit={(limit) => setPagination((prev) => ({ ...prev, limit }))}
            totalData={totalData}
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
          userMappings={userHospitalityMappings[editModal.account.id] || []}
          initialRoleScopes={userRoleScopes[editModal.account.id] || []}
          userDepartments={userDepartments[editModal.account.id] || []}
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
