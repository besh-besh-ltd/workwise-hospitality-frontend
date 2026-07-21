import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  getApprovalPolicies,
  deleteApprovalPolicy,
  getDepartmentSubGraphPreview as fetchDepartmentPreview,
} from "@/services/approval";
import { getRoles, getBatchUserRoleScopes, getBatchUserDepartments, getDepartments } from "@/services/rbac";
import { getCompanyUserMappings, getHospitalityHotels } from "@/services/hospitality";

const useApprovalData = (companyId, hotelId) => {
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRoleScopes, setUserRoleScopes] = useState({});
  const [userDepartmentsMap, setUserDepartmentsMap] = useState({});
  const [departments, setDepartments] = useState([]);

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
          // process_id: NULL = "all processes" (wildcard). Retained so the
          // Approval Wizard can filter approver options by the policy's process.
          process_id: s.process_id ?? null,
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
      await Promise.all([loadHotel(), loadPolicies(), loadRoles(), loadUsers(), loadDepartments()]);
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
    (roleId, departmentId, processId = null) => {
      if (!roleId) return [];
      const cId = parseInt(companyId);
      const hId = parseInt(hotelId);
      const pId = processId != null ? Number(processId) : null;
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
          // Process filter: NULL process on the scope row = wildcard (matches
          // any process). A specific scope process must equal the policy's
          // process. When no process is selected on the policy, don't filter.
          if (pId != null && scope.process_id != null && Number(scope.process_id) !== pId) return false;
          return true;
        });
      });
    },
    [users, userRoleScopes, companyId, hotelId]
  );

  const getApproverOptions = useCallback(
    (sourceType, departmentId, processId = null) => {
      const pId = processId != null ? Number(processId) : null;
      if (sourceType === "USER") {
        // Master policy context: no department filtering. When a process is
        // selected on the policy, only surface users who fall in that process —
        // i.e. hold at least one role scope for this company/hotel whose
        // process_id matches (or is the NULL wildcard). No process selected →
        // every user (backwards-compat).
        const cId = parseInt(companyId);
        const hId = parseInt(hotelId);
        const inSelectedProcess = (user) => {
          if (pId == null) return true;
          const scopes = userRoleScopes[user.user_id] || [];
          return scopes.some((scope) => {
            if (scope.company_id && scope.company_id !== cId) return false;
            if (scope.hotel_id && scope.hotel_id !== hId) return false;
            if (scope.process_id != null && Number(scope.process_id) !== pId) return false;
            return true;
          });
        };
        return users.filter(inSelectedProcess).map((u) => ({
          value: u.user_id,
          label: `${u.name}${u.email ? ` (${u.email})` : ""}`,
        }));
      } else if (sourceType === "ROLE") {
        return roles.map((r) => ({ value: r.id, label: r.title }));
      }
      return [];
    },
    [users, roles, userRoleScopes, companyId, hotelId]
  );

  const getUserDeptNames = useCallback(
    (userId) => {
      const depts = userDepartmentsMap[userId] || [];
      return depts.map((d) => d.title).filter(Boolean);
    },
    [userDepartmentsMap]
  );

  const getApproverDisplayInfo = useCallback(
    (step, departmentId, processId = null) => {
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
        // Preview the users this role resolves to, respecting the policy's
        // selected process (wildcard scopes still match).
        const roleUsers = getUsersByRole(step.approver_source_id, departmentId, processId);
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
    [users, roles, getUsersByRole, getUserDeptNames]
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
