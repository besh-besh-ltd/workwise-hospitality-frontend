import React from "react";
import { useRouter } from "next/router";
import Adjustments from "@/components/inventory/stock/AdjustmentsPage";

// /dashboard/buyer/inventory/adjustments?hotelId=&id= (notifications link ?id=).
const first = (v) => (Array.isArray(v) ? v[0] : v) || null;

const AdjustmentsPage = () => {
  const router = useRouter();
  if (!router.isReady) return null;
  return <Adjustments initialHotelId={first(router.query.hotelId)} initialId={first(router.query.id)} />;
};

export default AdjustmentsPage;
