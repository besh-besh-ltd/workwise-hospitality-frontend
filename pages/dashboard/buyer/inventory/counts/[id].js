import React from "react";
import { useRouter } from "next/router";
import CountDetailPage from "@/components/inventory/pages/CountDetailPage";

const Page = () => {
  const router = useRouter();
  if (!router.isReady) return null; // wait for router hydration
  return <CountDetailPage {...router.query} />;
};

export default Page;
