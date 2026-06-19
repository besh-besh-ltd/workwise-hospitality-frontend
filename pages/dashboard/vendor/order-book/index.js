import React, { useEffect } from "react";
import { useRouter } from "next/router";

// Order Book has been retired in favour of the vendor Purchase Orders module.
// Redirect any lingering links to the new Orders listing.
const Vendor = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/vendor/purchase-orders/orders");
  }, [router]);

  return <div style={{ padding: 24, color: "#6c757d" }}>Redirecting…</div>;
};

export default Vendor;
