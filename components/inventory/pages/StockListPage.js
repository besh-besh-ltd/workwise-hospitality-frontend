import React from "react";
import { useRouter } from "next/router";
import StockList from "@/components/inventory/stock/StockList";

// /dashboard/buyer/inventory/stock?hotelId=
const StockListPage = () => {
  const router = useRouter();
  if (!router.isReady) return null;
  const { hotelId } = router.query;
  return <StockList initialHotelId={Array.isArray(hotelId) ? hotelId[0] : hotelId || null} />;
};

export default StockListPage;
