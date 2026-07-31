// /dashboard/buyer/negotiation/round/[roundId]
//
// Every row on the Negotiations listing is already round-level, so it links
// straight here (NegotiationListPage detailHref). The static `round` segment
// sits beside the existing dynamic `[rfqId]` folder; Next.js resolves static
// segments first, so /negotiation/round/123 can never be read as an rfqId.

import Head from "next/head";
import { useRouter } from "next/router";
import NegotiationRoundDetailPage from "@/components/dashboard/buyer/negotiation/round-detail/NegotiationRoundDetailPage";
import RoundDetailSkeleton from "@/components/dashboard/buyer/negotiation/round-detail/RoundDetailSkeleton";

export default function NegotiationRoundDetailRoute() {
  const router = useRouter();
  const { roundId } = router.query;

  return (
    <>
      <Head>
        <title>Negotiation round | Workwise</title>
      </Head>
      {/* router.query is empty on the first client render of a dynamic route. */}
      {roundId ? <NegotiationRoundDetailPage roundId={roundId} /> : <RoundDetailSkeleton />}
    </>
  );
}
