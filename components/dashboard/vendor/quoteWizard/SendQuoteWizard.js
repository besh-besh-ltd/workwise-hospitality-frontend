/* ────────────────────────────────────────────────────────────
   SendQuoteWizard — vendor-side 3-step quote submission flow.
   Renders at /dashboard/vendor/quote and replaces the legacy
   /dashboard/vendor/send-quote experience.
   ──────────────────────────────────────────────────────────── */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Building2, ClipboardCheck, FileText, Clock, Send, Download, X,
  Plus, Trash2, ArrowRight, ArrowLeft, Copy, History,
  Check, Layers, MessageSquare, DollarSign,
} from "lucide-react";

import {
  getRFQById,
  sendQuotation,
  updateQuotation,
  fetchVendorAgreement,
  getClausesByRfqProductId,
  addVendorAgreement,
  fetchQuoteHistory,
  handleUploadFile,
} from "@/services/rfq";
import { getAllActiveNegotiationRounds } from "@/services/negotiation";
import { checkBidExpired } from "@/utils/sharedFunctions";
import usePreviewTotals from "@/hooks/usePreviewTotals";
import RegretQuoteReasonModal from "@/components/modal/RegretQuoteReasonModal";

import styles from "./SendQuoteWizard.module.scss";
import {
  buildInitialQuoteProducts,
  diffPaymentTerms,
  fmtINR,
  fmtShortDate,
  generateReference,
  genLocalId,
  sumPaymentTerms,
} from "./helpers";

const ALL_STEPS = [
  { id: "overview", label: "Inquiry overview", meta: "Buyer, products & terms" },
  { id: "eval", label: "Technical evaluation", meta: "Specs & clause responses" },
  { id: "pricing", label: "Pricing & submit", meta: "Quote totals & commercials" },
];

const PAY_TYPE_OPTIONS = [
  { value: "advance", label: "Advance" },
  { value: "credit", label: "Credit" },
  { value: "other", label: "Other" },
];

const SendQuoteWizard = () => {
  const router = useRouter();
  const { id, token, type: pageType } = router.query;
  const userProfile = useSelector((s) => s.userProfile);

  /* ─────────────────────────── State ─────────────────────────── */
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // step 1
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // step 2 — tech eval clauses keyed by `${product.id}.${clause.id}`
  // Shape: { response: 'agree'|'disagree', comment: '', files: [] }
  const [techClauses, setTechClauses] = useState({}); // { [productId]: Array<clause> }
  const [techResponses, setTechResponses] = useState({}); // { [productId]: { [clauseId]: {...} } }
  const [techLoading, setTechLoading] = useState(false);
  const [techSubmitted, setTechSubmitted] = useState({}); // { [productId]: true } — already submitted to backend

  // step 3 — line items + commercials
  const [products, setProducts] = useState([]);
  const [vendorGSTIN, setVendorGSTIN] = useState("");
  const [globalComment, setGlobalComment] = useState("");
  const [paymentTerms, setPaymentTerms] = useState([
    { id: null, type: "advance", value: 50, days: "", comment: "" },
    { id: null, type: "credit", value: 50, days: 30, comment: "" },
  ]);
  const originalPaymentTermsRef = useRef([]);
  const [alreadyQuoted, setAlreadyQuoted] = useState(false);

  // Global charges (apply on the grand total / PO value, not on a single line)
  const [globalCharges, setGlobalCharges] = useState([]);
  const [globalChargesModalOpen, setGlobalChargesModalOpen] = useState(false);

  // Edit eligibility + negotiation
  const [isBidExpired, setIsBidExpired] = useState(false);
  // keyed by rfq_product_id → array of { name, targetPrice, demand, mode }
  const [negotiationFields, setNegotiationFields] = useState({});
  const [negotiationLoading, setNegotiationLoading] = useState(false);

  // Charges modal
  const [chargesOpenIdx, setChargesOpenIdx] = useState(null);

  // History modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Regret
  const [regretOpen, setRegretOpen] = useState(false);

  // Submitted confirmation
  const [submittedRef, setSubmittedRef] = useState(null);
  const [submittedAt, setSubmittedAt] = useState("");

  /* ─────────────────────────── Derived ─────────────────────────── */
  // Backend-engine pricing preview. Sent on every change (debounced 300ms) so
  // what the vendor sees here is exactly what the server will compute on
  // submit — no duplicated math in the frontend.
  const previewDraft = useMemo(() => {
    const coerceAmount = (v) => {
      if (v === "" || v == null) return 0;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      items: products.map((p) => ({
        unit_price: coerceAmount(p.unit_price),
        quantity: coerceAmount(p.qty),
        tax: coerceAmount(p.tax),
        tax_mode: p.tax_mode || "percentage",
        other_charges: (p.other_charges || [])
          .filter((c) => c.name && c.name.trim())
          .map((c) => ({
            name: c.name,
            amount: coerceAmount(c.amount),
            amount_mode: c.amount_mode || "percentage",
            tax: c.tax == null || c.tax === "" ? null : coerceAmount(c.tax),
            tax_mode: c.tax_mode || "percentage",
          })),
      })),
      global_charges: globalCharges
        .filter((c) => c.name && c.name.trim())
        .map((c) => ({
          name: c.name,
          amount: coerceAmount(c.amount),
          amount_mode: c.amount_mode || "percentage",
        })),
    };
  }, [products, globalCharges]);

  // 600ms debounce — pauses long enough that fast keystrokes (e.g. typing
  // "400") collapse into a single API call after the user stops.
  const { totals: pricingTotals, isLoading: pricingLoading } = usePreviewTotals(
    previewDraft,
    { debounceMs: 600 }
  );

  // Sync engine-computed per-line totals back into product state so display
  // helpers (line foot, badges) keep working off `p.total_price`.
  useEffect(() => {
    if (!pricingTotals?.lines) return;
    setProducts((prev) => {
      let changed = false;
      const next = prev.map((p, idx) => {
        const newTotal = pricingTotals.lines[idx]?.total ?? 0;
        if (Number(p.total_price) === newTotal) return p;
        changed = true;
        return { ...p, total_price: newTotal };
      });
      return changed ? next : prev;
    });
  }, [pricingTotals]);

  // Derive hero-summary breakdown from engine response. Per-charge tax is
  // bundled into each bucket so the UI can show it as a sub-row of the charge.
  const totals = useMemo(() => {
    if (!pricingTotals?.lines) {
      return { subtotal: 0, gst: 0, extraCharges: [], globalCharges: [], globalChargesTotal: 0, grand: 0 };
    }
    let subtotal = 0;
    let baseTax = 0;
    const chargeBuckets = {};
    pricingTotals.lines.forEach((line) => {
      subtotal += Number(line.base) || 0;
      baseTax += Number(line.base_tax) || 0;
      (line.charges || []).forEach((c) => {
        const name = c.name || "Other";
        if (!chargeBuckets[name]) chargeBuckets[name] = { amount: 0, tax: 0 };
        chargeBuckets[name].amount += Number(c.subtotal) || 0;
        chargeBuckets[name].tax += Number(c.tax) || 0;
      });
    });
    const extraCharges = Object.entries(chargeBuckets).map(([label, v]) => ({
      label,
      amount: v.amount,
      tax: v.tax,
    }));
    const engineGlobals = (pricingTotals.global_charges || []).map((g) => ({
      label: g.name,
      amount: Number(g.subtotal) || Number(g.amount) || 0,
    }));
    return {
      subtotal,
      gst: baseTax,
      extraCharges,
      globalCharges: engineGlobals,
      globalChargesTotal: Number(pricingTotals.global_charges_total) || 0,
      grand: Number(pricingTotals.grand_total) || 0,
    };
  }, [pricingTotals]);
  const paymentTotal = useMemo(() => sumPaymentTerms(paymentTerms), [paymentTerms]);

  const evalProducts = useMemo(
    () => products.filter((p) => p.has_tech_eval),
    [products]
  );
  const hasTechEval = evalProducts.length > 0;
  const visibleSteps = useMemo(
    () => (hasTechEval ? ALL_STEPS : ALL_STEPS.filter((s) => s.id !== "eval")),
    [hasTechEval]
  );
  const currentStepId = visibleSteps[currentStep]?.id || "overview";
  const evalTotalClauses = useMemo(
    () => Object.values(techClauses).reduce((n, arr) => n + (arr?.length || 0), 0),
    [techClauses]
  );
  const evalAnswered = useMemo(() => {
    let n = 0;
    Object.entries(techClauses).forEach(([pid, list]) => {
      (list || []).forEach((c) => {
        const r = techResponses[pid]?.[c.id];
        if (r?.response) n++;
      });
    });
    return n;
  }, [techClauses, techResponses]);
  const evalProgress = evalTotalClauses === 0
    ? 100
    : Math.round((evalAnswered / evalTotalClauses) * 100);

  /* ───────── Gating ───────── */
  const evalGateOk = useMemo(() => {
    if (evalProducts.length === 0) return true;
    if (evalAnswered !== evalTotalClauses) return false;
    // disagree requires comment
    for (const pid of Object.keys(techClauses)) {
      const list = techClauses[pid] || [];
      for (const c of list) {
        const r = techResponses[pid]?.[c.id];
        if (r?.response === "disagree" && !(r.comment || "").trim()) return false;
      }
    }
    return true;
  }, [evalProducts.length, evalAnswered, evalTotalClauses, techClauses, techResponses]);

  const canContinueStep1 = acceptedTerms;
  const canContinueStep2 = evalGateOk;
  const canSubmit = useMemo(() => {
    if (!products.length) return false;
    // At least one product must have base price + delivery; payment terms valid.
    const anyPriced = products.some(
      (p) => (parseFloat(p.unit_price) || 0) > 0 && (parseInt(p.delivery_period) || 0) > 0
    );
    const validPayment =
      paymentTotal === 100 &&
      paymentTerms
        .filter((t) => t.action !== "delete")
        .every((t) => t.type && (Number(t.value) || 0) > 0);
    return anyPriced && validPayment;
  }, [products, paymentTotal, paymentTerms]);

  const canVisit = (i) => {
    if (i <= currentStep) return true;
    const targetId = visibleSteps[i]?.id;
    if (targetId === "eval") return acceptedTerms;
    if (targetId === "pricing") return acceptedTerms && evalGateOk;
    return false;
  };

  /* ───────── Edit eligibility ───────── */
  // Per-product negotiable check
  const hasAnyNegotiation = Object.keys(negotiationFields).length > 0;
  const allFinalizedOther = products.length > 0 &&
    products.every((p) => p.finalization_status === "Another vendor is finalized");
  const allFinalizedYou = products.length > 0 &&
    products.every((p) => p.finalization_status === "You are finalized");
  const anyFinalizedYou = products.some((p) => p.finalization_status === "You are finalized");

  const editStatus = (() => {
    if (allFinalizedYou) {
      return {
        kind: "success",
        title: "You've been finalized for this RFQ",
        body: "Congratulations — the buyer has finalized your quote. No further edits are needed.",
        canEdit: false,
      };
    }
    if (allFinalizedOther) {
      return {
        kind: "danger",
        title: "Another vendor was finalized",
        body: "The buyer has finalized another vendor for this RFQ. You can no longer edit your quote.",
        canEdit: false,
      };
    }
    if (isBidExpired && hasAnyNegotiation) {
      return {
        kind: "info",
        title: "Negotiation round in progress — you're invited",
        body: `The bid deadline has passed, but you've been invited to a negotiation round on ${Object.keys(negotiationFields).length} product(s). The buyer's target asks are highlighted on each line.`,
        canEdit: true,
      };
    }
    if (isBidExpired) {
      return {
        kind: "warn",
        title: "Bid window closed",
        body: `The bid deadline ${rfq?.bid_end_date ? `(${fmtShortDate(rfq.bid_end_date, { includeTime: true })}) ` : ""}has passed. Your quote is now read-only.`,
        canEdit: false,
      };
    }
    if (alreadyQuoted) {
      return {
        kind: "info",
        title: "You can update your quote",
        body: `Your existing quote is editable until the deadline${rfq?.bid_end_date ? ` on ${fmtShortDate(rfq.bid_end_date, { includeTime: true })}` : ""}. Any changes you submit will replace your previous values.`,
        canEdit: true,
      };
    }
    return { kind: "info", title: "", body: "", canEdit: true };
  })();
  const isReadOnly = !editStatus.canEdit;

  /* ─────────────────────────── Data load ─────────────────────────── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    getRFQById(id, token)
      .then(async (res) => {
        if (cancelled) return;
        const data = res?.data;
        if (!data) {
          toast.error("Inquiry not found.");
          return;
        }
        setRfq(data);

        const built = buildInitialQuoteProducts(data);
        setProducts(built);

        const hasQuote = (data.quotations || []).length > 0;
        setAlreadyQuoted(hasQuote);
        if (hasQuote) {
          // Prefill payment terms + GSTIN + global comment from existing quote
          const qd = data.quote_details || {};
          if (qd.gstin) setVendorGSTIN(qd.gstin);
          if (qd.global_comment) setGlobalComment(qd.global_comment);
          const pts = data.quotations[0]?.payment_terms || [];
          if (pts.length) {
            setPaymentTerms(pts.map((t) => ({ ...t })));
            originalPaymentTermsRef.current = pts.map((t) => ({ ...t }));
          }
          // Prefill global charges from existing quote
          const gc = qd.global_charges || data.quotations[0]?.global_charges || [];
          if (Array.isArray(gc) && gc.length) {
            setGlobalCharges(
              gc.map((c) => ({
                _id: genLocalId("gc"),
                name: c.name || "",
                amount: parseFloat(c.amount ?? c.tax ?? 0) || 0,
                amount_mode: c.amount_mode || c.tax_mode || "percentage",
                comment: c.comment || "",
              }))
            );
          }
          // Already-quoted vendors usually only re-visit pricing step
          setAcceptedTerms(true);
        }

        // Preload tech-eval clauses & responses for each product that has eval
        const evalable = built.filter((p) => p.has_tech_eval);
        if (evalable.length > 0) {
          setTechLoading(true);
          await Promise.all(
            evalable.map(async (p) => {
              try {
                const clausesRes = await getClausesByRfqProductId({
                  rfq_product_id: p.id,
                  vendor_id: userProfile?.id,
                });
                const list = clausesRes?.data || [];
                if (cancelled) return;
                setTechClauses((prev) => ({ ...prev, [p.id]: list }));

                // existing vendor responses
                try {
                  const respRes = await fetchVendorAgreement({
                    rfq_id: parseInt(id),
                    rfq_product_id: p.id,
                    vendor_id: userProfile?.id,
                  });
                  const responses = {};
                  (respRes?.data || []).forEach((r) => {
                    if (r.clause_id) {
                      responses[r.clause_id] = {
                        response:
                          r.vendor_response === "agree"
                            ? "agree"
                            : r.vendor_response === "disagree"
                            ? "disagree"
                            : null,
                        comment: r.deviation_text || r.comment || "",
                        files: r.vendor_response_files || [],
                      };
                    }
                  });
                  if (!cancelled && Object.keys(responses).length) {
                    setTechResponses((prev) => ({ ...prev, [p.id]: responses }));
                    setTechSubmitted((prev) => ({ ...prev, [p.id]: true }));
                  }
                } catch (_) {
                  /* swallow — clause-only state is fine */
                }
              } catch (e) {
                console.error("Failed to load clauses for product", p.id, e);
              }
            })
          );
          if (!cancelled) setTechLoading(false);
        }

        // If already quoted (update mode) — jump straight to pricing.
        // Pricing index is dynamic: 2 if tech-eval present, else 1.
        if (hasQuote) {
          const hasEvalAtLoad = built.some((p) => p.has_tech_eval);
          setCurrentStep(hasEvalAtLoad ? 2 : 1);
        }

        // Edit eligibility: check bid expiry + active negotiation rounds
        const expired = data.bid_end_date ? checkBidExpired(data.bid_end_date) : false;
        if (!cancelled) setIsBidExpired(expired);
        if (expired) {
          setNegotiationLoading(true);
          try {
            const resp = await getAllActiveNegotiationRounds(parseInt(id), token);
            const now = new Date();
            const activeRounds = (resp?.data || []).filter((r) => {
              if (r.status !== "ACTIVE" || !r.end_date) return false;
              const endStr =
                r.end_date.includes("+") || r.end_date.includes("Z")
                  ? r.end_date
                  : r.end_date.replace(" ", "T") + "Z";
              return new Date(endStr) > now;
            });
            const fieldsByProduct = {};
            activeRounds.forEach((r) => {
              const myApproval = (r.vendor_approvals || [])[0];
              if (!myApproval?.negotiation_fields) return;
              fieldsByProduct[r.rfq_product_id] = myApproval.negotiation_fields.map((f) => ({
                name: f.name,
                targetPrice: f.target || f.target_price,
                demand: f.demand || null,
                mode: f.mode || null,
              }));
            });
            if (!cancelled) setNegotiationFields(fieldsByProduct);
          } catch (e) {
            console.error("Failed to load negotiation rounds", e);
          } finally {
            if (!cancelled) setNegotiationLoading(false);
          }
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load inquiry. Please retry.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, userProfile?.id]);

  /* ─────────────────────────── Mutators ─────────────────────────── */
  const updateProduct = (idx, patch) => {
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const updateProductCharge = (pIdx, cIdx, patch) => {
    setProducts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const charges = [...(p.other_charges || [])];
        charges[cIdx] = { ...charges[cIdx], ...patch };
        return { ...p, other_charges: charges };
      })
    );
  };

  const addProductCharge = (pIdx, name = "") => {
    setProducts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        return {
          ...p,
          other_charges: [
            ...(p.other_charges || []),
            {
              _id: genLocalId("oc"),
              name,
              slug: name.toLowerCase().replace(/\s+/g, "_"),
              amount: 0,
              amount_mode: "percentage",
              // null = inherit base rate (tri-state). Vendor types 0 to mean "no tax on this charge".
              tax: null,
              tax_mode: "percentage",
              comment: "",
            },
          ],
        };
      })
    );
  };

  const removeProductCharge = (pIdx, cIdx) => {
    setProducts((prev) =>
      prev.map((p, i) => {
        if (i !== pIdx) return p;
        const charges = [...(p.other_charges || [])];
        charges.splice(cIdx, 1);
        return { ...p, other_charges: charges };
      })
    );
  };

  const setClauseResponse = (productId, clauseId, response) => {
    setTechResponses((prev) => {
      const cur = prev[productId]?.[clauseId] || {};
      return {
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [clauseId]: { ...cur, response },
        },
      };
    });
  };
  const setClauseComment = (productId, clauseId, comment) => {
    setTechResponses((prev) => {
      const cur = prev[productId]?.[clauseId] || {};
      return {
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [clauseId]: { ...cur, comment },
        },
      };
    });
  };
  const addClauseFile = async (productId, clauseId, file) => {
    if (!file) return;
    try {
      const res = await handleUploadFile(file, token);
      const url = res?.data?.[0]?.file_path;
      if (!url) throw new Error("Upload failed");
      setTechResponses((prev) => {
        const cur = prev[productId]?.[clauseId] || {};
        return {
          ...prev,
          [productId]: {
            ...(prev[productId] || {}),
            [clauseId]: { ...cur, files: [...(cur.files || []), url] },
          },
        };
      });
    } catch (e) {
      toast.error("File upload failed.");
    }
  };
  const removeClauseFile = (productId, clauseId, url) => {
    setTechResponses((prev) => {
      const cur = prev[productId]?.[clauseId] || {};
      return {
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [clauseId]: { ...cur, files: (cur.files || []).filter((u) => u !== url) },
        },
      };
    });
  };

  /* ─────────────────────────── Payment terms ─────────────────────────── */
  const addPaymentTerm = () =>
    setPaymentTerms((prev) => [
      ...prev,
      { id: null, type: "advance", value: 0, days: "", comment: "" },
    ]);
  const updatePaymentTerm = (i, patch) =>
    setPaymentTerms((prev) => prev.map((t, j) => (i === j ? { ...t, ...patch } : t)));
  const removePaymentTerm = (i) => {
    setPaymentTerms((prev) => {
      const next = [...prev];
      if (next[i].id) {
        next[i] = { ...next[i], action: "delete" };
      } else {
        next.splice(i, 1);
      }
      return next;
    });
  };

  /* ─────────────────────────── Submit tech-eval (per-product) ─────────────────────────── */
  const persistTechEvalForProduct = async (productId) => {
    const responses = techResponses[productId] || {};
    const payload = Object.entries(responses).map(([clauseId, r]) => ({
      rfq_id: parseInt(id),
      rfq_product_id: productId,
      clause_id: parseInt(clauseId),
      vendor_response: r.response,
      vendor_id: userProfile?.id,
      file_url: r.files || [],
      deviation_text: r.comment || "",
    }));
    if (!payload.length) return;
    await addVendorAgreement(payload);
    setTechSubmitted((prev) => ({ ...prev, [productId]: true }));
  };

  /* ─────────────────────────── Submit quote ─────────────────────────── */
  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Add prices, payment terms (sum to 100%), and delivery before submitting.");
      return;
    }
    if (!rfq) return;

    setSubmitting(true);

    try {
      // 1) Persist any pending tech-eval responses (one network call per product)
      const evalPromises = Object.keys(techResponses)
        .filter((pid) => !techSubmitted[pid])
        .map((pid) => persistTechEvalForProduct(pid));
      if (evalPromises.length) await Promise.all(evalPromises);

      // 2) Build submission payload (mirrors legacy send-quote contract)
      const filteredProducts = products
        .filter((p) => {
          // Skip finalized / locked products
          if (p.finalization_status === "Another vendor is finalized") return false;
          if (p.finalization_status === "You are finalized") return false;
          return true;
        })
        .map((p) => {
          // total_price comes from the engine via usePreviewTotals; backend
          // will recompute on save so this is purely advisory.
          const total = Number(p.total_price) || 0;

          return {
            id: p.id,
            product_id: p.product_id,
            variant: p.variant,
            quantity: p.qty,
            unit_price: parseFloat(p.unit_price) || 0,
            tax: parseFloat(p.tax) || 0,
            tax_mode: p.tax_mode || "percentage",
            total_price: total,
            comment: p.comment || "",
            delivery_period: parseInt(p.delivery_period) || 0,
            document_files: p.document_files || [],
            other_charges: (p.other_charges || [])
              .filter((c) => c.name && c.name.trim())
              .map((c) => ({
                name: c.name,
                slug: c.slug || c.name.toLowerCase().replace(/\s+/g, "_"),
                amount: parseFloat(c.amount) || 0,
                amount_mode: c.amount_mode || "percentage",
                // Per-charge GST. null = inherit product base rate.
                tax: c.tax == null || c.tax === "" ? null : parseFloat(c.tax),
                tax_mode: c.tax_mode || "percentage",
                comment: (c.comment || "").trim(),
                is_global: false,
              })),
          };
        });

      const basePayload = {
        rfq_id: rfq.id,
        rfq_no: rfq.rfq_no,
        status: 1,
        products: filteredProducts,
        globalPaymentTerms: "",
        globalComment,
        term_and_condition_files: [],
        vendorGSTIN,
        global_charges: globalCharges
          .filter((c) => c.name && c.name.trim())
          .map((c) => ({
            name: c.name,
            amount: parseFloat(c.amount) || 0,
            amount_mode: c.amount_mode || "percentage",
            comment: (c.comment || "").trim(),
          })),
      };

      if (alreadyQuoted) {
        const diff = diffPaymentTerms(paymentTerms, originalPaymentTermsRef.current);
        const updatePayload = {
          ...basePayload,
          global_payment_term_list: diff,
        };
        const quoteId = rfq.quotations[0]?.id;
        await updateQuotation(quoteId, updatePayload, token);
      } else {
        const insertPayload = {
          ...basePayload,
          global_payment_term_list: paymentTerms.filter((t) => t.action !== "delete"),
        };
        await sendQuotation(insertPayload, token);
      }

      // 3) Success
      setSubmittedRef(generateReference(rfq.rfq_no));
      setSubmittedAt(
        new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      toast.success("Quote submitted successfully");
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to submit quote. Please retry."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ─────────────────────────── History ─────────────────────────── */
  const openHistoryFor = async (productVariantId) => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetchQuoteHistory(productVariantId, token);
      setHistory(res?.data?.previous_quotes || res?.data || []);
    } catch (e) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ─────────────────────────── Regret ─────────────────────────── */
  const handleRegret = ({ reqret_reason }) => {
    if (!rfq) return;
    setSubmitting(true);
    const payload = {
      rfq_id: rfq.id,
      rfq_no: rfq.rfq_no,
      status: 1,
      products: products.map((p) => ({
        id: p.id,
        product_id: p.product_id,
        variant: p.variant,
        quantity: p.qty,
        unit_price: 0,
        total_price: 0,
        comment: "",
        delivery_period: "",
      })),
      is_regret: 1,
      regret_reason: reqret_reason,
      globalComment: "",
    };
    sendQuotation(payload, token)
      .then(() => {
        toast.success("Quote regretted. The buyer has been notified.");
        setRegretOpen(false);
        router.push(
          `/dashboard/vendor/inquiries-details?id=${id}${
            token !== undefined ? `&token=${token}` : ""
          }`
        );
      })
      .catch(() => toast.error("Failed to send regret. Please retry."))
      .finally(() => setSubmitting(false));
  };

  /* ─────────────────────────── Nav helpers ─────────────────────────── */
  const goToStep = (i) => {
    if (canVisit(i)) {
      setCurrentStep(i);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const nextStep = async () => {
    if (currentStepId === "eval") {
      // Persist any tech-eval responses opportunistically; don't block on failure.
      try {
        const pending = Object.keys(techResponses).filter((pid) => !techSubmitted[pid]);
        for (const pid of pending) await persistTechEvalForProduct(pid);
      } catch (e) {
        // Silently allow continue — they'll re-try on final submit too.
      }
    }
    if (currentStep < visibleSteps.length - 1) {
      const gateOk = currentStepId === "overview" ? canContinueStep1 : canContinueStep2;
      if (gateOk) {
        setCurrentStep((s) => s + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClose = () => {
    router.push(`/dashboard/vendor/inquiries-received`);
  };
  const handleBack = () => {
    router.push(`/dashboard/vendor/inquiries-received`);
  };

  /* ─────────────────────────── Render ─────────────────────────── */
  if (loading) {
    return <WizardSkeleton />;
  }

  if (!rfq) {
    return (
      <div className={styles.root}>
        <div className={styles.skeletonShell}>
          <div className={styles.alertDanger}>
            <span>This inquiry could not be loaded.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <HeaderStrip
        rfq={rfq}
        pageType={pageType}
        alreadyQuoted={alreadyQuoted}
        totalSteps={visibleSteps.length}
        onBack={handleBack}
      />

      <Stepper
        steps={visibleSteps}
        currentStep={currentStep}
        canVisit={canVisit}
        onStep={goToStep}
      />

      <main className={styles.content}>
        {currentStepId === "overview" && (
          <Step1Overview
            rfq={rfq}
            products={products}
            accepted={acceptedTerms}
            onToggleAccept={() => setAcceptedTerms((v) => !v)}
            alreadyQuoted={alreadyQuoted}
          />
        )}

        {currentStepId === "eval" && (
          <Step2TechEval
            evalProducts={evalProducts}
            allProducts={products}
            techClauses={techClauses}
            techResponses={techResponses}
            techLoading={techLoading}
            evalAnswered={evalAnswered}
            evalTotal={evalTotalClauses}
            evalProgress={evalProgress}
            onSetResponse={setClauseResponse}
            onSetComment={setClauseComment}
            onAddFile={addClauseFile}
            onRemoveFile={removeClauseFile}
            onOpenChat={() =>
              toast.info(
                "Buyer chat opens from the inquiry's Queries page — use the topbar Queries button."
              )
            }
          />
        )}

        {currentStepId === "pricing" && (
          <Step3Pricing
            rfq={rfq}
            products={products}
            totals={totals}
            pricingLoading={pricingLoading}
            paymentTerms={paymentTerms}
            paymentTotal={paymentTotal}
            globalComment={globalComment}
            vendorGSTIN={vendorGSTIN}
            globalCharges={globalCharges}
            onChangeGSTIN={setVendorGSTIN}
            onChangeGlobalComment={setGlobalComment}
            onUpdateProduct={updateProduct}
            onOpenCharges={(i) => setChargesOpenIdx(i)}
            onOpenGlobalCharges={() => setGlobalChargesModalOpen(true)}
            onAddPaymentTerm={addPaymentTerm}
            onUpdatePaymentTerm={updatePaymentTerm}
            onRemovePaymentTerm={removePaymentTerm}
            onOpenHistory={openHistoryFor}
            canSubmit={canSubmit}
            token={token}
            editStatus={editStatus}
            isReadOnly={isReadOnly}
            negotiationFields={negotiationFields}
          />
        )}
      </main>

      {!submittedRef && (
        <ActionBar
          currentStep={currentStep}
          currentStepId={currentStepId}
          totalSteps={visibleSteps.length}
          isLastStep={currentStep === visibleSteps.length - 1}
          canContinueStep1={canContinueStep1}
          canContinueStep2={canContinueStep2}
          canSubmit={canSubmit && !isReadOnly}
          evalAnswered={evalAnswered}
          evalTotal={evalTotalClauses}
          totals={totals}
          submitting={submitting}
          onPrev={prevStep}
          onNext={nextStep}
          onSubmit={handleSubmit}
          onRegret={() => setRegretOpen(true)}
          alreadyQuoted={alreadyQuoted}
          isReadOnly={isReadOnly}
        />
      )}

      {chargesOpenIdx !== null && (
        <ChargesModal
          product={products[chargesOpenIdx]}
          pIdx={chargesOpenIdx}
          onClose={() => setChargesOpenIdx(null)}
          onAddCharge={(name) => addProductCharge(chargesOpenIdx, name)}
          onUpdateCharge={(cIdx, patch) =>
            updateProductCharge(chargesOpenIdx, cIdx, patch)
          }
          onRemoveCharge={(cIdx) => removeProductCharge(chargesOpenIdx, cIdx)}
        />
      )}

      {globalChargesModalOpen && (
        <GlobalChargesModal
          charges={globalCharges}
          onClose={() => setGlobalChargesModalOpen(false)}
          onAddCharge={(name) =>
            setGlobalCharges((prev) => [
              ...prev,
              {
                _id: genLocalId("gc"),
                name,
                amount: 0,
                amount_mode: "percentage",
                comment: "",
              },
            ])
          }
          onUpdateCharge={(cIdx, patch) =>
            setGlobalCharges((prev) =>
              prev.map((c, i) => (i === cIdx ? { ...c, ...patch } : c))
            )
          }
          onRemoveCharge={(cIdx) =>
            setGlobalCharges((prev) => prev.filter((_, i) => i !== cIdx))
          }
        />
      )}

      {historyOpen && (
        <HistoryModal
          history={history}
          loading={historyLoading}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {regretOpen && (
        <RegretQuoteReasonModal
          showModal={regretOpen}
          closeModal={() => setRegretOpen(false)}
          handleRegretReason={handleRegret}
        />
      )}

      {submittedRef && (
        <SuccessModal
          rfq={rfq}
          totals={totals}
          products={products}
          submittedAt={submittedAt}
          submittedRef={submittedRef}
          onClose={handleClose}
        />
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Header strip
   ════════════════════════════════════════════════════════════════ */
const HeaderStrip = ({ rfq, pageType, alreadyQuoted, totalSteps, onBack }) => {
  const isTender = rfq?.is_tender === 1;
  const status = alreadyQuoted
    ? { label: "Existing quote · Update", dot: "warn" }
    : { label: "New inquiry · Active", dot: "" };
  const stepCopy = totalSteps === 2 ? "two quick steps" : "three quick steps";
  return (
    <section className={styles.headerStrip}>
      <div className={styles.headerInner}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <button type="button" className={styles.backBtn} onClick={onBack}>
            <ArrowLeft size={13} />
            Back to inquiries
          </button>
          <div className={styles.eyebrow}>
            <span className={`${styles.eyebrowDot} ${status.dot ? styles[status.dot] : ""}`} />
            {status.label}
          </div>
          <h1 className={styles.pageTitle}>
            Submit quote for {rfq?.company_name || "Buyer"}
          </h1>
          <p className={styles.pageSub}>
            Walk through {stepCopy} to{" "}
            {totalSteps === 2
              ? "acknowledge terms and price your items."
              : "acknowledge terms, respond to product evaluation, and price your items."}
          </p>
        </div>
        <div className={styles.headerMeta}>
          <span className={`${styles.pill} ${styles.outline}`}>
            <span className={styles.pdot} style={{ background: "var(--info)" }} />
            <span>{isTender ? "Tender" : "RFQ"}</span>
            <span className={styles.mono} style={{ color: "var(--fg)", fontWeight: 600 }}>
              #{rfq?.rfq_no}
            </span>
          </span>
          {rfq?.bid_end_date && (
            <span className={`${styles.pill} ${styles.warn}`}>
              <Clock size={12} />
              Deadline · {fmtShortDate(rfq.bid_end_date)}
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════════════════════════════
   Status banner — edit eligibility + negotiation invite
   ════════════════════════════════════════════════════════════════ */
const StatusBanner = ({ status }) => {
  const klass =
    status.kind === "success"
      ? styles.statusBannerSuccess
      : status.kind === "danger"
      ? styles.statusBannerDanger
      : status.kind === "warn"
      ? styles.statusBannerWarn
      : styles.statusBannerInfo;
  return (
    <div className={`${styles.statusBanner} ${klass}`}>
      <div className={styles.statusBannerDot} />
      <div className={styles.statusBannerBody}>
        <div className={styles.statusBannerTitle}>{status.title}</div>
        <div className={styles.statusBannerText}>{status.body}</div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Stepper
   ════════════════════════════════════════════════════════════════ */
const Stepper = ({ steps, currentStep, canVisit, onStep }) => (
  <nav className={styles.stepper} aria-label="Progress">
    {steps.map((s, i) => {
      const isActive = currentStep === i;
      const isDone = currentStep > i;
      const disabled = !canVisit(i) && !isActive && !isDone;
      return (
        <React.Fragment key={s.id}>
          <button
            type="button"
            className={`${styles.step} ${isActive ? styles.stepActive : ""} ${
              isDone ? styles.stepDone : ""
            }`}
            disabled={disabled}
            onClick={() => onStep(i)}
          >
            <div className={styles.stepNum}>
              <span className={styles.stepNumText}>{i + 1}</span>
            </div>
            <div className={styles.stepLabelWrap}>
              <div className={styles.stepLabel}>{s.label}</div>
              <div className={styles.stepMeta}>{s.meta}</div>
            </div>
          </button>
          {i < steps.length - 1 && <div className={styles.stepDivider} />}
        </React.Fragment>
      );
    })}
  </nav>
);

/* ════════════════════════════════════════════════════════════════
   Step 1 — Overview & Terms
   ════════════════════════════════════════════════════════════════ */
const Step1Overview = ({ rfq, products, accepted, onToggleAccept, alreadyQuoted }) => {
  const terms = rfq?.terms || [];
  const additionalRaw = rfq?.comment || "";

  return (
    <div className={styles.stepPane}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Inquiry overview</div>
          <div className={styles.sectionSub}>
            Review who's asking, what they need, and the terms you'll be agreeing to.
          </div>
        </div>
        <span className={`${styles.pill} ${rfq.is_tender === 1 ? styles.info : ""}`}>
          <span className={styles.pdot} style={{ background: "var(--info)" }} />
          {rfq.is_tender === 1 ? "Tender" : "RFQ"} · {alreadyQuoted ? "Update mode" : "Sealed bid"}
        </span>
      </div>

      {/* Buyer details */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h3>
            <Building2 size={14} />
            Buyer details
          </h3>
          {rfq.company_name && (
            <span className={styles.cardHeadCount}>
              {rfq.company_name}
              {rfq.hotel_name ? ` · ${rfq.hotel_name}` : ""}
            </span>
          )}
        </div>
        <div className={styles.detailGrid}>
          <DetailCell label="Company" value={rfq.company_name} />
          <DetailCell label="Business unit" value={rfq.hotel_name} />
          <DetailCell label="Department" value={rfq.department_name} />
          <DetailCell label="Contact person" value={rfq.contact_name} />
          <DetailCell label="Email" value={rfq.response_email} mono />
          <DetailCell label="Phone" value={rfq.contact_number} mono />
          <DetailCell label="Delivery location" value={rfq.location} />
          <DetailCell
            label="Quote deadline"
            value={
              rfq.bid_end_date ? (
                <>
                  <span className={styles.mono}>{fmtShortDate(rfq.bid_end_date)}</span>
                  <span style={{ color: "var(--fg-4)", fontWeight: 400, fontSize: 12.5 }}>
                    {" "}
                    · {new Date(rfq.bid_end_date).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              ) : (
                "—"
              )
            }
          />
          {rfq.ra_start_date && (
            <DetailCell
              label="Reverse auction"
              value={
                <>
                  <span className={styles.mono}>{fmtShortDate(rfq.ra_start_date)}</span>
                  <span style={{ color: "var(--fg-4)", fontWeight: 400, fontSize: 12.5 }}>
                    {" → "}
                  </span>
                  <span className={styles.mono}>{fmtShortDate(rfq.ra_end_date)}</span>
                </>
              }
            />
          )}
        </div>
      </div>

      {/* What you're quoting */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <div className={styles.cardHead}>
          <h3>
            <Layers size={14} />
            What you're quoting
          </h3>
          <span className={styles.cardHeadCount}>
            {products.length} product{products.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className={styles.cardSection} style={{ padding: "8px 22px" }}>
          {products.map((p, idx) => (
            <div
              className={styles.previewRow}
              key={p.id}
              style={idx > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
            >
              <div className={styles.previewLeft}>
                <div className={styles.previewIcon}>
                  <Layers size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className={styles.previewName}>{p.product_name}</div>
                  {(() => {
                    const parts = [p.size, p.detailedSpec].filter(
                      (s) => s && String(s).trim()
                    );
                    if (parts.length === 0) {
                      return (
                        <div className={`${styles.previewSpec} ${styles.previewSpecMuted}`}>
                          No additional information
                        </div>
                      );
                    }
                    return (
                      <div className={styles.previewSpec} title={parts.join(" · ")}>
                        {parts.join(" · ")}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className={styles.previewRight}>
                <div style={{ textAlign: "right" }}>
                  <div className={styles.previewQtyLbl}>Quantity</div>
                  <div className={`${styles.mono} ${styles.previewQty}`}>
                    {p.qty} {p.unit}
                  </div>
                </div>
                {p.has_tech_eval && (
                  <span className={styles.pill}>
                    <Check size={10} strokeWidth={2.5} />
                    Tech evaluation required
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <div className={styles.cardHead}>
          <h3>
            <FileText size={14} />
            Terms &amp; conditions
          </h3>
          <span className={styles.cardHeadCount}>
            {terms.length} clause{terms.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className={styles.cardSection}>
          {terms.length === 0 ? (
            <div className={styles.termsEmpty}>
              No predefined terms — submit your quote against the buyer's
              additional terms below (if any).
            </div>
          ) : (
            <div className={styles.termsList}>
              {terms.map((t, i) => {
                const text =
                  t.term_content || t.name || t.content?.[0]?.title || "Term";
                return (
                  <div className={styles.termItem} key={t.id || i}>
                    <span className={styles.termNum} />
                    <div className={styles.termText}>{text}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {additionalRaw && additionalRaw.replace(/<[^>]*>/g, "").trim() && (
          <div className={`${styles.cardSection} ${styles.additionalTerms}`}>
            <div className={styles.lbl}>Additional terms</div>
            <div
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: additionalRaw }}
            />
          </div>
        )}
      </div>

      <label
        className={`${styles.check} ${accepted ? styles.checked : ""}`}
        onClick={(e) => {
          e.preventDefault();
          onToggleAccept();
        }}
      >
        <span className={styles.checkBox} />
        <div className={styles.checkBody}>
          <div className={styles.checkTitle}>
            I have read and accept the terms &amp; conditions above.
          </div>
          <div className={styles.checkDesc}>
            By checking this, you confirm that any quote you submit will follow
            these terms. You can review them again before submitting.
          </div>
        </div>
      </label>
    </div>
  );
};

const DetailCell = ({ label, value, mono = false }) => (
  <div className={styles.detailCell}>
    <div className={styles.k}>{label}</div>
    <div className={`${styles.v} ${mono ? styles.mono : ""}`}>
      {value || <span style={{ color: "var(--fg-4)", fontWeight: 400 }}>—</span>}
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════
   Step 2 — Technical evaluation
   ════════════════════════════════════════════════════════════════ */
const Step2TechEval = ({
  evalProducts,
  allProducts,
  techClauses,
  techResponses,
  techLoading,
  evalAnswered,
  evalTotal,
  evalProgress,
  onSetResponse,
  onSetComment,
  onAddFile,
  onRemoveFile,
}) => {
  if (techLoading) {
    return (
      <div className={styles.stepPane}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.sectionTitle}>Technical evaluation</div>
            <div className={styles.sectionSub}>Loading clauses…</div>
          </div>
        </div>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>
    );
  }

  if (!evalProducts.length) {
    return (
      <div className={styles.stepPane}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.sectionTitle}>Technical evaluation</div>
            <div className={styles.sectionSub}>
              No technical evaluation required for this inquiry. Continue to pricing.
            </div>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.evalEmpty}>
            Nothing to respond to — all products in this inquiry skip tech evaluation.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stepPane}>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>
            Product specifications &amp; technical evaluation
          </div>
          <div className={styles.sectionSub}>
            For each product, review what's being asked for and answer all
            evaluation clauses. You'll quote pricing in the next step.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", width: "100%" }}>
            <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 500 }}>
              Evaluation progress
            </span>
            <span className={styles.mono} style={{ fontSize: 12, color: "var(--fg)" }}>
              {evalAnswered} of {evalTotal}
            </span>
          </div>
          <div className={styles.bar} style={{ width: "100%" }}>
            <div className={styles.barFill} style={{ width: `${evalProgress}%` }} />
          </div>
        </div>
      </div>

      {evalProducts.map((p, pidx) => {
        const clauses = techClauses[p.id] || [];
        const answered = clauses.filter(
          (c) => techResponses[p.id]?.[c.id]?.response
        ).length;

        return (
          <div className={styles.productCard} key={p.id}>
            {/* Head */}
            <div className={styles.productHead}>
              <div>
                <div className={styles.productName}>
                  <span className={styles.productIdx}>
                    {String(pidx + 1).padStart(2, "0")}
                  </span>
                  {p.product_name}
                </div>
                <div className={styles.productSpec}>
                  {p.detailedSpec || p.product_description || "—"}
                </div>
                <div className={styles.productMetaRow}>
                  {p.datasheet_file && (
                    <a className={styles.fileChip} href={p.datasheet_file} target="_blank" rel="noopener">
                      <Download size={11} />
                      TDS · datasheet
                    </a>
                  )}
                  {p.qap_file && (
                    <a className={styles.fileChip} href={p.qap_file} target="_blank" rel="noopener">
                      <Download size={11} />
                      QAP · quality plan
                    </a>
                  )}
                </div>
              </div>
              <div className={styles.qtyBlock}>
                <div className={styles.qtyLbl}>Quantity required</div>
                <div className={`${styles.qtyVal} ${styles.mono}`}>{p.qty}</div>
                <div className={styles.qtyUnit}>{p.unit}</div>
              </div>
            </div>

            {/* Spec details */}
            {p.size && (
              <div className={styles.kvRow}>
                <div className={styles.kvK}>Size</div>
                <div className={styles.kvV}>{p.size}</div>
              </div>
            )}
            {p.detailedSpec && (
              <div className={styles.kvRow}>
                <div className={styles.kvK}>Specification</div>
                <div className={styles.kvV}>{p.detailedSpec}</div>
              </div>
            )}
            {p.buyer_comment && (
              <div className={styles.kvRow}>
                <div className={styles.kvK}>Buyer comment</div>
                <div className={styles.kvV} style={{ fontStyle: "italic", color: "var(--fg-2)" }}>
                  {p.buyer_comment}
                </div>
              </div>
            )}

            {/* Clauses */}
            <div className={styles.cardHead} style={{ borderTop: "1px solid var(--border)" }}>
              <h3>
                <ClipboardCheck size={14} />
                Technical evaluation
              </h3>
              <span className={styles.cardHeadCount}>
                {answered} of {clauses.length} answered
              </span>
            </div>

            {clauses.length === 0 ? (
              <div className={styles.evalEmpty}>No clauses defined.</div>
            ) : (
              clauses.map((c, cidx) => {
                const resp = techResponses[p.id]?.[c.id] || {};
                const isAnswered = !!resp.response;
                return (
                  <div
                    key={c.id}
                    className={`${styles.clause} ${isAnswered ? styles.clauseAnswered : ""}`}
                  >
                    <span className={styles.clauseNum}>
                      {String(cidx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className={styles.clauseText}>
                        {c.clause_text || c.text || c.title || "Clause"}
                      </div>

                      {c.file_url && (
                        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11.5, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>
                            Reference
                          </span>
                          <a className={styles.fileChip} href={c.file_url} target="_blank" rel="noopener">
                            <Download size={11} />
                            {(c.file_url || "").split("/").pop()?.slice(0, 28) || "file"}
                          </a>
                        </div>
                      )}

                      <div className={styles.clauseActions}>
                        <button
                          type="button"
                          className={`${styles.radioChip} ${
                            resp.response === "agree" ? styles.agree : ""
                          }`}
                          onClick={() =>
                            onSetResponse(p.id, c.id, resp.response === "agree" ? null : "agree")
                          }
                        >
                          <span className={styles.radioInd} />
                          I agree
                        </button>
                        <button
                          type="button"
                          className={`${styles.radioChip} ${
                            resp.response === "disagree" ? styles.disagree : ""
                          }`}
                          onClick={() =>
                            onSetResponse(
                              p.id,
                              c.id,
                              resp.response === "disagree" ? null : "disagree"
                            )
                          }
                        >
                          <span className={styles.radioInd} />
                          I don't agree
                        </button>

                        <div style={{ height: 24, width: 1, marginLeft: 4, background: "var(--border)" }} />

                        <label className={styles.uploadMini}>
                          <Download size={12} style={{ transform: "rotate(180deg)" }} />
                          Attach cross-reference doc
                          <input
                            type="file"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) onAddFile(p.id, c.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>

                      {(resp.files || []).length > 0 && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                          {resp.files.map((u) => (
                            <div className={styles.uploadedFile} key={u}>
                              <Download size={12} style={{ color: "var(--fg-3)" }} />
                              <span className={styles.name}>{u.split("/").pop()}</span>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => onRemoveFile(p.id, c.id, u)}
                                aria-label="Remove"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {resp.response && (
                        <div className={styles.clauseExtra}>
                          <div>
                            <label className={styles.label}>
                              Explanation / deviation
                              {resp.response === "disagree" && (
                                <span className={styles.labelMeta} style={{ color: "var(--danger)" }}>
                                  required
                                </span>
                              )}
                            </label>
                            <textarea
                              className={styles.textarea}
                              value={resp.comment || ""}
                              onChange={(e) =>
                                onSetComment(p.id, c.id, e.target.value)
                              }
                              placeholder={
                                resp.response === "agree"
                                  ? "Optional — add any clarifying notes."
                                  : "Briefly describe your deviation or alternative compliance approach."
                              }
                              maxLength={500}
                              style={{ minHeight: 64 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Step 3 — Pricing & submit
   ════════════════════════════════════════════════════════════════ */
const Step3Pricing = ({
  rfq,
  products,
  totals,
  pricingLoading,
  paymentTerms,
  paymentTotal,
  globalComment,
  vendorGSTIN,
  globalCharges,
  onChangeGSTIN,
  onChangeGlobalComment,
  onUpdateProduct,
  onOpenCharges,
  onOpenGlobalCharges,
  onAddPaymentTerm,
  onUpdatePaymentTerm,
  onRemovePaymentTerm,
  onOpenHistory,
  canSubmit,
  token,
  editStatus,
  isReadOnly,
  negotiationFields,
}) => {
  const hasGlobalCharges = (globalCharges || []).some(
    (c) => c.name && c.name.trim() && parseFloat(c.amount) > 0
  );
  const activeGlobalCount = (globalCharges || []).filter(
    (c) => c.name && c.name.trim()
  ).length;
  return (
    <div className={styles.stepPane}>
      {editStatus?.title && (
        <StatusBanner status={editStatus} />
      )}
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Pricing &amp; commercial terms</div>
          <div className={styles.sectionSub}>
            {isReadOnly
              ? "Your quote is in read-only mode — review the values you submitted."
              : "Enter your prices, add any per-line or global charges, and submit your quote."}
          </div>
          <div className={styles.miniStats}>
            <div className={styles.miniStat}>
              <div className={styles.lbl}>Items to price</div>
              <div className={styles.val}>{products.length}</div>
            </div>
            {rfq.vendor_clarification_date && (
              <>
                <div style={{ height: 28, width: 1, background: "var(--border)" }} />
                <div className={styles.miniStat}>
                  <div className={styles.lbl}>Clarification</div>
                  <div className={styles.val}>{fmtShortDate(rfq.vendor_clarification_date)}</div>
                </div>
              </>
            )}
            {rfq.ra_start_date && (
              <>
                <div style={{ height: 28, width: 1, background: "var(--border)" }} />
                <div className={styles.miniStat}>
                  <div className={styles.lbl}>Auction window</div>
                  <div className={styles.val}>
                    {fmtShortDate(rfq.ra_start_date)} → {fmtShortDate(rfq.ra_end_date)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={styles.cols}>
        {/* LEFT — line items + commercial */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>
                Line items
              </h3>
              <span className={styles.pill}>
                {products.length} product{products.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {products.map((p, idx) => {
            const finalizedLocked =
              p.finalization_status === "Another vendor is finalized" ||
              (p.finalization_status === "You are finalized");
            const locked = finalizedLocked || isReadOnly;
            // Engine-computed total synced into p.total_price via usePreviewTotals
            const lineTotal = Number(p.total_price) || 0;
            const chargesTotal = (p.other_charges || []).reduce((s, c) => {
              if (!c.name) return s;
              const base = (parseFloat(p.qty) || 0) * (parseFloat(p.unit_price) || 0);
              const amt =
                c.amount_mode === "percentage"
                  ? (base * (parseFloat(c.amount) || 0)) / 100
                  : parseFloat(c.amount) || 0;
              return s + amt;
            }, 0);
            const hasCharges = (p.other_charges || []).some((c) => c.name && parseFloat(c.amount) > 0);
            const negFields = (negotiationFields && negotiationFields[p.id]) || [];
            const negByName = (name) =>
              negFields.find((f) => (f.name || "").toLowerCase() === name.toLowerCase());
            const isBeingNegotiated = negFields.length > 0;

            return (
              <div className={`${styles.lineCard} ${locked ? styles.locked : ""}`} key={p.id}>
                <div className={styles.lineHead}>
                  <div className={styles.lineHeadLeft}>
                    <div className={styles.numChip}>{String(idx + 1).padStart(2, "0")}</div>
                    <div>
                      <div className={styles.lineTitle}>{p.product_name}</div>
                      <div className={styles.lineDesc}>
                        {p.detailedSpec || p.product_description || "—"}
                      </div>
                      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {hasCharges && (
                          <span className={styles.pill}>
                            <Check size={10} strokeWidth={2.5} />
                            {(p.other_charges || []).filter((c) => c.name).length} extra charge
                            {((p.other_charges || []).filter((c) => c.name).length || 0) > 1 ? "s" : ""}
                          </span>
                        )}
                        {(parseFloat(p.unit_price) || 0) > 0 ? (
                          <span className={`${styles.pill} ${styles.success}`}>
                            <span className={styles.pdot} style={{ background: "var(--success)" }} />
                            Priced
                          </span>
                        ) : (
                          <span className={`${styles.pill} ${styles.warn}`}>Awaiting price</span>
                        )}
                        {p.has_tech_eval && (
                          <span className={`${styles.pill} ${styles.info}`}>Tech eval</span>
                        )}
                        {isBeingNegotiated && (
                          <span className={`${styles.pill} ${styles.warn}`}>
                            <span className={styles.pdot} style={{ background: "var(--warn)" }} />
                            Negotiation in progress
                          </span>
                        )}
                        {p.lowest_quotation && (
                          <span className={`${styles.pill}`}>
                            Lowest ₹{fmtINR(p.lowest_quotation.total_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={styles.qtyBlockRight}>
                    <div className={styles.lbl}>Qty required</div>
                    <div className={styles.val}>{p.qty}</div>
                    <div className={styles.unit}>{p.unit}</div>
                  </div>
                </div>

                {/* Pricing */}
                <div className={styles.lineSection}>
                  <div className={styles.lineSectionLabel}>
                    <FileText size={11} />
                    Pricing
                  </div>
                  <div className={styles.priceGrid}>
                    <div>
                      <label className={styles.label}>
                        Unit price <span className={styles.req}>*</span>
                      </label>
                      <div className={styles.inputGroup}>
                        <div className={styles.prefix}>₹</div>
                        <input
                          type="number"
                          className={`${styles.input} ${styles.inputNum}`}
                          value={p.unit_price ?? ""}
                          onChange={(e) =>
                            onUpdateProduct(idx, { unit_price: e.target.value })
                          }
                          placeholder="0.00"
                          min={0}
                          step="0.01"
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={locked}
                        />
                      </div>
                      {(() => {
                        const nf = negByName("unit_price") || negByName("base_price") || negByName("price");
                        if (!nf?.targetPrice) return null;
                        return (
                          <div className={styles.negHint}>
                            <span className={styles.negHintDot} />
                            Buyer's ask: <span className={styles.mono}>₹{fmtINR(nf.targetPrice)}</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <label className={styles.label}>Tax (GST)</label>
                      <div className={styles.taxField}>
                        <input
                          type="number"
                          className={styles.taxInput}
                          value={p.tax ?? ""}
                          onChange={(e) =>
                            onUpdateProduct(idx, { tax: e.target.value })
                          }
                          placeholder="0"
                          min={0}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={locked}
                        />
                        <div className={styles.modeSeg} role="group" aria-label="Tax mode">
                          <button
                            type="button"
                            className={p.tax_mode === "percentage" ? styles.modeSegActive : ""}
                            onClick={() => onUpdateProduct(idx, { tax_mode: "percentage" })}
                            disabled={locked}
                            aria-pressed={p.tax_mode === "percentage"}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            className={p.tax_mode === "absolute" ? styles.modeSegActive : ""}
                            onClick={() => onUpdateProduct(idx, { tax_mode: "absolute" })}
                            disabled={locked}
                            aria-pressed={p.tax_mode === "absolute"}
                          >
                            ₹
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={styles.label}>Other charges</label>
                      <button
                        type="button"
                        className={`${styles.chargesTrigger} ${
                          hasCharges ? styles.chargesActive : ""
                        }`}
                        onClick={() => onOpenCharges(idx)}
                        disabled={locked}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {hasCharges ? (
                            <Check size={12} strokeWidth={2.4} />
                          ) : (
                            <Plus size={12} />
                          )}
                          <span>
                            {hasCharges
                              ? `${(p.other_charges || []).filter((c) => c.name).length} charge${
                                  (p.other_charges || []).filter((c) => c.name).length > 1 ? "s" : ""
                                } added`
                              : "Add freight, insurance…"}
                          </span>
                        </span>
                        {hasCharges && (
                          <span className={styles.chargesAmt}>₹ {fmtINR(chargesTotal)}</span>
                        )}
                      </button>
                    </div>

                    <div>
                      <label className={styles.label}>
                        Delivery <span className={styles.req}>*</span>
                      </label>
                      <div className={styles.inputGroup}>
                        <input
                          type="number"
                          className={`${styles.input} ${styles.inputNum}`}
                          value={p.delivery_period ?? ""}
                          onChange={(e) =>
                            onUpdateProduct(idx, { delivery_period: e.target.value })
                          }
                          placeholder="7"
                          min={1}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={locked}
                        />
                        <div
                          className={styles.suffix}
                          style={{ fontFamily: "inherit", fontSize: 12 }}
                        >
                          days
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className={styles.lineSection}>
                  <div className={styles.lineSectionLabel}>
                    <MessageSquare size={11} />
                    Notes &amp; attachments
                  </div>
                  <div className={styles.notesGrid}>
                    <div>
                      <label className={styles.label}>
                        Comment to buyer <span className={styles.labelMeta}>optional</span>
                      </label>
                      <textarea
                        className={styles.textarea}
                        value={p.comment || ""}
                        onChange={(e) =>
                          onUpdateProduct(idx, { comment: e.target.value })
                        }
                        placeholder="Add any product-specific notes the buyer should consider."
                        maxLength={300}
                        style={{ minHeight: 64 }}
                        disabled={locked}
                      />
                    </div>
                    <div className={styles.spaceY3}>
                      <button
                        type="button"
                        className={styles.btn + " " + styles.btnSecondary + " " + styles.btnSm}
                        onClick={() => onOpenHistory(p.product_id)}
                        style={{ width: "100%", justifyContent: "center" }}
                        disabled={locked}
                      >
                        <History size={13} />
                        View past quotes
                      </button>
                      <label className={styles.uploadMini} style={{ width: "100%", justifyContent: "center", padding: 9 }}>
                        <Download size={12} style={{ transform: "rotate(180deg)" }} />
                        Attach supporting documents
                        <input
                          type="file"
                          multiple
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            const urls = [];
                            for (const f of files) {
                              try {
                                const res = await handleUploadFile(f, token);
                                const url = res?.data?.[0]?.file_path;
                                if (url) urls.push(url);
                              } catch (_) {}
                            }
                            if (urls.length) {
                              onUpdateProduct(idx, {
                                document_files: [...(p.document_files || []), ...urls],
                              });
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {(p.document_files || []).map((u) => (
                        <div className={styles.uploadedFile} key={u}>
                          <Download size={12} style={{ color: "var(--fg-3)" }} />
                          <span className={styles.name}>{u.split("/").pop()}</span>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() =>
                              onUpdateProduct(idx, {
                                document_files: (p.document_files || []).filter((f) => f !== u),
                              })
                            }
                            aria-label="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Foot */}
                <div className={styles.lineFoot}>
                  <div className={styles.lineFootBadges}>
                    <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                      <span className={styles.mono}>{p.qty}</span> ×{" "}
                      <span className={styles.mono}>
                        {p.unit_price ? `₹${fmtINR(p.unit_price)}` : "—"}
                      </span>
                      {p.tax > 0 && (
                        <>
                          {" + "}
                          <span className={styles.mono}>
                            {p.tax_mode === "percentage" ? `${p.tax}% GST` : `₹${p.tax} tax`}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className={styles.lineFootTotal}>
                    <span className={styles.lbl}>Line total</span>
                    <span className={`${styles.mono} ${styles.val} ${lineTotal === 0 ? styles.zero : ""}`}>
                      ₹ {fmtINR(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Commercial */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>
                Commercial terms
              </h3>
              <span className={styles.pill}>Applies to entire quote</span>
            </div>
          </div>

          <div className={styles.commercialCard}>
            <div className={styles.cardSection}>
              <label className={styles.label}>
                GSTIN <span className={styles.labelMeta}>optional</span>
              </label>
              <input
                className={`${styles.input} ${styles.mono}`}
                value={vendorGSTIN}
                onChange={(e) => onChangeGSTIN(e.target.value)}
                placeholder="29ABCDE1234F1Z5"
                maxLength={15}
                style={{ maxWidth: 280 }}
              />
              <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 6 }}>
                Used to issue invoices for the delivery location.
              </div>
            </div>

            <div className={styles.cardSection}>
              <label className={styles.label}>
                Global comment <span className={styles.labelMeta}>visible to buyer</span>
              </label>
              <textarea
                className={styles.textarea}
                value={globalComment}
                onChange={(e) => onChangeGlobalComment(e.target.value)}
                placeholder="Any quote-wide notes — packaging, batching, conditions, etc."
                maxLength={500}
              />
            </div>

            <div className={styles.cardSection}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
                <div>
                  <label className={styles.label} style={{ marginBottom: 2 }}>
                    Global charges <span className={styles.labelMeta}>applied on grand total</span>
                  </label>
                  <div style={{ fontSize: 11.5, color: "var(--fg-4)", lineHeight: 1.45 }}>
                    Charges that apply across the entire PO value — e.g. shipping
                    insurance, handling, vendor levies. Per-line charges live on each
                    product.
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.chargesTrigger} ${hasGlobalCharges ? styles.chargesActive : ""}`}
                  onClick={onOpenGlobalCharges}
                  disabled={isReadOnly}
                  style={{ maxWidth: 280, flexShrink: 0 }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {hasGlobalCharges ? (
                      <Check size={12} strokeWidth={2.4} />
                    ) : (
                      <Plus size={12} />
                    )}
                    <span>
                      {activeGlobalCount === 0
                        ? "Add global charge"
                        : `${activeGlobalCount} global charge${activeGlobalCount > 1 ? "s" : ""}`}
                    </span>
                  </span>
                  {hasGlobalCharges && totals?.globalChargesTotal > 0 && (
                    <span className={styles.chargesAmt}>₹ {fmtINR(totals.globalChargesTotal)}</span>
                  )}
                </button>
              </div>
            </div>

            <div className={styles.cardSection}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                <label className={styles.label} style={{ marginBottom: 0 }}>
                  Payment terms <span className={styles.req}>*</span>
                </label>
                <div className={styles.totHint} style={{ marginTop: 0 }}>
                  <span style={{ fontSize: 11.5, color: "var(--fg-4)" }}>
                    Must sum to 100% · currently
                  </span>
                  <span
                    className={`${styles.totNum} ${
                      paymentTotal === 100 ? styles.totOk : styles.totErr
                    }`}
                    style={{ marginLeft: 6 }}
                  >
                    {paymentTotal}%
                  </span>
                </div>
              </div>

              <div className={styles.payList}>
                {paymentTerms.map((t, i) => {
                  const isDeleted = t.action === "delete";
                  return (
                    <div
                      key={i}
                      className={`${styles.payRow} ${isDeleted ? styles.deleted : ""}`}
                    >
                      <div className={styles.payIdx}>
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <select
                        className={styles.select}
                        value={t.type || "advance"}
                        onChange={(e) => onUpdatePaymentTerm(i, { type: e.target.value })}
                        disabled={isDeleted}
                      >
                        {PAY_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <div className={styles.inputGroup}>
                        <input
                          className={`${styles.input} ${styles.inputNum}`}
                          type="number"
                          min={0}
                          max={100}
                          value={t.value ?? ""}
                          onChange={(e) =>
                            onUpdatePaymentTerm(i, { value: Number(e.target.value) })
                          }
                          disabled={isDeleted}
                          placeholder="0"
                        />
                        <div className={styles.suffix} style={{ padding: "0 9px" }}>%</div>
                      </div>
                      {t.type === "credit" ? (
                        <div className={styles.inputGroup}>
                          <input
                            className={`${styles.input} ${styles.inputNum}`}
                            type="number"
                            value={t.days ?? ""}
                            onChange={(e) =>
                              onUpdatePaymentTerm(i, { days: Number(e.target.value) })
                            }
                            disabled={isDeleted}
                            placeholder="30"
                          />
                          <div className={styles.suffix} style={{ fontFamily: "inherit", fontSize: 12 }}>
                            days
                          </div>
                        </div>
                      ) : (
                        <input
                          className={styles.input}
                          value={t.comment ?? ""}
                          onChange={(e) =>
                            onUpdatePaymentTerm(i, { comment: e.target.value })
                          }
                          placeholder="Note"
                          disabled={isDeleted}
                        />
                      )}
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => onRemovePaymentTerm(i)}
                        disabled={isDeleted && paymentTerms.length === 1}
                        aria-label="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className={styles.payAdd}
                  onClick={onAddPaymentTerm}
                >
                  <Plus size={13} />
                  Add another term
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — hero summary */}
        <div className={styles.stickySection}>
          <div className={styles.heroSummary}>
            <div className={styles.heroInner}>
              <div className={styles.heroHead}>
                <div className={styles.heroTitle}>Quote summary</div>
                <div className={styles.heroRfq}>#{rfq.rfq_no}</div>
              </div>

              {pricingLoading ? (
                <div>
                  <div className={styles.heroGrandLbl}>Grand total</div>
                  <div className={styles.calculatingState}>
                    <span className={styles.calcDotLg} />
                    Calculating…
                  </div>
                  <div className={styles.heroGrandMeta}>
                    Updating from the pricing engine
                  </div>
                </div>
              ) : totals.grand > 0 ? (
                <div>
                  <div className={styles.heroGrandLbl}>Grand total</div>
                  <div className={styles.heroGrand}>
                    <span className={styles.heroGrandCur}>₹</span>
                    <span>{fmtINR(totals.grand)}</span>
                  </div>
                  <div className={styles.heroGrandMeta}>
                    Inclusive of GST, global &amp; line charges · INR
                  </div>

                  <div className={styles.breakdownBar}>
                    <div
                      className={styles.bdSubtotal}
                      style={{ width: `${totals.grand ? (totals.subtotal / totals.grand) * 100 : 0}%` }}
                    />
                    <div
                      className={styles.bdGst}
                      style={{ width: `${totals.grand ? (totals.gst / totals.grand) * 100 : 0}%` }}
                    />
                    <div
                      className={styles.bdCharges}
                      style={{
                        width: `${
                          totals.grand
                            ? (totals.extraCharges.reduce((s, c) => s + c.amount, 0) /
                                totals.grand) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className={styles.breakdownLegend}>
                    <div className={styles.breakdownRow}>
                      <span className={styles.lbl}>
                        <span className={`${styles.swatch} ${styles.bdSubtotal}`} /> Subtotal
                      </span>
                      <span className={styles.val}>₹ {fmtINR(totals.subtotal)}</span>
                    </div>
                    <div className={styles.breakdownRow}>
                      <span className={styles.lbl}>
                        <span className={`${styles.swatch} ${styles.bdGst}`} /> GST
                      </span>
                      <span className={styles.val}>₹ {fmtINR(totals.gst)}</span>
                    </div>
                    {totals.extraCharges.map((ec) => (
                      <React.Fragment key={ec.label}>
                        <div className={styles.breakdownRow}>
                          <span className={styles.lbl}>
                            <span className={`${styles.swatch} ${styles.bdCharges}`} /> {ec.label}
                          </span>
                          <span className={styles.val}>₹ {fmtINR(ec.amount)}</span>
                        </div>
                        {ec.tax > 0 && (
                          <div className={`${styles.breakdownRow} ${styles.breakdownSub}`}>
                            <span className={styles.lbl}>
                              <span className={styles.subBranch} /> GST on {ec.label.toLowerCase()}
                            </span>
                            <span className={styles.val}>₹ {fmtINR(ec.tax)}</span>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                    {(totals.globalCharges || []).length > 0 && (
                      <>
                        <div className={styles.breakdownDivider}>On grand total</div>
                        {totals.globalCharges.map((gc) => (
                          <div className={styles.breakdownRow} key={`g-${gc.label}`}>
                            <span className={styles.lbl}>
                              <span className={`${styles.swatch} ${styles.bdGlobal}`} /> {gc.label}
                            </span>
                            <span className={styles.val}>₹ {fmtINR(gc.amount)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.emptyHero}>
                  <div className={styles.ic}>
                    <DollarSign size={20} strokeWidth={1.8} />
                  </div>
                  <div className={styles.ttl}>Awaiting your prices</div>
                  <div className={styles.sub}>
                    Your grand total &amp; tax breakdown will appear here as you
                    price each line item.
                  </div>
                </div>
              )}
            </div>

            <div className={styles.heroFoot}>
              <div className={styles.heroFootRow}>
                <span className={styles.k}>Payment</span>
                <span className={styles.v}>
                  {paymentTerms.filter((t) => t.action !== "delete").length} term
                  {paymentTerms.filter((t) => t.action !== "delete").length === 1 ? "" : "s"}
                </span>
              </div>
              <div className={styles.heroFootRow}>
                <span className={styles.k}>Deadline</span>
                <span className={styles.v}>{fmtShortDate(rfq.bid_end_date)}</span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span className={`${styles.completionPill} ${canSubmit ? styles.ready : ""}`}>
                  <span className={styles.completionPulse} />
                  {canSubmit ? "Ready to submit" : "In progress"}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--fg-4)",
                    fontFamily: "Geist Mono, monospace",
                  }}
                >
                  v1 · draft
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Action bar
   ════════════════════════════════════════════════════════════════ */
const ActionBar = ({
  currentStep,
  currentStepId,
  totalSteps,
  isLastStep,
  canContinueStep1,
  canContinueStep2,
  canSubmit,
  evalAnswered,
  evalTotal,
  totals,
  submitting,
  onPrev,
  onNext,
  onSubmit,
  onRegret,
  alreadyQuoted,
  isReadOnly,
}) => {
  const stepNum = currentStep + 1;
  return (
    <footer className={styles.actionBar}>
      <div className={styles.actionBarInner}>
        <div className={styles.actionHelper}>
          {isReadOnly && currentStepId === "pricing" ? (
            <span>
              <span className={styles.accent}>Read-only.</span>{" "}
              You can review your quote but no further changes can be submitted.
            </span>
          ) : currentStepId === "overview" ? (
            <span>
              <span className={styles.accent}>Step {stepNum} of {totalSteps}.</span>{" "}
              Acknowledge the terms above to continue.
            </span>
          ) : currentStepId === "eval" ? (
            <span>
              <span className={styles.accent}>Step {stepNum} of {totalSteps}.</span>{" "}
              {evalTotal === 0
                ? "No clauses — continue when ready."
                : `Answer ${Math.max(0, evalTotal - evalAnswered)} remaining clause(s) to continue.`}
            </span>
          ) : currentStepId === "pricing" ? (
            <span>
              <span className={styles.accent}>Step {stepNum} of {totalSteps}.</span>{" "}
              Review totals, then submit when ready.
            </span>
          ) : null}
        </div>
        <div className={styles.actionGroup}>
          {currentStepId === "pricing" && totals.grand > 0 && (
            <div className={styles.actionTotal}>
              <span className={styles.lbl}>Total</span>
              <span className={styles.val}>₹ {fmtINR(totals.grand)}</span>
            </div>
          )}

          {!alreadyQuoted && (
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onRegret}>
              <X size={13} />
              Regret quote
            </button>
          )}

          {currentStep > 0 && (
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onPrev}>
              <ArrowLeft size={13} />
              Back
            </button>
          )}

          {!isLastStep && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={onNext}
              disabled={currentStepId === "overview" ? !canContinueStep1 : !canContinueStep2}
            >
              {currentStepId === "overview"
                ? totalSteps === 2 ? "Continue to pricing" : "Continue to products"
                : "Continue to pricing"}
              <ArrowRight size={13} />
            </button>
          )}

          {isLastStep && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnXl}`}
              onClick={onSubmit}
              disabled={!canSubmit || submitting}
            >
              <Send size={14} />
              {submitting ? "Submitting…" : alreadyQuoted ? "Update quote" : "Submit quote"}
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};

/* ════════════════════════════════════════════════════════════════
   Charges modal
   ════════════════════════════════════════════════════════════════ */
const CHARGE_TYPES = ["Freight", "Insurance", "Packaging & Handling", "Installation", "TCS", "Custom"];

const validateCharge = (ch, i) => {
  const errs = [];
  if (!ch.name || !ch.name.trim()) errs.push("name missing");
  if (!(parseFloat(ch.amount) > 0)) errs.push("amount must be greater than 0");
  if (!(ch.comment || "").trim()) errs.push("note is required");
  return {
    idx: i,
    name: (ch.name || "").trim() || `Charge ${i + 1}`,
    errs,
  };
};

const ChargesModal = ({ product, pIdx, onClose, onAddCharge, onUpdateCharge, onRemoveCharge }) => {
  const charges = product?.other_charges || [];
  const chargeReports = charges.map(validateCharge);
  const errorList = chargeReports.filter((r) => r.errs.length > 0);
  const hasErrors = errorList.length > 0;

  // Filter out charge types already added (one-per-type, except Custom)
  const existingNames = new Set(charges.map((c) => (c.name || "").toLowerCase().trim()));
  const availableTypes = CHARGE_TYPES.filter(
    (t) => t === "Custom" || !existingNames.has(t.toLowerCase())
  );

  return (
    <div className={styles.modalBackdrop} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <h3>
              Additional charges
              <span style={{ fontWeight: 450, color: "var(--fg-3)", marginLeft: 6 }}>
                {" · "} {product?.product_name}
              </span>
            </h3>
            <div className={styles.sub}>
              Add freight, insurance or any custom charge that should be billed
              for this line item.
            </div>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <label className={styles.label}>Add charge type</label>
          <select
            className={styles.select}
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              if (v === "Custom") {
                const name = window.prompt("Custom charge name", "");
                if (name && name.trim()) {
                  const exists = existingNames.has(name.trim().toLowerCase());
                  if (exists) {
                    toast.error(`"${name.trim()}" is already added.`);
                  } else {
                    onAddCharge(name.trim());
                  }
                }
              } else {
                onAddCharge(v);
              }
              e.target.value = "";
            }}
            disabled={availableTypes.length === 0}
          >
            <option value="">
              {availableTypes.length === 0
                ? "All standard charge types added — use Custom"
                : "Select charge type…"}
            </option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {t === "Custom" ? "+ Custom charge" : t}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {(product?.other_charges || []).map((ch, ci) => (
              <div className={styles.chargeCard} key={ch._id || ci}>
                <div className={styles.chargeCardHead}>
                  <h4>{ch.name || "(Unnamed)"}</h4>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => onRemoveCharge(ci)}
                    aria-label="Remove"
                  >
                    <Trash2 size={14} style={{ color: "var(--danger)" }} />
                  </button>
                </div>
                <div className={styles.chargeGrid}>
                  <div>
                    <label className={styles.label}>Amount</label>
                    <div className={styles.taxField}>
                      <input
                        className={styles.taxInput}
                        type="number"
                        value={ch.amount ?? 0}
                        onChange={(e) => onUpdateCharge(ci, { amount: Number(e.target.value) })}
                        placeholder="0"
                        min={0}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                      <div className={styles.modeSeg} role="group" aria-label="Charge mode">
                        <button
                          type="button"
                          className={ch.amount_mode === "percentage" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { amount_mode: "percentage" })}
                          aria-pressed={ch.amount_mode === "percentage"}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={ch.amount_mode === "absolute" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { amount_mode: "absolute" })}
                          aria-pressed={ch.amount_mode === "absolute"}
                        >
                          ₹
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={styles.label}>
                      Tax (GST)
                      {ch.tax == null || ch.tax === "" ? (
                        <span className={styles.labelMeta}>uses base rate</span>
                      ) : null}
                    </label>
                    <div className={styles.taxField}>
                      <input
                        className={styles.taxInput}
                        type="number"
                        value={ch.tax == null ? "" : ch.tax}
                        onChange={(e) =>
                          onUpdateCharge(ci, {
                            tax: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        placeholder={`${product?.tax ?? 0}${
                          (product?.tax_mode || "percentage") === "absolute" ? "₹" : "%"
                        }`}
                        min={0}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                      <div className={styles.modeSeg} role="group" aria-label="Tax mode">
                        <button
                          type="button"
                          className={(ch.tax_mode || "percentage") === "percentage" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { tax_mode: "percentage" })}
                          aria-pressed={(ch.tax_mode || "percentage") === "percentage"}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={ch.tax_mode === "absolute" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { tax_mode: "absolute" })}
                          aria-pressed={ch.tax_mode === "absolute"}
                        >
                          ₹
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={styles.label}>
                      Note <span className={styles.req}>*</span>
                      {!(ch.comment || "").trim() && (
                        <span className={styles.labelMeta} style={{ color: "var(--danger)" }}>
                          required
                        </span>
                      )}
                    </label>
                    <input
                      className={styles.input}
                      type="text"
                      value={ch.comment || ""}
                      onChange={(e) => onUpdateCharge(ci, { comment: e.target.value })}
                      placeholder="e.g. GST 18% inclusive"
                      maxLength={120}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {charges.length === 0 ? (
            <div className={styles.chargesEmpty}>
              <div className={styles.ic}>
                <Plus size={18} />
              </div>
              <div className={styles.t1}>No extra charges yet</div>
              <div className={styles.t2}>
                Select a type above to add freight, insurance, etc.
              </div>
            </div>
          ) : hasErrors ? (
            <div className={styles.errorBanner}>
              <div className={styles.errorBannerTitle}>
                Please fix the following before saving:
              </div>
              <ul className={styles.errorBannerList}>
                {errorList.map((r) => (
                  <li key={r.idx}>
                    <strong>{r.name}</strong> — {r.errs.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={styles.infoBanner}>
              Charges are saved when you submit the quote. They appear in the
              buyer's quote summary.
            </div>
          )}
        </div>
        <div className={styles.modalFoot}>
          <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>
            {charges.length} charge{charges.length === 1 ? "" : "s"} on this line
            {hasErrors && (
              <span style={{ color: "var(--danger)", marginLeft: 8, fontWeight: 500 }}>
                · {errorList.length} need attention
              </span>
            )}
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onClose}
            disabled={hasErrors}
            title={hasErrors ? "Fix all errors before saving" : ""}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Global charges modal — charges that apply on the grand PO total
   ════════════════════════════════════════════════════════════════ */
const GLOBAL_CHARGE_TYPES = ["Shipping insurance", "Handling", "Service fee", "Discount", "Custom"];

const validateGlobalCharge = (ch, i) => {
  const errs = [];
  if (!ch.name || !ch.name.trim()) errs.push("name missing");
  if (!(parseFloat(ch.amount) > 0)) errs.push("amount must be greater than 0");
  if (!(ch.comment || "").trim()) errs.push("note is required");
  return {
    idx: i,
    name: (ch.name || "").trim() || `Charge ${i + 1}`,
    errs,
  };
};

const GlobalChargesModal = ({ charges, onClose, onAddCharge, onUpdateCharge, onRemoveCharge }) => {
  const reports = (charges || []).map(validateGlobalCharge);
  const errorList = reports.filter((r) => r.errs.length > 0);
  const hasErrors = errorList.length > 0;

  const existingNames = new Set((charges || []).map((c) => (c.name || "").toLowerCase().trim()));
  const availableTypes = GLOBAL_CHARGE_TYPES.filter(
    (t) => t === "Custom" || !existingNames.has(t.toLowerCase())
  );

  return (
    <div
      className={styles.modalBackdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <div>
            <h3>
              Global charges
              <span style={{ fontWeight: 450, color: "var(--fg-3)", marginLeft: 6 }}>
                · applied on grand total
              </span>
            </h3>
            <div className={styles.sub}>
              Charges that apply across the entire quote — billed on the grand
              total, not on individual line items.
            </div>
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <label className={styles.label}>Add charge type</label>
          <select
            className={styles.select}
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              if (v === "Custom") {
                const name = window.prompt("Custom global charge name", "");
                if (name && name.trim()) {
                  if (existingNames.has(name.trim().toLowerCase())) {
                    toast.error(`"${name.trim()}" is already added.`);
                  } else {
                    onAddCharge(name.trim());
                  }
                }
              } else {
                onAddCharge(v);
              }
              e.target.value = "";
            }}
            disabled={availableTypes.length === 0}
          >
            <option value="">
              {availableTypes.length === 0
                ? "All standard charge types added — use Custom"
                : "Select charge type…"}
            </option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {t === "Custom" ? "+ Custom charge" : t}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {(charges || []).map((ch, ci) => (
              <div className={styles.chargeCard} key={ch._id || ci}>
                <div className={styles.chargeCardHead}>
                  <h4>{ch.name || "(Unnamed)"}</h4>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => onRemoveCharge(ci)}
                    aria-label="Remove"
                  >
                    <Trash2 size={14} style={{ color: "var(--danger)" }} />
                  </button>
                </div>
                <div className={styles.chargeGrid}>
                  <div>
                    <label className={styles.label}>Amount</label>
                    <div className={styles.taxField}>
                      <input
                        className={styles.taxInput}
                        type="number"
                        value={ch.amount ?? 0}
                        onChange={(e) => onUpdateCharge(ci, { amount: Number(e.target.value) })}
                        placeholder="0"
                        min={0}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                      <div className={styles.modeSeg} role="group" aria-label="Charge mode">
                        <button
                          type="button"
                          className={ch.amount_mode === "percentage" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { amount_mode: "percentage" })}
                          aria-pressed={ch.amount_mode === "percentage"}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={ch.amount_mode === "absolute" ? styles.modeSegActive : ""}
                          onClick={() => onUpdateCharge(ci, { amount_mode: "absolute" })}
                          aria-pressed={ch.amount_mode === "absolute"}
                        >
                          ₹
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label className={styles.label}>
                      Note <span className={styles.req}>*</span>
                      {!(ch.comment || "").trim() && (
                        <span className={styles.labelMeta} style={{ color: "var(--danger)" }}>
                          required
                        </span>
                      )}
                    </label>
                    <input
                      className={styles.input}
                      type="text"
                      value={ch.comment || ""}
                      onChange={(e) => onUpdateCharge(ci, { comment: e.target.value })}
                      placeholder="e.g. across PO value"
                      maxLength={120}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(charges || []).length === 0 ? (
            <div className={styles.chargesEmpty}>
              <div className={styles.ic}>
                <Plus size={18} />
              </div>
              <div className={styles.t1}>No global charges yet</div>
              <div className={styles.t2}>
                Add charges that should apply on the entire PO value.
              </div>
            </div>
          ) : hasErrors ? (
            <div className={styles.errorBanner}>
              <div className={styles.errorBannerTitle}>
                Please fix the following before saving:
              </div>
              <ul className={styles.errorBannerList}>
                {errorList.map((r) => (
                  <li key={r.idx}>
                    <strong>{r.name}</strong> — {r.errs.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={styles.infoBanner}>
              Global charges are billed across the full PO value, after line totals.
            </div>
          )}
        </div>
        <div className={styles.modalFoot}>
          <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>
            {(charges || []).length} global charge
            {(charges || []).length === 1 ? "" : "s"}
            {hasErrors && (
              <span style={{ color: "var(--danger)", marginLeft: 8, fontWeight: 500 }}>
                · {errorList.length} need attention
              </span>
            )}
          </div>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onClose}
            disabled={hasErrors}
            title={hasErrors ? "Fix all errors before saving" : ""}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   History modal
   ════════════════════════════════════════════════════════════════ */
const HistoryModal = ({ history, loading, onClose }) => {
  return (
  <div className={styles.modalBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className={styles.modal} style={{ maxWidth: 540 }}>
      <div className={styles.modalHead}>
        <div>
          <h3>Previous quotes for this product</h3>
          <div className={styles.sub}>Most recent quotes you've submitted for the same item.</div>
        </div>
        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className={styles.modalBody}>
        {loading && <div className={styles.skeletonRow} style={{ width: "70%" }} />}
        {!loading && history.length === 0 && (
          <div className={styles.chargesEmpty}>
            <div className={styles.ic}>
              <History size={18} />
            </div>
            <div className={styles.t1}>No past quotes yet</div>
            <div className={styles.t2}>You haven't quoted this product before.</div>
          </div>
        )}
        {!loading && history.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((h, i) => {
              const total = h.total_price ?? h.amount ?? 0;
              return (
                <div
                  key={i}
                  style={{
                    padding: 14,
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {h.product_name || h.product || "Product"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 3 }}>
                      <span className={styles.mono}>RFQ #{h.rfq_no || h.rfq_id}</span>{" "}
                      · {fmtShortDate(h.timestamp || h.created_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className={styles.mono} style={{ fontSize: 13, fontWeight: 600 }}>
                      ₹ {fmtINR(total)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Success modal
   ════════════════════════════════════════════════════════════════ */
const SuccessModal = ({ rfq, totals, products, submittedAt, submittedRef, onClose }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(submittedRef);
      toast.success("Reference copied");
    } catch (_) {
      toast.error("Couldn't copy — please copy manually.");
    }
  };

  return (
    <div className={styles.confirmOverlay}>
      <div className={styles.confirmModal} role="dialog" aria-modal="true">
        <div className={styles.confirmHero}>
          <div className={styles.checkStage}>
            <svg className={styles.checkSvg} viewBox="0 0 80 80" aria-hidden="true">
              <circle className={styles.checkRingBg} cx="40" cy="40" r="38" />
              <circle className={styles.checkRing} cx="40" cy="40" r="36" />
              <path className={styles.checkTick} d="M26 41.5 L36 51.5 L55 31.5" />
            </svg>
          </div>
          <h2>Quote submitted</h2>
          <p>
            Your quote for{" "}
            <strong style={{ color: "var(--fg)" }}>
              RFQ #{rfq.rfq_no} · {rfq.company_name}
            </strong>{" "}
            has been delivered. The buyer team has been notified.
          </p>
          <div className={styles.refChip}>
            <span className={styles.tag}>Reference</span>
            <span className={styles.num}>{submittedRef}</span>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={handleCopy}
              aria-label="Copy reference"
            >
              <Copy size={13} />
            </button>
          </div>
        </div>

        <div className={styles.confirmBody}>
          <div className={styles.confirmGrid}>
            <div className={`${styles.confirmCell} ${styles.total}`}>
              <div className={styles.k}>Grand total submitted</div>
              <div className={styles.v}>₹ {fmtINR(totals.grand)}</div>
            </div>
            <div className={styles.confirmCell}>
              <div className={styles.k}>Products quoted</div>
              <div className={styles.v}>
                {products.length} line item{products.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className={styles.confirmCell}>
              <div className={styles.k}>Submitted at</div>
              <div className={styles.v}>{submittedAt}</div>
            </div>
          </div>
        </div>

        <div className={styles.confirmFoot}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            <ArrowLeft size={13} />
            Back to inquiry
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onClose}>
            Done
            <Check size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   Layout-aware loading skeleton — mirrors wizard structure
   ════════════════════════════════════════════════════════════════ */
const WizardSkeleton = () => (
  <div className={styles.root}>
    <section className={styles.headerStrip}>
      <div className={styles.headerInner}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.skelBar} style={{ width: 80, height: 12 }} />
          <div className={styles.skelBar} style={{ width: "55%", height: 28, marginTop: 12 }} />
          <div className={styles.skelBar} style={{ width: "70%", height: 14, marginTop: 10 }} />
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <div className={styles.skelBar} style={{ width: 110, height: 26, borderRadius: 999 }} />
          <div className={styles.skelBar} style={{ width: 140, height: 26, borderRadius: 999 }} />
        </div>
      </div>
    </section>
    <nav className={styles.stepper}>
      {[0, 1, 2].map((i) => (
        <React.Fragment key={i}>
          <div className={styles.skelStep}>
            <div className={styles.skelBar} style={{ width: 24, height: 24, borderRadius: 7 }} />
            <div>
              <div className={styles.skelBar} style={{ width: 120, height: 12 }} />
              <div className={styles.skelBar} style={{ width: 90, height: 10, marginTop: 6 }} />
            </div>
          </div>
          {i < 2 && <div className={styles.stepDivider} />}
        </React.Fragment>
      ))}
    </nav>
    <main className={styles.content}>
      <div style={{ marginBottom: 18 }}>
        <div className={styles.skelBar} style={{ width: 220, height: 19 }} />
        <div className={styles.skelBar} style={{ width: 380, height: 13, marginTop: 6 }} />
      </div>

      {/* Buyer details card skeleton */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.skelBar} style={{ width: 110, height: 13 }} />
          <div className={styles.skelBar} style={{ width: 160, height: 22, borderRadius: 999 }} />
        </div>
        <div className={styles.detailGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div className={styles.detailCell} key={i}>
              <div className={styles.skelBar} style={{ width: 80, height: 10 }} />
              <div className={styles.skelBar} style={{ width: "70%", height: 14, marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>

      {/* What you're quoting skeleton */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <div className={styles.cardHead}>
          <div className={styles.skelBar} style={{ width: 140, height: 13 }} />
          <div className={styles.skelBar} style={{ width: 70, height: 22, borderRadius: 999 }} />
        </div>
        <div style={{ padding: "8px 22px" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 0",
                borderTop: i > 0 ? "1px solid var(--border)" : undefined,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className={styles.skelBar} style={{ width: 36, height: 36, borderRadius: 9 }} />
                <div>
                  <div className={styles.skelBar} style={{ width: 180, height: 14 }} />
                  <div className={styles.skelBar} style={{ width: 240, height: 12, marginTop: 6 }} />
                </div>
              </div>
              <div className={styles.skelBar} style={{ width: 60, height: 14 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Terms skeleton */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <div className={styles.cardHead}>
          <div className={styles.skelBar} style={{ width: 140, height: 13 }} />
          <div className={styles.skelBar} style={{ width: 80, height: 22, borderRadius: 999 }} />
        </div>
        <div className={styles.cardSection}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px dashed var(--border)",
              }}
            >
              <div className={styles.skelBar} style={{ width: 26, height: 22, borderRadius: 6 }} />
              <div className={styles.skelBar} style={{ width: `${88 - i * 8}%`, height: 14 }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  </div>
);

export default SendQuoteWizard;
