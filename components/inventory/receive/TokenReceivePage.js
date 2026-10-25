import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
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
import useReceiveScan, { manualQtyPatch } from "./useReceiveScan";
import { ATTACHMENT_KINDS, kindLabel } from "./receiveShared";
import { isFreshPost } from "./receivePost";
import {
  HEADER_FIELDS, blankHeader, blankLine, buildGrnInput, errorInfo, fmtDay, fmtInstant, fmtQty, fmtQtyUnit,
  lineQty, newClientEventId, parseQty, toQ, validateForPost,
} from "./receiveUtils";
import { resolveOnOrder } from "./tokenScanMatch";
import styles from "./receive.module.scss";
import own from "./TokenReceivePage.module.scss";

// The site rep's receive page (/receive/token#t=<token>). The buyer emails a
// person with no account a link; they open it on a phone at the loading bay,
// scan or type what arrived and post a goods receipt for the link's PO at the
// link's hotel. Backend contract: task C5 (GET/POST /inventory/token/*).
//
// The token is a receiving credential:
//   - it is read from #t= (new links), else ?t=, else ?token= (a legacy link
//     forwarded by the next.config redirect), and the whole fragment and query
//     leave the address bar (history.replaceState) before any request;
//   - it lives in memory and in sessionStorage `inv.receiveToken` (this tab
//     only, so a reload still works). Never localStorage, never IndexedDB,
//     never a log line. A link with a different token drops this tab's drafts;
//   - it goes out only as X-Receive-Token, through the dedicated token client
//     in services/inventory (no buyer JWT, no SessionExpiredModal on a 401).
//
// The page never shows a price, rate, value or tax, nor any buyer contact. It
// has no mark-out on arrival, no unit-conversion prompt and no item mapping: a
// link can do none of those, so a line whose unit has no conversion yet is
// shown disabled with what to ask the buyer.
//
// Posting is one POST /token/grn keyed by a session clientEventId, never
// queued in the offline outbox. Before it is sent the screen is saved to
// sessionStorage `inv.receiveDraft:<poId>:<hotelId>` (no token in it) marked
// `unsent`. Until the server answers, the outcome is unknown and the form is
// frozen: after no answer, a 429 or a 5xx the only ways on are Retry (the same
// key, so a receipt that did land replays instead of doubling) or "Discard and
// start over". A 400 / 404 / 409 refusal comes after the server's replay
// lookup, so nothing was recorded under the key and the form opens again. A
// replay that differs from what was sent says so.
//
// Scans are matched on the device against the order's own barcodes with the
// server's rules (tokenScanMatch): the server resolve route needs a login.
//
// Built from C1's exported receive parts (ReceiveLineRow, ReceiveLineCard,
// QtyPad, ReceiveConfirmModal, DeliveryDocuments, useReceiveScan,
// receiveShared, receivePost, receiveUtils) and B4's scan parts (parseScan,
// useWedgeScanner, LazyCameraScanner, scanFeedback).

export { resolveOnOrder };

export const TOKEN_STORAGE_KEY = "inv.receiveToken";
const DRAFT_PREFIX = "inv.receiveDraft:";
export const draftStorageKey = (poId, hotelId) => `${DRAFT_PREFIX}${poId}:${hotelId}`;

const EXPIRED_MESSAGE = "This receiving link has expired. Ask the buyer for a new one.";
const EXPIRED_UNCERTAIN =
  "Your link expired. The last receipt may already have been recorded; ask the buyer to check.";
const MISSING_MESSAGE = "Open the receiving link from your email again. If it still doesn't open, ask the buyer for a new one.";
const UNKNOWN_CODE = "This code isn't on this order";
const AMBIGUOUS_CODE = "This code matches more than one item: pick one";
const dispatchNotHere = (hotelName) =>
  `That dispatch note isn't on its way to ${hotelName || "this hotel"} on this order`;
const dispatchName = (d) => d.dispatchNumber || (d.challanNo ? `challan ${d.challanNo}` : `dispatch #${d.id}`);
const NEVER_TWICE = "a receipt is never recorded twice.";
const NETWORK_DROPPED =
  "The connection dropped before the server answered, so this receipt may or may not be recorded. " +
  `Your entries are kept on this device. Retry when you have signal: ${NEVER_TWICE}`;
const RESTORED_UNSENT =
  "This receipt was being sent when the page closed, so it may already be recorded. " +
  `Retry to finish it: ${NEVER_TWICE}`;
const serverDidntConfirm = (status) =>
  `The server didn't confirm this receipt (error ${status}), so it may or may not be recorded. Retry: ${NEVER_TWICE}`;
const KEY_CLASH_RESTORED =
  "This delivery may already have been recorded from another link or device. " +
  "Ask the buyer to check this order's receipts before you post it again.";
const DISCARD_WARNING =
  "If the last attempt reached the server, that receipt is already recorded. " +
  "Check the receipts from this link before you enter the delivery again.";
const OVER_RECEIPT_HINT = "Record the extra as rejected (excess).";
const NOT_RECEIVABLE = {
  received: "Everything on this order has been received",
  closed_short: "This order was closed",
  not_ready: "This order can't be received yet",
};
export const uomBlockedMessage = (line) =>
  `Ask the buyer to set the unit conversion for ${line?.productName || "this item"} first`;
const replayMismatchMessage = (grn) =>
  `Already recorded as ${grn?.grnNumber || "an earlier receipt"}; changes after the first attempt were not saved.`;

const DRAFT_SAVE_MS = 300;
const CAMERA_REPEAT_MS = 1500;
// 400 / 404 / 409 answer after the server's replay lookup: the key was not used.
const REFUSALS = new Set([400, 404, 409]);

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
  keys() {
    try {
      const out = [];
      for (let i = 0; i < window.sessionStorage.length; i += 1) out.push(window.sessionStorage.key(i));
      return out;
    } catch {
      return [];
    }
  },
};

const ENTRY_FIELDS = ["received", "rejected", "reason", "batchNo", "mfgDate", "expiryDate", "remarks"];

const parseDraft = (raw) => {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    return d && typeof d === "object" && d.entries && typeof d.entries === "object" ? d : null;
  } catch {
    return null;
  }
};
const draftKeys = () => session.keys().filter((k) => typeof k === "string" && k.startsWith(DRAFT_PREFIX));
const dropAllDrafts = () => draftKeys().forEach((k) => session.remove(k));
const anyUnsentDraft = () => draftKeys().some((k) => parseDraft(session.get(k))?.unsent === true);

/**
 * Read the link's token (#t=, else ?t=, else ?token=), then take the whole
 * fragment and query (t, and the token / po / rfq a legacy link brings
 * through the redirect) out of the address bar. Next's history entry is
 * rewritten too, so Back / Forward never puts the token back.
 */
const takeTokenFromUrl = () => {
  if (typeof window === "undefined") return null;
  const { pathname, search, hash } = window.location;
  const fromHash = new URLSearchParams((hash || "").replace(/^#/, ""));
  const fromQuery = new URLSearchParams(search);
  const token = (fromHash.get("t") || fromQuery.get("t") || fromQuery.get("token") || "").trim();
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

/** Did the replayed GRN record what this attempt sent? Compared per PO line. */
const sameAsSent = (sentLines = [], grnLines) => {
  if (!Array.isArray(grnLines)) return true;
  const tally = (rows, withQty) => {
    const m = new Map();
    for (const r of rows) {
      const id = Number(r.poLineId);
      const cur = m.get(id) || [0, 0, 0];
      if (withQty) {
        cur[0] += toQ(r.receivedQty);
        cur[1] += toQ(r.acceptedQty);
        cur[2] += toQ(r.rejectedQty);
      }
      m.set(id, cur);
    }
    return m;
  };
  const withQty = grnLines.every((r) => r.receivedQty !== undefined);
  const sent = tally(sentLines, withQty);
  const got = tally(grnLines, withQty);
  if (sent.size !== got.size) return false;
  for (const [id, q] of sent) {
    const g = got.get(id);
    if (!g || g.some((v, i) => v !== q[i])) return false;
  }
  return true;
};

// ── Scan box ─────────────────────────────────────────────────────────────────
/**
 * The scan box for a link: camera, keyboard-wedge scanner and typed codes,
 * looked up by `onRead(parsed)` (which returns the status line to show,
 * {tone:'ok'|'warn', text, code, choices?}). A status with `choices`
 * ([{key, label}]) asks which one; the pick goes to `onChoose(choice)`, which
 * returns the next status line. Same look as ScanInput, which can't be used
 * here because it resolves through the buyer route. `disabled` pauses reads
 * and picks, and leaves an open camera running.
 */
const TokenScanBox = ({ disabled = false, onRead, onChoose }) => {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [camera, setCamera] = useState(false);
  const [status, setStatus] = useState(null);
  const [muted, setMutedState] = useState(() => scanFeedback.isMuted());
  const disabledRef = useRef(disabled);
  const onReadRef = useRef(onRead);
  const onChooseRef = useRef(onChoose);
  const seenRef = useRef(new Map());

  useEffect(() => {
    disabledRef.current = disabled;
    onReadRef.current = onRead;
    onChooseRef.current = onChoose;
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
    if (!next) return false;
    if (next.tone === "ok") scanFeedback.success();
    else scanFeedback.error();
    setStatus(next);
    return true;
  }, []);

  useWedgeScanner({ onCode: (raw) => read(raw, "wedge"), enabled: !disabled });

  const choose = (choice) => {
    if (disabledRef.current) return;
    const next = onChooseRef.current?.(choice) || null;
    if (!next) return;
    if (next.tone === "ok") scanFeedback.success();
    else scanFeedback.error();
    setStatus(next);
  };

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
      {status?.choices?.length > 0 && (
        <div className={own.scanChoices} role="group" aria-label="Which item is it?">
          {status.choices.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`${scanStyles.btn} ${scanStyles.btnSecondary}`}
              onClick={() => choose(c)}
              disabled={disabled}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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

// ── Files picked before posting, uploading after it ─────────────────────────
const UPLOAD_STATUS = { uploading: "Uploading…", done: "Uploaded", failed: "Not uploaded" };

/** Per-file status of the paperwork uploading for a posted receipt. */
const UploadList = ({ uploads, className = "" }) => (
  <ul className={`${own.uploadList} ${className}`} aria-label="Paperwork">
    {uploads.map((u, i) => (
      <li key={`${u.name}-${i}`} className={own.uploadItem} data-status={u.status}>
        {u.status === "uploading" && <Loader2 size={14} className={styles.spin} aria-hidden="true" />}
        {u.status === "done" && <CheckCircle2 size={14} aria-hidden="true" />}
        {u.status === "failed" && <AlertTriangle size={14} aria-hidden="true" />}
        <span className={own.uploadName}>{u.name}</span>
        <span className={own.uploadStatus}>{UPLOAD_STATUS[u.status]}{u.message ? `: ${u.message}` : ""}</span>
      </li>
    ))}
  </ul>
);

// ── Receipts this link posted, with "Attach paperwork" ───────────────────────
const STATUS_PILL = { partially_reversed: "Partly reversed", reversed: "Reversed" };
const isWebUrl = (url) => /^https?:\/\//i.test(String(url || ""));

const ReceiptItem = ({ receipt, canAttach, busy, error, uploads = null, onAttach }) => {
  const [kind, setKind] = useState("CHALLAN");
  const name = receipt.grnNumber || `Receipt #${receipt.id}`;
  const files = Array.isArray(receipt.attachments) ? receipt.attachments : [];
  // Files from the post still going up (or that didn't); the ones that made it are in `files`.
  const unsettled = (uploads || []).filter((u) => u.status !== "done");
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
              {isWebUrl(a.url) ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer">{a.fileName || kindLabel(a.kind)}</a>
              ) : (
                <span>{a.fileName || kindLabel(a.kind)}</span>
              )}{" "}
              <span className={`${styles.pill} ${styles.pillNeutral}`}>{kindLabel(a.kind)}</span>
            </li>
          ))}
        </ul>
      )}
      {unsettled.length > 0 && <UploadList uploads={unsettled} className={own.receiptUploads} />}
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
            {ATTACHMENT_KINDS.map((k) => (
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
const withReceipt = (data, grn) => {
  if (!data || grn?.id == null) return data;
  const receipts = Array.isArray(data.receipts) ? data.receipts : [];
  if (receipts.some((r) => r.id === grn.id)) return data;
  const row = {
    id: grn.id,
    grnNumber: grn.grnNumber || null,
    status: grn.status || "posted",
    receivedAt: grn.receivedAt || null,
    postedAt: grn.postedAt || null,
    lineCount: Array.isArray(grn.lines) ? grn.lines.length : null,
    attachments: Array.isArray(grn.attachments) ? grn.attachments : [],
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

/** A heading that takes focus when it appears (posted, expired and error states). */
const focusOnMount = (el) => {
  if (el && typeof el.focus === "function") el.focus();
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
  const [errorFocus, setErrorFocus] = useState(0);
  const [unsent, setUnsent] = useState(false);
  const [unsentNote, setUnsentNote] = useState(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [restored, setRestored] = useState(false);
  const [posting, setPosting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [posted, setPosted] = useState(null);
  // grnId → [{name, kind, status, message}]: files picked before a post, uploading after it.
  const [uploads, setUploads] = useState({});
  const [uploadingId, setUploadingId] = useState(null);
  const [attachErrors, setAttachErrors] = useState({});

  // Synchronous mirrors for scans, the draft writer and the post path.
  const tokenRef = useRef(null);
  const ctxRef = useRef(null);
  const headerRef = useRef(header);
  const entriesRef = useRef(entries);
  const sessionKeyRef = useRef(null);
  // The key of a restored draft whose last send had no answer.
  const restoredKeyRef = useRef(null);
  // A post went out and its outcome is unknown (saved in the draft as `unsent`).
  const unsentRef = useRef(false);
  const touchedRef = useRef(false);
  const postingRef = useRef(false);
  const pendingFilesRef = useRef(pendingFiles);
  const loadSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const linesBoxRef = useRef(null);
  const formErrorRef = useRef(null);
  const discardBoxRef = useRef(null);
  const keepEntriesRef = useRef(null);

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
  const commitUnsent = useCallback((v, note = null) => {
    unsentRef.current = v;
    setUnsent(v);
    setUnsentNote(v ? note : null);
    if (!v) setDiscardOpen(false);
  }, []);

  const lines = useMemo(() => ctx?.lines || [], [ctx]);
  const receivableLines = useMemo(() => lines.filter((l) => !l.needsUomFactor), [lines]);
  const lineById = useMemo(() => new Map(lines.map((l) => [Number(l.poLineId), l])), [lines]);
  const frozen = posting || unsent;
  const isFrozen = () => postingRef.current || unsentRef.current;

  // ── Session storage: the screen, never the token ──────────────────────────
  const writeDraft = useCallback(() => {
    const data = ctxRef.current;
    // A dead link (401) has already dropped its drafts: a late save must not bring one back.
    if (data?.po?.id == null || !sessionKeyRef.current || !tokenRef.current) return;
    session.set(draftStorageKey(data.po.id, data.hotel?.id), JSON.stringify({
      v: 2,
      savedAt: Date.now(),
      clientEventId: sessionKeyRef.current,
      unsent: unsentRef.current,
      header: headerRef.current,
      entries: entriesRef.current,
    }));
  }, []);

  const clearDraft = useCallback(() => {
    const data = ctxRef.current;
    if (data?.po?.id != null) session.remove(draftStorageKey(data.po.id, data.hotel?.id));
  }, []);

  /** The link is dead (401) or unusable: drop everything this tab kept for it. */
  const forgetLink = useCallback(() => {
    dropAllDrafts();
    session.remove(TOKEN_STORAGE_KEY);
    tokenRef.current = null;
  }, []);

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
    const storeKey = poId != null ? draftStorageKey(poId, data?.hotel?.id) : null;
    const saved = storeKey ? parseDraft(session.get(storeKey)) : null;
    if (saved && data.receivable !== false) {
      for (const l of ctxLines) {
        const e = saved.entries[l.poLineId];
        // A line the link can't receive never comes back from a draft.
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
      session.remove(storeKey);
    }
    sessionKeyRef.current = key;
    restoredKeyRef.current = wasUnsent ? key : null;
    touchedRef.current = false;
    commitUnsent(wasUnsent, wasUnsent ? RESTORED_UNSENT : null);
    commitEntries(nextEntries);
    commitHeader(nextHeader);
    setRestored(didRestore && !wasUnsent);
    setLineErrors({});
    setFormError(null);
    setPendingFiles([]);
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
      // A background refresh that fails for any other reason keeps what is on screen.
      if (silent && f.phase === "error") return null;
      if (f.phase === "expired") f.uncertain = unsentRef.current || anyUnsentDraft();
      if (f.phase === "expired" || f.phase === "no_hotel") forgetLink();
      setFailure(f);
      setPhase(f.phase);
      return null;
    }
  }, [commitCtx, startForm, forgetLink]);

  // Take the token out of the URL first; only then ask the server anything.
  useEffect(() => {
    mountedRef.current = true;
    const stored = session.get(TOKEN_STORAGE_KEY);
    const fromUrl = takeTokenFromUrl();
    if (fromUrl) {
      // Another link in this tab: its drafts are not this link's receipts.
      if (fromUrl !== stored) dropAllDrafts();
      session.set(TOKEN_STORAGE_KEY, fromUrl);
    }
    tokenRef.current = fromUrl || stored || null;
    if (tokenRef.current) load();
    else setPhase("missing");
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Keep Next's router (asPath, the canonical link) in step with the clean
  // URL. Its own hydration step can write the original URL back after we
  // stripped it, so strip again whenever a query or fragment shows up.
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

  // After a refusal: scroll to the first line with a message and focus it
  // (on a phone the post button is far from the line), else the form summary.
  useEffect(() => {
    if (!errorFocus) return;
    const alertEl = linesBoxRef.current?.querySelector('[role="alert"]') || null;
    const holder = alertEl?.closest("tbody, article") || null;
    // The field the message is about, else the line's first field.
    const control = holder?.querySelector('[aria-invalid="true"]') ||
      holder?.querySelector("input:not([disabled]), select:not([disabled]), textarea:not([disabled])");
    const target = control || formErrorRef.current;
    const scrollTo = holder || target;
    if (scrollTo && typeof scrollTo.scrollIntoView === "function") scrollTo.scrollIntoView({ block: "center", behavior: "smooth" });
    if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
  }, [errorFocus]);

  // "Discard?" opens at the top of the page; on a phone it was asked from the
  // bar at the bottom, so bring it into view and put focus on the safe answer.
  useEffect(() => {
    if (!discardOpen) return;
    const box = discardBoxRef.current;
    if (box && typeof box.scrollIntoView === "function") box.scrollIntoView({ block: "center", behavior: "smooth" });
    keepEntriesRef.current?.focus({ preventScroll: true });
  }, [discardOpen]);

  // ── Edits (none while a post is in flight or its outcome is unknown) ─────
  const patchLine = useCallback((id, patch) => {
    if (postingRef.current || unsentRef.current) return;
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
    if (postingRef.current || unsentRef.current) return;
    commitHeader({ ...headerRef.current, ...patch });
    setFormError(null);
    touchedRef.current = true;
  }, [commitHeader]);

  /** "Against dispatch": fill only the lines and fields not entered yet. */
  const pickDispatch = useCallback((id) => {
    if (postingRef.current || unsentRef.current) return;
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
        next = { ...next, [dl.poLineId]: { ...e, ...manualQtyPatch(dl.qty) } };
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

  // C1's scan handling: exact pack counting (twelve 1-piece scans of a
  // 12-piece box make exactly 1 box), the keypad for weighed units and for
  // units with no known conversion, the undo toast.
  const scan = useReceiveScan({
    form: { entriesRef, ctxRef, patchLine },
    lines,
    lineById,
    pickDispatch,
    canLinkCodes: false,
    router,
  });

  /** An item read onto its line; returns the scan box's status line. */
  const applyItemRead = (result, parsed) => {
    const line = lineById.get(Number(result.item?.poLineId));
    if (!line) return { tone: "warn", text: UNKNOWN_CODE, code: result.code };
    if (line.needsUomFactor) return { tone: "warn", text: uomBlockedMessage(line), code: result.code };
    scan.onScanResolved(result, { parsed });
    return { tone: "ok", text: line.productName, code: result.code };
  };

  const onScanRead = (parsed) => {
    if (isFrozen()) return null;
    const data = ctxRef.current;
    const result = resolveOnOrder(parsed, data?.lines || [], data?.dispatches || []);
    if (result.kind === "dispatch") {
      // As on the buyer's page: the dispatch note fills what isn't entered yet.
      if (!result.dispatch) return { tone: "warn", text: dispatchNotHere(data?.hotel?.name), code: result.code };
      pickDispatch(String(result.dispatch.id));
      return { tone: "ok", text: `Receiving against ${dispatchName(result.dispatch)}`, code: result.code };
    }
    if (result.kind === "ambiguous") {
      // The same code on two different items: never guess which one arrived.
      return {
        tone: "warn",
        text: AMBIGUOUS_CODE,
        code: result.code,
        choices: result.candidates.map((item) => ({
          key: String(item.poLineId),
          label: lineById.get(Number(item.poLineId))?.productName || `Line ${item.poLineId}`,
          result: { kind: "item", code: result.code, item, gs1: result.gs1 },
          parsed,
        })),
      };
    }
    if (result.kind !== "item") return { tone: "warn", text: UNKNOWN_CODE, code: result.code };
    return applyItemRead(result, parsed);
  };

  const onScanChoose = (choice) => (isFrozen() ? null : applyItemRead(choice.result, choice.parsed));

  /** The form summary: always name the line(s) to fix. */
  const lineSummary = (errs) => {
    const ids = lines.map((l) => l.poLineId).filter((id) => errs[id]);
    if (ids.length === 0) return null;
    const name = (id) => lineById.get(Number(id))?.productName || "a line";
    if (ids.length === 1) return `Check ${name(ids[0])}: ${errs[ids[0]]}`;
    return `Check ${ids.length} lines before posting: ${ids.map(name).join(", ")}.`;
  };

  const showErrors = (perLine, form = null) => {
    setLineErrors(perLine);
    const summary = lineSummary(perLine);
    setFormError([form, summary].filter(Boolean).join(" ") || null);
    setErrorFocus((n) => n + 1);
  };

  // ── Posting ───────────────────────────────────────────────────────────────
  /**
   * The files picked before posting, one after another, in the background: the
   * receipt is already posted and the form free. Returns how many went up.
   */
  const uploadPicked = async (grnId, files) => {
    let uploaded = 0;
    for (let i = 0; i < files.length; i += 1) {
      const p = files[i];
      let next;
      try {
        const att = tokenRef.current ? await uploadTokenGrnAttachment(tokenRef.current, grnId, p.file, p.kind) : null;
        if (att && mountedRef.current) commitCtx(withAttachments(ctxRef.current, grnId, [att]));
        if (att) uploaded += 1;
        next = att ? { status: "done" } : { status: "failed", message: "This link can't upload any more." };
      } catch (e) {
        const info = errorInfo(e, "Upload failed");
        next = {
          status: "failed",
          message: info.httpStatus === 429
            ? rateLimitMessage(e)
            : info.httpStatus === 401
              ? "This link has expired."
              : info.httpStatus == null
                ? "The connection dropped. Attach it again on this receipt."
                : info.message,
        };
      }
      if (!mountedRef.current) return uploaded;
      setUploads((prev) => (prev[grnId]
        ? { ...prev, [grnId]: prev[grnId].map((u, j) => (j === i ? { ...u, ...next } : u)) }
        : prev));
    }
    return uploaded;
  };

  /** The server recorded it: show the receipt, free the form, then send the files. */
  const finishPosted = (grn, sent) => {
    const replayed = grn?.replayed === true || !isFreshPost(grn);
    const mismatch = replayed && !sameAsSent(sent.lines, grn?.lines);
    const grnId = grn?.id ?? null;
    const files = grnId != null ? pendingFilesRef.current : [];
    clearDraft();
    sessionKeyRef.current = newClientEventId();
    restoredKeyRef.current = null;
    touchedRef.current = false;
    commitUnsent(false);
    setPendingFiles([]);
    setRestored(false);
    commitCtx(withReceipt(ctxRef.current, grn));
    if (files.length) {
      setUploads((prev) => ({
        ...prev,
        [grnId]: files.map((p) => ({ name: p.file.name, kind: p.kind, status: "uploading" })),
      }));
    }
    // "Receipt posted" first; the files picked before posting upload after it.
    setPosted({ grn, replayMismatch: mismatch, warnings: Array.isArray(grn?.warnings) ? grn.warnings : [] });
    // Fresh open quantities and the receipt list (with this one) from the
    // server now, for a next receipt that starts while the files go up.
    load({ silent: true });
    if (files.length) {
      // Not awaited: "Receive another delivery" must not wait for a slow upload.
      uploadPicked(grnId, files).then((uploaded) => {
        // The receipt list as the server has it, with the files that went up.
        if (uploaded > 0 && mountedRef.current) load({ silent: true });
      });
    }
  };

  const handlePostError = (err, { priorUnknown }) => {
    const info = errorInfo(err, "Could not post this receipt. Try again.");
    const status = info.httpStatus;
    const d = info.details || {};
    const lineId = d.poLineId != null ? Number(d.poLineId) : null;
    const line = lineId != null ? lineById.get(lineId) : null;

    if (status === 401) {
      forgetLink();
      setFailure({ phase: "expired", uncertain: priorUnknown });
      setPhase("expired");
      return;
    }
    if (status == null || status === 429 || status >= 500 || !REFUSALS.has(status)) {
      // No answer, rate limited, a gateway or server failure: it may or may
      // not have been recorded. Keep the key and keep the form frozen.
      const note = status == null
        ? NETWORK_DROPPED
        : status === 429
          ? `${rateLimitMessage(err)}, then retry: ${NEVER_TWICE}`
          : status >= 500
            ? serverDidntConfirm(status)
            : `${info.message}. Retry: ${NEVER_TWICE}`;
      commitUnsent(true, note);
      writeDraft();
      return;
    }

    // A refusal: the server looked the key up first, so nothing was recorded under it.
    commitUnsent(false);
    if (info.code === "CONFLICT" && d.field === "clientEventId") {
      const restoredClash = restoredKeyRef.current != null && restoredKeyRef.current === sessionKeyRef.current;
      sessionKeyRef.current = newClientEventId();
      restoredKeyRef.current = null;
      writeDraft();
      setFormError(restoredClash
        ? KEY_CLASH_RESTORED
        : `${info.message}. Your entries are still here: post again to record them as a new receipt.`);
      setErrorFocus((n) => n + 1);
      if (restoredClash) load({ silent: true });
      return;
    }
    if (info.code === "CONFLICT" && d.reason === "TOKEN_NO_HOTEL") {
      forgetLink();
      setFailure({ phase: "no_hotel", message: info.message });
      setPhase("no_hotel");
      return;
    }
    writeDraft();
    if (info.code === "CONFLICT" && d.reason === "PO_NOT_RECEIVABLE") {
      clearDraft();
      touchedRef.current = false;
      setFormError(info.message);
      load({ silent: true });
    } else if (info.code === "OVER_RECEIPT" && line) {
      const asked = d.requested != null ? `; this receipt has ${fmtQty(d.requested)}` : "";
      showErrors({
        [lineId]: `Max acceptable ${fmtQtyUnit(d.maxAcceptable, line.unit)} at this hotel${asked}. ${OVER_RECEIPT_HINT}`,
      });
    } else if (line) {
      // UOM_FACTOR_REQUIRED, MARK_OUT_NOT_ALLOWED, MAPPING_NOT_ALLOWED, EXPIRY_REQUIRED, …
      showErrors({ [lineId]: info.message });
    } else {
      setFormError(info.message);
      setErrorFocus((n) => n + 1);
    }
  };

  const runPost = async () => {
    if (postingRef.current) return;
    const token = tokenRef.current;
    const data = ctxRef.current;
    if (!token || !data?.po) return;
    const priorUnknown = unsentRef.current;
    postingRef.current = true;
    setPosting(true);
    setDiscardOpen(false);
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
    const body = { ...input, post: true, clientEventId: sessionKeyRef.current };
    // From here until the server answers, the outcome is unknown: save that
    // first, so a reload mid-flight comes back frozen with Retry on this key.
    unsentRef.current = true;
    writeDraft();
    try {
      const grn = await postTokenGrn(token, body);
      if (mountedRef.current) finishPosted(grn, body);
    } catch (err) {
      if (mountedRef.current) handlePostError(err, { priorUnknown });
    } finally {
      postingRef.current = false;
      if (mountedRef.current) {
        setPosting(false);
        setConfirmOpen(false);
      }
    }
  };

  const requestPost = () => {
    if (isFrozen()) return;
    const errs = validateForPost(receivableLines, entriesRef.current, { allowMarkOut: false });
    if (errs) {
      const { form, ...perLine } = errs;
      showErrors(perLine, form || null);
      return;
    }
    setLineErrors({});
    setFormError(null);
    setConfirmOpen(true);
  };

  /** Give up on an attempt whose outcome is unknown: new key, empty form. */
  const discardAndRestart = () => {
    // A Retry already went out: it decides, not this.
    if (postingRef.current) return;
    setDiscardOpen(false);
    clearDraft();
    restoredKeyRef.current = null;
    startForm(ctxRef.current);
    // The receipts list shows whether the last attempt landed after all.
    load({ silent: true });
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
        setFailure({ phase: "expired", uncertain: false });
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
  const padLine = scan.pad && !frozen ? lineById.get(Number(scan.pad.poLineId)) : null;
  const scanPaused = frozen || confirmOpen || !!padLine;

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
      {posting ? "Posting…" : "Post receipt"}
    </>
  );
  const retryLabel = (
    <>
      <RefreshCw size={14} aria-hidden="true" />
      Retry
    </>
  );

  const frame = (body, actions = null) => (
    <div className={own.page}>
      <Head>
        <title>Receive goods · Workwise</title>
        {/* The first paint's URL can still hold ?t=: send no Referer with anything. */}
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
          {showForm && !isMobile && !unsent && (
            <div className={styles.headerActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSuccess}`}
                onClick={requestPost}
                disabled={frozen || receivableLines.length === 0}
              >
                {postLabel}
              </button>
            </div>
          )}
        </div>
      </section>
      <main className={styles.pageBody}>{body}</main>
      {/* Inside the page so its spacer sees --mobile-action-bar-h. */}
      {actions}
    </div>
  );

  const stateCard = ({ icon, title, sub, action = null, ok = false, role }) => (
    <div className={styles.stateCard} role={role}>
      <div className={`${styles.stateIc} ${ok ? styles.stateIcOk : ""}`}>{icon}</div>
      <h2 className={styles.stateTitle} tabIndex={-1} ref={focusOnMount}>{title}</h2>
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
      icon: <Link2Off size={20} aria-hidden="true" />,
      title: "Link expired",
      sub: failure?.uncertain ? EXPIRED_UNCERTAIN : EXPIRED_MESSAGE,
      role: "alert",
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
    flash: scan.flashId === l.poLineId,
    showPrices: false,
    allowMarkOut: false,
    departments: [],
    allowItemSetup: false,
    suggestions: [],
    receivedAt: header.receivedAt,
  });

  const discardConfirm = discardOpen && (
    <div className={own.discardBox} role="alertdialog" aria-label="Discard these entries?" ref={discardBoxRef}>
      <p className={own.bannerText}>
        <strong>Discard these entries?</strong> {DISCARD_WARNING}
      </p>
      <div className={own.discardActions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => setDiscardOpen(false)}
          ref={keepEntriesRef}
        >
          Keep them
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={discardAndRestart}>
          Discard entries
        </button>
      </div>
    </div>
  );

  const banners = (
    <>
      {posting && (
        <div className={`${own.banner} ${own.bannerInfo}`} role="status">
          <Loader2 size={16} className={styles.spin} aria-hidden="true" />
          <span className={own.bannerText}>Posting this receipt. Keep this page open.</span>
        </div>
      )}
      {unsent && !posting && (
        <div className={`${own.banner} ${own.bannerWarn}`} role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span className={own.bannerText}>{unsentNote || NETWORK_DROPPED}</span>
          {!isMobile && (
            <div className={own.bannerActions}>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setDiscardOpen(true)}>
                Discard and start over
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => runPost()}>
                {retryLabel}
              </button>
            </div>
          )}
        </div>
      )}
      {unsent && !posting && discardConfirm}
      {restored && !unsent && (
        <div className={`${own.banner} ${own.bannerInfo}`} role="status">
          <WifiOff size={16} aria-hidden="true" />
          <span className={own.bannerText}>Restored the entries you had on this page before it reloaded.</span>
        </div>
      )}
    </>
  );

  const itemsCard = (
    <section className={`${styles.card} ${own.itemsCard}`} aria-labelledby="token-receive-items-title">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="token-receive-items-title">
          <span className={styles.cardIc}><ScanBarcode size={14} aria-hidden="true" /></span>
          Items
          <span className={styles.count}>{lines.length}</span>
        </h2>
        <span className={styles.saveState}>{counts.withQty} of {receivableLines.length} entered</span>
      </div>
      <div className={own.scanDock} data-testid="scan-dock">
        <TokenScanBox disabled={scanPaused} onRead={onScanRead} onChoose={onScanChoose} />
      </div>
      {formError && (
        <div className={styles.formError} role="alert" tabIndex={-1} ref={formErrorRef} style={{ marginTop: 14 }}>
          {formError}
        </div>
      )}
      <fieldset className={own.fieldset} disabled={frozen}>
        {lines.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Nothing is open on this order at {hotel?.name || "this hotel"}</div>
          </div>
        ) : isMobile ? (
          <div className={styles.cardList} ref={linesBoxRef}>
            {cardOrder.map((l) => (l.needsUomFactor ? (
              <BlockedLineCard key={l.poLineId} line={l} />
            ) : (
              <ReceiveLineCard
                key={l.poLineId}
                {...lineProps(l)}
                onStep={(delta) => scan.stepLine(l, delta)}
                onOpenPad={() => scan.openSetPad(l)}
              />
            )))}
          </div>
        ) : (
          <div className={styles.tableWrap} ref={linesBoxRef}>
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
      </fieldset>
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
        <fieldset className={own.fieldset} disabled={frozen}>
          <DeliveryDocuments
            header={header}
            onChange={patchHeader}
            dispatches={ctx?.dispatches || []}
            onPickDispatch={pickDispatch}
            attachments={[]}
            pendingFiles={pendingFiles}
            onUpload={(file, kind) => {
              if (!isFrozen()) setPendingFiles((list) => [...list, { file, kind }]);
            }}
            onRemovePending={(i) => {
              if (!isFrozen()) setPendingFiles((list) => list.filter((_, j) => j !== i));
            }}
            uploading={frozen}
            canDelete={false}
          />
        </fieldset>
      </div>
    </section>
  );

  const postedId = posted?.grn?.id ?? null;
  const postedUploads = (postedId != null && uploads[postedId]) || [];
  const postedCard = posted && (
    <div className={styles.stateCard} role="status">
      <div className={`${styles.stateIc} ${posted.replayMismatch ? "" : styles.stateIcOk}`}>
        {posted.replayMismatch ? <AlertTriangle size={20} aria-hidden="true" /> : <PackageCheck size={20} aria-hidden="true" />}
      </div>
      <h2 className={styles.stateTitle} tabIndex={-1} ref={focusOnMount}>
        {posted.replayMismatch ? "Already recorded" : "Receipt posted"}
      </h2>
      {posted.replayMismatch ? (
        <p className={styles.stateSub} role="alert">{replayMismatchMessage(posted.grn)}</p>
      ) : (
        <p className={styles.stateSub}>
          {posted.grn?.grnNumber ? <span className={styles.docNo}>{posted.grn.grnNumber}</span> : null}
          {posted.grn?.grnNumber ? <br /> : null}
          Accepted goods are in stock{hotel?.name ? ` at ${hotel.name}` : ""}.
        </p>
      )}
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
      {postedUploads.length > 0 && <UploadList uploads={postedUploads} />}
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
            // The posted card shows its own files; after "Receive another delivery", the row does.
            uploads={r.id === postedId ? null : uploads[r.id] || null}
            onAttach={(file, kind) => attachPaperwork(r.id, file, kind)}
          />
        ))}
      </ul>
    </section>
  );

  const actionBar = showForm && isMobile && (
    <MobileActionBar
      label="Receive actions"
      summary={<span>{counts.withQty} of {receivableLines.length} lines entered</span>}
    >
      {unsent && !posting ? (
        <>
          <MobileActionButton onClick={() => setDiscardOpen(true)}>Discard</MobileActionButton>
          <MobileActionButton variant="primary" onClick={() => runPost()}>{retryLabel}</MobileActionButton>
        </>
      ) : (
        <MobileActionButton variant="primary" onClick={requestPost} disabled={frozen || receivableLines.length === 0}>
          {postLabel}
        </MobileActionButton>
      )}
    </MobileActionBar>
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
        </div>,
        actionBar
      )}

      {confirmOpen && showForm && (
        <ReceiveConfirmModal
          show
          lines={receivableLines}
          entries={entries}
          hotelName={hotel?.name}
          receivedAt={header.receivedAt}
          busy={posting}
          onConfirm={() => runPost()}
          onHide={() => {
            if (!postingRef.current) setConfirmOpen(false);
          }}
        />
      )}
      {padLine && (
        <QtyPad
          show
          title={padLine.productName}
          unit={padLine.unit}
          initial={scan.pad.initial}
          mode={scan.pad.mode}
          receivedSoFar={parseQty(entries[padLine.poLineId]?.received) ?? 0}
          openQty={padLine.openAtHotel}
          onDone={scan.onPadDone}
          onHide={scan.closePad}
        />
      )}
    </>
  );
};

export default TokenReceivePage;
