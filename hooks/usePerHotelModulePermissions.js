import { useState, useEffect, useRef } from "react";
import { getPerHotelPermissions } from "@/services/rbac";

/**
 * Per-hotel permission resolver for picker UIs.
 *
 * Sister of useModulePermissions. The bulk endpoint returns the UNION
 * across the hotel set — useful AFTER selection but useless for filtering
 * the picker BEFORE selection. This hook fetches per-hotel breakdown so
 * each option can be independently shown / disabled / hidden based on
 * what the user can actually do at that hotel.
 *
 * Returns:
 *   permsByHotel: { [hotelId]: { canRead, canCreate, canUpdate, canDelete, canApprove, actions: Set } }
 *   getPerm(hotelId): same shape per hotel (with safe defaults if missing).
 *   loading: bool
 *   error: string|null
 *   refetch: fn
 */
export const usePerHotelModulePermissions = ({ moduleKey, hotelIds = [], enabled = true }) => {
  const [permsByHotel, setPermsByHotel] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchIdRef = useRef(0);

  // Stable cache key to prevent re-fetch loops when caller passes a new
  // array identity for the same set.
  const inputKey = `${moduleKey}|${enabled}|${(hotelIds || []).slice().sort().join(",")}`;

  const refetch = async () => {
    if (!enabled || !moduleKey || !hotelIds || hotelIds.length === 0) {
      setPermsByHotel({});
      setLoading(false);
      return;
    }
    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await getPerHotelPermissions(moduleKey, hotelIds);
      if (fetchIdRef.current !== currentFetchId) return;
      const data = response?.data?.data || response?.data || {};
      const byHotel = data.permissions_by_hotel || {};
      const shaped = {};
      Object.keys(byHotel).forEach((hotelId) => {
        const resourceMap = byHotel[hotelId] || {};
        const actions = new Set(resourceMap[moduleKey] || []);
        shaped[hotelId] = {
          actions,
          canRead: actions.has("read"),
          canCreate: actions.has("create"),
          canUpdate: actions.has("update"),
          canDelete: actions.has("delete"),
          canApprove: actions.has("approve"),
        };
      });
      setPermsByHotel(shaped);
    } catch (err) {
      if (fetchIdRef.current !== currentFetchId) return;
      console.error(`Failed to fetch per-hotel ${moduleKey} permissions:`, err);
      setError(err?.message || "Failed to fetch per-hotel permissions");
      setPermsByHotel({});
    } finally {
      if (fetchIdRef.current === currentFetchId) setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey]);

  const getPerm = (hotelId) => {
    return (
      permsByHotel[String(hotelId)] || permsByHotel[hotelId] || {
        actions: new Set(),
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canApprove: false,
      }
    );
  };

  return { permsByHotel, getPerm, loading, error, refetch };
};

export default usePerHotelModulePermissions;
