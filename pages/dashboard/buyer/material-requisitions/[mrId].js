import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import * as MrApi from "@/services/mr";
import { submitApprovalAction } from "@/services/approval";
import { MrDetailSkeleton } from "@/components/dashboard/material-requisitions/MrSkeletons";

// ---------- formatters ----------
const fmtINR = (v) => {
  if (v == null || v === "" || isNaN(Number(v))) return "—";
  return "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
};
const fmtLakh = (v) => {
  const n = Number(v || 0);
  if (!n) return "₹0";
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
  return fmtINR(n);
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};
const arcHref = (arcId) => `/dashboard/buyer/rate-contracts/${arcId}?stage=active`;
const poHref = (poId) => `/dashboard/buyer/purchase-orders/${poId}`;
const vendorHref = (vendorId) => `/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${vendorId}`;

const MR_STATUS_LABEL = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  po_released: "PO released",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const statusChipClass = (status) => {
  if (status === "po_released" || status === "approved") return "active";
  if (status === "rejected" || status === "cancelled") return "expired";
  return "eval";
};

const initialsOf = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

// ---------- icons (inline lucide-style) ----------
const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);
const IconBox = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);
const IconChat = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);
const IconClipboardCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);
const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
  </svg>
);
const IconCart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const IconCheck = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconInfo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// ---------- MrDetailPage ----------
export default function MrDetailPage() {
  const router = useRouter();
  const { mrId } = router.query;

  const [loading, setLoading] = useState(true);
  const [mr, setMr] = useState(null);
  const [items, setItems] = useState([]);
  const [approval, setApproval] = useState(null);
  const [callOffs, setCallOffs] = useState([]);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    const res = await MrApi.getMrById(mrId);
    const payload = res?.data || res || {};
    setMr(payload.mr || null);
    setItems(Array.isArray(payload.items) ? payload.items : []);
    setApproval(payload.approval || null);
    setCallOffs(Array.isArray(payload.callOffs) ? payload.callOffs : []);
  };

  useEffect(() => {
    if (!mrId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    MrApi.getMrById(mrId)
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data || res || {};
        setMr(payload.mr || null);
        setItems(Array.isArray(payload.items) ? payload.items : []);
        setApproval(payload.approval || null);
        setCallOffs(Array.isArray(payload.callOffs) ? payload.callOffs : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load MR");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mrId]);

  const act = async (action) => {
    if (!approval?.id || acting) return;
    setActing(true);
    try {
      await submitApprovalAction({
        approval_instance_id: approval.id,
        approval_instance_step_id: approval.user_approval_step_id || undefined,
        action,
        comment: action === "REJECT" ? (rejectReason || "Rejected") : undefined,
      });
      setRejectOpen(false);
      setRejectReason("");
      await load();
    } catch (_e) {
      // axios interceptor surfaces the error toast
    } finally {
      setActing(false);
    }
  };

  // -------- derived --------
  const totalEst = useMemo(() => {
    return items.reduce((sum, row) => {
      const qty = Number(row.quantity || 0);
      const rate = Number(row.matched_unit_rate || 0);
      return sum + qty * rate;
    }, 0);
  }, [items]);

  const arcMatches = useMemo(() => {
    const map = new Map();
    items.forEach((it) => {
      if (it.arc_contract_id) {
        map.set(String(it.arc_contract_id), {
          contractId: it.arc_contract_id,
          arcId: it.arc_id,
          arcNumber: it.arc_number || null,
          vendorId: it.vendor_id,
          vendorName: it.vendor_name,
        });
      }
    });
    return Array.from(map.values());
  }, [items]);

  const allItemsMatched = items.length > 0 && items.every((it) => !!it.arc_contract_id);
  const someItemsMatched = items.some((it) => !!it.arc_contract_id);

  // Real approval steps from the engine (getApprovalInstanceDetails).
  const approvalSteps = useMemo(() => {
    if (!approval?.steps) return [];
    return approval.steps
      .filter((s) => s.status !== "REMOVED")
      .map((s) => ({
        step_order: s.step_order,
        decision_rule: s.decision_rule,
        status: s.status,                                  // PENDING|APPROVED|REJECTED|SKIPPED
        isCurrent: approval.status === "PENDING" && approval.current_step === s.step_order,
        approvers: (s.approvers || []).filter((a) => a.status !== "REMOVED"),
      }));
  }, [approval]);

  if (!mrId) return null;

  if (loading) return <MrDetailSkeleton />;

  if (error || !mr) {
    return (
      <div style={{ padding: "32px" }}>
        <div className="guide warn">
          <div className="g-ic"><IconAlert /></div>
          <div>
            <strong>Could not load this MR.</strong>{" "}
            {error || "It may have been deleted, or you don't have access."}
            <div style={{ marginTop: 8 }}>
              <Link href="/dashboard/buyer/material-requisitions" className="btn btn-sm">
                <IconBack /> Back to list
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const requesterName = mr.raised_by_name || "—";
  const requesterRole = mr.raised_by_role || "Requester";
  const hasMatchBanner = items.length > 0;
  const showConvertCta =
    allItemsMatched &&
    mr.status === "approved";

  return (
    <div className="main-body" style={{ paddingBottom: 108 }}>

      {/* Hero */}
      <section className="arc-hero">
        <div className="top">
          <div>
            <div className="eyebrow">Material requisition</div>
            <h1>
              <span>{mr.title || "Untitled MR"}</span>
              {mr.mr_number && <span className="num">{"#" + mr.mr_number}</span>}
              <span className={"status-chip " + statusChipClass(mr.status)}>
                {MR_STATUS_LABEL[mr.status] || mr.status}
              </span>
            </h1>
            <div className="sub">
              {mr.department_name && (
                <>
                  <span className="em">{mr.department_name}</span>
                  <span className="sep">·</span>
                </>
              )}
              {mr.hotel_code || mr.hotel_name ? (
                <>
                  <span>
                    {mr.hotel_code && <span className="em">{mr.hotel_code}</span>}{" "}
                    {mr.hotel_name && <span>{mr.hotel_name}</span>}
                  </span>
                  <span className="sep">·</span>
                </>
              ) : null}
              <span>
                By <span className="em">{requesterName}</span>
                {requesterRole && <> ({requesterRole})</>}
              </span>
              {mr.cost_centre && (
                <>
                  <span className="sep">·</span>
                  <span>
                    Cost centre <span className="em mono">{mr.cost_centre}</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="hero-actions">
            {showConvertCta && arcMatches.length === 1 && (
              <Link
                className="btn btn-sm cta"
                href={`/dashboard/buyer/rate-contracts/${arcMatches[0].arcId}/call-off?mrId=${mr.id}`}
              >
                <IconCart /> Convert to released PO
              </Link>
            )}
            <Link className="btn btn-sm" href="/dashboard/buyer/material-requisitions">
              <IconBack /> Back to list
            </Link>
          </div>
        </div>
        <div className="hero-detail-grid">
          <div className="cell">
            <div className="k">Raised on</div>
            <div className="v"><span className="mono">{fmtDate(mr.submitted_at || mr.created_at)}</span></div>
          </div>
          <div className="cell">
            <div className="k">Required by</div>
            <div className="v"><span className="em mono">{fmtDate(mr.required_by_date)}</span></div>
          </div>
          <div className="cell">
            <div className="k">Urgency</div>
            <div className="v"><span className="em">{(mr.urgency || "normal").toUpperCase()}</span></div>
          </div>
          <div className="cell">
            <div className="k">Items</div>
            <div className="v"><span className="em mono">{items.length}</span> line(s)</div>
          </div>
          <div className="cell">
            <div className="k">Estimated value</div>
            <div className="v"><span className="em mono">{fmtLakh(totalEst)}</span></div>
          </div>
        </div>
      </section>

      {/* Your decision — shown only when the engine says the caller is the current approver */}
      {approval?.can_user_approve && approval.status === "PENDING" && (
        <div className="guide warn" style={{ display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="g-ic" style={{ marginTop: 0 }}><IconAlert /></div>
            <strong>Your decision is needed</strong> — you are the current approver (step {approval.current_step} of {approval.total_steps}).
          </div>
          {!rejectOpen ? (
            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
              <button className="btn btn-blue btn-sm" disabled={acting} onClick={() => act("APPROVE")}>{acting ? "Working…" : "Approve"}</button>
              <button className="btn btn-sm" disabled={acting} onClick={() => setRejectOpen(true)} style={{ color: "var(--danger)" }}>Reject</button>
            </div>
          ) : (
            <div style={{ marginTop: 11 }}>
              <textarea className="textarea" placeholder="Reason for rejection (visible in the audit trail)…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-sm" disabled={acting} onClick={() => { setRejectOpen(false); setRejectReason(""); }}>Cancel</button>
                <button className="btn btn-sm" disabled={acting || !rejectReason.trim()} onClick={() => act("REJECT")} style={{ background: "var(--danger)", color: "#fff" }}>{acting ? "Working…" : "Confirm reject"}</button>
              </div>
            </div>
          )}
        </div>
      )}
      {approval?.status === "PENDING" && !approval?.can_user_approve && (
        <div className="guide warn">
          <div className="g-ic"><IconAlert /></div>
          <div><strong>Approval in progress</strong> — step {approval.current_step} of {approval.total_steps}. The current approver will see this in their queue.</div>
        </div>
      )}
      {approval?.status === "REJECTED" && (
        <div className="guide" style={{ borderColor: "rgba(185,28,28,0.3)", background: "var(--danger-soft)" }}>
          <div className="g-ic" style={{ color: "var(--danger)" }}><IconAlert /></div>
          <div><strong style={{ color: "var(--danger)" }}>This MR was rejected.</strong> See the approval chain below for who and why.</div>
        </div>
      )}

      <div className="mr-grid">

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

          {/* Items */}
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic"><IconBox /></div>
                <div>
                  <h2>Items requested</h2>
                  <div className="h-sub">Each item is matched against active ARCs for the BU</div>
                </div>
              </div>
            </div>
            <div className="section-body flush">
              <table className="mr-item-table">
                <thead>
                  <tr>
                    <th>Sl.</th>
                    <th>Item</th>
                    <th className="right">Qty</th>
                    <th>Note</th>
                    <th>ARC match</th>
                    <th className="right">Est. value</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--fg-4)", fontSize: 13 }}>
                        No items on this requisition.
                      </td>
                    </tr>
                  )}
                  {items.map((row, idx) => {
                    const qty = Number(row.quantity || 0);
                    const rate = Number(row.matched_unit_rate || 0);
                    const estVal = qty * rate;
                    return (
                      <tr key={row.id || idx}>
                        <td className="mono" style={{ color: "var(--fg-3)" }}>{String(idx + 1).padStart(2, "0")}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--fg)" }}>
                            {row.variant_name || row.product_name || "—"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>
                            {row.variant_slug && <span className="mono">{row.variant_slug}</span>}
                            {row.uom && <> · <span>{row.uom}</span></>}
                          </div>
                        </td>
                        <td className="right">
                          <span>{qty.toLocaleString("en-IN")}</span>{" "}
                          <span style={{ fontFamily: "Geist,sans-serif", fontWeight: 500, fontSize: 11, color: "var(--fg-3)" }}>
                            {row.uom || ""}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--fg-2)" }}>{row.note || "—"}</td>
                        <td>
                          {row.arc_contract_id ? (
                            <div>
                              <Link href={arcHref(row.arc_id)} className="arc-tag" style={{ textDecoration: "none" }}>
                                <IconCheck />{" "}
                                <span>{row.arc_number || ("ARC #" + row.arc_id)}</span>
                              </Link>
                              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 5 }}>
                                via{" "}
                                {row.vendor_id ? (
                                  <Link href={vendorHref(row.vendor_id)} className="fw-700" style={{ color: "var(--fg)" }}>{row.vendor_name || "Vendor"}</Link>
                                ) : (
                                  <strong>{row.vendor_name || "Vendor"}</strong>
                                )}{" "}@{" "}
                                <span className="mono fw-700" style={{ color: "var(--fg)" }}>
                                  {fmtINR(rate)}
                                </span>
                                /{row.uom || "unit"}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11.5, color: "var(--fg-4)", fontStyle: "italic" }}>
                              — no match · sourcing —
                            </span>
                          )}
                        </td>
                        <td className="right">{estVal ? fmtINR(estVal) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {items.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="right">
                        <span style={{ fontFamily: "Geist,sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fg-3)" }}>
                          Total estimated value
                        </span>
                      </td>
                      <td className="right" style={{ fontSize: 14, color: "var(--success)" }}>{fmtINR(totalEst)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Justification */}
          {mr.justification && (
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic"><IconChat /></div>
                  <div>
                    <h2>Justification</h2>
                    <div className="h-sub">From the requester</div>
                  </div>
                </div>
              </div>
              <div className="section-body">
                <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--fg-2)" }}>
                  {mr.justification}
                </div>
              </div>
            </div>
          )}

          {/* Approval chain — live from the approval engine */}
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic"><IconClipboardCheck /></div>
                <div>
                  <h2>Approval chain</h2>
                  <div className="h-sub">
                    {approval ? `${approval.total_steps} step(s) · every step required`
                      : mr.status === "po_released" ? "Released PO issued"
                      : mr.status === "draft" ? "Not yet submitted for approval"
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
            <div className="section-body flush">
              {/* Created */}
              <div className="approval-step">
                <div className="as-av">{initialsOf(requesterName)}</div>
                <div className="as-body">
                  <div className="as-name">Requisition created</div>
                  <div className="as-role">By {requesterName}{requesterRole ? ` · ${requesterRole}` : ""}</div>
                </div>
                <div className="as-right">
                  <span className="vote-pill-mr pending">Created</span>
                  <span className="as-time">{fmtDateTime(mr.created_at)}</span>
                </div>
              </div>

              {/* Submitted for approval */}
              {mr.submitted_at && (
                <div className="approval-step">
                  <div className="as-av">↗</div>
                  <div className="as-body">
                    <div className="as-name">Submitted for approval</div>
                    <div className="as-role">{approval ? `Routed through a ${approval.total_steps}-step chain` : "Sent for approval"}</div>
                  </div>
                  <div className="as-right">
                    <span className="vote-pill-mr pending">Sent</span>
                    <span className="as-time">{fmtDateTime(mr.submitted_at)}</span>
                  </div>
                </div>
              )}

              {/* Approval cycle — one row per step, with the approver's comment */}
              {approvalSteps.map((s, idx) => {
                const approved = s.status === "APPROVED";
                const rejected = s.status === "REJECTED";
                const skipped = s.status === "SKIPPED";
                const actor = s.approvers.find((a) => a.status === "APPROVED" || a.status === "REJECTED");
                const names = s.approvers.map((a) => a.user_name).filter(Boolean);
                const who = actor?.user_name || names[0] || `Step ${s.step_order}`;
                const role = actor?.user_designation || actor?.user_department || (s.decision_rule === "ALL" ? "All must approve" : "Approver");
                return (
                  <div key={idx} className="approval-step">
                    <div className={"as-av" + (approved ? " av-green" : rejected ? " av-red" : "")}>{initialsOf(who)}</div>
                    <div className="as-body">
                      <div className="as-name">{who}</div>
                      <div className="as-role">{role} · Step {s.step_order} of {approval?.total_steps || approvalSteps.length}</div>
                      {actor?.comment && <div className="as-comment">{actor.comment}</div>}
                    </div>
                    <div className="as-right">
                      {approved ? <span className="vote-pill-mr approved">✓ Approved</span>
                        : rejected ? <span className="vote-pill-mr rejected">✗ Rejected</span>
                        : skipped ? <span className="vote-pill-mr pending">Skipped</span>
                        : s.isCurrent ? <span className="vote-pill-mr pending">● Current</span>
                        : <span className="vote-pill-mr pending">Pending</span>}
                      {actor?.acted_at && <span className="as-time">{fmtDateTime(actor.acted_at)}</span>}
                    </div>
                  </div>
                );
              })}

              {/* MR approved summary */}
              {approval?.status === "APPROVED" && (
                <div className="approval-step">
                  <div className="as-av av-green"><IconCheck /></div>
                  <div className="as-body">
                    <div className="as-name">Requisition approved</div>
                    <div className="as-role">All approval steps cleared</div>
                  </div>
                  <div className="as-right"><span className="vote-pill-mr approved">Approved</span></div>
                </div>
              )}

              {/* Call-off PO released — one row per released PO, each links to its PO */}
              {(callOffs.length > 0 ? callOffs : (mr.status === "po_released" ? [{}] : [])).map((co, i) => (
                <div key={i} className="approval-step">
                  <div className="as-av av-green">PO</div>
                  <div className="as-body">
                    <div className="as-name">Released PO{co.po_number ? ` · ${co.po_number}` : ""}</div>
                    <div className="as-role">
                      System · linked to ARC{" "}
                      {arcMatches[0]?.contractId
                        ? <Link href={arcHref(arcMatches[0].contractId)} className="mono fw-600">{arcMatches[0].arcNumber || ("#" + arcMatches[0].arcId)}</Link>
                        : <span className="mono fw-600">{arcMatches[0]?.arcNumber || "—"}</span>}
                      {co.released_at ? ` · ${fmtDateTime(co.released_at)}` : ""}
                    </div>
                  </div>
                  <div className="as-right">
                    {co.po_id
                      ? <Link href={poHref(co.po_id)} className="vote-pill-mr approved" style={{ textDecoration: "none" }}>View {co.po_number || "PO"} →</Link>
                      : arcMatches[0]?.contractId
                        ? <Link href={arcHref(arcMatches[0].contractId)} className="vote-pill-mr approved" style={{ textDecoration: "none" }}>View ARC</Link>
                        : null}
                  </div>
                </div>
              ))}

              {/* Draft empty */}
              {approvalSteps.length === 0 && mr.status === "draft" && callOffs.length === 0 && (
                <div style={{ padding: "12px 16px", fontSize: 12.5, color: "var(--fg-4)", borderTop: "1px solid var(--border)" }}>
                  Still a draft — submit it to start the approval chain.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <aside className="mr-aside">

          {hasMatchBanner && allItemsMatched && (
            <div className="guide success" style={{ display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div className="g-ic" style={{ marginTop: 0 }}><IconCheck /></div>
                <strong>Fast-trackable</strong>
              </div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
                All items match active rate contract
                {arcMatches.map((m, i) => (
                  <span key={m.contractId}>
                    {" "}
                    <Link
                      href={`/dashboard/buyer/rate-contracts/${m.arcId}?stage=active`}
                      className="mono fw-700"
                      style={{ color: "var(--success)" }}
                    >
                      {m.arcNumber || ("ARC #" + m.arcId)}
                    </Link>
                    {i < arcMatches.length - 1 ? "," : ""}
                  </span>
                ))}
                . After category approval, this MR can convert directly to a released PO — no sourcing.
              </div>
            </div>
          )}

          {hasMatchBanner && !allItemsMatched && (
            <div className="guide warn">
              <div className="g-ic"><IconInfo /></div>
              <div>
                <strong>{someItemsMatched ? "Partial ARC coverage." : "No matching ARC."}</strong>{" "}
                {someItemsMatched
                  ? "Some items will fast-track, others will route through fresh sourcing / RFQ."
                  : "Items will route through fresh sourcing / RFQ after approval. Lead-time likely longer."}
              </div>
            </div>
          )}

          {/* Vendor mapping (derived from items) */}
          {arcMatches.length > 0 && (
            <div className="section-card">
              <div className="section-head">
                <div className="h-left">
                  <div className="ic"><IconBox /></div>
                  <div><h2>Vendor mapping</h2></div>
                </div>
              </div>
              <div className="section-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {arcMatches.map((m) => {
                  const avatar = (
                    <div className="mr-vendor-av">{initialsOf(m.vendorName)}</div>
                  );
                  const top = (
                    <>
                      {avatar}
                      <div style={{ minWidth: 0 }}>
                        <div className="mr-vendor-name">{m.vendorName || "Vendor"}</div>
                        {m.vendorId && <div className="mr-vendor-sub">View vendor profile →</div>}
                      </div>
                    </>
                  );
                  return (
                    <div key={m.contractId} className="mr-vendor-card">
                      {m.vendorId
                        ? <Link href={vendorHref(m.vendorId)} className="mr-vendor-link">{top}</Link>
                        : <div className="mr-vendor-link" style={{ cursor: "default" }}>{top}</div>}
                      <Link href={arcHref(m.contractId)} className="mr-vendor-arc">
                        <span style={{ color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 9.5, fontFamily: "Geist,sans-serif", fontWeight: 600 }}>Rate contract</span>
                        <span className="mono">{m.arcNumber || ("#" + m.arcId)}</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Requester */}
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic"><IconUser /></div>
                <div><h2>Requester</h2></div>
              </div>
            </div>
            <div className="section-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  flexShrink: 0,
                }}
              >
                {initialsOf(requesterName)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>{requesterName}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>{requesterRole}</div>
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* Embedded scoped styles for grid layout from prototype */}
      <style jsx>{`
        .mr-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 18px;
          align-items: flex-start;
        }
        @media (max-width: 1100px) {
          .mr-grid {
            grid-template-columns: 1fr;
          }
        }
        .mr-aside {
          position: sticky;
          top: 78px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        @media (max-width: 1100px) {
          .mr-aside {
            position: static;
          }
        }
        .mr-item-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
        }
        .mr-item-table :global(thead th) {
          background: var(--surface-2);
          padding: 11px 14px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--fg-4);
          font-weight: 600;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .mr-item-table :global(thead th.right) {
          text-align: right;
        }
        .mr-item-table :global(tbody td) {
          padding: 14px;
          border-bottom: 1px solid var(--border);
          vertical-align: top;
        }
        .mr-item-table :global(tbody td.right) {
          text-align: right;
          font-family: "Geist Mono", monospace;
          font-weight: 600;
          color: var(--fg);
        }
        .mr-item-table :global(tbody tr:last-child td) {
          border-bottom: none;
        }
        .mr-item-table :global(tfoot td) {
          padding: 14px;
          background: var(--surface-2);
          border-top: 2px solid var(--border-strong);
          font-weight: 700;
        }
        .mr-item-table :global(tfoot td.right) {
          text-align: right;
          font-family: "Geist Mono", monospace;
        }
        .mr-item-table :global(.arc-tag) {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          background: var(--success-soft);
          color: var(--success);
          border: 1px solid rgba(21, 128, 61, 0.24);
          border-radius: 99px;
          font-size: 10.5px;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
