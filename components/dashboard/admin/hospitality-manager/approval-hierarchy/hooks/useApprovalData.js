import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  getApprovalPolicies,
  deleteApprovalPolicy,
  getDepartmentSubGraphPreview as fetchDepartmentPreview,
  getBuApproverOptions,
} from "@/services/approval";
import { getRoles, getBatchUserRoleScopes, getBatchUserDepartments, getDepartments } from "@/services/rbac";
import { getCompanyUserMappings, getHospitalityHotels } from "@/services/hospitality";

// Per-stage entity_types the BU wizard ever picks for. The hook fetches
// approver options once per stage at load time so the wizard's role /
// user pickers are pre-filtered to <entity>.approve holders for THIS
// hotel — and network-scope grants stay out of BU pickers.
const BU_STAGE_ENTITY_TYPES = ["RFQ", "TENDER", "TECHNICAL", "NEGOTIATION", "NEGOTIATION_QUOTE", "PO", "ARC"];

const useApprovalData = (companyId, hotelId) => {
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRoleScopes, setUserRoleScopes] = useState({});
  const [userDepartmentsMap, setUserDepartmentsMap] = useState({});
  const [departments, setDepartments] = useState([]);
  // entity_type → { roles: [{id,title,users:[...]}], users: [{id,name,email}] }
  // Pre-filtered to <entity>.approve holders for THIS hotel. Used by
  // the wizard's role/user pickers per stage.
  const [approverOptionsByEntity, setApproverOptionsByEntity] = useState({});

  const loadApproverOptionsByEntity = async () => {
    try {
      const responses = await Promise.all(
        BU_STAGE_ENTITY_TYPES.map((et) =>
          getBuApproverOptions(et, { hotelId: parseInt(hotelId) }).catch(() => null)
        )
      );
      const map = {};
      BU_STAGE_ENTITY_TYPES.forEach((et, idx) => {
        const data = responses[idx]?.data?.data || responses[idx]?.data || {};
        map[et] = {
          roles: (data.roles || []).map((r) => ({
            id: r.id,
            title: r.title || r.name,
            users: (r.users || []).map((u) => ({ user_id: u.id || u.user_id, name: u.name, email: u.email })),
          })),
          users: (data.users || []).map((u) => ({ user_id: u.id || u.user_id, name: u.name, email: u.email })),
        };
      });
      setApproverOptionsByEntity(map);
    } catch (error) {
      console.error("Error loading per-stage approver options:", error);
    }
  };

  const loadHotel = async () => {
    try {
      const response = await getHospitalityHotels(companyId);
      const hotels = response?.data ?? response ?? [];
      const foundHotel = hotels.find((h) => h.id === parseInt(hotelId));
      if (foundHotel) setHotel(foundHotel);
    } catch (error) {
      console.error("Error loading business unit:", error);
    }
  };

  const loadPolicies = async () => {
    try {
      const response = await getApprovalPolicies({
        hospitality_company_id: companyId,
        hotel_id: hotelId,
        include: 'steps',
      });
      const policiesList = response?.data?.data || response?.data || [];
      setPolicies(policiesList);
    } catch (error) {
      console.error("Error loading policies:", error);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await getRoles();
      const data = response?.data?.data || response?.data || [];
      setRoles(data);
    } catch (error) {
      console.error("Error loading roles:", error);
    }
  };

  const loadUserRoleScopesMap = async (userIds) => {
    try {
      if (!userIds.length) { setUserRoleScopes({}); return; }
      const response = await getBatchUserRoleScopes(userIds);
      const grouped = response?.data?.data || response?.data || {};
      const map = {};
      for (const uid of userIds) {
        const scopes = grouped[uid] || [];
        map[uid] = scopes.map((s) => ({
          role_id: s.role_id,
          department_id: s.department_id ?? null,
          company_id: s.company_id ?? null,
          hotel_id: s.hotel_id ?? null,
        }));
      }
      setUserRoleScopes(map);
    } catch (error) {
      console.error("Error loading user role scopes:", error);
    }
  };

  const loadUserDepartmentsMap = async (userIds) => {
    try {
      if (!userIds.length) { setUserDepartmentsMap({}); return; }
      const response = await getBatchUserDepartments(userIds);
      const grouped = response?.data?.data || response?.data || {};
      const map = {};
      for (const uid of userIds) {
        map[uid] = grouped[uid] || [];
      }
      setUserDepartmentsMap(map);
    } catch (error) {
      console.error("Error loading user departments:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const [companyResponse, hotelResponse] = await Promise.all([
        getCompanyUserMappings(companyId, { mappingType: 0 }),
        getCompanyUserMappings(companyId, {
          mappingType: 1,
          hotelId: parseInt(hotelId),
        }),
      ]);

      const companyUsers = companyResponse?.data?.data || companyResponse?.data || [];
      const hotelUsers = hotelResponse?.data?.data || hotelResponse?.data || [];

      const allUsers = [...companyUsers, ...hotelUsers];
      const uniqueUsers = Array.from(
        new Map(allUsers.map((user) => [user.user_id, user])).values()
      );
      setUsers(uniqueUsers);
      const uids = uniqueUsers.map((u) => u.user_id);
      await Promise.all([loadUserRoleScopesMap(uids), loadUserDepartmentsMap(uids)]);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      const data = response?.data?.data || response?.data || [];
      setDepartments(data);
    } catch (error) {
      console.error("Error loading departments:", error);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadHotel(),
        loadPolicies(),
        loadRoles(),
        loadUsers(),
        loadDepartments(),
        loadApproverOptionsByEntity(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId && hotelId) {
      loadAll();
    }
  }, [companyId, hotelId]);

  const refresh = useCallback(async () => {
    await loadPolicies();
  }, [companyId, hotelId]);

  const refreshDepartments = useCallback(async () => {
    await loadDepartments();
  }, []);

  const getUsersByRole = useCallback(
    (roleId, departmentId) => {
      if (!roleId) return [];
      const cId = parseInt(companyId);
      const hId = parseInt(hotelId);
      return users.filter((user) => {
        const scopes = userRoleScopes[user.user_id] || [];
        return scopes.some((scope) => {
          if (scope.role_id !== roleId) return false;
          // Scope must belong to this company (or be unscoped)
          if (scope.company_id && scope.company_id !== cId) return false;
          // Scope must belong to this hotel (or be unscoped / company-wide)
          if (scope.hotel_id && scope.hotel_id !== hId) return false;
          // Department filter
          if (departmentId != null && scope.department_id !== null && scope.department_id !== departmentId) return false;
          return true;
        });
      });
    },
    [users, userRoleScopes, companyId, hotelId]
  );

  const getApproverOptions = useCallback(
    (sourceType, entityType) => {
      // Picker uses the per-entity slice when one is available — i.e.
      // the wizard supplies stage entity_type. This narrows the pool to
      // <entity>.approve holders at THIS hotel's BU scope. Network-scope
      // holders are excluded server-side so e.g. a Group-ARC tender
      // approver can't bleed into a hotel's BU committee picker.
      const slice = entityType ? approverOptionsByEntity[entityType] : null;
      if (slice) {
        if (sourceType === "USER") {
          return slice.users.map((u) => ({
            value: u.user_id,
            label: `${u.name}${u.email ? ` (${u.email})` : ""}`,
          }));
        }
        if (sourceType === "ROLE") {
          return slice.roles.map((r) => ({ value: r.id, label: r.title }));
        }
        return [];
      }
      // Fallback (no entity_type passed — legacy callers / master policy
      // context with no specific stage).
      if (sourceType === "USER") {
        return users.map((u) => ({
          value: u.user_id,
          label: `${u.name}${u.email ? ` (${u.email})` : ""}`,
        }));
      } else if (sourceType === "ROLE") {
        return roles.map((r) => ({ value: r.id, label: r.title }));
      }
      return [];
    },
    [users, roles, approverOptionsByEntity]
  );

  const getUserDeptNames = useCallback(
    (userId) => {
      const depts = userDepartmentsMap[userId] || [];
      return depts.map((d) => d.title).filter(Boolean);
    },
    [userDepartmentsMap]
  );

  const getApproverDisplayInfo = useCallback(
    (step, entityType) => {
      // Prefer the per-entity slice — its users[] is BU-scope filtered
      // to this hotel and matches what the picker now offers.
      const slice = entityType ? approverOptionsByEntity[entityType] : null;
      if (slice) {
        if (step.approver_source_type === "USER") {
          const u = slice.users.find((x) => x.user_id === step.approver_source_id);
          return {
            name: u?.name || "Unknown User",
            email: u?.email || "",
            type: "User",
            typeLabel: "Specific User",
            users: u ? [u] : [],
          };
        }
        if (step.approver_source_type === "ROLE") {
          const r = slice.roles.find((x) => x.id === step.approver_source_id);
          return {
            name: r?.title || "Unknown Role",
            email: "",
            type: "Role",
            typeLabel: "User Role",
            users: r?.users || [],
          };
        }
      }
      // Legacy fallback for callers that don't pass entity_type.
      if (step.approver_source_type === "USER") {
        const user = users.find((u) => u.user_id === step.approver_source_id);
        return {
          name: user?.name || "Unknown User",
          email: user?.email || "",
          type: "User",
          typeLabel: "Specific User",
          users: user ? [{ ...user, departmentNames: getUserDeptNames(user.user_id) }] : [],
        };
      } else if (step.approver_source_type === "ROLE") {
        const role = roles.find((r) => r.id === step.approver_source_id);
        const roleUsers = getUsersByRole(step.approver_source_id, null);
        const enrichedUsers = roleUsers.map((u) => ({
          ...u,
          departmentNames: getUserDeptNames(u.user_id),
        }));
        return {
          name: role?.title || "Unknown Role",
          email: "",
          type: "Role",
          typeLabel: "User Role",
          users: enrichedUsers,
        };
      }
      return { name: "Unknown", email: "", type: "", typeLabel: "", users: [] };
    },
    [users, roles, getUsersByRole, getUserDeptNames, approverOptionsByEntity]
  );

  const handleDeletePolicy = useCallback(
    async (policyId) => {
      try {
        await deleteApprovalPolicy(policyId);
        toast.success("Workflow deleted successfully");
        await loadPolicies();
      } catch (error) {
        console.error("Error deleting policy:", error);
        toast.error(error?.message?.response?.data?.message || "Failed to delete workflow");
      }
    },
    [companyId, hotelId]
  );

  const getDeptSubGraphPreview = useCallback(
    async (policyId) => {
      try {
        const response = await fetchDepartmentPreview(policyId, {
          hospitality_company_id: companyId,
          hotel_id: hotelId
        });
        return response?.data || null;
      } catch (error) {
        console.error("Error loading department preview:", error);
        return null;
      }
    },
    [companyId, hotelId]
  );

  return {
    hotel,
    policies,
    roles,
    users,
    userRoleScopes,
    departments,
    loading,
    refresh,
    getUsersByRole,
    getApproverOptions,
    getApproverDisplayInfo,
    handleDeletePolicy,
    getDeptSubGraphPreview,
    refreshDepartments,
  };
};

export default useApprovalData;
