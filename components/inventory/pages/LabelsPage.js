import React from "react";
import { useRouter } from "next/router";
import Labels from "@/components/inventory/labels/LabelsPage";

// /dashboard/buyer/inventory/labels?hotelId=&items=9,11
const first = (v) => (Array.isArray(v) ? v[0] : v) || null;

const LabelsPage = () => {
  const router = useRouter();
  if (!router.isReady) return null;
  return <Labels initialHotelId={first(router.query.hotelId)} initialItems={first(router.query.items)} />;
};

export default LabelsPage;
