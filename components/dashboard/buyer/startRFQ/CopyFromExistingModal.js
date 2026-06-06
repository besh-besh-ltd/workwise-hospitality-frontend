import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import { createPortal } from "react-dom";
import {
  Search, X, Copy as CopyIcon, FileText, Gavel,
  Loader2, Check, ArrowRight, Building2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import { getRFQS, copyRfq } from "@/services/rfq";
import styles from "./CopyFromExistingModal.module.scss";

const PAGE_SIZE = 6;

/**
 * Two-phase modal that backs the "Copy from existing" CTA on Start-RFQ:
 *
 *   PHASE 1 (PICK) — search + paginate RFQs, pick one, optionally change the
 *                    target business unit (defaults to the source RFQ's BU),
 *                    click Copy. We call POST /rfq/copy.
 *   PHASE 2 (DONE) — show "Copied! Edit draft now?". Edit → push to the
 *                    edit-mode URL (?draft_id=…). Cancel → close modal.
 *
 * No external state — the modal owns everything except the trigger (open/close)
 * and the redirect target after Edit.
 */
const PHASE = { PICK: "pick", DONE: "done" };

const CopyFromExistingModal = ({ isOpen, onClose }) => {
  const router = useRouter();
  const userProfile = useSelector((s) => s.userProfile);

  // ── Hotel options from the user's hospitality_mappings (hotel-level rows
  //    only). Same shape the existing CopyRFQModal uses.
  const hotelOptions = useMemo(() => {
    const mappings = (userProfile?.hospitality_mappings || []).filter(
      (m) => m.hospitality_hotel_id != null
    );
    const seen = new Set();
    const out = [];
    for (const m of mappings) {
      if (seen.has(m.hospitality_hotel_id)) continue;
      seen.add(m.hospitality_hotel_id);
      out.push({
        value: m.hospitality_hotel_id,
        label: m.company_name
          ? `${m.company_name} — ${m.hotel_name}`
          : m.hotel_name,
      });
    }
    return out;
  }, [userProfile?.hospitality_mappings]);

  const [phase, setPhase] = useState(PHASE.PICK);
  const [query, setQuery] = useState("");
  const [rfqs, setRfqs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedRfq, setSelectedRfq] = useState(null);
  const [targetHotelId, setTargetHotelId] = useState("");
  const [copying, setCopying] = useState(false);

  // Result data after a successful copy.
  const [copiedRfq, setCopiedRfq] = useState(null);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  // Reset everything on close.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    setPhase(PHASE.PICK);
    setQuery("");
    setRfqs([]);
    setTotal(0);
    setPage(1);
    setSelectedRfq(null);
    setTargetHotelId("");
    setCopying(false);
    setCopiedRfq(null);
  }, [isOpen]);

  // Whenever a new RFQ is picked, default the target BU to the source's.
  useEffect(() => {
    if (!selectedRfq) {
      setTargetHotelId("");
      return;
    }
    const sourceHotel = selectedRfq.hotel_id;
    if (sourceHotel && hotelOptions.some((o) => Number(o.value) === Number(sourceHotel))) {
      setTargetHotelId(Number(sourceHotel));
    } else {
      setTargetHotelId(hotelOptions[0]?.value ?? "");
    }
  }, [selectedRfq, hotelOptions]);

  // Fetch RFQs whenever the modal opens, the query changes, or page flips.
  // Debounced on query so we don't spam the backend per keystroke.
  useEffect(() => {
    if (!isOpen || phase !== PHASE.PICK) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    const myReq = ++reqIdRef.current;
    debounceRef.current = setTimeout(() => {
      getRFQS({
        page,
        limit: PAGE_SIZE,
        search_val: query.trim() || undefined,
        sort: "DESC",
      })
        .then((res) => {
          if (myReq !== reqIdRef.current) return;
          setRfqs(Array.isArray(res?.data) ? res.data : []);
          setTotal(Number(res?.total_items) || 0);
        })
        .catch(() => {
          if (myReq !== reqIdRef.current) return;
          setRfqs([]);
          setTotal(0);
        })
        .finally(() => {
          if (myReq === reqIdRef.current) setLoading(false);
        });
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [isOpen, phase, query, page]);

  // Reset to page 1 whenever the query changes.
  useEffect(() => {
    setPage(1);
  }, [query]);

  // ESC closes.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !copying) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, copying]);

  // Lock body scroll.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleCopy = useCallback(async () => {
    if (!selectedRfq?.id || !targetHotelId || copying) return;
    setCopying(true);
    try {
      const res = await copyRfq({
        source_rfq_id: selectedRfq.id,
        target_hotel_id: Number(targetHotelId),
      });
      const data = res?.data || {};
      setCopiedRfq({
        new_rfq_id: data.new_rfq_id,
        new_rfq_no: data.new_rfq_no,
        source_rfq_no: selectedRfq.rfq_no,
        is_tender: selectedRfq.is_tender,
      });
      setPhase(PHASE.DONE);
    } catch (err) {
      const message =
        err?.message?.response?.data?.message ||
        err?.message?.message ||
        err?.message ||
        "Failed to copy RFQ. Please try again.";
      toast.error(typeof message === "string" ? message : "Failed to copy RFQ.");
    } finally {
      setCopying(false);
    }
  }, [selectedRfq, targetHotelId, copying]);

  const handleEditDraft = () => {
    if (!copiedRfq?.new_rfq_id) return;
    onClose?.();
    router.push(
      `/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${copiedRfq.new_rfq_id}`
    );
  };

  if (!isOpen) return null;
  if (typeof window === "undefined") return null;

  // Helper to render an RFQ row in the picker.
  const renderRfqRow = (r) => {
    const isSelected = selectedRfq?.id === r.id;
    const isTender = r.is_tender === 1 || r.is_tender === true;
    const sourceHotelLabel =
      hotelOptions.find((h) => Number(h.value) === Number(r.hotel_id))?.label ||
      r.hotel_name ||
      "—";
    return (
      <button
        type="button"
        key={r.id}
        className={`${styles.rfqRow} ${isSelected ? styles.rfqRowSelected : ""}`}
        onClick={() => setSelectedRfq(r)}
      >
        <span className={`${styles.typeIcon} ${isTender ? styles.typeIconTender : ""}`}>
          {isTender ? <Gavel size={12} /> : <FileText size={12} />}
        </span>
        <div className={styles.rfqMain}>
          <div className={styles.rfqTitle}>
            {r.title || `#${r.rfq_no}`}
          </div>
          <div className={styles.rfqMeta}>
            <span className={styles.rfqNo}>#{r.rfq_no}</span>
            <span className={styles.metaDot} />
            <span className={styles.rfqHotel}>
              <Building2 size={10} /> {sourceHotelLabel}
            </span>
          </div>
        </div>
        <span className={styles.selectMark}>
          {isSelected ? (
            <Check size={14} strokeWidth={3} />
          ) : (
            <span className={styles.selectMarkEmpty} />
          )}
        </span>
      </button>
    );
  };

  const renderPickPhase = () => (
    <>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>Copy from existing</h3>
          <p className={styles.subtitle}>
            Pick a past RFQ — its products, vendors and terms come along as a
            fresh draft you can edit before publishing.
          </p>
        </div>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </header>

      <div className={styles.searchBar}>
        <Search size={14} className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search by title or RFQ number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={14} className={styles.spinner} />
            <span>Loading…</span>
          </div>
        ) : rfqs.length === 0 ? (
          <div className={styles.emptyState}>
            {query
              ? `No RFQs match "${query.trim()}".`
              : "No RFQs available to copy."}
          </div>
        ) : (
          rfqs.map(renderRfqRow)
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pagerBtn}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span className={styles.pagerLabel}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className={styles.pagerBtn}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}

      <div className={styles.targetSection}>
        <label className={styles.targetLabel} htmlFor="copy-target-hotel">
          Target business unit
        </label>
        <select
          id="copy-target-hotel"
          className={styles.targetSelect}
          disabled={!selectedRfq || hotelOptions.length === 0}
          value={targetHotelId || ""}
          onChange={(e) => setTargetHotelId(Number(e.target.value))}
        >
          {hotelOptions.length === 0 ? (
            <option value="">No business units available</option>
          ) : (
            hotelOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          )}
        </select>
        {selectedRfq && hotelOptions.length > 0 &&
          Number(selectedRfq.hotel_id) !== Number(targetHotelId) && (
            <div className={styles.crossUnitNote}>
              Copying across business units — vendor assignments will be
              re-resolved against the target BU's catalog.
            </div>
          )}
      </div>

      <footer className={styles.footer}>
        <span className={styles.footerHint}>
          {selectedRfq
            ? `Selected: #${selectedRfq.rfq_no}${selectedRfq.title ? ` — ${selectedRfq.title}` : ""}`
            : "Select an RFQ to continue."}
        </span>
        <div className={styles.footerActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={copying}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleCopy}
            disabled={!selectedRfq || !targetHotelId || copying}
          >
            {copying ? (
              <>
                <Loader2 size={13} className={styles.spinner} /> Copying…
              </>
            ) : (
              <>
                <CopyIcon size={13} /> Copy
              </>
            )}
          </button>
        </div>
      </footer>
    </>
  );

  const renderDonePhase = () => (
    <>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>RFQ copied</h3>
          <p className={styles.subtitle}>
            Your new draft is ready. Open it to review, adjust, and publish.
          </p>
        </div>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </header>

      <div className={styles.successCard}>
        <span className={styles.successIcon}>
          <Check size={18} strokeWidth={3} />
        </span>
        <div className={styles.successMain}>
          <div className={styles.successTitle}>
            Copied to draft <strong>#{copiedRfq?.new_rfq_no}</strong>
          </div>
          <div className={styles.successMeta}>
            Source: #{copiedRfq?.source_rfq_no}
          </div>
        </div>
      </div>

      <p className={styles.confirmPrompt}>
        Would you like to edit the draft now?
      </p>

      <footer className={styles.footer}>
        <span className={styles.footerHint}>
          You can also find this draft under <strong>Drafts</strong> any time.
        </span>
        <div className={styles.footerActions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.primaryBtn} onClick={handleEditDraft}>
            Edit draft <ArrowRight size={13} />
          </button>
        </div>
      </footer>
    </>
  );

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={() => {
        if (!copying) onClose?.();
      }}
    >
      <div
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Copy from existing RFQ"
      >
        {phase === PHASE.PICK ? renderPickPhase() : renderDonePhase()}
      </div>
    </div>,
    document.body
  );
};

export default CopyFromExistingModal;
