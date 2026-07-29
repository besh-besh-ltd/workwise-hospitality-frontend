import React, { useEffect, useState } from "react";
import VendorPoDashboard from "@/components/dashboard/vendor/purchase-orders/VendorPoDashboard";
import { getVendorPoDashboard } from "@/services/po";

const VendorPurchaseOrdersDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getVendorPoDashboard();
        if (active) setData(res?.data || null);
      } catch (e) {
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return <VendorPoDashboard data={data} loading={loading} />;
};

export default VendorPurchaseOrdersDashboardPage;
