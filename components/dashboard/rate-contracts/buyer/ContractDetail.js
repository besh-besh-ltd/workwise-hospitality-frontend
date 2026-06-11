// Buyer-side ARC detail page. Surfaces the lifecycle stepper, ARC metadata,
// items, invitations, and contextual action chips based on the current
// status. Action chips link to the phase-specific panels (tech-eval, comm-eval,
// committee, active dashboard, call-off).

import { useEffect, useState } from "react";
import Link from "next/link";
import { getContractDetail, withdraw as withdrawArc, terminate as terminateArc } from "@/services/arc_v2";
import StatusBadge from "@/components/dashboard/rate-contracts/shared/StatusBadge";
import LifecycleStepper from "@/components/dashboard/rate-contracts/shared/LifecycleStepper";
import ItemCard from "@/components/dashboard/rate-contracts/shared/ItemCard";
import VendorAvatar from "@/components/dashboard/rate-contracts/shared/VendorAvatar";
import styles from "./ContractDetail.module.scss";

function NextAction({ arc }) {
  const cards = [];
  if (arc.status === "draft")             cards.push({ to: `?step=2`, label: "Continue editing draft" });
  if (arc.status === "submission_closed") cards.push({ to: `./${arc.id}/tech-eval`, label: "Start tech evaluation" });
  if (arc.status === "tech_eval_approved") cards.push({ to: `./${arc.id}/comm-eval`, label: "Start commercial evaluation" });
  if (arc.status === "comm_eval_finalized" || arc.status === "committee_review") {
    cards.push({ to: `./${arc.id}/committee`, label: "Open committee dashboard" });
  }
  if (arc.status === "contract_active" || arc.status === "expiring_soon") {
    cards.push({ to: `./${arc.id}/active`, label: "Active contract dashboard" });
  }
  if (cards.length === 0) return null;
  return (
    <div className={styles.nextStrip}>
      {cards.map((c, i) => (
        <Link key={i} href={c.to} className={styles.nextChip}>{c.label} →</Link>
      ))}
    </div>
  );
}

export default function ContractDetail({ contractId }) {
  const [arc, setArc] = useState(null);
  const [items, setItems] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getContractDetail(contractId);
        if (cancelled) return;
        setArc(res?.data?.arc || null);
        setItems(res?.data?.items || []);
        setInvitations(res?.data?.invitations || []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [contractId]);

  if (loading) return <div className={styles.wrap}>Loading…</div>;
  if (error) return <div className={styles.wrap}>{error}</div>;
  if (!arc) return <div className={styles.wrap}>Not found</div>;

  const canWithdraw = ["floated", "submission_closed"].includes(arc.status);
  const canTerminate = !["draft", "expired", "terminated", "closed_no_award"].includes(arc.status);

  const onWithdraw = async () => {
    if (!confirm("Withdraw this ARC back to draft?")) return;
    setBusy(true);
    try { await withdrawArc(arc.id); window.location.reload(); }
    finally { setBusy(false); }
  };
  const onTerminate = async () => {
    const reason = prompt("Reason for termination (required):");
    if (!reason) return;
    setBusy(true);
    try { await terminateArc(arc.id, reason); window.location.reload(); }
    finally { setBusy(false); }
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <div className={styles.metaRow}>
            <span className={styles.arcNo}>{arc.arc_number}</span>
            <StatusBadge status={arc.status} />
          </div>
          <h1>{arc.title}</h1>
          {arc.description && <p className={styles.desc}>{arc.description}</p>}
        </div>
        <div className={styles.actions}>
          {canWithdraw &&
            <button disabled={busy} onClick={onWithdraw} className={styles.secondary}>Withdraw</button>}
          {canTerminate &&
            <button disabled={busy} onClick={onTerminate} className={styles.danger}>Terminate</button>}
        </div>
      </header>

      <LifecycleStepper status={arc.status} />
      <NextAction arc={arc} />

      <div className={styles.grid}>
        <section className={styles.section}>
          <h2>Items ({items.length})</h2>
          <div className={styles.itemGrid}>
            {items.map(it => <ItemCard key={it.id} item={it} dense />)}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Vendors {arc.eligibility_type === "invitation" ? "(invited)" : "(open)"}</h2>
          {invitations.length === 0 && (
            <div className={styles.muted}>
              {arc.eligibility_type === "open"
                ? "Eligible vendors will see this ARC automatically once floated."
                : "No vendors invited yet."}
            </div>
          )}
          <div className={styles.vendorList}>
            {invitations.map(v => (
              <div key={v.id} className={styles.vendorRow}>
                <VendorAvatar id={v.vendor_id} name={v.vendor_name || ""} size="sm" />
                <div>
                  <div>{v.vendor_name || `Vendor #${v.vendor_id}`}</div>
                  <div className={styles.muted}>{v.status}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Tender period</h2>
          <div className={styles.kv}>
            <span>Submission</span>
            <span>{arc.submission_start_at ? new Date(arc.submission_start_at).toLocaleString() : "—"} → {arc.submission_end_at ? new Date(arc.submission_end_at).toLocaleString() : "—"}</span>
          </div>
          <div className={styles.kv}>
            <span>Contract</span>
            <span>{arc.contract_start_at ? new Date(arc.contract_start_at).toLocaleString() : "—"} → {arc.contract_end_at ? new Date(arc.contract_end_at).toLocaleString() : "—"}</span>
          </div>
          <div className={styles.kv}><span>Eligibility</span><span>{arc.eligibility_type}</span></div>
          <div className={styles.kv}><span>Tech required</span><span>{arc.technical_response_required ? "Yes" : "No"}</span></div>
          <div className={styles.kv}><span>Samples</span><span>{arc.sample_required ? "Yes" : "No"}</span></div>
        </section>

        <section className={styles.section}>
          <h2>Commercial terms</h2>
          <div className={styles.kv}><span>Payment</span><span>{arc.payment_terms_expected || "—"}</span></div>
          <div className={styles.kv}><span>Delivery</span><span>{arc.delivery_expected || "—"}</span></div>
          <div className={styles.kv}><span>Penalty</span><span>{arc.penalty_clause || "—"}</span></div>
        </section>
      </div>
    </div>
  );
}
