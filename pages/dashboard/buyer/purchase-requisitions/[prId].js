// Buyer-side · Purchase Requisition detail.
//
// One page for every actor: the requester (edit / submit / withdraw / cancel /
// copy / cancel a line), technical reviewers (spec, clauses, files; complete or
// send back), approvers (approve / reject / send back) and buyers (progress,
// RFQ and PO links) — plus the conversation and the full audit timeline.
//
// Buttons come only from `capabilities` (never from role names or the engine's
// can_user_approve). Every mutation shows a toast and refetches; a 409 offers
// Refresh.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import * as PrApi from "@/services/pr";
import { submitApprovalAction } from "@/services/approval";
import PrStatusPill from "@/components/dashboard/purchase-requisitions/PrStatusPill";
import PrProgressPill from "@/components/dashboard/purchase-requisitions/PrProgressPill";
import PrLinesTable from "@/components/dashboard/purchase-requisitions/PrLinesTable";
import PrReviewPanel from "@/components/dashboard/purchase-requisitions/PrReviewPanel";
import PrApprovalPanel, { PrDecisionBanner } from "@/components/dashboard/purchase-requisitions/PrApprovalPanel";
import PrConversation from "@/components/dashboard/purchase-requisitions/PrConversation";
import PrTimeline from "@/components/dashboard/purchase-requisitions/PrTimeline";
import PrReasonModal from "@/components/dashboard/purchase-requisitions/PrReasonModal";
import { AttachmentBlock } from "@/components/dashboard/purchase-requisitions/PrLineWork";
import { ERROR_COPY, STATUS_LABEL, errorCopy, formatINR } from "@/components/dashboard/purchase-requisitions/prFormat";
import {
  PR_TYPE_LABEL, URGENCY_LABEL, errorBody, fmtDate, fmtDateTime, headerProgress, lineName,
} from "@/components/dashboard/purchase-requisitions/prDetail";
import { purchaseRequisitionCreate, purchaseRequisitions } from "@/components/dashboard/shared/dashboardLinks";

const CHAIN_CODES = new Set(["PR_NO_POLICY", "PR_STEP_UNRESOLVED", "PR_NO_INDEPENDENT_APPROVER"]);
const TOAST_MS = 3500;

/** What the approver's action actually did, read from the refetched PR. */
const decisionToast = (action, d) => {
  const s = d?.pr?.status;
  if (!s) return action === "APPROVE" ? "Approval sent." : "Rejection sent.";
  const now = STATUS_LABEL[s] || s;
  if (action === "APPROVE") {
    if (s === "approved") return "Approved — the PR is now with the purchase team.";
    if (s === "pending_approval") return `Approval recorded. Now with: ${d.pr.now_with || "the next approver"}.`;
    return `Your approval didn't change this PR — it is now ${now}.`;
  }
  if (s === "rejected") return "Rejected — this PR is closed.";
  return `Your rejection didn't change this PR — it is now ${now}.`;
};

/** Text for a failed call: ERROR_COPY by code, else the server's message. */
const failureText = (e) => {
  const body = errorBody(e);
  if (body?.code === "PR_NO_REVIEWER" && body?.details?.department_title) {
    return `${ERROR_COPY.PR_NO_REVIEWER} (${body.details.department_title})`;
  }
  return errorCopy(e);
};

export default function PrDetailPage() {
  const router = useRouter();
  const prId = router.query?.prId ? String(router.query.prId) : null;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [failure, setFailure] = useState(null); // { title?, text, refresh? }
  const [modal, setModal] = useState(null); // { kind, line? }
  const [modalError, setModalError] = useState("");
  const busyRef = useRef(false);
  const reqRef = useRef(0);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), TOAST_MS);
  };

  // Load / refetch. A newer request (or unmount) makes an older one a no-op.
  const load = useCallback(async (id, { quiet = false } = {}) => {
    const my = ++reqRef.current;
    if (!quiet) setLoading(true);
    try {
      const res = await PrApi.getPr(id);
      if (my !== reqRef.current) return null;
      const d = res?.data || null;
      setDetail(d);
      setLoadError("");
      return d;
    } catch (e) {
      if (my !== reqRef.current) return null;
      if (quiet) setFailure({ text: `Couldn't load the latest version of this PR. ${errorCopy(e)}`, refresh: true });
      else setLoadError(errorCopy(e));
      return null;
    } finally {
      if (my === reqRef.current && !quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady || !prId) return undefined;
    load(prId);
    return () => { reqRef.current += 1; };
  }, [router.isReady, prId, load]);

  const refresh = () => { setFailure(null); load(prId, { quiet: true }); };

  /**
   * Run one mutation: double-click guard, then the fresh detail (from the
   * response when the endpoint returns it, else a refetch) and a toast.
   * opts: success (string | (detail, res) => string), refetch (default true),
   *       inModal (validation errors stay in the open dialog), chain (review
   *       completion: 422 chain codes mean the review stayed pending),
   *       refetchOnError (approval engine refusals).
   * Resolves true on success.
   */
  const run = async (fn, opts = {}) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setFailure(null);
    setModalError("");
    try {
      const res = await fn();
      let d = null;
      if (res?.data?.pr && res?.data?.capabilities) {
        reqRef.current += 1; // an older in-flight load must not overwrite this
        d = res.data;
        setDetail(d);
      } else if (opts.refetch !== false) {
        d = await load(prId, { quiet: true });
      }
      const msg = typeof opts.success === "function" ? opts.success(d, res) : opts.success || res?.message;
      if (msg) showToast(msg);
      return true;
    } catch (e) {
      const code = errorBody(e)?.code;
      const text = failureText(e);
      if (code === "PR_STATE_CONFLICT") {
        setModal(null);
        setFailure({ text, refresh: true });
      } else if (opts.chain && CHAIN_CODES.has(code)) {
        setFailure({ title: "Approval chain problem — contact your admin", text: `${text} Your review is still pending.` });
      } else if (opts.inModal) {
        setModalError(text);
      } else {
        setFailure({ text });
      }
      if (opts.refetchOnError) await load(prId, { quiet: true });
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!prId || loading) {
    return <div className="main-body"><p className="page-sub">Loading requisition…</p></div>;
  }
  if (loadError || !detail?.pr) {
    return (
      <div className="main-body">
        <div role="alert" className="guide danger">
          <div>
            <strong>Could not open this purchase requisition.</strong>{" "}
            {loadError || "It may not exist, or you may not have access to it."}
          </div>
        </div>
        <div><Link href={purchaseRequisitions()} className="btn btn-secondary btn-sm">Back to requisitions</Link></div>
      </div>
    );
  }

  const { pr, lines = [], attachments = [], reviews = [], events = [], comments = [], approval } = detail;
  const caps = detail.capabilities || {};
  const rights = caps.approval || null;
  const review = caps.review || null;
  const hp = headerProgress(pr.status, lines);
  const myReview = review ? reviews.find((r) => r.id === review.review_id) : null;
  const lastReject = [...(approval?.action_history || [])].reverse().find((a) => a.action === "REJECT");
  const closeModal = () => { if (!busy) { setModal(null); setModalError(""); } };

  // ----- actions ----------------------------------------------------------
  const submit = () => run(() => PrApi.submitPr(prId));

  const copy = async () => {
    let newId = null;
    const ok = await run(async () => {
      const res = await PrApi.copyPr(prId);
      newId = res?.data?.id;
      return res;
    }, { refetch: false, success: "Copied as a new draft" });
    if (ok && newId) router.push(purchaseRequisitionCreate(newId));
  };

  const decide = async (action, comment) => {
    await run(
      () => submitApprovalAction({
        approval_instance_id: rights.instance_id,
        approval_instance_step_id: rights.current_step_id,
        action,
        comment,
      }),
      { refetchOnError: true, success: (d) => decisionToast(action, d) },
    );
    setModal(null);
  };

  const inModal = async (fn) => {
    const ok = await run(fn, { inModal: true });
    if (ok) setModal(null);
  };

  const MODALS = {
    cancel: {
      title: `Cancel ${pr.pr_number}?`,
      explain: "Cancelling closes this purchase requisition for good. Nobody can act on it afterwards; you can still copy it as a new draft.",
      confirmLabel: "Cancel this PR",
      onConfirm: (text) => inModal(() => PrApi.cancelPr(prId, text)),
    },
    withdraw: {
      title: `Withdraw ${pr.pr_number}?`,
      explain: "Withdrawing pulls this PR back to draft. Open technical reviews and any approval in progress are cancelled. You can edit it and submit it again.",
      withText: false,
      tone: "warn",
      confirmLabel: "Withdraw PR",
      onConfirm: () => inModal(() => PrApi.withdrawPr(prId)),
    },
    cancelLine: modal?.line && {
      title: `Cancel item ${modal.line.line_no}?`,
      explain: `“${lineName(modal.line)}” will not be sourced. The rest of the PR is not affected. This can't be undone.`,
      confirmLabel: "Cancel this item",
      onConfirm: (text) => inModal(() => PrApi.cancelLine(prId, modal.line.id, text)),
    },
    reviewSendBack: review && {
      title: "Send back to the requester?",
      explain: `The PR goes back to ${pr.raised_by_name || "the requester"} to change and resubmit. Every open technical review closes; review starts again when it is resubmitted.`,
      label: "Note to the requester",
      placeholder: "What needs to change?",
      tone: "warn",
      confirmLabel: "Send back to requester",
      onConfirm: (text) => inModal(() => PrApi.sendBackReview(prId, review.review_id, text)),
    },
    approverSendBack: {
      title: "Send back to the requester?",
      explain: `The approval stops and the PR goes back to ${pr.raised_by_name || "the requester"} to change and resubmit. Review and approval start again from the beginning.`,
      label: "Note to the requester",
      placeholder: "What needs to change?",
      tone: "warn",
      confirmLabel: "Send back to requester",
      onConfirm: (text) => inModal(() => PrApi.sendBackPr(prId, text)),
    },
    approve: {
      title: `Approve ${pr.pr_number}?`,
      explain: `Estimated value ${formatINR(pr.estimated_total)}. Your approval completes your part of step ${approval?.current_step ?? ""}; after the last step the PR goes to the purchase team.`,
      label: "Comment",
      required: false,
      tone: "success",
      confirmLabel: "Confirm approve",
      onConfirm: (text) => decide("APPROVE", text),
    },
    reject: {
      title: `Reject ${pr.pr_number}?`,
      explain: "Rejecting ends this PR. The requester can copy it into a new draft but cannot resubmit this one.",
      label: "Reason for rejection",
      confirmLabel: "Confirm reject",
      onConfirm: (text) => decide("REJECT", text),
    },
  };
  const activeModal = modal ? MODALS[modal.kind] : null;

  const hasDock = caps.can_edit || caps.can_submit || caps.can_withdraw || caps.can_cancel || caps.can_copy;
  const nowWithBad = typeof pr.now_with === "string" && pr.now_with.startsWith("No eligible");

  return (
    <>
      <div className="main-body" style={{ paddingBottom: hasDock ? 108 : 24 }}>
        {/* Hero */}
        <section className="arc-hero">
          <div className="top">
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow">Purchase requisition</div>
              <h1>
                <span>{pr.title || "Untitled requisition"}</span>
                <span className="num">{pr.pr_number}</span>
                <PrStatusPill status={pr.status} />
                {hp && <span data-testid="header-progress"><PrProgressPill header progress={hp} /></span>}
              </h1>
              {pr.now_with && (
                <div className="sub" data-testid="now-with">
                  Now with: <span className="em" style={nowWithBad ? { color: "#fca5a5" } : undefined}>{pr.now_with}</span>
                </div>
              )}
            </div>
            <div className="hero-actions">
              <Link className="btn btn-sm" href={purchaseRequisitions()}>Back to list</Link>
            </div>
          </div>
          <div className="hero-detail-grid">
            <div className="cell"><div className="k">Hotel</div><div className="v">{pr.hotel_name || "—"}</div></div>
            <div className="cell"><div className="k">Department</div><div className="v">{pr.department_name || "—"}</div></div>
            <div className="cell"><div className="k">Type</div><div className="v">{PR_TYPE_LABEL[pr.pr_type] || pr.pr_type || "—"}</div></div>
            <div className="cell"><div className="k">Urgency</div><div className="v"><span className="em">{URGENCY_LABEL[pr.urgency] || pr.urgency || "—"}</span></div></div>
            <div className="cell"><div className="k">Need by</div><div className="v mono">{fmtDate(pr.required_by_date)}</div></div>
            <div className="cell"><div className="k">Estimated total</div><div className="v mono"><span className="em">{pr.estimated_total ? formatINR(pr.estimated_total) : "—"}</span></div></div>
            <div className="cell"><div className="k">Raised by</div><div className="v">{pr.raised_by_name || "—"}</div></div>
            <div className="cell"><div className="k">Submitted</div><div className="v mono">{pr.submitted_at ? fmtDateTime(pr.submitted_at) : "Not yet"}</div></div>
            {pr.status === "approved" && (
              <div className="cell"><div className="k">Buyer</div><div className="v">{pr.assigned_buyer_name || "Not assigned yet"}</div></div>
            )}
            {pr.delivery_location && (
              <div className="cell"><div className="k">Deliver to</div><div className="v">{pr.delivery_location}</div></div>
            )}
          </div>
        </section>

        {/* State banners */}
        {pr.status === "returned" && (
          <div className="guide warn" data-testid="returned-banner" style={{ display: "block" }}>
            <strong>Sent back for changes.</strong>{" "}
            {pr.returned_note ? <span style={{ whiteSpace: "pre-wrap" }}>“{pr.returned_note}”</span> : null}
            {caps.can_edit && <div style={{ marginTop: 6 }}>Edit the PR, then submit it again.</div>}
          </div>
        )}
        {pr.status === "cancelled" && (
          <div className="guide" style={{ display: "block" }}>
            <strong>Cancelled.</strong> {pr.cancelled_reason ? `“${pr.cancelled_reason}”` : ""}
          </div>
        )}
        {pr.status === "rejected" && (
          <div className="guide danger" style={{ display: "block" }}>
            <strong>Rejected{lastReject?.actor?.name ? ` by ${lastReject.actor.name}` : ""}.</strong>{" "}
            {lastReject?.comment ? `“${lastReject.comment}”` : ""}
          </div>
        )}
        <PrDecisionBanner
          rights={rights}
          approval={approval}
          busy={busy}
          onApprove={() => setModal({ kind: "approve" })}
          onReject={() => setModal({ kind: "reject" })}
          onSendBack={() => setModal({ kind: "approverSendBack" })}
        />
        {review && (
          <div className="guide warn" style={{ display: "block" }}>
            <strong>Your technical review is needed{myReview ? ` — ${myReview.department_title}` : ""}.</strong>{" "}
            Check the items opened for you below, then complete your review or send the PR back.
          </div>
        )}

        <PrLinesTable
          prId={prId}
          lines={lines}
          total={pr.estimated_total}
          editableLineIds={review?.can_edit_lines || []}
          cancellableLineIds={caps.can_cancel_lines || []}
          run={run}
          onCancelLine={(line) => setModal({ kind: "cancelLine", line })}
        />

        <div className="pr-detail-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <PrReviewPanel
              reviews={reviews}
              lines={lines}
              review={review}
              prStatus={pr.status}
              busy={busy}
              onComplete={(note) => run(() => PrApi.completeReview(prId, review.review_id, note), { chain: true })}
              onSendBack={() => setModal({ kind: "reviewSendBack" })}
            />
            <PrApprovalPanel approval={approval} events={events} prStatus={pr.status} />
            <div className="section-card">
              <div className="section-head"><div className="h-left"><div><h2>Why it is needed</h2></div></div></div>
              <div className="section-body" style={{ display: "grid", gap: 14 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--fg-2)", whiteSpace: "pre-wrap" }}>{pr.justification || "—"}</div>
                <AttachmentBlock
                  prId={prId}
                  prLineId={null}
                  attachments={attachments}
                  canEdit={Boolean(caps.can_edit)}
                  run={run}
                  title="Files for the whole PR"
                />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            <PrConversation comments={comments} busy={busy} onPost={(text) => run(() => PrApi.addComment(prId, text), { success: "Comment added" })} />
            <PrTimeline events={events} lines={lines} />
          </div>
        </div>

        {activeModal && (
          <PrReasonModal key={modal.kind} busy={busy} error={modalError} onClose={closeModal} {...activeModal} />
        )}

        {toast && (
          <div className="arc-toast" role="status"><span className="t-ic">✓</span><span>{toast}</span></div>
        )}

        {failure && (
          <div className="guide danger" role="alert" data-testid="action-error"
            style={{ position: "fixed", bottom: hasDock ? 90 : 24, left: "50%", transform: "translateX(-50%)", zIndex: 2100, maxWidth: 620, width: "calc(100% - 48px)", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ flex: 1 }}>
              {failure.title && <div><strong>{failure.title}</strong></div>}
              <div>{failure.text}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {failure.refresh && <button type="button" className="btn btn-secondary btn-sm" onClick={refresh}>Refresh</button>}
              <button type="button" className="btn btn-ghost btn-sm" aria-label="Dismiss" onClick={() => setFailure(null)}>✕</button>
            </div>
          </div>
        )}
      </div>

      {hasDock && (
        <div className="action-dock">
          <div className="inner">
            <div className="left">
              <PrStatusPill status={pr.status} />
              {pr.now_with && <span className="fs-13 text-fg-2">Now with <span className="em">{pr.now_with}</span></span>}
            </div>
            <div className="right">
              {caps.can_copy && <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={copy}>Copy as new</button>}
              {caps.can_cancel && (
                <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => setModal({ kind: "cancel" })}>Cancel PR</button>
              )}
              {caps.can_withdraw && (
                <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setModal({ kind: "withdraw" })}>Withdraw</button>
              )}
              {caps.can_edit && (
                <Link href={purchaseRequisitionCreate(pr.id)} className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>Edit</Link>
              )}
              {caps.can_submit && (
                <button type="button" className="btn btn-blue btn-sm" disabled={busy} onClick={submit}>{busy ? "Working…" : "Submit"}</button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pr-detail-grid { display:grid; grid-template-columns: minmax(0, 1fr) 400px; gap:18px; align-items:flex-start; }
        @media (max-width:1100px){ .pr-detail-grid { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
