import React from "react";
import { useRouter } from "next/router";
import PODetail from "@/components/dashboard/buyer/purchase-orders/PODetail";

const PurchaseOrderDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;

  // Wait for the router to hydrate the dynamic param before mounting the
  // detail component (it fetches keyed on id).
  if (!id) return null;

  return <PODetail id={id} />;
};

export default PurchaseOrderDetailPage;
