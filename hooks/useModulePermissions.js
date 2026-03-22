import { useState, useEffect, useCallback, useRef } from "react";
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
export const useModulePermissions = ({ moduleKey, hotelIds = [], departmentId = null, enabled = true }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchIdRef = useRef(0); // Tracks latest fetch to discard stale responses

  // Serialize inputs to detect changes during render (not in effects)
  const inputKey = `${moduleKey}|${enabled}|${(hotelIds || []).sort().join(',')}|${departmentId}`;
  const prevInputKeyRef = useRef(inputKey);

  // When inputs change, immediately mark as loading and clear stale permissions
  // This runs during render, so other hooks/effects in the same cycle see loading=true
  if (prevInputKeyRef.current !== inputKey) {
    prevInputKeyRef.current = inputKey;
    if (enabled && moduleKey && hotelIds && hotelIds.length > 0) {
      // Inputs changed and we need a fresh fetch — mark loading synchronously
      // React allows setState during render if the value actually changes
      if (!loading) setLoading(true);
      setPermissions([]);
    }
  }

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

    const currentFetchId = ++fetchIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const response = await getBulkPermissions(moduleKey, hotelIds, departmentId);

      // Stale check — discard if a newer fetch has started
      if (fetchIdRef.current !== currentFetchId) return;

      const responseData = response?.data?.data || response?.data || {};

      // Extract permissions from the new response structure
      // Response: { permissions: { tender: ["read", "create", "update"] }, meta: {...} }
      const permissionsObj = responseData?.permissions || responseData || {};
      const modulePermissions = permissionsObj[moduleKey] || [];
      setPermissions(modulePermissions);
    } catch (err) {
      if (fetchIdRef.current !== currentFetchId) return;
      console.error(`Failed to fetch ${moduleKey} permissions:`, err);
      setError(err?.message || "Failed to fetch permissions");
      setPermissions([]);
    } finally {
      if (fetchIdRef.current === currentFetchId) {
        setLoading(false);
      }
    }
  }, [moduleKey, hotelIds, departmentId, enabled]);

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
