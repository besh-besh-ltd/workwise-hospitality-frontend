// Amendments moved to a standalone workspace. This route survives only to
// honour old deep links — it forwards to the request page with the contract
// preselected. See /dashboard/vendor/rate-contracts/amendments/{index,request}.

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function VendorAmendmentRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (!router.isReady) return;
    const { contractId } = router.query;
    router.replace(
      contractId
        ? `/dashboard/vendor/rate-contracts/amendments/request?contract=${contractId}`
        : "/dashboard/vendor/rate-contracts/amendments/request"
    );
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
