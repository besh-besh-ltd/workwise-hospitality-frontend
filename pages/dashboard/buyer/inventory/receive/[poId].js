import React from "react";
import { useRouter } from "next/router";
import ReceivePoPage from "@/components/inventory/pages/ReceivePoPage";

const Page = () => {
  const router = useRouter();
  if (!router.isReady) return null; // wait for router hydration
  return <ReceivePoPage {...router.query} />;
};

export default Page;
