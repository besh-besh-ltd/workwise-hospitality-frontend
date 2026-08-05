// Permanent redirect — the Active dashboard now lives inside the single
// lifecycle page at /dashboard/buyer/rate-contracts/[contractId]?stage=active.
// Any ?tab= deep link (consumption / pos / doc / audit / amendments) is
// carried through to the Contract Active stage's internal sub-tabs.
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ActiveRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (!router.isReady) return;
    const { contractId, ...rest } = router.query;
    if (!contractId) return;
    router.replace({
      pathname: `/dashboard/buyer/rate-contracts/${contractId}`,
      query: { ...rest, stage: "active" },
    });
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
