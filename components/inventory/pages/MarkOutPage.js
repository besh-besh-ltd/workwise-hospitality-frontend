import React from "react";
import { useRouter } from "next/router";
import MarkOut from "@/components/inventory/stock/MarkOutPage";

// /dashboard/buyer/inventory/out?hotelId=&mode=return
const first = (v) => (Array.isArray(v) ? v[0] : v) || null;

const MarkOutPage = () => {
  const router = useRouter();
  if (!router.isReady) return null;
  const mode = String(first(router.query.mode) || "").toUpperCase() === "RETURN" ? "RETURN" : "OUT";
  return <MarkOut initialHotelId={first(router.query.hotelId)} initialMode={mode} />;
};

export default MarkOutPage;
