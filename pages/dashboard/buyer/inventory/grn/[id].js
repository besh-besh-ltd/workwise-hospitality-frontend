import React from "react";
import { useRouter } from "next/router";
import GrnDetailPage from "@/components/inventory/pages/GrnDetailPage";

const Page = () => {
  const router = useRouter();
  if (!router.isReady) return null; // wait for router hydration
  return <GrnDetailPage {...router.query} />;
};

export default Page;
