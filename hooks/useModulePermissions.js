import { useState, useEffect, useCallback } from "react";
import { getBulkPermissions } from "@/services/rbac";

/**
 * Custom hook for managing module-specific permissions
 * Fetches permissions fresh on every page load based on hotel context
 *
 * @param {Object} options
 * @param {string} options.moduleKey - The permission module key (e.g., "tender", "purchase_order")
 * @param {number[]} options.hotelIds - Array of hotel IDs to check permissions for
 * @param {boolean} options.enabled - Whether to fetch permissions (default: true)
 * @returns {Object} Permission state and helper functions
 */
export const useModulePermissions = ({ moduleKey, hotelIds = [], enabled = true }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch permissions from API
  const fetchPermissions = useCallback(async () => {
    if (!enabled || !moduleKey) {
      setLoading(false);
      return;
    }

    // If no hotel IDs provided, we can't check permissions
    if (!hotelIds || hotelIds.length === 0) {
      setLoading(false);
      setPermissions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getBulkPermissions(moduleKey, hotelIds);
      const responseData = response?.data?.data || response?.data || {};

      // Extract permissions from the new response structure
      // Response: { permissions: { tender: ["read", "create", "update"] }, meta: {...} }
      const permissionsObj = responseData?.permissions || responseData || {};
      const modulePermissions = permissionsObj[moduleKey] || [];
      setPermissions(modulePermissions);
    } catch (err) {
      console.error(`Failed to fetch ${moduleKey} permissions:`, err);
      setError(err?.message || "Failed to fetch permissions");
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [moduleKey, hotelIds, enabled]);

  // Fetch permissions when dependencies change
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permissionType) => {
    if (!permissions || !Array.isArray(permissions)) return false;
    return permissions.includes(permissionType);
  }, [permissions]);

  // Derived permission checks
  const canRead = hasPermission("read");
  const canUpdate = hasPermission("update");
  const canCreate = hasPermission("create");
  const canDelete = hasPermission("delete");
  const canApprove = hasPermission("approve");

  // Determine access mode based on permissions
  const getAccessMode = () => {
    if (!canRead) return "denied";
    if (!canUpdate) return "readonly";
    return "full";
  };

  const accessMode = getAccessMode();

  return {
    permissions,
    loading,
    error,
    canRead,
    canUpdate,
    canCreate,
    canDelete,
    canApprove,
    accessMode,
    hasPermission,
    refetch: fetchPermissions,
  };
};

export default useModulePermissions;
