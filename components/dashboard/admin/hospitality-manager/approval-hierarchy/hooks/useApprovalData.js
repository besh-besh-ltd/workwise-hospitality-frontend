import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  getApprovalPolicies,
  getApprovalPolicy,
  deleteApprovalPolicy,
} from "@/services/approval";
import { getRoles, getUserRoleScopes, getDepartments } from "@/services/rbac";
import { getCompanyUserMappings, getHospitalityHotels } from "@/services/hospitality";

const useApprovalData = (companyId, hotelId) => {
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRoleScopes, setUserRoleScopes] = useState({});
  const [departments, setDepartments] = useState([]);

  const loadHotel = async () => {
    try {
      const response = await getHospitalityHotels(companyId);
      const hotels = response?.data ?? response ?? [];
      const foundHotel = hotels.find((h) => h.id === parseInt(hotelId));
      if (foundHotel) setHotel(foundHotel);
    } catch (error) {
      console.error("Error loading hotel:", error);
    }
  };

  const loadPolicies = async () => {
    try {
      const response = await getApprovalPolicies({
        hospitality_company_id: companyId,
        hotel_id: hotelId,
      });
      const policiesList = response?.data?.data || response?.data || [];

      const policiesWithSteps = await Promise.all(
        policiesList.map(async (policy) => {
          try {
            const policyResponse = await getApprovalPolicy(policy.id);
            return policyResponse?.data?.data || policyResponse?.data || policy;
          } catch (error) {
            console.error(`Error loading steps for policy ${policy.id}:`, error);
            return { ...policy, steps: [] };
          }
        })
      );

      setPolicies(policiesWithSteps);
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
      const results = await Promise.all(
        userIds.map(async (userId) => {
          try {
            const response = await getUserRoleScopes(userId);
            const scopes = response?.data?.data || response?.data || [];
            return { userId, scopes: scopes.map((s) => ({ role_id: s.role_id, department_id: s.department_id ?? null })) };
          } catch (error) {
            return { userId, roleIds: [] };
          }
        })
      );
      const map = {};
      results.forEach(({ userId, scopes }) => {
        map[userId] = scopes;
      });
      setUserRoleScopes(map);
    } catch (error) {
      console.error("Error loading user role scopes:", error);
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
      await loadUserRoleScopesMap(uniqueUsers.map((u) => u.user_id));
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

  const getUsersByRole = useCallback(
    (roleId, departmentId) => {
      if (!roleId) return [];
      return users.filter((user) => {
        const scopes = userRoleScopes[user.user_id] || [];
        return scopes.some((scope) =>
          scope.role_id === roleId &&
          (departmentId == null || scope.department_id === null || scope.department_id === departmentId)
        );
      });
    },
    [users, userRoleScopes]
  );

  const getApproverOptions = useCallback(
    (sourceType, departmentId) => {
      if (sourceType === "USER") {
        let filteredUsers = users;
        if (departmentId != null) {
          filteredUsers = users.filter((u) => {
            const scopes = userRoleScopes[u.user_id] || [];
            return scopes.some((scope) =>
              scope.department_id === null || scope.department_id === departmentId
            );
          });
        }
        return filteredUsers.map((u) => ({
          value: u.user_id,
          label: `${u.name}${u.email ? ` (${u.email})` : ""}`,
        }));
      } else if (sourceType === "ROLE") {
        return roles.map((r) => ({ value: r.id, label: r.title }));
      }
      return [];
    },
    [users, roles, userRoleScopes]
  );

  const getApproverDisplayInfo = useCallback(
    (step, departmentId) => {
      if (step.approver_source_type === "USER") {
        const user = users.find((u) => u.user_id === step.approver_source_id);
        return {
          name: user?.name || "Unknown User",
          email: user?.email || "",
          type: "User",
          typeLabel: "Specific User",
          users: user ? [user] : [],
        };
      } else if (step.approver_source_type === "ROLE") {
        const role = roles.find((r) => r.id === step.approver_source_id);
        const roleUsers = getUsersByRole(step.approver_source_id, departmentId);
        return {
          name: role?.title || "Unknown Role",
          email: "",
          type: "Role",
          typeLabel: "User Role",
          users: roleUsers,
        };
      }
      return { name: "Unknown", email: "", type: "", typeLabel: "", users: [] };
    },
    [users, roles, getUsersByRole]
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
  };
};

export default useApprovalData;
