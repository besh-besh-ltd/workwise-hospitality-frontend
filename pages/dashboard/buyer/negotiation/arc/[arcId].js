// /dashboard/buyer/negotiation/arc/[arcId]
//
// Level 2 of the negotiation module for a rate contract: the same page as an
// RFQ's (RfqNegotiationPage), keyed ARC:<id>. The listing's ARC cards link
// here; each row links on to /negotiation/round/[roundId] (level 3), or to the
// round's ARC approval page when it is waiting on this user.
//
// ROUTE SAFETY: `arc` is a static segment, and Next.js resolves static
// segments before the sibling dynamic [rfqId], so /negotiation/arc/9 can never
// be read as an rfqId.

import Head from "next/head";
import { useRouter } from "next/router";
import RfqNegotiationPage from "@/components/dashboard/buyer/negotiation/rfq-detail/RfqNegotiationPage";

export default function ArcNegotiationRoute() {
  const router = useRouter();
  const { arcId } = router.query;

  return (
    <>
      <Head>
        <title>Rate contract negotiation | Workwise</title>
      </Head>
      {/* router.query is empty on the first client render of a dynamic route. */}
      {arcId ? <RfqNegotiationPage arcId={arcId} /> : null}
    </>
  );
}
