import { useEffect, useState } from "react";
import { getBulkPermissions } from "@/services/rbac";

/**
 * Module grants for sidebar gating, fetched once per shell mount.
 *
 * A null module key with empty hotel_ids asks the server for every module across
 * every hotel the user can reach. Returns `{ [moduleKey]: ["read", ...] }`, or
 * null while loading / on failure, so gated entries stay hidden until we know.
 */
export const parseNavGrants = (response) => {
  const data = response?.data?.data || response?.data || {};
  const permissions = data?.permissions || {};
  const grants = {};
  Object.keys(permissions).forEach((key) => {
    const entry = permissions[key];
    grants[key] = Array.isArray(entry) ? entry : entry?.actions || [];
  });
  return grants;
};

const useNavPermissions = ({ enabled = true } = {}) => {
  const [grants, setGrants] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setGrants(null);
      return undefined;
    }
    let cancelled = false;
    getBulkPermissions(null, [])
      .then((response) => {
        if (!cancelled) setGrants(parseNavGrants(response));
      })
      .catch(() => {
        if (!cancelled) setGrants(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return grants;
};

export default useNavPermissions;
