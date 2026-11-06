import React, { useEffect, useMemo, useState } from "react";
import Modal from "react-modal";
import { TriangleAlert, Lock } from "lucide-react";
import base from "@/components/modal/ConfirmationModal.module.scss";
import styles from "./RfqCloseModal.module.scss";
import { getRfqClosePreview, closeRfqItems, closeRFQ } from "@/services/rfq";
import { ITEM_CLOSE_REASONS, CLOSE_BLOCKER_TEXT, awardOutcomeLabel, blockedItemsToExplain } from "@/utils/rfqItemClosure";

// Close an RFQ, or close its leftover items without award.
//
//   mode "items"  pick the items still open, a reason and remarks; the RFQ
//                 stays open (POST /rfq/:id/items/close)
//   mode "rfq"    close the whole RFQ; items still open are closed without
//                 award with the chosen reason, and the dialog names the POs and
//                 award approvals the close cancels (POST /rfq/close-rfq/:id)
//
// Both read GET /rfq/:id/close-preview first, so what the dialog says is what
// the server will do.

const errorMessage = (err, fallback) =>
  err?.message?.response?.data?.message || err?.response?.data?.message || fallback;

const RfqCloseModal = ({ isOpen, mode = "rfq", rfq, entity = "RFQ", onClose, onDone }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const rfqId = rfq?.id;

  useEffect(() => {
    if (!isOpen) {
      setPreview(null);
      setLoadError(null);
      setSelected([]);
      setReason("");
      setRemarks("");
      setComment("");
      setTouched(false);
      setSubmitting(false);
      setSubmitError(null);
      return;
    }
    if (!rfqId) return;
    let cancelled = false;
    setLoading(true);
    getRfqClosePreview(rfqId)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || null;
        setPreview(data);
        const closable = (data?.items || []).filter((i) => i.closable);
        setSelected(closable.map((i) => i.rfq_product_id));
        // Preselect the reason when every closable item points the same way.
        const suggested = [...new Set(closable.map((i) => i.suggested_reason).filter(Boolean))];
        if (mode === "items" && suggested.length === 1) setReason(suggested[0]);
      })
      .catch((err) => { if (!cancelled) setLoadError(errorMessage(err, "Could not load the items of this RFQ.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, rfqId, mode]);

  const items = preview?.items || [];
  const openItems = items.filter((i) => i.state === "open");
  const closableItems = items.filter((i) => i.closable);
  const blockedItems = blockedItemsToExplain(items);
  const onClose_ = preview?.on_close_rfq || null;
  const outcome = awardOutcomeLabel(preview?.award_outcome, preview?.summary);

  const needsRemarks = reason === "other";
  const remarksMissing = needsRemarks && !remarks.trim();
  const valid = useMemo(() => {
    if (mode === "items") return selected.length > 0 && !!reason && !remarksMissing;
    // Close RFQ: a comment always; an item reason is optional ("Closed with the RFQ").
    return comment.trim().length > 0 && !remarksMissing;
  }, [mode, selected, reason, remarksMissing, comment]);

  const toggle = (id) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = async () => {
    setTouched(true);
    if (!valid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let res;
      if (mode === "items") {
        res = await closeRfqItems(rfqId, {
          rfq_product_ids: selected,
          reason_code: reason,
          remarks: remarks.trim() || undefined,
        });
      } else {
        const itemClosure = reason
          ? { item_reason_code: reason, item_remarks: remarks.trim() || undefined }
          : {};
        res = await closeRFQ(rfqId, comment.trim(), itemClosure);
      }
      if (res?.status === 1) {
        onDone?.(res);
      } else {
        setSubmitError(res?.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setSubmitError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === "items" ? "Close remaining items" : `Close ${entity}`;
  const description =
    mode === "items"
      ? `Close the items of ${entity} #${rfq?.rfq_no || ""} that will not be awarded. The ${entity} stays open for the rest; vendors can no longer quote the closed items.`
      : `Close ${entity} #${rfq?.rfq_no || ""}. Vendors will no longer be able to submit quotes.`;

  const reasonPicker = (
    <div className={base.commentGroup}>
      <label className={base.commentLabel} htmlFor="item_close_reason-rfq_close_modal">
        {mode === "items" ? "Reason" : "Reason for the items not awarded"}
        {mode === "items" && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <select
        id="item_close_reason-rfq_close_modal"
        className={styles.select}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={submitting}
      >
        <option value="">{mode === "items" ? "Choose a reason" : "Closed with the RFQ (no specific reason)"}</option>
        {ITEM_CLOSE_REASONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      {touched && mode === "items" && !reason && <span className={base.commentError}>Choose a reason</span>}
      {(reason || mode === "items") && (
        <>
          <label className={base.commentLabel} htmlFor="item_close_remarks-rfq_close_modal" style={{ marginTop: 10 }}>
            Remarks{needsRemarks && <span style={{ color: "#ef4444" }}> *</span>}
          </label>
          <textarea
            id="item_close_remarks-rfq_close_modal"
            className={base.commentTextarea}
            rows={2}
            placeholder="Anything the audit trail should say about these items"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={submitting}
          />
          {touched && remarksMissing && <span className={base.commentError}>Add remarks for "Other"</span>}
        </>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={submitting ? undefined : onClose}
      ariaHideApp={false}
      contentLabel={title}
      shouldCloseOnOverlayClick={!submitting}
      shouldCloseOnEsc={!submitting}
      overlayClassName={base.overlay}
      className={`${base.content} ${styles.wide}`}
    >
      <div className={`${base.accentBar} ${base.accentWarning}`} />
      <div className={base.inner}>
        <div className={base.header}>
          <div className={`${base.iconWrap} ${base.iconWarning}`}>
            {mode === "items" ? <Lock size={18} strokeWidth={1.8} /> : <TriangleAlert size={18} strokeWidth={1.8} />}
          </div>
          <div className={base.headerText}>
            <h4 className={base.title}>{title}</h4>
            <p className={base.desc}>{description}</p>
          </div>
        </div>

        {loading && <div className={styles.note}>Loading the items…</div>}
        {loadError && <div className={styles.error}>{loadError}</div>}

        {preview && (
          <div className={styles.summary} data-testid="rfq-close-summary">
            {preview.summary.awarded} awarded · {preview.summary.closed_no_award} closed without award ·{" "}
            {preview.summary.open} open
            {preview.summary.award_pending > 0 && <> · {preview.summary.award_pending} awaiting award approval</>}
            {outcome && <span className={styles.outcome}>{outcome}</span>}
          </div>
        )}

        {preview && mode === "items" && (
          <>
            {closableItems.length === 0 ? (
              <div className={styles.note}>No item can be closed right now.</div>
            ) : (
              <ul className={styles.itemList}>
                {closableItems.map((i) => (
                  <li key={i.rfq_product_id}>
                    <label className={styles.itemRow}>
                      <input
                        type="checkbox"
                        checked={selected.includes(i.rfq_product_id)}
                        onChange={() => toggle(i.rfq_product_id)}
                        disabled={submitting}
                        id={`item_close_pick_${i.rfq_product_id}-rfq_close_modal`}
                      />
                      <span className={styles.itemName}>{i.product_name}</span>
                      <span className={styles.itemMeta}>
                        {i.quoted_vendor_count > 0
                          ? `${i.quoted_vendor_count} quote${i.quoted_vendor_count === 1 ? "" : "s"}`
                          : "No quotes"}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {blockedItems.length > 0 && (
              <div className={styles.blocked} data-testid="rfq-close-blocked">
                <div className={styles.blockedTitle}>Can't be closed right now</div>
                <ul className={styles.blockedList}>
                  {blockedItems.map((i) => (
                    <li
                      key={i.rfq_product_id}
                      className={styles.blockedRow}
                      data-testid={`rfq-close-blocked-${i.rfq_product_id}`}
                    >
                      <span className={styles.itemName}>{i.product_name}</span>
                      <span className={styles.blockedReason}>
                        {i.blockers.map((b) => CLOSE_BLOCKER_TEXT[b] || b).join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {closableItems.length > 0 && reasonPicker}
          </>
        )}

        {preview && mode === "rfq" && (
          <>
            {openItems.length > 0 && (
              <>
                <div className={styles.note}>
                  {openItems.length === 1 ? "This item has" : `These ${openItems.length} items have`} no award and will be
                  closed without award:
                </div>
                <ul className={styles.itemList}>
                  {openItems.map((i) => (
                    <li key={i.rfq_product_id} className={styles.itemRow}>
                      <span className={styles.itemName}>{i.product_name}</span>
                    </li>
                  ))}
                </ul>
                {reasonPicker}
              </>
            )}
            {onClose_?.pending_po_approvals_cancelled?.length > 0 && (
              <div className={styles.warn} data-testid="rfq-close-po-warning">
                {onClose_.pending_po_approvals_cancelled.length === 1 ? "This purchase order is" : "These purchase orders are"}{" "}
                still awaiting approval and will be cancelled:{" "}
                <strong>{onClose_.pending_po_approvals_cancelled.map((p) => p.po_number || `#${p.po_id}`).join(", ")}</strong>
              </div>
            )}
            {(onClose_?.pending_award_approvals_cancelled > 0 || onClose_?.active_rounds_cancelled > 0) && (
              <div className={styles.warn}>
                Also cancelled:{" "}
                {[
                  onClose_.pending_award_approvals_cancelled > 0 &&
                    `${onClose_.pending_award_approvals_cancelled} award approval${onClose_.pending_award_approvals_cancelled === 1 ? "" : "s"}`,
                  onClose_.active_rounds_cancelled > 0 &&
                    `${onClose_.active_rounds_cancelled} negotiation round${onClose_.active_rounds_cancelled === 1 ? "" : "s"}`,
                ].filter(Boolean).join(" and ")}
                .
              </div>
            )}
          </>
        )}

        {mode === "rfq" && (
          <div className={base.commentGroup}>
            <label className={base.commentLabel} htmlFor="close_comment-rfq_close_modal">
              Reason for closing <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              id="close_comment-rfq_close_modal"
              className={base.commentTextarea}
              rows={3}
              placeholder={`Please provide a reason for closing this ${entity}...`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={() => setTouched(true)}
              disabled={submitting}
            />
            {touched && !comment.trim() && <span className={base.commentError}>Comment is required</span>}
          </div>
        )}

        {submitError && <div className={styles.error}>{submitError}</div>}

        <div className={base.actions}>
          <button
            type="button"
            onClick={onClose}
            className={`${base.btn} ${base.btnCancel}`}
            id="cancel-rfq_close_modal"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className={`${base.btn} ${base.btnWarning}`}
            id="confirm-rfq_close_modal"
            disabled={submitting || loading || !valid || (mode === "items" && closableItems.length === 0)}
          >
            {submitting && <span className={base.spinner} role="status" aria-hidden="true" />}
            {mode === "items"
              ? (selected.length ? `Close ${selected.length} item${selected.length === 1 ? "" : "s"}` : "Close items")
              : `Close ${entity}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RfqCloseModal;
