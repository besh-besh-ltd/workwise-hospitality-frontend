import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Download,
  CornerUpLeft,
  X,
  Check,
  Clock,
  ShieldCheck,
  Boxes,
  Building2,
  FileText,
  ClipboardCheck,
  BarChart2,
  IndianRupee,
  Phone,
  Mail,
  CreditCard,
  User,
  ExternalLink,
  AlertCircle,
  Circle,
} from "lucide-react";
import { getPODetailFull, handlePOApproval } from "@/services/po";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import styles, {
  avatarClass,
  initialsOf,
  statusLabel,
  statusTone,
  inr,
  fmtDateTime,
  fmtDateOnly,
  fmtMaybeDate,
  Sk,
} from "./shared";

const PO_ROUTE = "/dashboard/buyer/purchase-orders";

// Technical-evaluation status → label + tone class (resolved against the module).
const TE_STATUS = {
  passed: { label: "Passed", cls: "tePassed" },
  failed: { label: "Failed", cls: "teFailed" },
  evaluated: { label: "Evaluated", cls: "teEval" },
  pending: { label: "Pending", cls: "tePend" },
};

const PODetail = ({ id }) => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);

  const hotelIds = useMemo(() => {
    const mappings = userProfile?.hospitality_mappings || [];
    return mappings.map((m) => m.hospitality_hotel_id).filter(Boolean);
  }, [userProfile]);

  const { canRead, canApprove, loading: permissionsLoading } = useModulePermissions({
    moduleKey: "awarding",
    hotelIds,
    departmentId: null,
  });

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(null); // 'approved' | 'rejected' | null

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const data = await getPODetailFull(id);
      setPo(data || null);
      if (!data) setError(true);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(PO_ROUTE);
  };

  // Approve / Reject — reuse the existing PO approval endpoint and payload
  // shape: handlePOApproval(po_id, { decision, type: "approval", remarks }).
  const decide = async (decision) => {
    if (decision === "rejected" && !comment.trim()) {
      toast.error("Please add a reason before rejecting this PO.");
      return;
    }
    setSubmitting(decision);
    try {
      const res = await handlePOApproval(id, {
        decision,
        type: "approval",
        remarks: comment.trim(),
      });
      const message =
        res?.data?.message ||
        res?.message ||
        (decision === "approved" ? "PO approved successfully" : "PO rejected · vendor notified");
      toast.success(message);
      setComment("");
      await fetchDetail();
    } catch (e) {
      const message = e?.response?.data?.message || e?.message || "Something went wrong, please try again.";
      toast.error(message);
    } finally {
      setSubmitting(null);
    }
  };

  if (permissionsLoading || loading) return <DetailSkeleton onBack={handleBack} />;

  if (!canRead) {
    return (
      <div className={styles.page}>
        <div className={styles.pageBody}>
          <AccessDeniedPage
            title="Access Denied"
            message="You do not have permission to view this Purchase Order."
            showBackButton
            backUrl={PO_ROUTE}
            backLabel="Back to Purchase Orders"
          />
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className={styles.page}>
        <Breadcrumb onBack={handleBack} current={id} />
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

  const isPending =
    po.status === "pending" ||
    po.status === "pending_approval" ||
    po.status === "acceptance_pending";
  // Gating: the action card / hero banner / Approve-Reject buttons only show
  // when the backend says this PO is awaiting THE CURRENT USER. canApprove
  // additionally gates the buttons.
  const awaitingMe = po.awaiting_me === true;
  const currentStepLabel = po.current_step_label || null;
  const currentApprovers = Array.isArray(po.current_approvers) ? po.current_approvers : [];
  const currentApproverNames = currentApprovers.map((a) => a.name).filter(Boolean).join(", ");
  const heroMod =
    po.status === "approved" || po.status === "delivered" || po.status === "completed"
      ? styles.heroApproved
      : po.status === "rejected"
      ? styles.heroRejected
      : "";

  const pricing = po.pricing || {};
  const items = Array.isArray(po.items) ? po.items : [];
  const vendor = po.vendor || {};
  const rfq = po.rfq || {};
  const comparison = Array.isArray(po.comparison) ? po.comparison : [];
  const docs = Array.isArray(po.docs) ? po.docs : [];
  // The generated PO document (po_pdf_url) is surfaced in docs as type "po".
  const poDocUrl = (docs.find((d) => d.type === "po") || {}).url || null;
  const paymentTerms = Array.isArray(po.payment_terms) ? po.payment_terms : [];
  const techEval = Array.isArray(po.tech_eval) ? po.tech_eval : [];
  const workflow = Array.isArray(po.workflow) ? po.workflow : [];
  const keyDates = Array.isArray(po.key_dates) ? po.key_dates : [];
  const activity = Array.isArray(po.activity) ? po.activity : [];
  const decisionChecks = Array.isArray(po.decision_checks) ? po.decision_checks : [];

  const rfqDocs = po.rfq_docs || null;
  const vendorDocs = po.vendor_docs || null;

  const freightInsurance = (Number(pricing.freight) || 0) + (Number(pricing.insurance) || 0);
  const passedChecks = decisionChecks.filter((c) => c.status === "ok").length;

  const doneSteps = workflow.filter((w) => w.status === "done").length;

  const finalizedBy = rfq.finalized_by;
  const finalizedDate = rfq.finalized_date ? fmtDateOnly(rfq.finalized_date) : null;

  // Call-off provenance (set only for ARC call-off POs, which have no RFQ).
  const isCallOff = !!po.is_call_off;
  const callOff = po.call_off || {};
  const arcHref = callOff.arc_id
    ? `/dashboard/buyer/rate-contracts/${callOff.arc_id}?stage=active`
    : null;
  const mrHref = callOff.mr_id
    ? `/dashboard/buyer/material-requisitions/${callOff.mr_id}`
    : null;

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
                {po.status_label || statusLabel(po.status)}
              </span>
            </h1>
            <div className={styles.hSub}>
              {vendor.name && <span className={styles.vendor}>{vendor.name}</span>}
              {vendor.name && <span className={styles.sep}>·</span>}
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

            {isPending && awaitingMe && (
              <div className={styles.heroWaiting}>
                <span className={styles.clockIc}>
                  <Clock size={14} />
                </span>
                <span>
                  Waiting on <strong>you</strong> for approval — review the details and take action.
                </span>
              </div>
            )}
            {isPending && !awaitingMe && (
              <div className={styles.heroPendingNote}>
                <span className={styles.clockIc}>
                  <Clock size={14} />
                </span>
                <span>
                  Pending approval — currently with
                  {currentStepLabel ? ` ${currentStepLabel}` : ""}
                  {currentApproverNames ? `: ${currentApproverNames}` : ""}.
                </span>
              </div>
            )}
          </div>

          <div className={styles.heroActions}>
            {poDocUrl ? (
              <a
                className={`${styles.btn} ${styles.btnSecondary}`}
                href={poDocUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={13} />
                Download PO
              </a>
            ) : (
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                type="button"
                disabled
                title="PO document not available yet"
              >
                <Download size={13} />
                Download PO
              </button>
            )}
            {isPending && awaitingMe && canApprove && (
              <>
                <button className={`${styles.btn} ${styles.btnSecondary}`} type="button">
                  <CornerUpLeft size={13} />
                  Send back
                </button>
                <button
                  className={`${styles.btn} ${styles.btnDangerStrong}`}
                  type="button"
                  disabled={!!submitting}
                  onClick={() => decide("rejected")}
                >
                  <X size={13} />
                  Reject
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSuccess}`}
                  type="button"
                  disabled={!!submitting}
                  onClick={() => decide("approved")}
                >
                  <Check size={14} strokeWidth={2.4} />
                  Approve PO
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Body */}
      <main className={`${styles.pageBody} ${styles.pageBodyAside}`}>
        {/* LEFT */}
        <div className={styles.sectionStack}>
          {/* Decision summary — hidden when empty */}
          {decisionChecks.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <ShieldCheck size={13} />
                  </div>
                  <h2>Decision summary</h2>
                  <span className={`${styles.pill} ${styles.pillSuccess}`}>
                    {passedChecks} of {decisionChecks.length} checks pass
                  </span>
                </div>
              </div>
              <div className={styles.decisionGrid}>
                {decisionChecks.map((c, i) => (
                  <div
                    key={i}
                    className={`${styles.decisionCell} ${
                      c.status === "ok"
                        ? styles.dcOk
                        : c.status === "warn"
                        ? styles.dcWarn
                        : c.status === "err"
                        ? styles.dcErr
                        : styles.dcNeutral
                    }`}
                  >
                    <span className={styles.checkIc}>
                      {c.status === "ok" ? (
                        <Check size={13} strokeWidth={2.4} />
                      ) : c.status === "warn" ? (
                        <AlertCircle size={13} />
                      ) : c.status === "err" ? (
                        <X size={13} />
                      ) : (
                        <Circle size={13} />
                      )}
                    </span>
                    <div className={styles.meta}>
                      <div className={styles.k}>{c.k}</div>
                      <div className={styles.v}>{c.v}</div>
                      {c.sub && <div className={styles.vSub}>{c.sub}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                      {it.size && (
                        <div className={styles.itSpec}>
                          <span className={styles.itLabel}>Product size: </span>{it.size}
                        </div>
                      )}
                      {it.spec && (
                        <div className={styles.itSpec}>
                          <span className={styles.itLabel}>Product specification: </span>{it.spec}
                        </div>
                      )}
                      {it.comment && (
                        <div className={styles.itSpec}>
                          <span className={styles.itLabel}>Comment: </span>{it.comment}
                        </div>
                      )}
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

          {/* Vendor profile */}
          {vendor.name && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <Building2 size={13} />
                  </div>
                  <h2>Vendor profile</h2>
                </div>
              </div>
              <div className={styles.vendorProfile}>
                <div className={`${styles.vLogo} ${avatarClass(null, vendor.name)}`}>
                  {vendor.short || initialsOf(vendor.name)}
                </div>
                <div className={styles.vMain}>
                  <div className={styles.vName}>{vendor.name}</div>
                  {vendor.tagline && <div className={styles.vTagline}>{vendor.tagline}</div>}
                  <div className={styles.vMeta}>
                    {vendor.gstin && (
                      <VRow icon={<FileText size={12} />} label="GSTIN" value={vendor.gstin} />
                    )}
                    {vendor.pan && <VRow icon={<FileText size={12} />} label="PAN" value={vendor.pan} />}
                    {vendor.phone && <VRow icon={<Phone size={12} />} label="Contact" value={vendor.phone} />}
                    {vendor.email && <VRow icon={<Mail size={12} />} label="Email" value={vendor.email} />}
                    {vendor.bank && <VRow icon={<CreditCard size={12} />} label="Bank" value={vendor.bank} />}
                    {vendor.contact && <VRow icon={<User size={12} />} label="Primary" value={vendor.contact} />}
                  </div>
                </div>
                {(vendor.rating != null || vendor.past_orders != null || vendor.on_time_delivery != null) && (
                  <div className={styles.vStats}>
                    {vendor.rating != null && (
                      <>
                        <div className={styles.statV}>{vendor.rating} ★</div>
                        <div className={styles.stat}>Vendor rating</div>
                      </>
                    )}
                    {vendor.past_orders != null && (
                      <>
                        <div className={`${styles.statV} ${styles.mt}`}>{vendor.past_orders}</div>
                        <div className={styles.stat}>Prior POs</div>
                      </>
                    )}
                    {vendor.on_time_delivery != null && (
                      <>
                        <div className={`${styles.statV} ${styles.mt}`}>{vendor.on_time_delivery}%</div>
                        <div className={styles.stat}>On-time delivery</div>
                      </>
                    )}
                  </div>
                )}
              </div>
              {(Array.isArray(vendor.flags) && vendor.flags.length > 0) ||
              vendor.avg_delay ||
              vendor.past_value ? (
                <div className={styles.vendorFlags}>
                  {(vendor.flags || []).map((f, i) => {
                    const label = typeof f === "string" ? f : f.label;
                    const type = typeof f === "object" ? f.type : "neutral";
                    return (
                      <span
                        key={i}
                        className={`${styles.pill} ${type === "success" ? styles.pillSuccess : styles.pillNeutral}`}
                      >
                        <span className={styles.pdot} />
                        {label}
                      </span>
                    );
                  })}
                  {vendor.avg_delay && (
                    <span className={`${styles.pill} ${styles.pillOutline}`}>
                      Avg delay <span className={styles.mono} style={{ marginLeft: 3, color: "var(--fg)" }}>{vendor.avg_delay}</span>
                    </span>
                  )}
                  {vendor.past_value && (
                    <span className={`${styles.pill} ${styles.pillOutline}`}>
                      Past value <span className={styles.mono} style={{ marginLeft: 3, color: "var(--fg)" }}>₹{vendor.past_value}</span>
                    </span>
                  )}
                </div>
              ) : null}
            </section>
          )}

          {/* RFQ context */}
          {(rfq.title || rfq.number) && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <FileText size={13} />
                  </div>
                  <h2>RFQ context</h2>
                </div>
                <div className={styles.hRight}>
                  <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
                    <ExternalLink size={12} />
                    Open RFQ
                  </button>
                </div>
              </div>
              <div className={styles.rfqContext}>
                <div className={styles.rfqIc}>
                  <FileText size={16} />
                </div>
                <div className={styles.meta}>
                  <div className={styles.title}>
                    <span>{rfq.title}</span>
                    {rfq.number && (
                      <span className={`${styles.pill} ${styles.pillOutline} ${styles.mono}`}>#{rfq.number}</span>
                    )}
                  </div>
                  <div className={styles.sub}>
                    {[rfq.company, rfq.business_unit, rfq.department].filter(Boolean).map((v, i, arr) => (
                      <React.Fragment key={i}>
                        <span>{v}</span>
                        {i < arr.length - 1 && <span className={styles.sep}>·</span>}
                      </React.Fragment>
                    ))}
                    {rfq.vendors_participated != null && (
                      <>
                        <span className={styles.sep}>·</span>
                        <span>
                          <span className={styles.em}>
                            {rfq.vendors_participated}
                            {rfq.vendors_invited != null ? ` of ${rfq.vendors_invited}` : ""}
                          </span>{" "}
                          vendors quoted
                        </span>
                      </>
                    )}
                    {rfq.rounds != null && (
                      <>
                        <span className={styles.sep}>·</span>
                        <span>
                          <span className={styles.em}>{rfq.rounds} rounds</span> of negotiation
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {finalizedBy && (
                <div className={styles.rfqFinalized}>
                  Vendor selection finalized by <strong>{finalizedBy}</strong>
                  {finalizedDate && (
                    <>
                      {" "}
                      on <strong className={styles.mono}>{finalizedDate}</strong>
                    </>
                  )}{" "}
                  based on commercial evaluation.
                </div>
              )}
            </section>
          )}

          {/* Call-off source — for ARC call-off POs (no RFQ). Links back to the
              originating rate contract and material requisition. */}
          {isCallOff && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <FileText size={13} />
                  </div>
                  <h2>Released PO source</h2>
                </div>
                <div className={styles.hRight}>
                  {arcHref && (
                    <Link href={arcHref} className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                      <ExternalLink size={12} />
                      Open rate contract
                    </Link>
                  )}
                </div>
              </div>
              <div className={styles.rfqContext}>
                <div className={styles.rfqIc}>
                  <FileText size={16} />
                </div>
                <div className={styles.meta}>
                  <div className={styles.title}>
                    {arcHref ? (
                      <Link href={arcHref} className={styles.rfqLink} style={{ textDecoration: "none" }}>
                        {callOff.arc_title || "Rate contract"}
                      </Link>
                    ) : (
                      <span>{callOff.arc_title || "Rate contract"}</span>
                    )}
                    {callOff.arc_number && (
                      <span className={`${styles.pill} ${styles.pillOutline} ${styles.mono}`}>
                        {callOff.arc_number}
                      </span>
                    )}
                  </div>
                  <div className={styles.sub}>
                    {[rfq.company, rfq.business_unit, rfq.department].filter(Boolean).map((v, i, arr) => (
                      <React.Fragment key={i}>
                        <span>{v}</span>
                        {i < arr.length - 1 && <span className={styles.sep}>·</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              {callOff.mr_number && (
                <div className={styles.rfqFinalized}>
                  Released against material requisition{" "}
                  {mrHref ? (
                    <Link href={mrHref} className={styles.mono} style={{ fontWeight: 600 }}>
                      {callOff.mr_number}
                    </Link>
                  ) : (
                    <strong className={styles.mono}>{callOff.mr_number}</strong>
                  )}{" "}
                  at contracted rates — no fresh sourcing required.
                </div>
              )}
            </section>
          )}

          {/* Technical evaluation — per product clause marks + % + approver.
              Hidden only when no product in this PO has a technical evaluation. */}
          {techEval.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <ClipboardCheck size={13} />
                  </div>
                  <h2>Technical evaluation</h2>
                  <span className={styles.pill}>
                    {techEval.length} {techEval.length === 1 ? "product" : "products"}
                  </span>
                </div>
              </div>

              <div className={styles.teList}>
                {techEval.map((t, i) => {
                  const meta = TE_STATUS[t.status] || TE_STATUS.evaluated;
                  return (
                    <div key={i} className={styles.teProduct}>
                      <div className={styles.teProductHead}>
                        <div className={styles.teProductName}>{t.product}</div>
                        <div className={styles.teProductMeta}>
                          {t.round != null && (
                            <span className={`${styles.pill} ${styles.pillOutline} ${styles.mono}`}>
                              Round {t.round}
                            </span>
                          )}
                          {t.percentage != null && (
                            <span className={`${styles.teScore} ${styles[meta.cls]}`}>
                              {t.percentage}%
                            </span>
                          )}
                          <span className={`${styles.teStatusPill} ${styles[meta.cls]}`}>
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      <div className={styles.teSubMeta}>
                        {t.minimum_passing_score != null && (
                          <span>
                            Passing mark{" "}
                            <span className={styles.mono}>{t.minimum_passing_score}%</span>
                          </span>
                        )}
                        <span className={styles.teApprover}>
                          {t.approver ? (
                            <>
                              Approved by <strong>{t.approver}</strong>
                              {t.approved_at ? (
                                <span className={styles.when}> · {fmtDateTime(t.approved_at)}</span>
                              ) : null}
                            </>
                          ) : (
                            <span className={styles.teMuted}>Evaluation approval pending</span>
                          )}
                        </span>
                      </div>

                      {t.clauses && t.clauses.length > 0 ? (
                        <table className={styles.teClauseTable}>
                          <thead>
                            <tr>
                              <th>Clause</th>
                              <th className={styles.num}>Max</th>
                              <th className={styles.num}>Obtained</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.clauses.map((c, ci) => {
                              const max = c.max_marks != null ? c.max_marks : null;
                              const got = c.obtained_marks;
                              const pct = max && got != null ? Math.max(0, Math.min(100, (got / max) * 100)) : 0;
                              return (
                                <tr key={ci}>
                                  <td>
                                    <div className={styles.teClauseText}>{c.clause_text}</div>
                                    {max != null && got != null && (
                                      <div className={styles.teClauseBar}>
                                        <span style={{ width: `${pct}%` }} />
                                      </div>
                                    )}
                                  </td>
                                  <td className={`${styles.num} ${styles.mono}`}>{max != null ? max : "—"}</td>
                                  <td className={`${styles.num} ${styles.mono}`}>
                                    {got != null ? got : <span className={styles.teMuted}>—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className={styles.teMuted}>No clause-level marks recorded.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quote comparison */}
          {comparison.length > 0 && (
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <BarChart2 size={13} />
                  </div>
                  <h2>Quote comparison</h2>
                  <span className={styles.pill}>{comparison.length} bidders</span>
                </div>
              </div>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>GSTIN</th>
                    <th className="num">Quoted</th>
                    <th className="num">Delivery</th>
                    <th className="num">Δ vs L1</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((v, i) => (
                    <tr key={i} className={v.is_winner ? styles.isWinner : undefined}>
                      <td>
                        <div className={styles.vCell}>
                          <div className={`${styles.vAvatar} ${avatarClass(null, v.vendor)}`}>
                            {v.short || initialsOf(v.vendor)}
                          </div>
                          <div className={styles.vn}>{v.vendor}</div>
                          {v.is_winner && (
                            <span className={styles.winnerMarker}>
                              <Check size={9} strokeWidth={3} />
                              Awarded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.gstinCell}>{v.gstin || "—"}</td>
                      <td className="num">
                        <span className={v.is_winner ? styles.winnerAmt : undefined}>{inr(v.amount)}</span>
                      </td>
                      <td className="num">{v.delivery_days != null ? `${v.delivery_days} days` : "—"}</td>
                      <td className="num">
                        {v.is_winner ? (
                          <span className={styles.saving}>— Baseline</span>
                        ) : (
                          <span className={styles.over}>{v.delta_pct != null ? `${v.delta_pct}%` : "—"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                      <div className={styles.sub}>
                        {[doc.kind, doc.size].filter(Boolean).join(" · ")}
                      </div>
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
                    <IndianRupee size={13} />
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
            {/* Calm read-only note — pending, but not awaiting the current user */}
            {isPending && !awaitingMe && (
              <div className={styles.pendingNoteCard}>
                <div className={styles.pnHead}>
                  <Clock size={13} />
                  <span>Pending approval</span>
                </div>
                <div className={styles.pnBody}>
                  Currently with
                  {currentStepLabel ? ` ${currentStepLabel}` : ""}
                  {currentApproverNames ? `: ${currentApproverNames}` : ""}.
                  {" "}No action is required from you right now.
                </div>
              </div>
            )}

            {/* Action card */}
            {isPending && awaitingMe && canApprove && (
              <div className={styles.actionCard}>
                <div className={styles.acHead}>
                  <div className={styles.hereNow}>Your action required</div>
                  <div className={styles.title}>
                    {currentStepLabel ? `${currentStepLabel} approval · You` : "Approval · You"}
                  </div>
                  <div className={styles.sub}>
                    Approve to route to the next approver. Reject to send back to the initiator.
                  </div>
                </div>
                <div className={styles.acBody}>
                  <textarea
                    className={styles.acComment}
                    placeholder="Add a comment for next approver or audit trail (optional)…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <div className={styles.acCta}>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      type="button"
                      disabled={!!submitting}
                      onClick={() => decide("rejected")}
                    >
                      <X size={12} />
                      {submitting === "rejected" ? "Rejecting…" : "Reject"}
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSuccess}`}
                      type="button"
                      disabled={!!submitting}
                      onClick={() => decide("approved")}
                    >
                      <Check size={13} strokeWidth={2.4} />
                      {submitting === "approved" ? "Approving…" : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                        {w.when && (
                          <div className={styles.stepWhen}>{fmtDateTime(w.when)}</div>
                        )}
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

            {/* Buyer + Vendor documents — sticky wrapper so both cards stay pinned */}
            {((rfqDocs && (rfqDocs.rfq_level.length > 0 || rfqDocs.products.length > 0)) ||
              (vendorDocs && (vendorDocs.quote_level.length > 0 || vendorDocs.products.length > 0))) && (
              <div className={styles.docsSticky}>
                {rfqDocs && (rfqDocs.rfq_level.length > 0 || rfqDocs.products.length > 0) && (
                  <DocAsideCard title="Buyer documents" sections={[
                    rfqDocs.rfq_level.length > 0 && { label: "RFQ level", files: rfqDocs.rfq_level },
                    ...rfqDocs.products.map((p) => ({ label: p.name, files: p.files })),
                  ].filter(Boolean)} />
                )}
                {vendorDocs && (vendorDocs.quote_level.length > 0 || vendorDocs.products.length > 0) && (
                  <DocAsideCard title="Vendor documents" sections={[
                    vendorDocs.quote_level.length > 0 && { label: "Quote level", files: vendorDocs.quote_level },
                    ...vendorDocs.products.map((p) => ({ label: p.name, files: p.files })),
                  ].filter(Boolean)} />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const fileDisplayName = (url) => {
  try {
    const seg = new URL(url).pathname.split("/").pop();
    const name = decodeURIComponent(seg);
    return name.length > 40 ? name.slice(0, 37) + "…" : name || "File";
  } catch {
    return "File";
  }
};

const DocAsideCard = ({ title, sections }) => (
  <div className={styles.docAsideCard}>
    <div className={styles.docAsideHead}>
      <FileText size={13} />
      {title}
    </div>
    {sections.map((sec, si) => (
      <div key={si} className={styles.docSection}>
        <div className={styles.docSectionLabel}>{sec.label}</div>
        {sec.files.map((f, fi) => (
          <div key={fi} className={styles.docFileRow}>
            <Download size={11} />
            {f.label && <span className={styles.docTypeBadge}>{f.label}</span>}
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.docFileName}
              title={fileDisplayName(f.url)}
            >
              {fileDisplayName(f.url)}
            </a>
          </div>
        ))}
      </div>
    ))}
  </div>
);

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

export default PODetail;
