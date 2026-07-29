import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Download,
  X,
  Check,
  Clock,
  Boxes,
  Building2,
  FileText,
  ExternalLink,
  Truck,
  Send,
} from "lucide-react";
import {
  handleAcceptPO,
  handleRejectPO,
  handleRaiseInvoice,
  handleMarkDispatched,
  getVendorPoPdf,
} from "@/services/po";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import RaiseInvoiceModal from "@/components/dashboard/vendor/order-book/RaiseInvoiceModal";
import styles, {
  avatarClass,
  initialsOf,
  statusTone,
  inr,
  fmtDateTime,
  fmtMaybeDate,
  Sk,
} from "@/components/dashboard/buyer/purchase-orders/shared";

const PO_ROUTE = "/dashboard/vendor/purchase-orders/orders";

// Vendor-friendly status labels — what the seller sees, not the buyer's
// approval vocabulary. Falls back to the server status_label for the rest.
const VENDOR_STATUS_LABELS = {
  acceptance_pending: "Awaiting you",
  sent: "Awaiting you",
  approved: "Accepted",
  dispatched: "Dispatched",
  invoice_raised: "Invoice raised",
  GRN: "Received",
  delivered: "Received",
  completed: "Completed",
  rejected_by_vendor: "Rejected",
};

const vendorStatusLabel = (po) =>
  VENDOR_STATUS_LABELS[po.status] || po.status_label || po.status || "—";

const VendorPoDetail = ({ data, loading, error, onRefresh }) => {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const po = data || {};

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(PO_ROUTE);
  };

  const refresh = async () => {
    if (typeof onRefresh === "function") await onRefresh();
  };

  const confirmAccept = async () => {
    try {
      setSubmitting(true);
      await handleAcceptPO(po.id);
      toast.success(`PO #${po.po_number} accepted successfully!`);
      setAcceptOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to accept PO");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError("Please provide a reason for rejection.");
      return;
    }
    setRejectionError("");
    try {
      setSubmitting(true);
      await handleRejectPO(po.id, rejectionReason.trim());
      toast.success(`PO #${po.po_number} rejected. The buyer has been notified.`);
      setRejectOpen(false);
      setRejectionReason("");
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to reject PO");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDispatch = async () => {
    try {
      setSubmitting(true);
      await handleMarkDispatched(po.id);
      toast.success(`PO #${po.po_number} marked as dispatched.`);
      setDispatchOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to mark dispatched");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmInvoice = async (invoiceUrl) => {
    try {
      await handleRaiseInvoice(po.id, invoiceUrl);
      toast.success(`Invoice raised for PO #${po.po_number}.`);
      setInvoiceOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to raise invoice");
    }
  };

  // Download the PO PDF — opens the existing document, or asks the server to
  // generate it on demand (call-offs created before the PDF feature won't have
  // one yet). The response body is the API envelope ({ data: { url } }).
  const handleDownloadPo = async () => {
    const d = Array.isArray(po.docs) ? po.docs : [];
    const existing = (d.find((x) => x.type === "po") || {}).url || po.po_pdf_url || null;
    if (existing) {
      window.open(existing, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      setPdfLoading(true);
      const res = await getVendorPoPdf(po.id);
      const url = res?.data?.url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.info("The PO document is being prepared — please try again shortly.");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Couldn't fetch the PO document");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return <DetailSkeleton onBack={handleBack} />;

  if (error || !data) {
    return (
      <div className={styles.page}>
        <Breadcrumb onBack={handleBack} current={po.po_number || po.id || "…"} />
        <div className={styles.pageBody}>
          <div className={styles.sectionCard}>
            <div className={styles.emptyState}>
              <div className={styles.ic}>
                <FileText size={20} />
              </div>
              <div className={styles.ttl}>Unable to load this purchase order</div>
              <div className={styles.sub}>It may have been removed, or you may not have access.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pricing = po.pricing || {};
  const items = Array.isArray(po.items) ? po.items : [];
  const vendor = po.vendor || {};
  const rfq = po.rfq || {};
  const docs = Array.isArray(po.docs) ? po.docs : [];
  // The generated PO document (po_pdf_url) is surfaced in docs as type "po".
  const poDocUrl = (docs.find((d) => d.type === "po") || {}).url || po.po_pdf_url || null;
  const paymentTerms = Array.isArray(po.payment_terms) ? po.payment_terms : [];
  const workflow = Array.isArray(po.workflow) ? po.workflow : [];
  const keyDates = Array.isArray(po.key_dates) ? po.key_dates : [];
  const activity = Array.isArray(po.activity) ? po.activity : [];

  const freightInsurance = (Number(pricing.freight) || 0) + (Number(pricing.insurance) || 0);
  const doneSteps = workflow.filter((w) => w.status === "done").length;

  const isCallOff = !!po.is_call_off;
  const callOff = po.call_off || {};
  const arcHref = callOff.arc_id
    ? `/dashboard/vendor/rate-contracts/${callOff.arc_id}`
    : null;

  // The "ordered by" buyer label: company / hotel-or-BU / department come from
  // the RFQ join (or the ARC contract for call-off POs).
  const buyerCompany = rfq.company || null;
  const buyerBusinessUnit = rfq.business_unit || null;
  const buyerDepartment = rfq.department || null;
  const orderedByLines = [buyerCompany, buyerBusinessUnit, buyerDepartment].filter(Boolean);

  // 'sent' is the legacy synonym for 'acceptance_pending' — both await the
  // vendor's accept/reject.
  const awaitingMe = po.status === "acceptance_pending" || po.status === "sent";
  // Fulfilment sequence (one next-step at a time): Accept → Dispatch → (buyer GRN)
  // → Raise invoice. After acceptance ('approved') the only vendor action is
  // dispatch; the invoice opens once goods are on the way.
  const canDispatch = po.status === "approved";
  const canInvoice = po.status === "dispatched" || po.status === "GRN";

  const heroMod =
    po.status === "approved" ||
    po.status === "dispatched" ||
    po.status === "GRN" ||
    po.status === "delivered" ||
    po.status === "completed"
      ? styles.heroApproved
      : po.status === "rejected_by_vendor"
      ? styles.heroRejected
      : "";

  return (
    <div className={styles.page}>
      <Breadcrumb onBack={handleBack} current={po.po_number || po.id} />

      {/* Hero */}
      <section className={`${styles.detailHero} ${heroMod}`}>
        <div className={styles.detailHeroInner}>
          <div className={styles.heroIdBlock}>
            <div className={styles.hEye}>Purchase order</div>
            <h1>
              <span className={styles.poMono}>#{po.po_number || po.id}</span>
              <span className={`${styles.statusPill} ${statusTone(po.status)}`}>
                <span className={styles.dot} />
                {vendorStatusLabel(po)}
              </span>
            </h1>
            <div className={styles.hSub}>
              {buyerCompany && <span className={styles.vendor}>{buyerCompany}</span>}
              {buyerCompany && <span className={styles.sep}>·</span>}
              <span className={styles.amount}>{inr(pricing.total ?? po.total_value)}</span>
              {rfq.number && (
                <>
                  <span className={styles.sep}>·</span>
                  <span className={`${styles.rfqLink} ${styles.mono}`}>RFQ #{rfq.number}</span>
                </>
              )}
              {isCallOff && (
                <>
                  <span className={styles.sep}>·</span>
                  <span className={`${styles.rfqLink} ${styles.mono}`}>
                    Released PO{callOff.arc_number ? ` · ${callOff.arc_number}` : ""}
                  </span>
                </>
              )}
            </div>

            {awaitingMe && (
              <div className={styles.heroWaiting}>
                <span className={styles.clockIc}>
                  <Clock size={14} />
                </span>
                <span>
                  Waiting on <strong>you</strong> — review the order and accept or reject it.
                </span>
              </div>
            )}
          </div>

          <div className={styles.heroActions}>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              type="button"
              disabled={pdfLoading}
              onClick={handleDownloadPo}
            >
              <Download size={13} />
              {pdfLoading ? "Preparing…" : "Download PO"}
            </button>

            {awaitingMe && (
              <>
                <button
                  className={`${styles.btn} ${styles.btnDangerStrong}`}
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setRejectionReason("");
                    setRejectionError("");
                    setRejectOpen(true);
                  }}
                >
                  <X size={13} />
                  Reject
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSuccess}`}
                  type="button"
                  disabled={submitting}
                  onClick={() => setAcceptOpen(true)}
                >
                  <Check size={14} strokeWidth={2.4} />
                  Accept PO
                </button>
              </>
            )}

            {canDispatch && (
              <button
                className={`${styles.btn} ${styles.btnSuccess}`}
                type="button"
                disabled={submitting}
                onClick={() => setDispatchOpen(true)}
              >
                <Truck size={13} />
                Mark dispatched
              </button>
            )}
            {canInvoice && (
              <button
                className={`${styles.btn} ${styles.btnSuccess}`}
                type="button"
                disabled={submitting}
                onClick={() => setInvoiceOpen(true)}
              >
                <Send size={13} />
                Raise invoice
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Body */}
      <main className={`${styles.pageBody} ${styles.pageBodyAside}`}>
        {/* LEFT */}
        <div className={styles.sectionStack}>
          {/* Items & pricing */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <div className={styles.hLeft}>
                <div className={styles.ic}>
                  <Boxes size={13} />
                </div>
                <h2>Items &amp; pricing</h2>
                <span className={styles.pill}>
                  {items.length} line item{items.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Item</th>
                  <th>HSN</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit price</th>
                  <th className="num">GST %</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td className={styles.itIdx}>{String(idx + 1).padStart(2, "0")}</td>
                    <td>
                      <div className={styles.itName}>{it.name}</div>
                      {it.spec && <div className={styles.itSpec}>{it.spec}</div>}
                    </td>
                    <td className={styles.itHsn}>{it.hsn || "—"}</td>
                    <td className="num">
                      {it.quantity}
                      {it.unit && <span className={styles.itUnit}>{it.unit}</span>}
                    </td>
                    <td className="num">{inr(it.unit_price)}</td>
                    <td className="num">{it.gst != null ? `${it.gst}%` : "—"}</td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {inr(it.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {pricing.subtotal != null && (
                  <tr className="subtotal">
                    <td colSpan={6} className={styles.tRight}>
                      Subtotal
                    </td>
                    <td className="num">{inr(pricing.subtotal)}</td>
                  </tr>
                )}
                {pricing.tax != null && (
                  <tr className="subtotal">
                    <td colSpan={6} className={styles.tRight}>
                      GST
                    </td>
                    <td className="num">{inr(pricing.tax)}</td>
                  </tr>
                )}
                {freightInsurance > 0 && (
                  <tr className="subtotal">
                    <td colSpan={6} className={styles.tRight}>
                      Freight + insurance
                    </td>
                    <td className="num">{inr(freightInsurance)}</td>
                  </tr>
                )}
                <tr className="total">
                  <td colSpan={6} className={styles.tRight}>
                    Grand total
                  </td>
                  <td className="num">{inr(pricing.total ?? po.total_value)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Ordered by (buyer) — vendor's view of WHO placed the order. */}
          {(buyerCompany || isCallOff) && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <Building2 size={13} />
                  </div>
                  <h2>Ordered by</h2>
                </div>
              </div>
              <div className={styles.vendorProfile}>
                <div className={`${styles.vLogo} ${avatarClass(null, buyerCompany || "Buyer")}`}>
                  {initialsOf(buyerCompany || "Buyer")}
                </div>
                <div className={styles.vMain}>
                  <div className={styles.vName}>{buyerCompany || "Buyer"}</div>
                  <div className={styles.vMeta}>
                    {buyerBusinessUnit && (
                      <VRow icon={<Building2 size={12} />} label="Hotel / BU" value={buyerBusinessUnit} />
                    )}
                    {buyerDepartment && (
                      <VRow icon={<Building2 size={12} />} label="Department" value={buyerDepartment} />
                    )}
                    {isCallOff && callOff.arc_number && (
                      <VRow icon={<FileText size={12} />} label="Rate contract" value={callOff.arc_number} />
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Source — RFQ provenance, or ARC + MR reference for call-off POs. */}
          {(isCallOff || rfq.title || rfq.number) && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <FileText size={13} />
                  </div>
                  <h2>{isCallOff ? "Released PO source" : "RFQ source"}</h2>
                </div>
                {isCallOff && arcHref && (
                  <div className={styles.hRight}>
                    <Link href={arcHref} className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                      <ExternalLink size={12} />
                      Open rate contract
                    </Link>
                  </div>
                )}
              </div>
              <div className={styles.rfqContext}>
                <div className={styles.rfqIc}>
                  <FileText size={16} />
                </div>
                <div className={styles.meta}>
                  <div className={styles.title}>
                    <span>{isCallOff ? callOff.arc_title || "Rate contract" : rfq.title || "RFQ"}</span>
                    {isCallOff
                      ? callOff.arc_number && (
                          <span className={`${styles.pill} ${styles.pillOutline} ${styles.mono}`}>
                            {callOff.arc_number}
                          </span>
                        )
                      : rfq.number && (
                          <span className={`${styles.pill} ${styles.pillOutline} ${styles.mono}`}>
                            #{rfq.number}
                          </span>
                        )}
                  </div>
                  <div className={styles.sub}>
                    {orderedByLines.map((v, i, arr) => (
                      <React.Fragment key={i}>
                        <span>{v}</span>
                        {i < arr.length - 1 && <span className={styles.sep}>·</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              {isCallOff && callOff.mr_number && (
                <div className={styles.rfqFinalized}>
                  Released against material requisition{" "}
                  <strong className={styles.mono}>{callOff.mr_number}</strong> at contracted rates.
                </div>
              )}
            </section>
          )}

          {/* Documents */}
          {docs.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <FileText size={13} />
                  </div>
                  <h2>Documents &amp; attachments</h2>
                  <span className={styles.pill}>{docs.length} files</span>
                </div>
              </div>
              <div className={styles.docsList}>
                {docs.map((doc, i) => (
                  <a
                    key={i}
                    href={doc.url || "#"}
                    target={doc.url ? "_blank" : undefined}
                    rel="noreferrer"
                    className={`${styles.docItem} ${styles[doc.type] || ""}`}
                  >
                    <div className={styles.fileIc}>
                      <FileText size={14} />
                    </div>
                    <div className={styles.meta}>
                      <div className={styles.name}>{doc.name}</div>
                      <div className={styles.sub}>{[doc.kind, doc.size].filter(Boolean).join(" · ")}</div>
                    </div>
                    <Download size={14} className={styles.dl} />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Payment terms */}
          {paymentTerms.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <FileText size={13} />
                  </div>
                  <h2>Payment terms</h2>
                </div>
              </div>
              <div className={styles.milestoneList}>
                {paymentTerms.map((m, i) => (
                  <div key={i} className={styles.milestoneRow}>
                    <span className={styles.mNum}>{String(m.num ?? i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className={styles.mName}>{m.name}</div>
                      {m.due && <div className={styles.mDue}>{m.due}</div>}
                    </div>
                    <div className={styles.mPct}>{m.pct != null ? `${m.pct}%` : ""}</div>
                    <div className={styles.mAmt}>{inr(m.amount)}</div>
                    <span className={`${styles.pill} ${styles.pillNeutral}`}>Scheduled</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT (sticky aside) */}
        <div>
          <div className={styles.asideStack}>
            {/* Audit trail — full PO lifecycle */}
            {workflow.length > 0 && (
              <div className={styles.workflowCard}>
                <div className={styles.wfHead}>
                  <span>Audit trail</span>
                  <span className={styles.wfProgress}>
                    {doneSteps} of {workflow.length} done
                  </span>
                </div>
                {workflow.map((w, i) => {
                  const isRejected = w.status === "rejected";
                  const reasonText = isRejected ? w.reason || w.policy : null;
                  return (
                    <div
                      key={i}
                      className={`${styles.wfStep} ${
                        isRejected
                          ? styles.wfRejected
                          : w.status === "done"
                          ? styles.wfDone
                          : w.status === "current"
                          ? styles.wfCurrent
                          : styles.wfPending
                      }`}
                    >
                      <div className={styles.wfNode} />
                      <div className={styles.body}>
                        <div className={styles.stepName}>{w.title}</div>
                        {w.by && (
                          <div className={styles.stepMeta}>
                            <span className={`${styles.miniAv} ${avatarClass(null, w.by)}`}>
                              {initialsOf(w.by)}
                            </span>
                            <span className={styles.byName}>{w.by}</span>
                          </div>
                        )}
                        {w.when && <div className={styles.stepWhen}>{fmtDateTime(w.when)}</div>}
                        {isRejected ? (
                          <div className={styles.stepMeta} style={{ marginTop: 4 }}>
                            <span className={styles.rejectReason}>
                              {reasonText ? `Reason: “${reasonText}”` : "Rejected (no reason given)"}
                            </span>
                          </div>
                        ) : (
                          w.policy && (
                            <div className={styles.stepMeta} style={{ marginTop: 4 }}>
                              <span className={styles.policy}>{w.policy}</span>
                            </div>
                          )
                        )}
                      </div>
                      <div className={styles.rightStat}>
                        {isRejected
                          ? "Rejected"
                          : w.status === "done"
                          ? "Done"
                          : w.status === "current"
                          ? "Awaiting"
                          : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Key dates */}
            {keyDates.length > 0 && (
              <div className={styles.datesCard}>
                <div className={styles.dHead}>Key dates</div>
                {keyDates.map((d, i) => (
                  <div key={i} className={`${styles.dRow} ${d.soon ? styles.dSoon : ""}`}>
                    <span className={styles.k}>{d.k}</span>
                    <span className={styles.v}>{fmtMaybeDate(d.v)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Activity */}
            {activity.length > 0 && (
              <div className={styles.workflowCard}>
                <div className={styles.wfHead}>
                  <span>Activity</span>
                  <span className={styles.wfProgress}>{activity.length} events</span>
                </div>
                <div className={styles.activityList}>
                  {activity.map((a, i) => {
                    const cls =
                      a.type === "approved"
                        ? styles.aiApproved
                        : a.type === "rejected"
                        ? styles.aiRejected
                        : styles.aiComment;
                    const isOk = a.dot === "ok";
                    return (
                      <div key={i} className={`${styles.activityItem} ${cls}`}>
                        <div className={`${styles.aDot} ${isOk ? "" : avatarClass(null, a.who)}`}>
                          {isOk ? "✓" : initialsOf(a.who)}
                        </div>
                        <div className={styles.aBody}>
                          <div className={styles.aMsg}>
                            <span className={styles.who}>{a.who}</span> {a.msg}
                          </div>
                          {a.when && <div className={styles.aWhen}>{fmtDateTime(a.when)}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Action modals ── */}
      <ConfirmationModal
        isOpen={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        onConfirm={confirmAccept}
        title="Accept Purchase Order"
        description={`Are you sure you want to accept PO #${po.po_number || ""}? This confirms your commitment to fulfill this order as per the specified terms.`}
        confirmButtonColor="success"
        confirmButtonText="Yes, Accept PO"
        cancelButtonText="Cancel"
      />

      <ConfirmationModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={confirmReject}
        title="Reject Purchase Order"
        description={`Are you sure you want to reject PO #${po.po_number || ""}? The buyer will be notified and will need to finalize another vendor.`}
        confirmButtonColor="danger"
        confirmButtonText="Reject PO"
        cancelButtonText="Cancel"
        customFooter={
          <div style={{ marginTop: 4 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#334155", marginBottom: 6 }}>
              Reason for rejection <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (rejectionError) setRejectionError("");
              }}
              placeholder="Please provide a reason for rejecting this PO..."
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 13.5,
                color: "#1e293b",
                border: `1px solid ${rejectionError ? "#ef4444" : "#e2e8f0"}`,
                borderRadius: 8,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.6,
                transition: "border-color 0.2s",
              }}
            />
            {rejectionError && (
              <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#ef4444", fontWeight: 500 }}>
                {rejectionError}
              </p>
            )}
          </div>
        }
      />

      <ConfirmationModal
        isOpen={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        onConfirm={confirmDispatch}
        title="Mark Dispatched"
        description={`Are you sure you want to mark PO #${po.po_number || ""} as dispatched?`}
        confirmButtonColor="success"
        confirmButtonText="Yes, Mark Dispatched"
        cancelButtonText="Cancel"
      />

      <RaiseInvoiceModal
        show={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        onAction={confirmInvoice}
      />
    </div>
  );
};

const VRow = ({ icon, label, value }) => (
  <div className={styles.row}>
    {icon}
    <span>{label}</span>
    <span className={styles.v}>{value}</span>
  </div>
);

const Breadcrumb = ({ onBack, current }) => (
  <div className={styles.breadcrumbStrip}>
    <div className={styles.breadcrumbInner}>
      <button type="button" className={styles.crumbBack} onClick={onBack}>
        <ArrowLeft size={13} />
        Back
      </button>
      <span className={styles.crumbSep}>/</span>
      <a onClick={onBack}>Purchase orders</a>
      <span className={styles.crumbSep}>/</span>
      <span className={`${styles.crumbCurrent} ${styles.mono}`}>#{current}</span>
    </div>
  </div>
);

const DetailSkeleton = ({ onBack }) => (
  <div className={styles.page}>
    <Breadcrumb onBack={onBack} current="…" />
    <section className={styles.detailHero}>
      <div className={styles.detailHeroInner}>
        <div className={styles.heroIdBlock}>
          <Sk w={110} h={11} style={{ marginBottom: 8 }} />
          <Sk w={280} h={30} style={{ marginBottom: 10 }} />
          <Sk w={380} h={13} />
        </div>
        <div className={styles.heroActions}>
          <Sk w={120} h={36} r={6} />
          <Sk w={120} h={36} r={6} />
        </div>
      </div>
    </section>
    <main className={`${styles.pageBody} ${styles.pageBodyAside}`}>
      <div className={styles.sectionStack}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skCard}>
            <Sk w={180} h={16} style={{ marginBottom: 16 }} />
            <Sk h={90} />
          </div>
        ))}
      </div>
      <div>
        <div className={styles.asideStack}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={styles.skCard}>
              <Sk w={140} h={14} style={{ marginBottom: 14 }} />
              <Sk h={70} />
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

export default VendorPoDetail;
