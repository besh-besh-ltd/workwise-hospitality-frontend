// Buyer-side · Technical reviewer's inbox (GET /pr/review-queue).
// A 403 means the caller holds no pr.evaluate grant: that is a normal state for
// most users, so it renders as an explanation, not an error.

import { useEffect, useState } from "react";
import Link from "next/link";
import * as PrApi from "@/services/pr";
import { errorCopy, errorStatus } from "@/components/dashboard/purchase-requisitions/prFormat";
import { purchaseRequisition, purchaseRequisitions } from "@/components/dashboard/shared/dashboardLinks";

const ageLabel = (d) => {
  const n = Number(d) || 0;
  return n <= 0 ? "Today" : `${n} ${n === 1 ? "day" : "days"}`;
};
const fmtDate = (s) => {
  const d = s ? new Date(s) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

export default function PrReviewPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    PrApi.getReviewQueue()
      .then((res) => { if (!cancelled) setItems(Array.isArray(res?.data?.items) ? res.data.items : []); })
      .catch((err) => {
        if (!cancelled) setError({ forbidden: errorStatus(err) === 403, message: errorCopy(err) });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  return (
    <div className="main-body">
      <div>
        <h1 className="page-h1">Requisitions to review</h1>
        <p className="page-sub">Technical reviews waiting on you, oldest first.</p>
      </div>

      {loading ? (
        <div className="contract-card"><span className="arc-sk" style={{ display: "block", width: "60%", height: 16 }} /></div>
      ) : error?.forbidden ? (
        <div className="empty-state" style={{ padding: "56px 24px" }}>
          <h2>You don't review purchase requisitions</h2>
          <p>Technical review is assigned by your admin per department. Your own requisitions are on the main list.</p>
          <Link href={purchaseRequisitions()} className="btn btn-secondary btn-sm">Back to requisitions</Link>
        </div>
      ) : error ? (
        <div className="empty-state" style={{ padding: "56px 24px" }}>
          <h2>{error.message}</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReload((n) => n + 1)}>Try again</button>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ padding: "56px 24px" }}>
          <h2>Nothing is waiting for your review</h2>
          <p>New requisitions for your departments appear here as soon as they are submitted.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Requisition</th><th>Hotel</th><th>Department</th><th>Requester</th>
                <th>Lines</th><th>Submitted</th><th>Waiting</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.review_id}>
                  <td>
                    <Link href={purchaseRequisition(it.pr_id)}>{it.title}</Link>
                    <div className="mono fs-12 text-fg-3">{it.pr_number}</div>
                  </td>
                  <td>{it.hotel_name}</td>
                  <td>{it.department_title}</td>
                  <td>{it.requester_name}</td>
                  <td className="mono">{it.line_count}</td>
                  <td>{fmtDate(it.submitted_at)}</td>
                  <td><span className={"mono" + (Number(it.age_days) >= 3 ? " fw-700" : "")}>{ageLabel(it.age_days)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
