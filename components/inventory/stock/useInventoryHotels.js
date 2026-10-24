import { useCallback, useEffect, useRef, useState } from "react";
import { getStock } from "@/services/inventory";
import { errorInfo } from "./stockUtils";

// The hotels the caller can read stock at, as the server lists them (`hotels`
// on GET /stock). Pickers only ever offer these; the hotel id sent back is a
// choice among them, never an authority (the server re-checks every call).
//
// @returns {{hotels: Array<{id:number, name:string}>, loading: boolean, error: string|null, reload: () => void}}
const useInventoryHotels = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getStock({});
      if (seq !== seqRef.current) return;
      const list = Array.isArray(res?.hotels) ? res.hotels : [];
      setHotels(list.map((h) => ({ id: Number(h.id), name: h.name || `Hotel ${h.id}` })));
    } catch (err) {
      if (seq !== seqRef.current) return;
      setError(errorInfo(err, "Could not load your hotels.").message);
      setHotels([]);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      seqRef.current += 1;
    };
  }, [load]);

  return { hotels, loading, error, reload: load };
};

export default useInventoryHotels;
