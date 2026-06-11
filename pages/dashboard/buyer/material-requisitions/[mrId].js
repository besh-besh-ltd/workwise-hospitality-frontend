import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import * as MrApi from "@/services/mr";

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

const MR_STATUS_LABEL = {
  draft: "Draft",
  pending: "Pending approval",
  "dept-approval": "Dept approval",
  "category-approval": "Category approval",
  "finance-approval": "Finance approval",
  approved: "Approved",
  "po-released": "PO released",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const statusChipClass = (status) => {
  if (status === "po-released" || status === "approved") return "active";
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
  const [error, setError] = useState(null);

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

  // placeholder approval steps — actual approval steps come from a separate endpoint
  const approvalSteps = useMemo(() => {
    if (!mr) return [];
    const status = mr.status;
    const steps = [
      { step: "dept", role: "Department head", label: "Step 1 of 3" },
      { step: "category", role: "Category manager", label: "Step 2 of 3" },
      { step: "finance", role: "Finance controller", label: "Step 3 of 3" },
    ];
    const order = ["dept", "category", "finance"];
    let currentIdx = order.length;
    if (status === "draft" || status === "pending" || status === "dept-approval") currentIdx = 0;
    else if (status === "category-approval") currentIdx = 1;
    else if (status === "finance-approval") currentIdx = 2;
    else if (status === "approved" || status === "po-released") currentIdx = order.length;
    else if (status === "rejected" || status === "cancelled") currentIdx = -1;

    return steps.map((s, idx) => {
      let decided = false;
      let vote = "pending";
      if (status === "approved" || status === "po-released") {
        decided = true;
        vote = "approved";
      } else if (status === "rejected") {
        decided = idx < currentIdx;
        vote = idx < currentIdx ? "approved" : idx === currentIdx ? "rejected" : "pending";
      } else if (currentIdx >= 0 && idx < currentIdx) {
        decided = true;
        vote = "approved";
      }
      return { ...s, decided, vote, approver: "—" };
    });
  }, [mr]);

  if (!mrId) return null;

  if (loading) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "var(--fg-3)" }}>Loading MR…</div>
    );
  }

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
    (mr.status === "approved" || mr.status === "category-approval" || mr.status === "finance-approval");

  return (
    <div style={{ paddingBottom: 108 }}>

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
                href={`/dashboard/buyer/rate-contracts/${arcMatches[0].contractId}/call-off?mrId=${mr.id}`}
              >
                <IconCart /> Convert to call-off PO
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

      {/* Action banner — placeholder until approval endpoint is wired */}
      {(mr.status === "dept-approval" || mr.status === "category-approval" || mr.status === "finance-approval") && (
        <div className="guide warn">
          <div className="g-ic"><IconAlert /></div>
          <div>
            <strong>Approval in progress</strong> at the{" "}
            {String(mr.status).replace("-approval", "")} stage. Reviewers will see this MR in their queue.
          </div>
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
                              <span className="arc-tag">
                                <IconCheck />{" "}
                                <span>{row.arc_number || ("ARC #" + row.arc_id)}</span>
                              </span>
                              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 5 }}>
                                via <strong>{row.vendor_name || "Vendor"}</strong> @{" "}
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

          {/* Approval chain (placeholder until a dedicated endpoint exists) */}
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <div className="ic"><IconClipboardCheck /></div>
                <div>
                  <h2>Approval chain</h2>
                  <div className="h-sub">Department → Category → Finance → PO release</div>
                </div>
              </div>
            </div>
            <div className="section-body flush">
              {approvalSteps.map((a, idx) => (
                <div key={idx} className="approval-step">
                  <div className="as-av">{a.step === "dept" ? "DH" : a.step === "category" ? "CM" : "FC"}</div>
                  <div className="as-body">
                    <div className="as-name">
                      <span>{a.approver}</span>
                    </div>
                    <div className="as-role">{a.role + " · " + a.label}</div>
                  </div>
                  <div className="as-right">
                    {a.decided ? (
                      <span className={"vote-pill-mr " + a.vote}>
                        {a.vote === "approved" ? "✓ Approved" : "✗ Rejected"}
                      </span>
                    ) : (
                      <span className="vote-pill-mr pending">● Pending</span>
                    )}
                  </div>
                </div>
              ))}
              {mr.status === "po-released" && (
                <div className="approval-step">
                  <div className="as-av av-green">PO</div>
                  <div className="as-body">
                    <div className="as-name">Call-off PO released</div>
                    <div className="as-role">
                      System · linked to ARC{" "}
                      {arcMatches[0]?.arcNumber && (
                        <span className="mono fw-600" style={{ color: "var(--fg)" }}>
                          {arcMatches[0].arcNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="as-right">
                    {arcMatches[0]?.contractId && (
                      <Link
                        href={`/dashboard/buyer/rate-contracts/${arcMatches[0].contractId}/active`}
                        className="vote-pill-mr approved"
                        style={{ textDecoration: "none" }}
                      >
                        View ARC
                      </Link>
                    )}
                  </div>
                </div>
              )}
              <div style={{ padding: "10px 16px", fontSize: 11, color: "var(--fg-4)", borderTop: "1px solid var(--border)" }}>
                Approval steps shown above reflect MR status. Detailed approver names &amp; comments are loaded from the approval endpoint.
              </div>
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
                      href={`/dashboard/buyer/rate-contracts/${m.contractId}/active`}
                      className="mono fw-700"
                      style={{ color: "var(--success)" }}
                    >
                      {m.arcNumber || ("ARC #" + m.arcId)}
                    </Link>
                    {i < arcMatches.length - 1 ? "," : ""}
                  </span>
                ))}
                . After category approval, this MR can convert directly to a call-off PO — no sourcing.
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
                {arcMatches.map((m) => (
                  <div key={m.contractId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        border: "1px solid var(--border)",
                        background: "var(--surface-2)",
                        flexShrink: 0,
                      }}
                    >
                      {initialsOf(m.vendorName)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
                        {m.vendorName || "Vendor"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
                        ARC{" "}
                        <Link
                          href={`/dashboard/buyer/rate-contracts/${m.contractId}/active`}
                          className="mono fw-600"
                        >
                          {m.arcNumber || ("#" + m.arcId)}
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
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
