// ViewRFQ — buyer-side RFQ Management Details page body.
//
// Hosted by /pages/dashboard/buyer/rfq-management-details which feeds `data`
// from getRFQById(), plus handlers for Close/Withdraw/Edit. This file owns the
// entire visual surface: page header, stats, buyer-and-inquiry details,
// products list (with per-product status), terms & conditions, action bar,
// edit-history modal trigger, and the right-rail Lifecycle Journey.
//
// Tender vs RFQ branching uses getEntityLabel(data.is_tender) everywhere
// labels are shown to the user. Tender-only sections (clarifications,
// publish scheduler, etc.) gate on data.is_tender directly.
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import moment from "moment";
import {
  Building2,
  Box,
  Users,
  Calendar,
  Zap,
  Copy,
  Pencil,
  History,
  MessageSquare,
  BarChart2,
  ClipboardCheck,
  ShieldCheck,
  Lock,
  Download,
  FileText,
  CheckCircle2,
  Check,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";

import {
  getEntityLabel,
  canEditRfq,
  getRFQPublishState,
} from "@/utils/sharedFunctions";
import PublishDateTimer from "@/components/shared/PublishDateTimer";
import useHasTechClauses from "@/hooks/useHasTechClauses";
import { getTechEvalStatus } from "@/services/rfq";
import { getNegotiationRounds } from "@/services/negotiation";
import { buildBuyerTechEvalProductSummary } from "@/components/dashboard/vendor/technicalEvaluationHelpers";
import NegotiationRoundsModal from "./NegotiationRoundsModal";

import RFQEditHistory from "./RFQEditHistory/RFQEditHistory";
import RFQLifecycleJourneyV2 from "./RFQLifecycleJourneyV2";
import ViewRFQSkeleton from "./ViewRFQSkeleton";

import styles from "./ViewRFQ.module.scss";

/* ─────────────────────────────  small helpers  ───────────────────────────── */

const fmtDateTime = (d) => (d ? moment(d).format("DD MMM YY · hh:mm A") : "—");
const fmtDate = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");

// Single source of truth for the top-of-page eyebrow status (Draft/Active/etc).
// Mirrors getRFQPublishState() but flattens into a presentation tuple so the
// header doesn't need to know every status code.
const getEyebrow = (data, publishState) => {
  if (!data) return { label: "Loading", tone: "neutral" };
  if (data.po_completed) return { label: "Completed", tone: "success" };
  if (publishState.isClosed)
    return {
      label: data.is_published === 0 ? "Terminated" : "Closed",
      tone: "danger",
    };
  if (publishState.isWithdrawn) return { label: "Withdrawn", tone: "warn" };
  if (publishState.isPendingApproval) return { label: "Pending approval", tone: "warn" };
  if (publishState.isReadyToPublish) return { label: "Ready to publish", tone: "info" };
  if (publishState.isOpen) return { label: "Active", tone: "success" };
  return { label: "Draft", tone: "neutral" };
};

// Edit button shared by header + action bar. Uses canEditRfq() to decide
// enabled/disabled state; disabled buttons get a tooltip explaining why.
const EditRfqButton = ({ data, currentUser, label, idAttr, small = false }) => {
  const { allowed, reason } = canEditRfq(data, currentUser);
  const cls = `${styles.btn} ${styles.btnPrimary} ${small ? styles.btnSm : ""}`;
  if (allowed) {
    return (
      <Link
        href={`/dashboard/buyer/rfq-management-edit?id=${data.id}`}
        className={cls}
        id={idAttr}
      >
        <Pencil size={small ? 13 : 14} strokeWidth={2} />
        {label}
      </Link>
    );
  }
  return (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id={`edit-disabled-${data?.id || "x"}`}>{reason}</Tooltip>
      }
    >
      <span className="d-inline-block">
        <button type="button" className={cls} disabled id={idAttr}>
          <Pencil size={small ? 13 : 14} strokeWidth={2} />
          {label}
        </button>
      </span>
    </OverlayTrigger>
  );
};

/* ─────────────────────────────  product card  ───────────────────────────── */

// Read a product spec value by exact title (matches inquiries-details.js, which
// keys specs on the canonical titles "Size"/"Spec"/"Quantity"/"Unit").
const specValue = (specs, title) => {
  const s = specs.find((x) => x?.title === title);
  const v = s?.value;
  // Treat empty / placeholder values as absent so we don't render a stray pill.
  if (v == null) return null;
  const str = String(v).trim();
  if (!str || str === "----" || str === "N/A") return null;
  return str;
};

const ProductCard = ({
  product,
  index,
  techEval,
  techEvalLoading,
  negRounds,
  negLoading,
  onOpenNegotiation,
}) => {
  const specs = Array.isArray(product?.product_specs) ? product.product_specs : [];
  // Canonical spec titles used across the platform.
  const size = specValue(specs, "Size");
  const spec = specValue(specs, "Spec");
  const qty = specValue(specs, "Quantity");
  const unit = specValue(specs, "Unit");
  // Variant guarded so a numeric 0 / blank never renders as a stray "0".
  const variantStr = product?.variant == null ? "" : String(product.variant).trim();
  const variant = variantStr && variantStr !== "0" ? variantStr : null;

  const productName =
    product?.product_details?.[0]?.name ||
    product?.name ||
    `Product #${product?.product_id || index + 1}`;

  const datasheetFiles = Array.isArray(product?.datasheet_file)
    ? product.datasheet_file
    : [];
  const qapFiles = Array.isArray(product?.qap_file) ? product.qap_file : [];
  const specFiles = Array.isArray(product?.spec_file) ? product.spec_file : [];

  // Vendor participation — backed by participated_vendors_count / vendors_count
  // (same fields inquiries-details.js renders for the buyer view).
  const participated = product?.participated_vendors_count ?? 0;
  const invited = product?.vendors_count ?? 0;

  /* ── Technical evaluation state ──
     has_tech_eval / is_accepted come from the getRFQById payload. The per-vendor
     eligible/passed/failed counts and the round number come from the separate
     getTechEvalStatus(product.id) call, resolved by ViewRFQ and passed down as
     `techEval` (the raw service `data`). We run it through the same
     buildBuyerTechEvalProductSummary() helper inquiries-details.js uses, so the
     numbers match exactly (eligible = teAndQuoteVendorCount, passed/failed/
     currentRound from the summary, completed = stateKey === "COMPLETED"). */
  const te = product?.tech_evaluation_status;
  const teConfigured = !!te?.has_tech_eval;
  const teSummary = useMemo(
    () =>
      teConfigured
        ? buildBuyerTechEvalProductSummary(product, techEval || null)
        : null,
    [product, techEval, teConfigured],
  );
  // "Completed" once the eval is accepted OR the summary reports COMPLETED;
  // otherwise it's still pending evaluation.
  const teCompleted =
    teConfigured &&
    (te?.is_accepted === true || teSummary?.stateKey === "COMPLETED");
  const tePending = teConfigured && !teCompleted;
  const teEligible = teSummary?.teAndQuoteVendorCount ?? 0;
  const tePassed = teSummary?.passedCount ?? 0;
  const teFailed = teSummary?.failedCount ?? 0;
  const teRound = teSummary?.currentRound ?? 0;

  /* ── Commercial negotiation state ──
     finalization_status is a buyer-view string; lowest_quotation.total_price is
     the only ₹ amount on the payload. The negotiation round list (`negRounds`)
     is fetched per-product by ViewRFQ via getNegotiationRounds — it backs the
     round count, the "finalized by" actor, and the clickable history modal. */
  const finalizationStatus = product?.finalization_status;
  const finalized =
    !!finalizationStatus &&
    finalizationStatus !== "No vendor finalized yet" &&
    finalizationStatus !== "Pending";
  // Buyer-facing winning-vendor name + amount (additive backend field). Falls
  // back to a neutral label so we never surface the vendor-perspective string
  // "Another vendor is finalized" on the buyer page.
  const finalizedVendor = product?.finalized_vendor || null;
  const finalizedVendorName = finalizedVendor?.vendor_name || null;
  const lowestPrice =
    finalizedVendor?.finalized_amount ?? product?.lowest_quotation?.total_price;

  const rounds = Array.isArray(negRounds) ? negRounds : [];
  const negRoundCount = rounds.length;
  const hasNegotiation = negRoundCount > 0;
  // "Finalized by" actor: the creator of the most recent completed/approved
  // round (rounds carry created_by_name — the only actor name available here).
  const finalizedByActor = useMemo(() => {
    if (!hasNegotiation) return null;
    const completed = [...rounds]
      .reverse()
      .find((r) => r.status === "COMPLETED" || r.approved_at);
    return (completed || rounds[rounds.length - 1])?.created_by_name || null;
  }, [rounds, hasNegotiation]);
  const negEnded = finalized || rounds.some((r) => r.status === "COMPLETED");

  return (
    <div className={styles.productCard}>
      <div className={styles.productHead}>
        <div className={styles.productNameBlock}>
          <span className={styles.numChip}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className={styles.productMeta}>
            <div className={styles.productTitleRow}>
              <span className={styles.productTitle}>{productName}</span>
              {/* Size pill when there's a real value; otherwise an explicit
                  "no additional information" marker. (Guard against a numeric
                  0 / empty variant rendering as a stray "0".) */}
              {size ? (
                <span className={`${styles.pill} ${styles.neutral}`}>{size}</span>
              ) : variant ? (
                <span className={`${styles.pill} ${styles.neutral}`}>{variant}</span>
              ) : (
                <span className={`${styles.pill} ${styles.pillMuted}`}>
                  No additional information
                </span>
              )}
            </div>

            {spec && <div className={styles.productSpec}>{spec}</div>}

            {product?.comment && (
              <div className={styles.productSpec}>{product.comment}</div>
            )}

            {(datasheetFiles.length > 0 ||
              qapFiles.length > 0 ||
              specFiles.length > 0) && (
              <div className={styles.productFiles}>
                {datasheetFiles.map((url, i) => (
                  <a
                    key={`tds-${i}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.fileChip}
                  >
                    <FileText size={11} className={styles.fileChipIcon} strokeWidth={2} />
                    TDS
                  </a>
                ))}
                {qapFiles.map((url, i) => (
                  <a
                    key={`qap-${i}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.fileChip}
                  >
                    <FileText size={11} className={styles.fileChipIcon} strokeWidth={2} />
                    QAP
                  </a>
                ))}
                {specFiles.map((url, i) => (
                  <a
                    key={`spec-${i}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.fileChip}
                  >
                    <FileText size={11} className={styles.fileChipIcon} strokeWidth={2} />
                    SPEC
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.productStats}>
          <div className={styles.productStat}>
            <div className={styles.k}>Quantity</div>
            <div className={styles.v}>
              {qty || "—"}
              {unit && <span className={styles.unit}>{unit}</span>}
            </div>
          </div>
          <div className={styles.productStat}>
            <div className={styles.k}>Vendor participation</div>
            <div className={styles.v}>
              {participated}
              <span className={styles.fracDivider}>/</span>
              {invited}
            </div>
          </div>
        </div>
      </div>

      {/* Body grid: Technical evaluation (left) + Commercial negotiation (right) */}
      <div className={styles.productBody}>
        {/* ── Technical evaluation ── */}
        {teCompleted && (
          <div className={`${styles.teCard} ${styles.teCompleted}`}>
            <div className={styles.teHead}>
              <div className={styles.teLabel}>
                <span className={styles.lblIc}>
                  <ClipboardCheck size={11} strokeWidth={2.2} />
                </span>
                Technical evaluation
              </div>
              {teRound > 0 && (
                <span className={styles.teRound}>Round {teRound}</span>
              )}
            </div>
            <div className={styles.teStatusRow}>
              <span className={`${styles.pill} ${styles.success}`}>
                <CheckCircle2 size={9} strokeWidth={3} />
                Completed
              </span>
            </div>
            {techEvalLoading ? (
              <div className={styles.teMeta}>Loading evaluation…</div>
            ) : (
              <>
                <div className={styles.teCounts}>
                  <span className={styles.teCount}>
                    <span className={styles.teCountEm}>{teEligible}</span> Eligible
                  </span>
                  <span className={styles.teCountSep}>·</span>
                  <span className={`${styles.teCount} ${styles.teCountPass}`}>
                    <span className={styles.teCountEm}>{tePassed}</span> Passed
                  </span>
                  <span className={styles.teCountSep}>·</span>
                  <span className={`${styles.teCount} ${styles.teCountFail}`}>
                    <span className={styles.teCountEm}>{teFailed}</span> Failed
                  </span>
                </div>
                <div className={styles.teFinal}>
                  <ArrowRight size={11} className={styles.teArrow} strokeWidth={2} />
                  <span className={styles.teEm}>
                    {tePassed} vendor{tePassed === 1 ? "" : "s"} cleared
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {tePending && (
          <div className={`${styles.teCard} ${styles.tePending}`}>
            <div className={styles.teHead}>
              <div className={styles.teLabel}>
                <span className={styles.lblIc}>
                  <ClipboardCheck size={11} strokeWidth={2.2} />
                </span>
                Technical evaluation
              </div>
              {teRound > 0 && (
                <span className={styles.teRound}>Round {teRound}</span>
              )}
            </div>
            <div className={styles.teStatusRow}>
              <span className={`${styles.pill} ${styles.warn}`}>
                <span className={styles.pdot} />
                Evaluation pending
              </span>
            </div>
            {techEvalLoading ? (
              <div className={styles.teMeta}>Loading evaluation…</div>
            ) : teEligible + tePassed + teFailed > 0 ? (
              <div className={styles.teCounts}>
                <span className={styles.teCount}>
                  <span className={styles.teCountEm}>{teEligible}</span> Eligible
                </span>
                <span className={styles.teCountSep}>·</span>
                <span className={`${styles.teCount} ${styles.teCountPass}`}>
                  <span className={styles.teCountEm}>{tePassed}</span> Passed
                </span>
                <span className={styles.teCountSep}>·</span>
                <span className={`${styles.teCount} ${styles.teCountFail}`}>
                  <span className={styles.teCountEm}>{teFailed}</span> Failed
                </span>
              </div>
            ) : (
              <div className={styles.teMeta}>
                {te?.total_clauses
                  ? `${te.total_clauses} clause${te.total_clauses === 1 ? "" : "s"} configured`
                  : "Awaiting evaluation"}
              </div>
            )}
          </div>
        )}

        {!teConfigured && (
          <div className={`${styles.teCard} ${styles.teNotConfigured}`}>
            <div className={styles.teHead}>
              <div className={styles.teLabel}>
                <span className={styles.lblIc}>
                  <XCircle size={11} strokeWidth={2.2} />
                </span>
                Technical evaluation
              </div>
            </div>
            <div className={styles.teStatusRow}>
              <span className={styles.statusText}>Not configured</span>
            </div>
            <div className={styles.teMeta}>
              Vendors evaluated on commercials only.
            </div>
          </div>
        )}

        {/* ── Commercial negotiation ── */}
        {(() => {
          // No rounds at all → graceful, non-clickable state.
          if (!negLoading && !hasNegotiation) {
            return (
              <div className={`${styles.negCard} ${styles.negPending}`}>
                <div className={styles.negHead}>
                  <div className={styles.negLabel}>
                    <BarChart2 size={11} strokeWidth={2} />
                    Commercial negotiation
                  </div>
                </div>
                <div className={styles.negStatusRow}>
                  <span className={`${styles.pill} ${styles.neutral}`}>
                    <span className={styles.pdot} />
                    {finalized ? "Finalized" : "In progress"}
                  </span>
                </div>
                {finalized ? (
                  <>
                    <div className={styles.negVendor}>
                      <div className={styles.negVName}>{finalizedVendorName || "Vendor finalized"}</div>
                      {lowestPrice != null && (
                        <div className={styles.negVAmount}>
                          ₹{Number(lowestPrice).toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>
                    <div className={styles.negFoot}>Vendor finalized for this product</div>
                  </>
                ) : (
                  <div className={styles.negMeta}>No negotiation rounds</div>
                )}
              </div>
            );
          }

          const clickable = hasNegotiation;
          return (
            <div
              className={`${styles.negCard} ${negEnded ? styles.negEnded : styles.negPending} ${clickable ? styles.negClickable : ""}`}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onOpenNegotiation(product, rounds) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenNegotiation(product, rounds);
                      }
                    }
                  : undefined
              }
            >
              <div className={styles.negHead}>
                <div className={styles.negLabel}>
                  <BarChart2 size={11} strokeWidth={2} />
                  Commercial negotiation
                </div>
                {negRoundCount > 0 && (
                  <span className={styles.negRound}>Round {negRoundCount}</span>
                )}
              </div>
              <div className={styles.negStatusRow}>
                {negEnded ? (
                  <span className={`${styles.pill} ${styles.success}`}>
                    <CheckCircle2 size={9} strokeWidth={3} />
                    Ended
                  </span>
                ) : (
                  <span className={`${styles.pill} ${styles.warn}`}>
                    <span className={styles.pdot} />
                    In progress
                  </span>
                )}
              </div>

              {finalized ? (
                <>
                  <div className={styles.negVendor}>
                    <div className={styles.negVName}>{finalizedVendorName || "Vendor finalized"}</div>
                    {lowestPrice != null && (
                      <div className={styles.negVAmount}>
                        ₹{Number(lowestPrice).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                  <div className={styles.negFoot}>
                    {finalizedByActor
                      ? `Finalized by ${finalizedByActor}`
                      : "Vendor finalized for this product"}
                  </div>
                </>
              ) : (
                <div className={styles.negMeta}>
                  {negLoading ? (
                    "Loading negotiation rounds…"
                  ) : lowestPrice != null ? (
                    <>
                      Lowest quote{" "}
                      <span className={styles.negEm}>
                        ₹{Number(lowestPrice).toLocaleString("en-IN")}
                      </span>{" "}
                      · {negRoundCount} round{negRoundCount === 1 ? "" : "s"} · tap to view history
                    </>
                  ) : (
                    `${negRoundCount} round${negRoundCount === 1 ? "" : "s"} · tap to view history`
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

/* ─────────────────────────────  main component  ───────────────────────────── */

const ViewRFQ = ({
  data,
  onCloseRFQ,
  closeLoading,
  isCreator,
  onWithdrawPublish,
  withdrawLoading,
  onTerminate,
}) => {
  const router = useRouter();
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentUser = useSelector((state) => state.userProfile);
  const { hasClauses, loading: clauseLoading } = useHasTechClauses({
    rfq_id: data?.id,
  });

  const rfqStatus = data?.status ? Number(data.status) : 0;
  const publishState = useMemo(() => getRFQPublishState(data), [data]);
  const eyebrow = useMemo(
    () => getEyebrow(data, publishState),
    [data, publishState],
  );
  const isTender = data?.is_tender === 1;
  const entity = getEntityLabel(data?.is_tender);
  const products = Array.isArray(data?.products) ? data.products : [];

  const rfqId = data?.id;

  /* ── Per-product Technical Evaluation status ──
     Mirrors inquiries-details.js (lines 276-327): for every product with
     tech_evaluation_status.has_tech_eval we fetch getTechEvalStatus(product.id)
     in parallel, keyed by product id. A request-id ref makes it race-safe so a
     stale RFQ's results can never overwrite a newer one. */
  const [techEvalByProduct, setTechEvalByProduct] = useState({});
  const [techEvalLoading, setTechEvalLoading] = useState({});
  const techEvalReqRef = useRef(0);

  useEffect(() => {
    const teProducts = products.filter(
      (p) => p?.tech_evaluation_status?.has_tech_eval,
    );
    if (teProducts.length === 0) {
      setTechEvalByProduct({});
      setTechEvalLoading({});
      return;
    }
    const reqId = techEvalReqRef.current + 1;
    techEvalReqRef.current = reqId;

    setTechEvalLoading(
      teProducts.reduce((acc, p) => {
        acc[p.id] = true;
        return acc;
      }, {}),
    );

    (async () => {
      const results = await Promise.all(
        teProducts.map(async (p) => {
          try {
            const res = await getTechEvalStatus(p.id);
            return { id: p.id, data: res?.data?.data || res?.data || null };
          } catch (err) {
            console.error(`Error fetching tech eval status for product ${p.id}:`, err);
            return { id: p.id, data: null };
          }
        }),
      );
      if (techEvalReqRef.current !== reqId) return; // stale
      const nextStatus = {};
      const nextLoading = {};
      results.forEach(({ id, data: d }) => {
        nextStatus[id] = d;
        nextLoading[id] = false;
      });
      setTechEvalByProduct(nextStatus);
      setTechEvalLoading(nextLoading);
    })();
    // Re-run only when the RFQ identity changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId]);

  /* ── Per-product Negotiation rounds ──
     Fetched eagerly per product so the card's round count + "finalized by"
     actor are accurate and the history modal opens with data immediately.
     Buyer view relies on the JWT (no magic-link token), like NegotiationBanner. */
  const [negRoundsByProduct, setNegRoundsByProduct] = useState({});
  const [negLoading, setNegLoading] = useState({});
  const negReqRef = useRef(0);

  useEffect(() => {
    if (!rfqId || products.length === 0) {
      setNegRoundsByProduct({});
      setNegLoading({});
      return;
    }
    const reqId = negReqRef.current + 1;
    negReqRef.current = reqId;

    setNegLoading(
      products.reduce((acc, p) => {
        acc[p.id] = true;
        return acc;
      }, {}),
    );

    (async () => {
      const results = await Promise.all(
        products.map(async (p) => {
          try {
            const res = await getNegotiationRounds(rfqId, p.id);
            return { id: p.id, rounds: res?.data || [] };
          } catch (err) {
            console.error(`Error fetching negotiation rounds for product ${p.id}:`, err);
            return { id: p.id, rounds: [] };
          }
        }),
      );
      if (negReqRef.current !== reqId) return; // stale
      const nextRounds = {};
      const nextLoading = {};
      results.forEach(({ id, rounds }) => {
        nextRounds[id] = rounds;
        nextLoading[id] = false;
      });
      setNegRoundsByProduct(nextRounds);
      setNegLoading(nextLoading);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId]);

  // Negotiation history modal — opened by clicking a product's neg card.
  const [negModal, setNegModal] = useState({ open: false, product: null, rounds: [] });
  const openNegotiation = useCallback((product, rounds) => {
    setNegModal({ open: true, product, rounds: rounds || [] });
  }, []);
  const negModalProductName =
    negModal.product?.product_details?.[0]?.name ||
    negModal.product?.name ||
    "Product";

  // Terms: API returns an array of {id, term_content, name, term_id}. Surface
  // the term_content (preferred) or fall back to name.
  const terms = Array.isArray(data?.terms) ? data.terms : [];
  const additionalTerms = (data?.comment || "").trim();
  const termFile = Array.isArray(data?.TERM_files) && data.TERM_files.length > 0
    ? data.TERM_files[0]
    : null;

  const copyRfqNumber = () => {
    if (copied) return;
    const lines = [`RFQ No: #${data?.rfq_no || ""}`];
    if (data?.title) lines.push(`RFQ Title: ${data.title}`);
    const txt = lines.join("\n");
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(txt)
        .then(() => {
          // Flip the copy icon to a tick for 3s instead of toasting.
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(() => toast.error("Copy failed"));
    }
  };

  if (!data) {
    return <ViewRFQSkeleton />;
  }

  return (
    <div className={styles.page}>
      {/* ─── Page header ─── */}
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/dashboard/buyer/rfq-management?tab=manage-rfq");
              }
            }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back to {entity} management
          </button>
          <div className={styles.eyebrow}>
            <span
              className={`${styles.eyebrowDot} ${
                eyebrow.tone === "warn"
                  ? styles.eyebrowDotWarn
                  : eyebrow.tone === "danger"
                  ? styles.eyebrowDotDanger
                  : eyebrow.tone === "neutral"
                  ? styles.eyebrowDotNeutral
                  : ""
              }`}
            />
            {eyebrow.label}
            {data.lifecycle_stage && (
              <>
                {" "}· Lifecycle stage:
                <span className={styles.eyebrowEm}>
                  {data.lifecycle_stage.replace(/_/g, " ").toLowerCase()}
                </span>
              </>
            )}
          </div>

          <div className={styles.titleRow}>
            <div className={styles.titleBlock}>
              <h1 className={styles.pageTitle}>
                <span className={styles.titleText}>
                  {data.title || `${entity} #${data.rfq_no}`}
                </span>
                <span className={styles.rfqNum}>#{data.rfq_no}</span>
                <OverlayTrigger
                  placement="top"
                  show={copied}
                  overlay={
                    <Tooltip id={`copied-${data?.id || "x"}`}>Copied to clipboard</Tooltip>
                  }
                >
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${copied ? styles.iconBtnCopied : ""}`}
                    onClick={copyRfqNumber}
                    disabled={copied}
                    aria-label={copied ? "Copied" : "Copy RFQ number"}
                  >
                    {copied ? (
                      <Check size={13} strokeWidth={2} />
                    ) : (
                      <Copy size={13} strokeWidth={2} />
                    )}
                  </button>
                </OverlayTrigger>
              </h1>
              <div className={styles.pageSub}>
                {data.company_name && (
                  <>
                    <span>
                      <span className="em">{data.company_name}</span>
                      {data.hotel_name && (
                        <>
                          {" · "}
                          {data.hotel_name}
                        </>
                      )}
                    </span>
                    <span className="sep">·</span>
                  </>
                )}
                <span>
                  Created{" "}
                  <span className="em">{fmtDate(data.timestamp)}</span>
                </span>
                <span className="sep">·</span>
                <span>
                  {entity}
                  {data.rfq_type ? ` · ${data.rfq_type}` : ""}
                </span>
              </div>
            </div>

            <div className={styles.headerActions}>
              {isTender && (
                <Link
                  href={`/dashboard/buyer/query?rfq_id=${data.rfq_no}&role=buyer`}
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                  id="queries_button-rfq_header-view_rfq_page"
                >
                  <MessageSquare size={13} strokeWidth={2} />
                  Clarifications
                  {data.unseen_query_count > 0 && (
                    <span className={`${styles.pill} ${styles.info}`} style={{ padding: "1px 6px", fontSize: 10 }}>
                      {data.unseen_query_count}
                    </span>
                  )}
                </Link>
              )}
              {!isTender && (
                <Link
                  href={`/dashboard/buyer/query?rfq_id=${data.rfq_no}&role=buyer`}
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                  id="queries_button-rfq_header-view_rfq_page"
                >
                  <MessageSquare size={13} strokeWidth={2} />
                  Queries
                </Link>
              )}
              <Link
                href={`/dashboard/buyer/quote-compare?rfq_id=${data.rfq_no}`}
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                id="compare_quotes_button-rfq_header-view_rfq_page"
              >
                <BarChart2 size={13} strokeWidth={2} />
                Compare quotes
              </Link>
              <Link
                href={`/dashboard/buyer/technical-evaluation?rfq_id=${data.rfq_no}`}
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                id="technical_evaluation-rfq_header-view_rfq_page"
              >
                <ClipboardCheck size={13} strokeWidth={2} />
                Technical eval
              </Link>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                onClick={() => setShowEditHistoryModal(true)}
                id="edit_history_button-rfq_header-view_rfq_page"
              >
                <History size={13} strokeWidth={2} />
                Edit history
              </button>

              {/* Edit / Close / Withdraw — gated by rfqStatus + isCreator. */}
              {(rfqStatus === 1 || rfqStatus === 3 || rfqStatus === 4 || rfqStatus === 5) && (
                <EditRfqButton
                  data={data}
                  currentUser={currentUser}
                  label={`Edit ${entity}`}
                  idAttr="edit_rfq-rfq_actions-view_rfq_page"
                  small
                />
              )}

              {rfqStatus === 1 && isCreator && (
                <>
                  <div className={styles.actionsDivider} />
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                    id="close_rfq-rfq_actions-view_rfq_page"
                    onClick={onCloseRFQ}
                    disabled={closeLoading}
                  >
                    <Lock size={13} strokeWidth={2} />
                    {closeLoading ? "Processing…" : `Close ${entity}`}
                  </button>
                </>
              )}

              {(rfqStatus === 3 || rfqStatus === 4) && isCreator && (
                <>
                  <div className={styles.actionsDivider} />
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnWarn} ${styles.btnSm}`}
                    id="withdraw_publish-rfq_actions-view_rfq_page"
                    onClick={onWithdrawPublish}
                    disabled={withdrawLoading}
                  >
                    {withdrawLoading ? "Processing…" : "Withdraw publish"}
                  </button>
                  {onTerminate && (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                      id="terminate_rfq-rfq_actions-view_rfq_page"
                      onClick={onTerminate}
                    >
                      Terminate
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stat strip */}
          <div className={styles.statStrip}>
            <div className={styles.statCell}>
              <div className={styles.statIcon}>
                <Box size={14} strokeWidth={2} />
              </div>
              <div className={styles.statBody}>
                <div className={styles.statKey}>Products</div>
                <div className={`${styles.statValue} ${styles.mono}`}>
                  {products.length}
                </div>
              </div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statIcon}>
                <Users size={14} strokeWidth={2} />
              </div>
              <div className={styles.statBody}>
                <div className={styles.statKey}>Quotes received</div>
                <div className={`${styles.statValue} ${styles.mono}`}>
                  {data.is_quotes_present ? "Yes" : "No"}
                </div>
              </div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statIcon}>
                <Calendar size={14} strokeWidth={2} />
              </div>
              <div className={styles.statBody}>
                <div className={styles.statKey}>Quote deadline</div>
                <div className={`${styles.statValue} ${styles.mono}`}>
                  {data.bid_end_date ? fmtDateTime(data.bid_end_date) : "—"}
                </div>
              </div>
            </div>
            <div className={styles.statCell}>
              <div className={styles.statIcon}>
                <ClipboardCheck size={14} strokeWidth={2} />
              </div>
              <div className={styles.statBody}>
                <div className={styles.statKey}>
                  Technical configured
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id={`tech-config-${data?.id || "x"}`}>
                        When configured, this {entity} has technical evaluation
                        clauses that vendors must clear before commercial
                        comparison. When not, vendors are compared on commercials
                        only.
                      </Tooltip>
                    }
                  >
                    <span className={styles.statInfo}>
                      <Info size={11} strokeWidth={2} />
                    </span>
                  </OverlayTrigger>
                </div>
                <div className={`${styles.statValue} ${styles.mono}`}>
                  {clauseLoading
                    ? "—"
                    : hasClauses
                    ? "Yes"
                    : "No"}
                </div>
              </div>
            </div>
            {data.reverse_auction === 1 && (
              <div className={styles.statCell}>
                <div className={styles.statIcon}>
                  <Zap size={14} strokeWidth={2} />
                </div>
                <div className={styles.statBody}>
                  <div className={styles.statKey}>Reverse auction</div>
                  <div className={`${styles.statValue} ${styles.mono}`}>
                    {data.ra_start_date ? fmtDate(data.ra_start_date) : "—"}
                    {data.ra_end_date && (
                      <>
                        {" → "}
                        {fmtDate(data.ra_end_date)}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            {publishState.isPrePublishState && data.tender_publish_date && (
              <div className={styles.statCell}>
                <div className={styles.statIcon}>
                  <Calendar size={14} strokeWidth={2} />
                </div>
                <div className={styles.statBody}>
                  <div className={styles.statKey}>Scheduled publish</div>
                  <div className={styles.statValue}>
                    <PublishDateTimer
                      publishDate={data.tender_publish_date}
                      variant="full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Closed banner */}
          {rfqStatus === 2 && (
            <div className={`${styles.banner} ${styles.warn}`}>
              <div className={styles.bannerIcon} style={{ borderColor: "rgba(185, 28, 28, 0.16)", color: "#b91c1c" }}>
                <XCircle size={13} strokeWidth={2} />
              </div>
              <div>
                <strong>{entity} is closed.</strong>{" "}
                {data.close_comment || "Vendors can no longer submit quotes."}
              </div>
            </div>
          )}
          {rfqStatus === 5 && (
            <div className={`${styles.banner} ${styles.warn}`}>
              <div
                className={styles.bannerIcon}
                style={{
                  borderColor: "rgba(180, 83, 9, 0.16)",
                  color: "#b45309",
                }}
              >
                <AlertTriangle size={13} strokeWidth={2} />
              </div>
              <div>
                <strong>Publish request withdrawn.</strong> This {entity} is
                back in draft.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Page body ─── */}
      <main className={styles.pageBody}>
        <div className={styles.leftCol}>
          {/* Buyer & inquiry details */}
          <section className={styles.card}>
            <header className={styles.cardHead}>
              <div className={styles.cardHeadLeft}>
                <span className={styles.cardTitleIcon}>
                  <Building2 size={13} strokeWidth={2} />
                </span>
                <h2 className={styles.cardTitle}>Buyer &amp; inquiry details</h2>
              </div>
              {data.department_name && (
                <div className={styles.cardHeadRight}>
                  <span className={`${styles.pill} ${styles.outline}`}>
                    {data.department_name}
                  </span>
                </div>
              )}
            </header>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <div className={styles.detailKey}>Company</div>
                <div className={styles.detailValue}>
                  {data.company_name || (
                    <span className={styles.detailMuted}>Not set</span>
                  )}
                </div>
              </div>
              <div className={styles.detailCell}>
                <div className={styles.detailKey}>Business unit</div>
                <div className={styles.detailValue}>
                  {data.hotel_name || (
                    <span className={styles.detailMuted}>Not set</span>
                  )}
                </div>
              </div>
              <div className={styles.detailCell}>
                <div className={styles.detailKey}>Department</div>
                <div className={styles.detailValue}>
                  {data.department_name || (
                    <span className={styles.detailMuted}>Not set</span>
                  )}
                </div>
              </div>

              <div className={styles.detailCell}>
                <div className={styles.detailKey}>Contact person</div>
                <div className={styles.detailValue}>
                  {data.contact_name || (
                    <span className={styles.detailMuted}>—</span>
                  )}
                </div>
              </div>
              <div className={styles.detailCell}>
                <div className={styles.detailKey}>Email</div>
                <div
                  className={`${styles.detailValue} ${styles.mono}`}
                  style={{ fontSize: 12, wordBreak: "break-all" }}
                >
                  {data.response_email || (
                    <span className={styles.detailMuted}>—</span>
                  )}
                </div>
              </div>
              <div className={styles.detailCell}>
                <div className={styles.detailKey}>Phone</div>
                <div className={`${styles.detailValue} ${styles.mono}`}>
                  {data.contact_number || (
                    <span className={styles.detailMuted}>—</span>
                  )}
                </div>
              </div>

              <div className={styles.detailCell}>
                <div className={styles.detailKey}>
                  {isTender ? "Publish date" : "Created"}
                </div>
                <div className={`${styles.detailValue} ${styles.mono}`}>
                  {data.tender_publish_date
                    ? fmtDateTime(data.tender_publish_date)
                    : fmtDateTime(data.timestamp)}
                </div>
              </div>
              <div className={styles.detailCell}>
                <div className={styles.detailKey}>Clarification window</div>
                <div className={`${styles.detailValue} ${styles.mono}`}>
                  {data.vendor_clarification_date
                    ? fmtDateTime(data.vendor_clarification_date)
                    : "—"}
                </div>
              </div>
              <div className={styles.detailCell}>
                <div className={styles.detailKey}>Quote deadline</div>
                <div className={`${styles.detailValue} ${styles.mono}`}>
                  {data.bid_end_date ? fmtDateTime(data.bid_end_date) : "—"}
                </div>
              </div>

              <div className={`${styles.detailCell} ${styles.detailCellSpan2}`}>
                <div className={styles.detailKey}>Delivery location</div>
                <div className={styles.detailValue}>
                  {data.location || (
                    <span className={styles.detailMuted}>Not specified</span>
                  )}
                </div>
              </div>
              <div className={styles.detailCell}>
                <div className={styles.detailKey}>Reverse auction</div>
                <div className={`${styles.detailValue} ${styles.mono}`}>
                  {data.reverse_auction === 1 && data.ra_start_date ? (
                    <>
                      <span>{fmtDate(data.ra_start_date)}</span>
                      {data.ra_end_date && (
                        <div className={styles.detailSub}>
                          to {fmtDate(data.ra_end_date)}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className={styles.detailMuted}>Not configured</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Products requested */}
          <section className={styles.card}>
            <header className={styles.cardHead}>
              <div className={styles.cardHeadLeft}>
                <span className={styles.cardTitleIcon}>
                  <Box size={13} strokeWidth={2} />
                </span>
                <h2 className={styles.cardTitle}>Products requested</h2>
                <span className={styles.pill}>
                  {products.length} product{products.length === 1 ? "" : "s"}
                </span>
              </div>
            </header>

            {products.length === 0 ? (
              <div className={styles.emptyState}>
                No products on this {entity.toLowerCase()}.
              </div>
            ) : (
              <div>
                {products.map((p, i) => (
                  <ProductCard
                    key={p?.id || `p-${i}`}
                    product={p}
                    index={i}
                    techEval={techEvalByProduct[p?.id]}
                    techEvalLoading={!!techEvalLoading[p?.id]}
                    negRounds={negRoundsByProduct[p?.id]}
                    negLoading={!!negLoading[p?.id]}
                    onOpenNegotiation={openNegotiation}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Terms & Conditions */}
          <section className={styles.card}>
            <header className={styles.cardHead}>
              <div className={styles.cardHeadLeft}>
                <span className={styles.cardTitleIcon}>
                  <ShieldCheck size={13} strokeWidth={2} />
                </span>
                <h2 className={styles.cardTitle}>Terms &amp; conditions</h2>
                <span className={styles.pill}>
                  {terms.length} clause{terms.length === 1 ? "" : "s"}
                </span>
              </div>
              {termFile && (
                <div className={styles.cardHeadRight}>
                  <a
                    href={termFile}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.fileChip}
                    id="view_terms_conditions_file-terms_section-view_rfq_page"
                  >
                    <Download
                      size={11}
                      className={styles.fileChipIcon}
                      strokeWidth={2}
                    />
                    T&amp;C file
                  </a>
                </div>
              )}
            </header>

            <div className={styles.cardSection}>
              {terms.length === 0 ? (
                <div className={styles.emptyState}>
                  No terms attached to this {entity.toLowerCase()}.
                </div>
              ) : (
                <div className={styles.termsList}>
                  {terms.map((t, i) => (
                    <div key={t?.id || i} className={styles.termItem}>
                      <span className={styles.termNum}></span>
                      <div className={styles.termText}>
                        {t?.term_content || t?.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {additionalTerms && (
                <>
                  <div
                    className={styles.additionalTermsLabel}
                    style={{ marginTop: 14 }}
                  >
                    Additional notes
                  </div>
                  <div className={styles.additionalTerms}>
                    {additionalTerms}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Action bar — secondary bottom-of-page actions for status states that
              don't render a primary CTA in the header (closed, withdrawn). */}
          {rfqStatus === 2 && (
            <div className={styles.actionsBar}>
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip id={`close-info-${data?.id || "x"}`}>
                    {data?.close_comment || `${entity} has been closed`}
                  </Tooltip>
                }
              >
                <span className="d-inline-block">
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    disabled
                    style={{ pointerEvents: "none" }}
                    id="rfq_closed-rfq_status-view_rfq_page"
                  >
                    <Lock size={14} strokeWidth={2} />
                    {entity} is closed
                  </button>
                </span>
              </OverlayTrigger>
            </div>
          )}
        </div>

        {/* ─── Right column — lifecycle journey ─── */}
        <aside className={styles.rightCol}>
          <div className={styles.rightSticky}>
            {data?.id && (
              <div className={styles.journeyShell}>
                <RFQLifecycleJourneyV2
                  rfqId={data.id}
                  isTender={isTender}
                  closed={rfqStatus === 2}
                />
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Edit history modal */}
      {data?.id && (
        <RFQEditHistory
          rfqId={data.id}
          isOpen={showEditHistoryModal}
          onClose={() => setShowEditHistoryModal(false)}
        />
      )}

      {/* Negotiation rounds history — opened from a product's neg card.
          Custom minimal-theme modal matching the details page. */}
      <NegotiationRoundsModal
        open={negModal.open}
        onClose={() => setNegModal((m) => ({ ...m, open: false }))}
        rounds={negModal.rounds}
        productName={negModalProductName}
      />
    </div>
  );
};

export default ViewRFQ;
