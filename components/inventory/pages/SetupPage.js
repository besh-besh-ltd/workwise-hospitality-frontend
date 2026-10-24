import React from "react";
import { useRouter } from "next/router";
import Setup from "@/components/inventory/setup/SetupPage";

// /dashboard/buyer/inventory/setup?tab=&hotelId=
const first = (v) => (Array.isArray(v) ? v[0] : v) || null;

const SetupPage = () => {
  const router = useRouter();
  if (!router.isReady) return null;
  return <Setup initialTab={first(router.query.tab)} initialHotelId={first(router.query.hotelId)} />;
};

export default SetupPage;
