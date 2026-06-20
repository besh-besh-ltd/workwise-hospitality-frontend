import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import VendorPoDetail from "@/components/dashboard/vendor/purchase-orders/VendorPoDetail";
import { getVendorPoDetail } from "@/services/po";

const VendorPurchaseOrderDetailPage = () => {
  const router = useRouter();
  const { poId } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!poId) return;
    setLoading(true);
    setError(false);
    try {
      const res = await getVendorPoDetail(poId);
      const detail = res?.data || null;
      setData(detail);
      if (!detail) setError(true);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return (
    <VendorPoDetail
      data={data}
      loading={loading}
      error={error}
      onRefresh={fetchDetail}
    />
  );
};

export default VendorPurchaseOrderDetailPage;
