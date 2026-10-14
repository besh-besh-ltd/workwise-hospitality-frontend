// Placeholder — the real page lands in a later purchase-requisition task.
import { useRouter } from "next/router";

export default function PrCreateStub() {
  const router = useRouter();
  const { id: draftId } = router.query || {}; void draftId;
  return (
    <div className="main-body">
      <h1>New purchase requisition</h1>
    </div>
  );
}
