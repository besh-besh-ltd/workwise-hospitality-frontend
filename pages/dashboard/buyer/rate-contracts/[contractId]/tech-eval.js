// Permanent redirect — Technical Evaluation now lives inside the single
// lifecycle page at /dashboard/buyer/rate-contracts/[contractId]?stage=technical.
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function TechEvalRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (!router.isReady) return;
    const { contractId, ...rest } = router.query;
    if (!contractId) return;
    router.replace({
      pathname: `/dashboard/buyer/rate-contracts/${contractId}`,
      query: { ...rest, stage: "technical" },
    });
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
