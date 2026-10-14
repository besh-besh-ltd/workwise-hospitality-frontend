// Placeholder — the real page lands in a later purchase-requisition task.
import { useRouter } from "next/router";

export default function PrDetailStub() {
  const router = useRouter();
  const { prId } = router.query || {}; void prId;
  return (
    <div className="main-body">
      <h1>Purchase requisition</h1>
    </div>
  );
}
