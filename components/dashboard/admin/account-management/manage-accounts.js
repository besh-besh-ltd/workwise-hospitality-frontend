import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import Pagination from "@/components/shared/Pagination";
import CustomRolePermissionsModal from "@/components/modal/CustomRolePermissionsModal";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import {
  BsFileEarmarkText,
  BsFileEarmarkRuled,
  BsClipboardCheck,
  BsChatLeftDots,
  BsCheck2Square,
  BsAward,
  BsCart3,
  BsClipboard,
  BsExclamationTriangleFill,
} from "react-icons/bs";

// Friendly labels + icons + accent colours per approval entity type.
// Mirrors backend's ENTITY_LABELS so admins see "Vendor Finalization" instead
// of "NEGOTIATION_QUOTE", with a colour-coded icon for quick recognition.
const ENTITY_META = {
  RFQ:                { label: "RFQ",                 Icon: BsFileEarmarkText,   color: "#2563eb", bg: "#eff6ff" },
  TENDER:             { label: "Tender",              Icon: BsFileEarmarkRuled,  color: "#4f46e5", bg: "#eef2ff" },
  TECHNICAL:          { label: "Technical Evaluation",Icon: BsClipboardCheck,    color: "#0891b2", bg: "#ecfeff" },
  NEGOTIATION:        { label: "Negotiation",         Icon: BsChatLeftDots,      color: "#d97706", bg: "#fffbeb" },
  NEGOTIATION_QUOTE:  { label: "Vendor Finalization", Icon: BsCheck2Square,      color: "#7c3aed", bg: "#f5f3ff" },
  ARC:                { label: "ARC Document",        Icon: BsAward,             color: "#b45309", bg: "#fef3c7" },
  PO:                 { label: "Purchase Order",      Icon: BsCart3,             color: "#059669", bg: "#ecfdf5" },
  INDENT:             { label: "Indent",              Icon: BsClipboard,         color: "#475569", bg: "#f8fafc" },
};
const getEntityMeta = (type) =>
  ENTITY_META[type] || { label: type || "Approval", Icon: BsFileEarmarkText, color: "#64748b", bg: "#f1f5f9" };
import { getCompanyUsersDetailed, updateUserAccount } from "@/services/Auth";
import {
  getHospitalityCompanies,
  getHospitalityHotels,
  mapHospitalityUsers,
  deleteUserMapping,
  getUserMappingsById,
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
  const [removeMappingConfirm, setRemoveMappingConfirm] = useState({ open: false, mapping: null });

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
        getUserMappingsById(account.id).then((res) => res?.data || []).catch(() => [])
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

  const [approvalImpactModal, setApprovalImpactModal] = useState({ open: false, type: null, data: null, pendingAccountData: null });
  // Dedicated state for the in-flight Update Account save. Distinct from the
  // page-level `loading` (which tracks list fetches) so the modal can show
  // its own spinner without putting the table into a loading skeleton.
  const [savingAccount, setSavingAccount] = useState(false);

  const handleSaveAccount = async (accountData, confirmedApprovalImpact = false) => {
    setSavingAccount(true);
    try {
      const payload = { ...accountData };
      if (confirmedApprovalImpact) payload.confirmed_approval_impact = true;

      const response = await updateUserAccount(payload.id, payload);

      // Check for approval impact responses
      if (response?.code === 'APPROVAL_AUTO_COMPLETE_BLOCKED') {
        setApprovalImpactModal({
          open: true,
          type: 'blocked',
          data: response.data,
          pendingAccountData: null
        });
        return;
      }

      if (response?.code === 'APPROVAL_IMPACT_WARNING' && !confirmedApprovalImpact) {
        setApprovalImpactModal({
          open: true,
          type: 'warning',
          data: response.data,
          pendingAccountData: accountData
        });
        return;
      }

      toast.success("User updated successfully");
      setEditModal({ open: false, account: null });
      refreshCurrentPage();
    } catch (err) {
      console.error("Error updating user:", err);
      // Check if error response contains approval impact info
      const errData = err?.message?.response?.data || err?.response?.data;
      if (errData?.code === 'APPROVAL_AUTO_COMPLETE_BLOCKED') {
        setApprovalImpactModal({
          open: true,
          type: 'blocked',
          data: errData.data,
          pendingAccountData: null
        });
        return;
      }
      toast.error("Failed to update user");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleApprovalImpactConfirm = async () => {
    const data = approvalImpactModal.pendingAccountData;
    if (data?._removeMapping) {
      await executeRemoveMapping(data._removeMapping, true);
      setApprovalImpactModal({ open: false, type: null, data: null, pendingAccountData: null });
    } else if (data) {
      setApprovalImpactModal({ open: false, type: null, data: null, pendingAccountData: null });
      handleSaveAccount(data, true);
    }
  };

  // ── Access Modal Handlers ────────────────────────────────

  const handleManageAccess = async (account) => {
    setAccessModal({ open: true, account });
    setAccessModalMappings([]);
    try {
      const res = await getUserMappingsById(account.id);
      setAccessModalMappings(res?.data || []);
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
      try {
        const res = await getUserMappingsById(user.id);
        setAccessModalMappings(res?.data || []);
      } catch { /* ignore */ }
      refreshCurrentPage();
    } catch (error) {
      toast.error(
        error?.message?.response?.data?.message || "Failed to add access"
      );
    }
  };

  const handleAccessRemoveMapping = (mapping) => {
    setRemoveMappingConfirm({ open: true, mapping });
  };

  const executeRemoveMapping = async (mapping, confirmed = false) => {
    const userId = accessModal.account?.id;
    if (!userId || !mapping) return;
    const payload = {
      company_id: mapping.hospitality_company_id,
      mapping_type: mapping.mapping_type,
      hotel_id: mapping.mapping_type === 1 ? mapping.hospitality_hotel_id : null,
    };
    if (confirmed) payload.confirmed_approval_impact = true;
    try {
      const response = await deleteUserMapping(userId, payload);

      // Backend returns HTTP 200 with status: 0 for approval impact warning
      if (response?.code === 'APPROVAL_IMPACT_WARNING' && !confirmed) {
        setRemoveMappingConfirm({ open: false, mapping: null });
        setApprovalImpactModal({
          open: true,
          type: 'warning',
          data: response.data,
          pendingAccountData: { _removeMapping: mapping }
        });
        return;
      }

      const removedCount = response?.data?.removed_role_scopes || 0;
      toast.success(`Access removed${removedCount > 0 ? ` (${removedCount} role scope${removedCount > 1 ? 's' : ''} cleared)` : ''}`);
      setRemoveMappingConfirm({ open: false, mapping: null });
      try {
        const res = await getUserMappingsById(userId);
        setAccessModalMappings(res?.data || []);
      } catch { /* ignore */ }
      refreshCurrentPage();
    } catch (error) {
      // Backend returns HTTP 400 for auto-complete blocked
      const errData = error?.message?.response?.data || error?.response?.data;
      if (errData?.code === 'APPROVAL_AUTO_COMPLETE_BLOCKED') {
        setRemoveMappingConfirm({ open: false, mapping: null });
        setApprovalImpactModal({
          open: true,
          type: 'blocked',
          data: errData.data,
          pendingAccountData: null
        });
        return;
      }
      toast.error(errData?.message || "Failed to remove access");
    }
  };

  const handleConfirmRemoveMapping = async () => {
    const mapping = removeMappingConfirm.mapping;
    if (!mapping) return;
    await executeRemoveMapping(mapping);
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
          isSaving={savingAccount}
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

      {/* Approval Impact Modal — shown when role/dept/status changes affect
          pending approvals. Uses the shared ConfirmationModal so it inherits
          the app's overlay (z-index 9999, sits above the EditAccountModal),
          the gradient accent bar, the Poppins typography, and the standard
          button styles. The affected-instances list is rendered as the
          customFooter so we don't have to duplicate the modal chrome. */}
      <ConfirmationModal
        isOpen={approvalImpactModal.open}
        onClose={() => setApprovalImpactModal({ open: false, type: null, data: null, pendingAccountData: null })}
        onConfirm={
          approvalImpactModal.type === 'blocked'
            ? () => setApprovalImpactModal({ open: false, type: null, data: null, pendingAccountData: null })
            : handleApprovalImpactConfirm
        }
        title={
          approvalImpactModal.type === 'blocked'
            ? 'Removal would skip approvals'
            : 'This user has open approvals'
        }
        description={
          approvalImpactModal.type === 'blocked'
            ? 'Without this user the workflows below would self-approve, with no human review. Reassign their role to another user first, then try again.'
            : "Saving will skip this user's pending approvals on the workflows below. Other approvers can still act, but their review will be missing from the audit trail."
        }
        confirmButtonColor={approvalImpactModal.type === 'blocked' ? 'danger' : 'warning'}
        confirmButtonText={approvalImpactModal.type === 'blocked' ? 'Got it' : 'Proceed anyway'}
        cancelButtonText="Cancel"
        hideCancelButton={approvalImpactModal.type === 'blocked'}
        showCloseButton
        customFooter={
          approvalImpactModal.data?.affectedInstances?.length > 0 ? (
            <div style={{ marginTop: 6 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  marginBottom: 8,
                  paddingLeft: 2,
                }}
              >
                {approvalImpactModal.data.affectedInstances.length}{' '}
                pending workflow{approvalImpactModal.data.affectedInstances.length === 1 ? '' : 's'} affected
              </div>
              <div
                style={{
                  maxHeight: 260,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {approvalImpactModal.data.affectedInstances.map((inst, idx) => {
                  const meta = getEntityMeta(inst.entity_type);
                  const Icon = meta.Icon;
                  const total = parseInt(inst.total_steps) || null;
                  return (
                    <div
                      key={`${inst.instance_id || inst.entity_id}-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        fontFamily: '"Poppins", "Inter", -apple-system, sans-serif',
                      }}
                    >
                      {/* Entity icon tile */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: meta.bg,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} />
                      </div>

                      {/* Label + identifier + step */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#0f172a',
                            lineHeight: 1.3,
                            marginBottom: 2,
                          }}
                        >
                          {meta.label}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: '#64748b',
                            lineHeight: 1.3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ fontWeight: 500, color: '#475569' }}>
                            {inst.entity_identifier || `#${inst.entity_id}`}
                          </span>
                          <span style={{ color: '#cbd5e1' }}>·</span>
                          <span>
                            Step {inst.step_order}
                            {total ? ` of ${total}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Severity badge */}
                      {inst.wouldAutoCompleteInstance ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            color: '#fff',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            padding: '4px 9px',
                            borderRadius: 999,
                            boxShadow: '0 1px 2px rgba(220, 38, 38, 0.25)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          <BsExclamationTriangleFill size={9} />
                          Auto-approves
                        </div>
                      ) : inst.wouldAutoCompleteStep ? (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            color: '#92400e',
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            padding: '3px 9px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          Step skipped
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null
        }
      />

      {/* Remove Mapping Confirmation */}
      <ConfirmationModal
        isOpen={removeMappingConfirm.open}
        onClose={() => setRemoveMappingConfirm({ open: false, mapping: null })}
        onConfirm={handleConfirmRemoveMapping}
        title="Remove Access"
        description={
          removeMappingConfirm.mapping
            ? `Removing access to ${
                removeMappingConfirm.mapping.mapping_type === 0
                  ? (removeMappingConfirm.mapping.company_name || 'this company')
                  : (removeMappingConfirm.mapping.hotel_name || 'this business unit')
              } will also remove all role scopes assigned for it.`
            : 'Are you sure you want to remove this access?'
        }
        confirmButtonColor="danger"
        confirmButtonText="Remove"
        cancelButtonText="Cancel"
      />
    </div>
  );
};

export default ManageAccountsPage;
