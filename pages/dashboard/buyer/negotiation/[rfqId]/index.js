// /dashboard/buyer/negotiation/[rfqId]
//
// Level 2 of the negotiation module: one RFQ's whole negotiation — the gist,
// then every round of it. The listing (level 1) links here; each row of the
// rounds table links on to /negotiation/round/[roundId] (level 3).
//
// ROUTE SAFETY: this folder already held `approve.js` and `create.js`, so
// adding `index.js` is a pure addition — no existing URL changes meaning. The
// sibling `round/` segment is static, and Next.js resolves static segments
// before dynamic ones, so /negotiation/round/123 can never be read as an rfqId.

import Head from "next/head";
import { useRouter } from "next/router";
import RfqNegotiationPage from "@/components/dashboard/buyer/negotiation/rfq-detail/RfqNegotiationPage";

export default function RfqNegotiationRoute() {
  const router = useRouter();
  const { rfqId } = router.query;

  return (
    <>
      <Head>
        <title>RFQ negotiation | Workwise</title>
      </Head>
      {/* router.query is empty on the first client render of a dynamic route. */}
      {rfqId ? <RfqNegotiationPage rfqId={rfqId} /> : null}
    </>
  );
}
