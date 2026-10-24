import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  AlertTriangle, Camera, CameraOff, CheckCircle2, Clock, FileText, Link2Off, Loader2, PackageCheck, PackageOpen,
  RefreshCw, Ruler, ScanBarcode, Search, Send, Upload, Volume2, VolumeX, WifiOff,
} from "lucide-react";
import LazyCameraScanner from "@/components/inventory/scan/LazyCameraScanner";
import { parseScan } from "@/components/inventory/scan/parseScan";
import { useWedgeScanner } from "@/components/inventory/scan/useWedgeScanner";
import scanFeedback from "@/components/inventory/scan/scanFeedback";
import scanStyles from "@/components/inventory/scan/Scan.module.scss";
import MobileActionBar, { MobileActionButton } from "@/components/shared/mobile/MobileActionBar";
import useIsMobile from "@/hooks/useIsMobile";
import { getTokenReceiveContext, postTokenGrn, uploadTokenGrnAttachment } from "@/services/inventory";
import ReceiveLineRow from "./ReceiveLineRow";
import ReceiveLineCard from "./ReceiveLineCard";
import QtyPad from "./QtyPad";
import ReceiveConfirmModal from "./ReceiveConfirmModal";
import DeliveryDocuments from "./DeliveryDocuments";
import {
  HEADER_FIELDS, addQty, blankHeader, blankLine, buildGrnInput, errorInfo, fmtDay, fmtInstant, fmtQty, fmtQtyUnit,
  isDecimalUnit, lineQty, newClientEventId, parseQty, qtyText, subQty, toQ, validateForPost,
} from "./receiveUtils";
import styles from "./receive.module.scss";
import own from "./TokenReceivePage.module.scss";

// The site rep's receive page (/receive/token?t=<token>). The buyer emails a
// person with no account a link; they open it on a phone at the loading bay,
// scan or type what arrived and post a goods receipt for the link's PO at the
// link's hotel. Backend contract: task C5 (GET/POST /inventory/token/*).
//
// The token is a receiving credential:
//   - it is read from ?t= (or ?token=, a legacy link forwarded by the
//     next.config redirect) and the whole query is dropped from the address
//     bar with history.replaceState before any request is made;
//   - it lives in memory and in sessionStorage `inv.receiveToken` (this tab
//     only, so a reload still works). Never localStorage, never IndexedDB,
//     never a log line;
//   - it goes out only as X-Receive-Token, through the dedicated token client
//     in services/inventory (no buyer JWT, no SessionExpiredModal on a 401).
//
// The page never shows a price, rate, value or tax, nor any buyer contact. It
// has no mark-out on arrival, no unit-conversion prompt and no item mapping: a
// link can do none of those, so a line whose unit has no conversion yet is
// shown disabled with what to ask the buyer.
//
// Posting is one POST /token/grn keyed by a session clientEventId. A link post
// is never queued in the offline outbox (that is IndexedDB). If the connection
// drops, the screen (no token in it) is kept in sessionStorage
// `inv.receiveDraft:<poId>` and Retry re-sends with the same clientEventId, so
// a receipt that did land replays instead of doubling.
//
// Scans are matched on the device against the order's own barcodes
// (ctx.lines[].barcodes): the server resolve route needs a login.
//
// Built from C1's exported receive parts (ReceiveLineRow, ReceiveLineCard,
// QtyPad, ReceiveConfirmModal, DeliveryDocuments, receiveUtils) and B4's scan
// parts (parseScan, useWedgeScanner, LazyCameraScanner, scanFeedback).

export const TOKEN_STORAGE_KEY = "inv.receiveToken";
export const draftStorageKey = (poId) => `inv.receiveDraft:${poId}`;

const EXPIRED_MESSAGE = "This receiving link has expired. Ask the buyer for a new one.";
const MISSING_MESSAGE = "Open the receiving link from your email again. If it still doesn't open, ask the buyer for a new one.";
const UNKNOWN_CODE = "This code isn't on this order";
const NETWORK_DROPPED =
  "The connection dropped before the server answered. Your entries are kept on this device. " +
  "Retry when you have signal: a receipt is never recorded twice.";
const NOT_RECEIVABLE = {
  received: "Everything on this order has been received",
  closed_short: "This order was closed",
  not_ready: "This order can't be received yet",
};
export const uomBlockedMessage = (line) =>
  `Ask the buyer to set the unit conversion for ${line?.productName || "this item"} first`;

const FLASH_MS = 1200;
const DRAFT_SAVE_MS = 300;
const CAMERA_REPEAT_MS = 1500;

// ── sessionStorage (this tab only) ───────────────────────────────────────────
const session = {
  get(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Private mode or full: the page keeps working from memory.
    }
  },
  remove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Nothing was stored.
    }
  },
};

const ENTRY_FIELDS = ["received", "rejected", "reason", "batchNo", "mfgDate", "expiryDate", "remarks"];

const readDraft = (poId) => {
  const raw = session.get(draftStorageKey(poId));
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    return d && typeof d === "object" && d.entries && typeof d.entries === "object" ? d : null;
  } catch {
    return null;
  }
};

/**
 * Read the link's token, then take the whole query (t, and the token / po /
 * rfq a legacy link brings through the redirect) and any fragment out of the
 * address bar. Next's history entry is rewritten too, so Back / Forward never
 * puts the token back.
 */
const takeTokenFromUrl = () => {
  if (typeof window === "undefined") return null;
  const { pathname, search, hash } = window.location;
  const params = new URLSearchParams(search);
  const token = (params.get("t") || params.get("token") || "").trim();
  if (search || hash) {
    const state = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
    window.history.replaceState({ ...state, url: pathname, as: pathname }, "", pathname);
  }
  return token || null;
};

// ── Server answers ───────────────────────────────────────────────────────────
const retryAfterMinutes = (err) => {
  const h = err?.response?.headers;
  const raw = typeof h?.get === "function" ? h.get("retry-after") : h?.["retry-after"] ?? h?.["Retry-After"];
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? Math.max(1, Math.ceil(seconds / 60)) : null;
};

/** 429: "try again in N min" from Retry-After, else the server's sentence. */
const rateLimitMessage = (err) => {
  const minutes = retryAfterMinutes(err);
  if (minutes) return `Too many requests, try again in ${minutes} min`;
  return errorInfo(err, "Too many requests. Please wait a few minutes and try again.").message;
};

/** What a failed context load means for the page. */
const loadFailure = (err) => {
  const info = errorInfo(err, "Could not load this order. Try again.");
  if (info.httpStatus === 401) return { phase: "expired" };
  if (info.httpStatus === 429) return { phase: "error", message: rateLimitMessage(err), retry: true };
  if (info.code === "CONFLICT" && info.details.reason === "TOKEN_NO_HOTEL") {
    return { phase: "no_hotel", message: info.message };
  }
  if (info.httpStatus == null) {
    return { phase: "error", message: "Couldn't reach the server. Check your signal and try again.", retry: true };
  }
  return { phase: "error", message: info.message, retry: info.httpStatus >= 500 };
};

// ── Scans, matched on the device ─────────────────────────────────────────────
const sameUnit = (a, b) =>
  !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/**
 * Match one read against this order's barcodes, by exact code. A GS1 read
 * also matches by its GTIN (and the 13-digit form of a GTIN-14 with a leading
 * 0). Returns the resolve shape the receive screens use:
 * {kind:'item', code, item:{poLineId, packFactor}, gs1} or {kind:'unknown', code}.
 */
export const resolveOnOrder = (parsed, lines = []) => {
  if (!parsed?.code) return { kind: "unknown", code: "" };
  const candidates = new Set([parsed.code]);
  const gtin = parsed.gs1?.gtin;
  if (gtin) {
    candidates.add(gtin);
    if (gtin.startsWith("0")) candidates.add(gtin.slice(1));
  }
  for (const line of lines) {
    for (const b of line.barcodes || []) {
      if (b?.code != null && candidates.has(String(b.code))) {
        return {
          kind: "item",
          code: String(b.code),
          item: { poLineId: line.poLineId, packFactor: Number(b.packFactor) > 0 ? Number(b.packFactor) : 1 },
          gs1: parsed.gs1 || null,
        };
      }
    }
  }
  return { kind: "unknown", code: parsed.code };
};

/**
 * The scan box for a link: camera, keyboard-wedge scanner and typed codes,
 * looked up by `onRead(parsed)` (which returns the status line to show,
 * {tone:'ok'|'warn', text, code}). Same look as ScanInput, which can't be used
 * here because it resolves through the buyer route. `disabled` pauses reads
 * and leaves an open camera running.
 */
const TokenScanBox = ({ disabled = false, onRead }) => {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [camera, setCamera] = useState(false);
  const [status, setStatus] = useState(null);
  const [muted, setMutedState] = useState(() => scanFeedback.isMuted());
  const disabledRef = useRef(disabled);
  const onReadRef = useRef(onRead);
  const seenRef = useRef(new Map());

  useEffect(() => {
    disabledRef.current = disabled;
    onReadRef.current = onRead;
  });
  useEffect(() => scanFeedback.installUnlock(), []);

  const read = useCallback((raw, source) => {
    if (disabledRef.current) return false;
    const parsed = parseScan(raw);
    if (!parsed) return false;
    if (source === "camera") {
      // The camera sees a code many times a second: one sighting per 1.5 s.
      const now = Date.now();
      const seen = seenRef.current;
      for (const [code, at] of seen) if (now - at >= CAMERA_REPEAT_MS) seen.delete(code);
      const repeat = seen.has(parsed.code);
      seen.set(parsed.code, now);
      if (repeat) return false;
    }
    const next = onReadRef.current?.(parsed) || null;
    if (next?.tone === "ok") scanFeedback.success();
    else scanFeedback.error();
    setStatus(next);
    return true;
  }, []);

  useWedgeScanner({ onCode: (raw) => read(raw, "wedge"), enabled: !disabled });

  const submitTyped = () => {
    if (!disabled && read(value, "manual")) setValue("");
  };

  const onKeyDown = (e) => {
    if (e.key !== "Enter" && e.key !== "Tab") return;
    // The wedge listener ran first and took this burst as a scan: its
    // characters also landed here, so clear them instead of reading twice.
    if (e.nativeEvent?.defaultPrevented === true) {
      setValue("");
      return;
    }
    if (e.key === "Tab") return;
    e.preventDefault();
    submitTyped();
  };

  const toggleCamera = () => {
    if (!camera) scanFeedback.unlock();
    setCamera((on) => !on);
  };

  const toggleMute = () => {
    const next = !muted;
    scanFeedback.setMuted(next);
    setMutedState(next);
    if (!next) scanFeedback.unlock();
  };

  return (
    <div className={scanStyles.scan}>
      <div className={scanStyles.bar}>
        <div className={scanStyles.field}>
          <ScanBarcode size={16} className={scanStyles.fieldIcon} aria-hidden="true" />
          <input
            id={inputId}
            className={scanStyles.input}
            type="text"
            data-scan-input="true"
            aria-label="Scan or type a code"
            placeholder="Scan or type a code"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          className={`${scanStyles.btn} ${scanStyles.btnPrimary}`}
          onClick={submitTyped}
          disabled={disabled || !value.trim()}
        >
          <Search size={15} aria-hidden="true" />
          <span>Look up</span>
        </button>
        <button
          type="button"
          className={`${scanStyles.btn} ${scanStyles.iconBtn} ${camera ? scanStyles.btnOn : ""}`}
          onClick={toggleCamera}
          disabled={disabled && !camera}
          aria-label={camera ? "Stop camera" : "Scan with camera"}
          title={camera ? "Stop camera" : "Scan with camera"}
        >
          {camera ? <CameraOff size={17} aria-hidden="true" /> : <Camera size={17} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className={`${scanStyles.btn} ${scanStyles.iconBtn}`}
          onClick={toggleMute}
          aria-label="Mute scan sounds"
          aria-pressed={muted}
          title={muted ? "Scan sounds off" : "Scan sounds on"}
        >
          {muted ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}
        </button>
      </div>

      {camera && <LazyCameraScanner onDetected={(raw) => read(raw, "camera")} paused={disabled} />}

      <div
        role="status"
        aria-live="polite"
        className={`${scanStyles.status} ${status ? scanStyles[`status_${status.tone}`] : ""}`}
      >
        {status && (
          <>
            <span className={scanStyles.dot} aria-hidden="true" />
            <span className={scanStyles.statusText}>{status.text}</span>
            {status.code && <span className={scanStyles.mono}>{status.code}</span>}
          </>
        )}
      </div>
    </div>
  );
};

const ScanToast = ({ name, unit, delta, total, onUndo }) => (
  <div className={styles.toastRow}>
    <div style={{ minWidth: 0 }}>
      <div className={styles.toastQty}>+{fmtQty(delta)} (now {fmtQty(total)})</div>
      <div className={styles.toastName}>{name}{unit ? ` · ${unit}` : ""}</div>
    </div>
    <button type="button" className={styles.toastUndo} onClick={onUndo}>
      Undo
    </button>
  </div>
);

// ── Lines a link can't receive (no unit conversion yet) ──────────────────────
const BlockedLineRow = ({ index, line }) => (
  <tbody className={styles.lineGroup}>
    <tr className={`${styles.lineMain} ${styles.lineDone}`} aria-disabled="true">
      <td className={styles.itIdx}>{index + 1}</td>
      <td>
        <div className={styles.itName}>{line.productName}</div>
        <div className={own.blockedNote}>
          <Ruler size={13} aria-hidden="true" />
          <span>{uomBlockedMessage(line)}</span>
        </div>
      </td>
      <td className={styles.num} data-label="Open">
        {fmtQty(line.openAtHotel)} <span className={styles.unit}>{line.unit}</span>
      </td>
      <td colSpan={3} />
    </tr>
  </tbody>
);

const BlockedLineCard = ({ line }) => (
  <article className={styles.rcard} aria-disabled="true">
    <div className={styles.rcardHead}>
      <h3 className={styles.rcardTitle}>{line.productName}</h3>
    </div>
    <div className={styles.rcardMeta}>
      <span>Open <span className={styles.mono}>{fmtQty(line.openAtHotel)}</span> {line.unit}</span>
    </div>
    <div className={own.blockedNote}>
      <Ruler size={13} aria-hidden="true" />
      <span>{uomBlockedMessage(line)}</span>
    </div>
  </article>
);

// ── Receipts this link posted, with "Attach paperwork" ───────────────────────
const PAPER_KINDS = [
  { value: "CHALLAN", label: "Challan" },
  { value: "INVOICE", label: "Invoice" },
  { value: "PHOTO", label: "Photo" },
  { value: "OTHER", label: "Other" },
];
const kindLabel = (k) => PAPER_KINDS.find((x) => x.value === k)?.label || "File";
const STATUS_PILL = { partially_reversed: "Partly reversed", reversed: "Reversed" };

const ReceiptItem = ({ receipt, canAttach, busy, error, onAttach }) => {
  const [kind, setKind] = useState("CHALLAN");
  const name = receipt.grnNumber || `Receipt #${receipt.id}`;
  const files = Array.isArray(receipt.attachments) ? receipt.attachments : [];
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onAttach(file, kind);
  };
  return (
    <li className={own.receipt}>
      <div className={own.receiptHead}>
        <span className={styles.docNo}>{name}</span>
        <span className={own.receiptMeta}>
          Received {fmtDay(receipt.receivedAt)}
          {receipt.lineCount != null ? ` · ${receipt.lineCount} line${Number(receipt.lineCount) === 1 ? "" : "s"}` : ""}
        </span>
        {STATUS_PILL[receipt.status] && (
          <span className={`${styles.pill} ${styles.pillWarn}`}>{STATUS_PILL[receipt.status]}</span>
        )}
      </div>
      {files.length > 0 && (
        <ul className={own.receiptFiles}>
          {files.map((a) => (
            <li key={a.id}>
              {/^https?:\/\//i.test(String(a.url || "")) ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer">{a.fileName || kindLabel(a.kind)}</a>
              ) : (
                <span>{a.fileName || kindLabel(a.kind)}</span>
              )}{" "}
              <span className={`${styles.pill} ${styles.pillNeutral}`}>{kindLabel(a.kind)}</span>
            </li>
          ))}
        </ul>
      )}
      {canAttach && (
        <div className={own.attachRow}>
          <span className={own.attachLabel}>Attach paperwork</span>
          <select
            className={`${styles.select} ${own.kindSelect}`}
            aria-label={`Paperwork type for ${name}`}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={busy}
          >
            {PAPER_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <label className={`${styles.btn} ${styles.btnSecondary} ${styles.fileBtn}`}>
            {busy ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : <Camera size={14} aria-hidden="true" />}
            <span>Take photo</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              aria-label={`Photograph paperwork for ${name}`}
              onChange={pick}
              disabled={busy}
            />
          </label>
          <label className={`${styles.btn} ${styles.btnSecondary} ${styles.fileBtn}`}>
            <Upload size={14} aria-hidden="true" />
            <span>Upload file</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              aria-label={`Upload paperwork for ${name}`}
              onChange={pick}
              disabled={busy}
            />
          </label>
        </div>
      )}
      {error && (
        <div className={styles.formError} role="alert" style={{ margin: "10px 0 0" }}>
          {error}
        </div>
      )}
    </li>
  );
};

/** The posted GRN as a `receipts[]` row, until the refreshed context replaces it. */
const withReceipt = (data, grn, uploaded = []) => {
  if (!data || grn?.id == null) return data;
  const receipts = Array.isArray(data.receipts) ? data.receipts : [];
  if (receipts.some((r) => r.id === grn.id)) return withAttachments(data, grn.id, uploaded);
  const row = {
    id: grn.id,
    grnNumber: grn.grnNumber || null,
    status: grn.status || "posted",
    receivedAt: grn.receivedAt || null,
    postedAt: grn.postedAt || null,
    lineCount: Array.isArray(grn.lines) ? grn.lines.length : null,
    attachments: [...(Array.isArray(grn.attachments) ? grn.attachments : []), ...uploaded],
  };
  return { ...data, receipts: [row, ...receipts] };
};

const withAttachments = (data, grnId, added) => {
  if (!data || !added.length) return data;
  return {
    ...data,
    receipts: (data.receipts || []).map((r) =>
      r.id === grnId ? { ...r, attachments: [...(r.attachments || []), ...added] } : r
    ),
  };
};

/** GrnInput for a link: the server takes the PO and hotel from the token. */
const linkInput = (input) => {
  const out = { ...input };
  delete out.poId;
  delete out.hotelId;
  out.lines = (input.lines || []).map((l) => {
    const line = { ...l };
    delete line.uomFactor;
    delete line.mapToInvItemId;
    delete line.markOutDepartmentId;
    return line;
  });
  return out;
};

const TokenReceivePage = () => {
  const router = useRouter();
  const isMobile = useIsMobile();

  // starting | missing | loading | ready | expired | no_hotel | error
  const [phase, setPhase] = useState("starting");
  const [failure, setFailure] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [header, setHeader] = useState(blankHeader);
  const [entries, setEntries] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [unsent, setUnsent] = useState(false);
  const [restored, setRestored] = useState(false);
  const [posting, setPosting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pad, setPad] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [posted, setPosted] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [attachErrors, setAttachErrors] = useState({});

  // Synchronous mirrors for scans, the draft writer and the post path.
  const tokenRef = useRef(null);
  const ctxRef = useRef(null);
  const headerRef = useRef(header);
  const entriesRef = useRef(entries);
  const sessionKeyRef = useRef(null);
  const unsentRef = useRef(false);
  const touchedRef = useRef(false);
  const postingRef = useRef(false);
  const pendingFilesRef = useRef(pendingFiles);
  const loadSeqRef = useRef(0);
  const toastSeqRef = useRef(0);
  const flashTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);

  const commitCtx = useCallback((data) => {
    ctxRef.current = data;
    setCtx(data);
  }, []);
  const commitEntries = useCallback((next) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);
  const commitHeader = useCallback((next) => {
    headerRef.current = next;
    setHeader(next);
  }, []);
  const commitUnsent = useCallback((v) => {
    unsentRef.current = v;
    setUnsent(v);
  }, []);

  const lines = useMemo(() => ctx?.lines || [], [ctx]);
  const receivableLines = useMemo(() => lines.filter((l) => !l.needsUomFactor), [lines]);
  const lineById = useMemo(() => new Map(lines.map((l) => [Number(l.poLineId), l])), [lines]);

  // ── Session storage: the screen, never the token ──────────────────────────
  const writeDraft = useCallback(() => {
    const poId = ctxRef.current?.po?.id;
    // A dead link (401) has already dropped its draft: a late save must not bring it back.
    if (poId == null || !sessionKeyRef.current || !tokenRef.current) return;
    session.set(draftStorageKey(poId), JSON.stringify({
      v: 1,
      savedAt: Date.now(),
      clientEventId: sessionKeyRef.current,
      unsent: unsentRef.current,
      header: headerRef.current,
      entries: entriesRef.current,
    }));
  }, []);

  const clearDraft = useCallback(() => {
    const poId = ctxRef.current?.po?.id;
    if (poId != null) session.remove(draftStorageKey(poId));
  }, []);

  /** The link is dead (401): drop everything this tab kept for it. */
  const forgetLink = useCallback(() => {
    clearDraft();
    session.remove(TOKEN_STORAGE_KEY);
    tokenRef.current = null;
  }, [clearDraft]);

  // ── Form ──────────────────────────────────────────────────────────────────
  /** A fresh receipt for `data`, or the one this tab had before a reload. */
  const startForm = useCallback((data) => {
    const ctxLines = data?.lines || [];
    const nextEntries = {};
    for (const l of ctxLines) nextEntries[l.poLineId] = blankLine(l);
    const nextHeader = blankHeader();
    let key = newClientEventId();
    let wasUnsent = false;
    let didRestore = false;
    const poId = data?.po?.id;
    const saved = poId != null ? readDraft(poId) : null;
    if (saved && data.receivable !== false) {
      for (const l of ctxLines) {
        const e = saved.entries[l.poLineId];
        if (!e || typeof e !== "object" || l.needsUomFactor) continue;
        const patch = {};
        for (const f of ENTRY_FIELDS) if (typeof e[f] === "string") patch[f] = e[f];
        if (Number(e.scannedAt) > 0) patch.scannedAt = Number(e.scannedAt);
        nextEntries[l.poLineId] = { ...nextEntries[l.poLineId], ...patch };
      }
      const h = saved.header && typeof saved.header === "object" ? saved.header : {};
      for (const f of HEADER_FIELDS) if (typeof h[f] === "string") nextHeader[f] = h[f];
      if ((data.dispatches || []).some((d) => String(d.id) === String(h.dispatchId))) nextHeader.dispatchId = String(h.dispatchId);
      if (typeof saved.clientEventId === "string" && saved.clientEventId) key = saved.clientEventId;
      wasUnsent = saved.unsent === true;
      didRestore = true;
    } else if (saved) {
      session.remove(draftStorageKey(poId));
    }
    sessionKeyRef.current = key;
    touchedRef.current = false;
    commitUnsent(wasUnsent);
    commitEntries(nextEntries);
    commitHeader(nextHeader);
    setRestored(didRestore && !wasUnsent);
    setLineErrors({});
    setFormError(null);
    setPendingFiles([]);
    setPad(null);
    setConfirmOpen(false);
  }, [commitEntries, commitHeader, commitUnsent]);

  // ── Loading ───────────────────────────────────────────────────────────────
  const load = useCallback(async ({ silent = false } = {}) => {
    const token = tokenRef.current;
    if (!token) return null;
    const seq = ++loadSeqRef.current;
    if (!silent) setPhase("loading");
    try {
      const data = await getTokenReceiveContext(token);
      if (seq !== loadSeqRef.current || !mountedRef.current) return null;
      commitCtx(data);
      if (!silent) startForm(data);
      setPhase("ready");
      return data;
    } catch (err) {
      if (seq !== loadSeqRef.current || !mountedRef.current) return null;
      const f = loadFailure(err);
      if (f.phase === "expired") forgetLink();
      // A background refresh that fails keeps what is on screen.
      if (silent && f.phase === "error") return null;
      setFailure(f);
      setPhase(f.phase);
      return null;
    }
  }, [commitCtx, startForm, forgetLink]);

  // Take the token out of the URL first; only then ask the server anything.
  useEffect(() => {
    mountedRef.current = true;
    const fromUrl = takeTokenFromUrl();
    if (fromUrl) session.set(TOKEN_STORAGE_KEY, fromUrl);
    tokenRef.current = fromUrl || session.get(TOKEN_STORAGE_KEY) || null;
    if (tokenRef.current) load();
    else setPhase("missing");
    return () => {
      mountedRef.current = false;
      clearTimeout(flashTimerRef.current);
    };
  }, [load]);

  // Keep Next's router (asPath, the canonical link) in step with the clean
  // URL. Its own hydration step can write the original URL back after we
  // stripped it, so strip again whenever a query shows up.
  const { isReady, asPath, pathname } = router;
  useEffect(() => {
    if (!isReady || typeof window === "undefined") return;
    const urlDirty = !!(window.location.search || window.location.hash);
    if (!urlDirty && !/[?#]/.test(asPath || "")) return;
    if (urlDirty) takeTokenFromUrl();
    Promise.resolve(router.replace({ pathname }, undefined, { shallow: true })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, asPath, pathname]);

  // The screen goes to sessionStorage a moment after each edit.
  useEffect(() => {
    if (!touchedRef.current || posted) return undefined;
    const t = setTimeout(writeDraft, DRAFT_SAVE_MS);
    return () => clearTimeout(t);
  }, [header, entries, posted, writeDraft]);

  // ── Edits ─────────────────────────────────────────────────────────────────
  const patchLine = useCallback((id, patch) => {
    const prev = entriesRef.current;
    if (!prev[id]) return;
    commitEntries({ ...prev, [id]: { ...prev[id], ...patch } });
    setLineErrors((errs) => {
      if (!(id in errs)) return errs;
      const next = { ...errs };
      delete next[id];
      return next;
    });
    setFormError(null);
    touchedRef.current = true;
  }, [commitEntries]);

  const patchHeader = useCallback((patch) => {
    commitHeader({ ...headerRef.current, ...patch });
    setFormError(null);
    touchedRef.current = true;
  }, [commitHeader]);

  /** "Against dispatch": fill only the lines and fields not entered yet. */
  const pickDispatch = useCallback((id) => {
    const dsp = (ctxRef.current?.dispatches || []).find((x) => String(x.id) === String(id));
    if (!dsp) {
      patchHeader({ dispatchId: "" });
      return;
    }
    let next = entriesRef.current;
    for (const dl of dsp.lines || []) {
      const e = next[dl.poLineId];
      const line = lineById.get(Number(dl.poLineId));
      if (e && line && !line.needsUomFactor && !(toQ(e.received) > 0)) {
        next = { ...next, [dl.poLineId]: { ...e, received: qtyText(dl.qty) } };
      }
    }
    if (next !== entriesRef.current) commitEntries(next);
    const hdr = headerRef.current;
    patchHeader({
      dispatchId: String(dsp.id),
      vendorChallanNo: hdr.vendorChallanNo || dsp.challanNo || "",
      vendorChallanDate: hdr.vendorChallanDate || (dsp.challanDate ? String(dsp.challanDate).slice(0, 10) : ""),
      ewayBillNo: hdr.ewayBillNo || dsp.ewayBillNo || "",
      vehicleNo: hdr.vehicleNo || dsp.vehicleNo || "",
    });
  }, [commitEntries, patchHeader, lineById]);

  const flash = (id) => {
    setFlashId(id);
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashId(null), FLASH_MS);
  };

  /** Add `delta` (PO units) to a line's received qty; returns the new total. */
  const addToLine = (line, delta, { scanned = false, gs1 = null } = {}) => {
    const e = entriesRef.current[line.poLineId];
    if (!e) return 0;
    const total = Math.max(0, addQty(parseQty(e.received) ?? 0, delta));
    const patch = { received: qtyText(total) };
    if (scanned) patch.scannedAt = Date.now();
    if (gs1 && line.trackExpiry) {
      if (gs1.batch && !e.batchNo) patch.batchNo = gs1.batch;
      if (gs1.expiry && !e.expiryDate) patch.expiryDate = gs1.expiry;
    }
    patchLine(line.poLineId, patch);
    return total;
  };

  const showScanToast = (line, delta, total) => {
    toastSeqRef.current += 1;
    const toastId = `token-receive-scan-${line.poLineId}-${toastSeqRef.current}`;
    toast(
      <ScanToast
        name={line.productName}
        unit={line.unit}
        delta={delta}
        total={total}
        onUndo={() => {
          const e = entriesRef.current[line.poLineId];
          if (e) patchLine(line.poLineId, { received: qtyText(Math.max(0, subQty(parseQty(e.received) ?? 0, delta))) });
          toast.dismiss(toastId);
        }}
      />,
      { toastId, autoClose: 4000, closeOnClick: false, hideProgressBar: true }
    );
  };

  /** One scan of `packFactor` stock units onto a PO line. */
  const applyItemScan = (line, packFactor, gs1 = null) => {
    const e = entriesRef.current[line.poLineId];
    if (!e) return;
    const factor = Number(line.uomFactor) > 0
      ? Number(line.uomFactor)
      : !line.stockUom || sameUnit(line.unit, line.stockUom) ? 1 : null;
    // Weighed or measured units, and units with no known conversion: ask how much.
    if (isDecimalUnit(line.unit) || factor == null) {
      setPad({
        poLineId: line.poLineId, mode: "add", scanned: true, gs1,
        initial: Math.max(0, subQty(line.openAtHotel, parseQty(e.received) ?? 0)),
      });
      return;
    }
    const delta = Number(qtyText((Number(packFactor) > 0 ? Number(packFactor) : 1) / factor));
    const total = addToLine(line, delta, { scanned: true, gs1 });
    flash(line.poLineId);
    showScanToast(line, delta, total);
  };

  const onScanRead = (parsed) => {
    const result = resolveOnOrder(parsed, ctxRef.current?.lines || []);
    const line = result.kind === "item" ? lineById.get(Number(result.item.poLineId)) : null;
    if (!line) return { tone: "warn", text: UNKNOWN_CODE, code: result.code };
    if (line.needsUomFactor) return { tone: "warn", text: uomBlockedMessage(line), code: result.code };
    applyItemScan(line, result.item.packFactor, result.gs1);
    return { tone: "ok", text: line.productName, code: result.code };
  };

  const onPadDone = (qty) => {
    const p = pad;
    setPad(null);
    const line = p && lineById.get(Number(p.poLineId));
    if (!line) return;
    if (p.mode === "add") {
      if (!(qty > 0)) return;
      const total = addToLine(line, qty, { scanned: p.scanned, gs1: p.gs1 });
      flash(line.poLineId);
      if (p.scanned) showScanToast(line, qty, total);
    } else {
      patchLine(line.poLineId, { received: qtyText(qty) });
    }
  };

  // ── Posting ───────────────────────────────────────────────────────────────
  const finishPosted = async (grn) => {
    const token = tokenRef.current;
    const uploaded = [];
    const uploadFailures = [];
    if (grn?.id != null && token) {
      for (const p of pendingFilesRef.current) {
        try {
          const att = await uploadTokenGrnAttachment(token, grn.id, p.file, p.kind);
          if (att) uploaded.push(att);
        } catch (e) {
          uploadFailures.push({ name: p.file.name, message: errorInfo(e, "Upload failed").message });
        }
      }
    }
    clearDraft();
    sessionKeyRef.current = newClientEventId();
    touchedRef.current = false;
    commitUnsent(false);
    if (!mountedRef.current) return;
    setPendingFiles([]);
    setRestored(false);
    commitCtx(withReceipt(ctxRef.current, grn, uploaded));
    setPosted({ grn, warnings: Array.isArray(grn?.warnings) ? grn.warnings : [], uploadFailures });
    // Fresh open quantities and the receipt list (with this one) from the server.
    load({ silent: true });
  };

  const handlePostError = (err) => {
    const info = errorInfo(err, "Could not post this receipt. Try again.");
    const d = info.details || {};
    const lineId = d.poLineId != null ? Number(d.poLineId) : null;
    const line = lineId != null ? lineById.get(lineId) : null;

    if (info.httpStatus == null) {
      // No answer: it may or may not have landed. Keep the screen and the key.
      commitUnsent(true);
      writeDraft();
      return;
    }
    if (unsentRef.current) {
      commitUnsent(false);
      writeDraft();
    }
    if (info.httpStatus === 401) {
      forgetLink();
      setPhase("expired");
    } else if (info.httpStatus === 429) {
      setFormError(rateLimitMessage(err));
    } else if (info.code === "CONFLICT" && d.field === "clientEventId") {
      // That key belongs to another receipt: start a fresh session, keep the entries.
      sessionKeyRef.current = newClientEventId();
      writeDraft();
      setFormError(`${info.message}. Your entries are still here: post again to record them as a new receipt.`);
    } else if (info.code === "CONFLICT" && d.reason === "TOKEN_NO_HOTEL") {
      setFailure({ phase: "no_hotel", message: info.message });
      setPhase("no_hotel");
    } else if (info.code === "CONFLICT" && d.reason === "PO_NOT_RECEIVABLE") {
      clearDraft();
      touchedRef.current = false;
      setFormError(info.message);
      load({ silent: true });
    } else if (info.code === "OVER_RECEIPT" && line) {
      const asked = d.requested != null ? `; this receipt has ${fmtQty(d.requested)}` : "";
      setLineErrors({ [lineId]: `Max acceptable ${fmtQtyUnit(d.maxAcceptable, line.unit)} at this hotel${asked}` });
      setFormError("One line is more than this order allows. Fix it, then post again.");
    } else if (line) {
      // UOM_FACTOR_REQUIRED, MARK_OUT_NOT_ALLOWED, MAPPING_NOT_ALLOWED, EXPIRY_REQUIRED, …
      setLineErrors({ [lineId]: info.message });
    } else {
      setFormError(info.message);
    }
  };

  const runPost = async () => {
    if (postingRef.current) return;
    const token = tokenRef.current;
    const data = ctxRef.current;
    if (!token || !data?.po) return;
    postingRef.current = true;
    setPosting(true);
    setFormError(null);
    setLineErrors({});
    const input = linkInput(buildGrnInput({
      poId: data.po.id,
      hotelId: data.hotel?.id,
      header: headerRef.current,
      ctxLines: (data.lines || []).filter((l) => !l.needsUomFactor),
      entries: entriesRef.current,
      allowMarkOut: false,
    }));
    try {
      const grn = await postTokenGrn(token, { ...input, post: true, clientEventId: sessionKeyRef.current });
      if (mountedRef.current) await finishPosted(grn);
    } catch (err) {
      if (mountedRef.current) handlePostError(err);
    } finally {
      postingRef.current = false;
      if (mountedRef.current) setPosting(false);
    }
  };

  const requestPost = () => {
    if (postingRef.current) return;
    const errs = validateForPost(receivableLines, entriesRef.current, { allowMarkOut: false });
    if (errs) {
      const { form, ...perLine } = errs;
      setLineErrors(perLine);
      setFormError(form || "Fix the highlighted lines, then post.");
      return;
    }
    setLineErrors({});
    setFormError(null);
    setConfirmOpen(true);
  };

  const confirmPost = () => {
    setConfirmOpen(false);
    runPost();
  };

  const receiveAnother = () => {
    setPosted(null);
    startForm(ctxRef.current);
  };

  // ── Paperwork on posted receipts ──────────────────────────────────────────
  const attachPaperwork = async (grnId, file, kind) => {
    const token = tokenRef.current;
    if (!token) return;
    setUploadingId(grnId);
    setAttachErrors((prev) => ({ ...prev, [grnId]: null }));
    try {
      const att = await uploadTokenGrnAttachment(token, grnId, file, kind);
      if (att && mountedRef.current) commitCtx(withAttachments(ctxRef.current, grnId, [att]));
    } catch (e) {
      if (!mountedRef.current) return;
      const info = errorInfo(e, "Could not upload that file. Try again.");
      if (info.httpStatus === 401) {
        forgetLink();
        setPhase("expired");
        return;
      }
      const message = info.httpStatus === 429
        ? rateLimitMessage(e)
        : info.httpStatus == null
          ? "The connection dropped. Try the upload again when you have signal."
          : info.message;
      setAttachErrors((prev) => ({ ...prev, [grnId]: message }));
    } finally {
      if (mountedRef.current) setUploadingId(null);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const po = ctx?.po || null;
  const hotel = ctx?.hotel || null;
  const notReceivable = ctx?.receivable === false;
  const reason = NOT_RECEIVABLE[ctx?.notReceivableReason] ? ctx.notReceivableReason : "not_ready";
  const receipts = Array.isArray(ctx?.receipts) ? ctx.receipts : [];
  const expiresAt = ctx?.linkExpiresAt ? Date.parse(ctx.linkExpiresAt) : NaN;
  const linkOpen = Number.isNaN(expiresAt) || expiresAt > Date.now();
  const showForm = phase === "ready" && !posted && !notReceivable;
  const scanPaused = confirmOpen || !!pad || posting;

  const counts = useMemo(() => {
    let withQty = 0;
    for (const l of receivableLines) {
      const { received, rejected } = lineQty(entries[l.poLineId]);
      if ((received || 0) > 0 || (rejected || 0) > 0) withQty += 1;
    }
    return { withQty };
  }, [receivableLines, entries]);

  // Phone: most recently scanned first, then PO order; lines a link can't take last.
  const cardOrder = useMemo(() => {
    const idx = new Map(lines.map((l, i) => [l.poLineId, i]));
    return [...lines].sort((a, b) => {
      if (!!a.needsUomFactor !== !!b.needsUomFactor) return a.needsUomFactor ? 1 : -1;
      const sa = entries[a.poLineId]?.scannedAt || 0;
      const sb = entries[b.poLineId]?.scannedAt || 0;
      if (sa !== sb) return sb - sa;
      return idx.get(a.poLineId) - idx.get(b.poLineId);
    });
  }, [lines, entries]);

  const canReceiveMore = !notReceivable && receivableLines.some((l) => toQ(l.openAtHotel) > 0);

  // ── Render ────────────────────────────────────────────────────────────────
  const postLabel = (
    <>
      {posting ? <Loader2 size={15} className={styles.spin} aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
      Post receipt
    </>
  );

  const frame = (body) => (
    <div className={own.page}>
      <Head>
        <title>Receive goods · Workwise</title>
        {/* The first paint's URL still holds ?t=: send no Referer with anything. */}
        <meta name="referrer" content="no-referrer" />
      </Head>
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headMain}>
            <div className={styles.eyebrow}>Receive goods</div>
            <h1 className={styles.pageTitle}>
              {po ? <span className={styles.titleMono}>{po.poNumber}</span> : "Receiving link"}
              {po?.isCallOff && <span className={`${styles.pill} ${styles.pillIndigo}`}>Call-off</span>}
            </h1>
            {po && (
              <div className={styles.pageSub}>
                {po.vendorName && <span>{po.vendorName}</span>}
                {po.vendorName && hotel && <span className={styles.subSep} aria-hidden="true">·</span>}
                {hotel && (
                  <span>
                    Receiving at <strong data-testid="receiving-hotel">{hotel.name}</strong>
                  </span>
                )}
              </div>
            )}
            {phase === "ready" && ctx?.linkExpiresAt && linkOpen && (
              <div className={own.linkNote}>
                <Clock size={12} aria-hidden="true" />
                This link works until {fmtInstant(ctx.linkExpiresAt)}
              </div>
            )}
          </div>
          {showForm && !isMobile && (
            <div className={styles.headerActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSuccess}`}
                onClick={requestPost}
                disabled={posting || receivableLines.length === 0}
              >
                {postLabel}
              </button>
            </div>
          )}
        </div>
      </section>
      <main className={styles.pageBody}>{body}</main>
    </div>
  );

  const stateCard = ({ icon, title, sub, action = null, ok = false, role }) => (
    <div className={styles.stateCard} role={role}>
      <div className={`${styles.stateIc} ${ok ? styles.stateIcOk : ""}`}>{icon}</div>
      <h2 className={styles.stateTitle}>{title}</h2>
      {sub && <p className={styles.stateSub}>{sub}</p>}
      {action && <div className={styles.stateActions}>{action}</div>}
    </div>
  );

  if (phase === "starting" || phase === "loading") {
    return frame(
      <div className={styles.card} aria-busy="true" aria-label="Loading the order">
        <div className={styles.cardBody}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={styles.sk} style={{ width: `${88 - i * 14}%`, marginBottom: 14 }} />
          ))}
        </div>
      </div>
    );
  }
  if (phase === "missing") {
    return frame(stateCard({ icon: <Link2Off size={20} aria-hidden="true" />, title: "Link incomplete", sub: MISSING_MESSAGE }));
  }
  if (phase === "expired") {
    return frame(stateCard({
      icon: <Link2Off size={20} aria-hidden="true" />, title: "Link expired", sub: EXPIRED_MESSAGE, role: "alert",
    }));
  }
  if (phase === "no_hotel") {
    return frame(stateCard({
      icon: <Link2Off size={20} aria-hidden="true" />, title: "This link can't be used", sub: failure?.message, role: "alert",
    }));
  }
  if (phase === "error") {
    return frame(stateCard({
      icon: <PackageOpen size={20} aria-hidden="true" />,
      title: "Couldn't load this order",
      sub: failure?.message,
      role: "alert",
      action: failure?.retry ? (
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => load()}>
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      ) : null,
    }));
  }

  const lineProps = (l) => ({
    line: l,
    entry: entries[l.poLineId] || blankLine(l),
    onChange: (patch) => patchLine(l.poLineId, patch),
    error: lineErrors[l.poLineId] || null,
    flash: flashId === l.poLineId,
    showPrices: false,
    allowMarkOut: false,
    departments: [],
    allowItemSetup: false,
    suggestions: [],
    receivedAt: header.receivedAt,
  });

  const banners = (
    <>
      {unsent && (
        <div className={`${own.banner} ${own.bannerWarn}`} role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span className={own.bannerText}>{NETWORK_DROPPED}</span>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${own.bannerAction}`}
            onClick={() => runPost()}
            disabled={posting}
          >
            {posting ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
            Retry
          </button>
        </div>
      )}
      {restored && !unsent && (
        <div className={`${own.banner} ${own.bannerInfo}`} role="status">
          <WifiOff size={16} aria-hidden="true" />
          <span className={own.bannerText}>Restored the entries you had on this page before it reloaded.</span>
        </div>
      )}
    </>
  );

  const itemsCard = (
    <section className={styles.card} aria-labelledby="token-receive-items-title">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="token-receive-items-title">
          <span className={styles.cardIc}><ScanBarcode size={14} aria-hidden="true" /></span>
          Items
          <span className={styles.count}>{lines.length}</span>
        </h2>
        <span className={styles.saveState}>{counts.withQty} of {receivableLines.length} entered</span>
      </div>
      <div className={own.scanDock} data-testid="scan-dock">
        <TokenScanBox disabled={scanPaused} onRead={onScanRead} />
      </div>
      {formError && (
        <div className={styles.formError} role="alert" style={{ marginTop: 14 }}>
          {formError}
        </div>
      )}
      {lines.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Nothing is open on this order at {hotel?.name || "this hotel"}</div>
        </div>
      ) : isMobile ? (
        <div className={styles.cardList}>
          {cardOrder.map((l) => (l.needsUomFactor ? (
            <BlockedLineCard key={l.poLineId} line={l} />
          ) : (
            <ReceiveLineCard
              key={l.poLineId}
              {...lineProps(l)}
              onStep={(delta) => addToLine(l, delta)}
              onOpenPad={() =>
                setPad({
                  poLineId: l.poLineId, mode: "set", scanned: false, gs1: null,
                  initial: parseQty(entries[l.poLineId]?.received) ?? 0,
                })
              }
            />
          )))}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.linesTable} aria-label="Receive lines">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th className={styles.num}>Open</th>
                <th className={styles.num}>Received</th>
                <th className={styles.num}>Accepted</th>
                <th className={styles.num}>Rejected</th>
              </tr>
            </thead>
            {lines.map((l, i) => (l.needsUomFactor ? (
              <BlockedLineRow key={l.poLineId} index={i} line={l} />
            ) : (
              <ReceiveLineRow key={l.poLineId} index={i} {...lineProps(l)} />
            )))}
          </table>
        </div>
      )}
    </section>
  );

  const documentsCard = (
    <section className={styles.card} aria-labelledby="token-receive-docs-title">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="token-receive-docs-title">
          <span className={styles.cardIc}><FileText size={14} aria-hidden="true" /></span>
          Delivery documents
        </h2>
      </div>
      <div className={styles.cardBody}>
        <DeliveryDocuments
          header={header}
          onChange={patchHeader}
          dispatches={ctx?.dispatches || []}
          onPickDispatch={pickDispatch}
          attachments={[]}
          pendingFiles={pendingFiles}
          onUpload={(file, kind) => setPendingFiles((list) => [...list, { file, kind }])}
          onRemovePending={(i) => setPendingFiles((list) => list.filter((_, j) => j !== i))}
          uploading={posting}
          canDelete={false}
        />
      </div>
    </section>
  );

  const postedCard = posted && (
    <div className={styles.stateCard} role="status">
      <div className={`${styles.stateIc} ${styles.stateIcOk}`}><PackageCheck size={20} aria-hidden="true" /></div>
      <h2 className={styles.stateTitle}>Receipt posted</h2>
      <p className={styles.stateSub}>
        {posted.grn?.grnNumber ? <span className={styles.docNo}>{posted.grn.grnNumber}</span> : null}
        {posted.grn?.grnNumber ? <br /> : null}
        Accepted goods are in stock{hotel?.name ? ` at ${hotel.name}` : ""}.
      </p>
      {posted.warnings.length > 0 && (
        <ul className={styles.successList} aria-label="Warnings">
          {posted.warnings.map((w, i) => (
            <li key={`${w.poLineId}-${w.code}-${i}`} className={styles.lineWarn}>
              <strong>{lineById.get(Number(w.poLineId))?.productName || "Line"}</strong>
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      )}
      {posted.uploadFailures.length > 0 && (
        <ul className={styles.successList} aria-label="Files not uploaded">
          {posted.uploadFailures.map((f, i) => (
            <li key={`${f.name}-${i}`} className={styles.lineError}>
              <strong>{f.name}</strong>
              <span>{f.message}</span>
            </li>
          ))}
        </ul>
      )}
      {notReceivable && <p className={styles.stateSub}>{NOT_RECEIVABLE[reason]}.</p>}
      {canReceiveMore && (
        <div className={styles.stateActions}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={receiveAnother}>
            Receive another delivery
          </button>
        </div>
      )}
    </div>
  );

  const blockedCard = !posted && notReceivable && stateCard({
    icon: reason === "not_ready" ? <PackageOpen size={20} aria-hidden="true" /> : <CheckCircle2 size={20} aria-hidden="true" />,
    ok: reason !== "not_ready",
    title: NOT_RECEIVABLE[reason],
    sub: receipts.length > 0 && linkOpen
      ? "You can still attach paperwork to the receipts below until this link expires."
      : reason === "not_ready"
        ? "Check with the buyer."
        : "Nothing is left to receive with this link.",
  });

  const receiptsCard = receipts.length > 0 && (
    <section className={styles.card} aria-labelledby="token-receipts-title">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="token-receipts-title">
          <span className={styles.cardIc}><FileText size={14} aria-hidden="true" /></span>
          Receipts from this link
          <span className={styles.count}>{receipts.length}</span>
        </h2>
        {linkOpen && ctx?.linkExpiresAt && (
          <span className={styles.saveState}>Paperwork until {fmtInstant(ctx.linkExpiresAt)}</span>
        )}
      </div>
      <ul className={own.receiptList}>
        {receipts.map((r) => (
          <ReceiptItem
            key={r.id}
            receipt={r}
            canAttach={linkOpen && r.status !== "reversed"}
            busy={uploadingId === r.id}
            error={attachErrors[r.id] || null}
            onAttach={(file, kind) => attachPaperwork(r.id, file, kind)}
          />
        ))}
      </ul>
    </section>
  );

  return (
    <>
      {frame(
        <div className={styles.stack}>
          {showForm && banners}
          {postedCard}
          {blockedCard}
          {showForm && (isMobile ? (
            <>
              {itemsCard}
              {documentsCard}
            </>
          ) : (
            <>
              {documentsCard}
              {itemsCard}
            </>
          ))}
          {receiptsCard}
        </div>
      )}

      {showForm && isMobile && (
        <MobileActionBar
          label="Receive actions"
          summary={<span>{counts.withQty} of {receivableLines.length} lines entered</span>}
        >
          <MobileActionButton variant="primary" onClick={requestPost} disabled={posting || receivableLines.length === 0}>
            {postLabel}
          </MobileActionButton>
        </MobileActionBar>
      )}

      {confirmOpen && (
        <ReceiveConfirmModal
          show
          lines={receivableLines}
          entries={entries}
          hotelName={hotel?.name}
          busy={posting}
          onConfirm={confirmPost}
          onHide={() => setConfirmOpen(false)}
        />
      )}
      {pad && lineById.get(Number(pad.poLineId)) && (
        <QtyPad
          show
          title={lineById.get(Number(pad.poLineId)).productName}
          unit={lineById.get(Number(pad.poLineId)).unit}
          initial={pad.initial}
          mode={pad.mode}
          receivedSoFar={parseQty(entries[pad.poLineId]?.received) ?? 0}
          openQty={lineById.get(Number(pad.poLineId)).openAtHotel}
          onDone={onPadDone}
          onHide={() => setPad(null)}
        />
      )}
    </>
  );
};

export default TokenReceivePage;
