import React from "react";
import { useRouter } from "next/router";
import StockItemPage from "@/components/inventory/pages/StockItemPage";

const Page = () => {
  const router = useRouter();
  if (!router.isReady) return null; // wait for router hydration
  return <StockItemPage {...router.query} />;
};

export default Page;
