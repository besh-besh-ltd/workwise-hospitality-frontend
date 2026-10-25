import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, CloudOff, Loader2, Minus, PackageMinus, Plus, RotateCcw, Trash2, Undo2, X,
} from "lucide-react";
import ScanInput from "@/components/inventory/scan/ScanInput";
import QtyPad from "@/components/inventory/receive/QtyPad";
import MobileActionBar, { MobileActionButton } from "@/components/shared/mobile/MobileActionBar";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import useIsMobile from "@/hooks/useIsMobile";
import { getStockItem, postOut } from "@/services/inventory";
import { getDepartments } from "@/services/rbac";
import {
  fmtInstant, fmtQty, isDecimalUnit, newClientEventId, parseQty, qtyText,
} from "@/components/inventory/receive/receiveUtils";
import HotelSelect from "./HotelSelect";
import ItemPicker from "./ItemPicker";
import useInventoryHotels from "./useInventoryHotels";
import useUserId from "./useUserId";
import useQueuedOuts, { OUT_KIND } from "./useQueuedOuts";
import { dismissFailed, getOutboxStatus, outboxReady, submitOrQueue } from "./outboxBridge";
import { clearOutSession, clearOutSessionIf, listQueuedOuts, loadOutSession, saveOutSession } from "./outSession";
import {
  QTY_MAX_LENGTH, cleanQtyInput, errorInfo, freezeMessage, isImplausibleQty, isPositiveQty, isUncertainFailure,
  lineProblems, messageOf, sameLines, stockRoutes, toId,
} from "./stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "./stock.module.scss";

// Mark out to a department, or return to stock from one: one scan session,
// posted as one document (POST /inventory/out). Scan-first on a phone, with
// "Find an item" as the manual fallback.
//
// - Scanning an item adds its pack factor (stock units per scan); a weighed or
//   measured stock unit opens the qty pad instead. The toast and "Undo last
//   scan" take a scan back off.
// - The open session lives on the device under `out-session:<userId>:<hotelId>`
//   (IndexedDB) from its first line until it is recorded, together with its
//   clientEventId: a retry after a dropped reply replays the same document
//   instead of posting twice. An empty session is never kept, and nobody else
//   signed in on this device ever sees it.
// - The department is required before Post. Refusals land on their lines
//   (NEGATIVE_STOCK, the RETURN cap) or on the form (count freeze).
// - A session the outbox queued moves to its own copy (`out-queued:<userId>:
//   <clientEventId>`) and frees the hotel at once: it is listed under "Waiting
//   to sync" until the outbox says it was sent. If the server refuses it, it
//   reopens here, editable, with the refusal; if the outbox can't say what
//   became of it, it reopens locked ("uncertain"). Nothing is read as synced
//   from the absence of news.
// - A post whose answer never came (no reply, or a 5xx) locks the lines under
//   the same key ("uncertain"): Post again, or Discard after a confirm.
// - A qty over 100 on a mark out waits for the on-hand check; one far above
//   what is in stock, or with no stock figure to check against, needs a confirm.
//
// Props: initialHotelId, initialMode ("RETURN" opens in Return to stock; the page shell maps ?mode=return).

const FLASH_MS = 1100;
const MODES = [
  { value: "OUT", label: "Mark out" },
  { value: "RETURN", label: "Return to stock" },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const kindLabel = (docType) => (docType === "RETURN" ? "Return to stock" : "Mark out");
const HIGH_QTY = 100;

/** A tiny store the toasts read, so their Undo buttons lock while a post is in flight. */
const createLock = () => {
  let locked = false;
  const listeners = new Set();
  return {
    get: () => locked,
    set: (next) => {
      if (locked === next) return;
      locked = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
};

const UndoButton = ({ lock, onClick }) => {
  const locked = useSyncExternalStore(lock.subscribe, lock.get, lock.get);
  return (
    <button type="button" className={s.toastUndo} onClick={onClick} disabled={locked}>
      Undo
    </button>
  );
};

const ScanToast = ({ name, unit, delta, total, lock, onUndo }) => (
  <div className={s.toastRow}>
    <div style={{ minWidth: 0 }}>
      <div className={s.toastQty}>+{fmtQty(delta)} (now {fmtQty(total)})</div>
      <div className={s.toastName}>{name}{unit ? ` · ${unit}` : ""}</div>
    </div>
    <UndoButton lock={lock} onClick={onUndo} />
  </div>
);

const nonItemMessage = (result) => {
  switch (result?.kind) {
    case "po":
      return "That's a purchase order. Scan an item to add it to this session.";
    case "grn":
      return "That's a goods receipt. Scan an item to add it to this session.";
    case "dispatch":
      return "That's a dispatch note. Scan an item to add it to this session.";
    default:
      return "Scan an item to add it to this session.";
  }
};

/** A session line as stored: quantities are text, as typed (stock units). */
const toLine = (item, qty) => {
  const available = item.qty != null ? Number(item.qty) : item.available != null ? Number(item.available) : null;
  return {
    invItemId: Number(item.invItemId),
    displayName: item.displayName || `Item ${item.invItemId}`,
    itemCode: item.itemCode ?? null,
    stockUom: item.stockUom || "",
    qty: qtyText(qty),
    exact: Number(qty),
    available,
    // "pending" until the on-hand check settles (it may settle unknown)
    onHand: available != null ? "done" : "pending",
    confirmedQty: null,
  };
};

const storedLine = ({ invItemId, displayName, itemCode, stockUom, qty, exact, available, confirmedQty }) => ({
  invItemId, displayName, itemCode, stockUom, qty, exact, available, confirmedQty: confirmedQty ?? null,
});

/** Lines from a device copy; an unknown on-hand is checked again. */
const linesFromStored = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((l) => l && l.invItemId != null)
    .map((l) => ({
      ...l,
      invItemId: Number(l.invItemId),
      exact: l.exact ?? parseQty(l.qty) ?? 0,
      available: l.available != null ? Number(l.available) : null,
      onHand: l.available != null ? "done" : "pending",
      confirmedQty: l.confirmedQty ?? null,
    }));

/**
 * What a line needs before a mark out can post: null, "checking" (the on-hand
 * check for a qty over 100 hasn't settled) or "confirm" (far above what is in
 * stock, or no stock figure to check against). Returns are never held.
 */
const qtyCheck = (l, mode) => {
  if (mode !== "OUT") return null;
  const q = parseQty(l.qty);
  if (!(q > HIGH_QTY) || l.confirmedQty === l.qty) return null;
  if (l.available == null) return l.onHand === "pending" ? "checking" : "confirm";
  return isImplausibleQty(q, l.available) ? "confirm" : null;
};

const uncertainText = (info) =>
  `${
    info?.gaveUp
      ? `The sync queue gave up on this session${info.message ? ` (${info.message.replace(/\.$/, "")})` : ""}`
      : info?.httpStatus
        ? "The server had a problem before it answered"
        : "The connection dropped before the server answered"
  }, ` +
  "so this session may or may not be recorded. Post again to find out: the same session is never recorded twice. " +
  "Discard it only if you know it went through, or you no longer want it.";

/** What the page would send for a stored session (the same body post() builds). */
const payloadOf = (session) => ({
  hotelId: Number(session.hotelId),
  docType: session.docType === "RETURN" ? "RETURN" : "OUT",
  departmentId: Number(session.departmentId),
  ...(String(session.requestedByName || "").trim() ? { requestedByName: String(session.requestedByName).trim() } : {}),
  clientEventId: session.sessionKey || session.clientEventId,
  lines: (session.lines || []).map((l) => ({ invItemId: l.invItemId, qty: parseQty(l.qty) })),
});

const unconfirmedText =
  "This device can't confirm whether this session was recorded: the sync queue no longer has it. Post again to find " +
  "out: the same session is never recorded twice. Discard it only if you know it went through, or you no longer want it.";

const MarkOutPage = ({ initialHotelId = null, initialMode = null }) => {
  const isMobile = useIsMobile();
  const userId = useUserId();
  const { hotels, loading: hotelsLoading, error: hotelsError, reload: reloadHotels } = useInventoryHotels();

  const [hotelId, setHotelId] = useState(null);
  const [mode, setMode] = useState(initialMode === "RETURN" ? "RETURN" : "OUT");
  const [departmentId, setDepartmentId] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [lines, setLines] = useState([]);
  const [restoredFor, setRestoredFor] = useState(null);
  const [restoredNote, setRestoredNote] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [problems, setProblems] = useState({});
  const [formError, setFormError] = useState(null);
  const [deptError, setDeptError] = useState(null);
  const [posting, setPosting] = useState(false);
  const [done, setDone] = useState(null);
  const [pad, setPad] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [deptLoadError, setDeptLoadError] = useState(null);
  // "open" (editable) or "uncertain" (no answer came, or the outbox lost track of it)
  const [status, setStatus] = useState("open");
  const [sentPayload, setSentPayload] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [notices, setNotices] = useState([]); // [{id, hotelId, tone: "ok"|"warn", text}]
  const [viewing, setViewing] = useState(null); // clientEventId of a waiting session shown in full
  const [askDiscard, setAskDiscard] = useState(null); // clientEventId: "Discard from this device?"
  const [askOpen, setAskOpen] = useState(null); // clientEventId: "Open it and drop the current session?"

  const linesRef = useRef([]);
  const opsRef = useRef([]);
  const opSeqRef = useRef(0);
  const sessionKeyRef = useRef(newClientEventId());
  const postingRef = useRef(false);
  const statusRef = useRef("open");
  const flashTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const hotelIdRef = useRef(null);
  const toastIdsRef = useRef(new Set());
  const onHandAskedRef = useRef(new Set());
  const openingRef = useRef(false);
  const queueRef = useRef(null); // the queued-sessions hook, for the restore effect
  const lockRef = useRef(null);
  if (!lockRef.current) lockRef.current = createLock();
  const lock = lockRef.current;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(flashTimerRef.current);
    };
  }, []);

  const editable = status === "open";
  useEffect(() => {
    statusRef.current = status;
    lock.set(posting || status !== "open");
  }, [posting, status, lock]);

  const dismissToasts = useCallback(() => {
    for (const id of toastIdsRef.current) toast.dismiss(id);
    toastIdsRef.current.clear();
  }, []);

  // ── Hotel: the URL's choice when the server lists it, else the first ──────
  useEffect(() => {
    if (hotelsLoading || hotelId != null || !hotels.length) return;
    const wanted = toId(initialHotelId);
    setHotelId(wanted && hotels.some((h) => h.id === wanted) ? wanted : hotels[0].id);
  }, [hotels, hotelsLoading, hotelId, initialHotelId]);
  const hotel = hotels.find((h) => h.id === hotelId) || null;
  hotelIdRef.current = hotelId;

  const hotelIds = useMemo(() => (hotelId ? [hotelId] : []), [hotelId]);
  const {
    canCreate, loading: permLoading, error: permError, refetch: refetchPerms,
  } = useModulePermissions({ moduleKey: "inventory", hotelIds, enabled: !!hotelId });
  const permReady = !!hotelId && !permLoading && !permError;
  const cannotPost = permReady && !canCreate;

  // ── Departments (the master list, as the receive context uses) ────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDepartments();
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setDepartments(list.map((d) => ({ id: Number(d.id), title: d.title || `Department ${d.id}` })));
      } catch (err) {
        if (!cancelled) setDeptLoadError(errorInfo(err, "Could not load departments.").message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Session: restore the device copy for this hotel, then keep it saved ───
  const commitLines = useCallback((next) => {
    linesRef.current = next;
    setLines(next);
  }, []);

  const resetSession = useCallback(
    (keepMode) => {
      commitLines([]);
      opsRef.current = [];
      onHandAskedRef.current = new Set();
      setUndoCount(0);
      setProblems({});
      setFormError(null);
      setDeptError(null);
      setDepartmentId("");
      setRequestedBy("");
      setStatus("open");
      setSentPayload(null);
      setConfirmDiscard(false);
      if (!keepMode) setMode(initialMode === "RETURN" ? "RETURN" : "OUT");
      sessionKeyRef.current = newClientEventId();
    },
    [commitLines, initialMode]
  );

  // The open slot belongs to one user at one hotel.
  const slotKey = hotelId ? `${userId || "-"}:${hotelId}` : null;

  /** Put a stored session (open, uncertain or reopened) on screen. */
  const showStored = useCallback(
    (saved, savedStatus) => {
      commitLines(linesFromStored(saved.lines));
      opsRef.current = [];
      onHandAskedRef.current = new Set();
      setUndoCount(0);
      setProblems({});
      setDeptError(null);
      setConfirmDiscard(false);
      setMode(saved.docType === "RETURN" ? "RETURN" : "OUT");
      setDepartmentId(saved.departmentId ? String(saved.departmentId) : "");
      setRequestedBy(saved.requestedByName || "");
      sessionKeyRef.current = saved.sessionKey || saved.clientEventId || newClientEventId();
      setStatus(savedStatus);
      setSentPayload(savedStatus === "uncertain" ? saved.sentPayload : null);
    },
    [commitLines]
  );

  useEffect(() => {
    if (!hotelId) return undefined;
    let cancelled = false;
    setRestoredFor(null);
    setRestoredNote(false);
    setDone(null);
    setViewing(null);
    setAskDiscard(null);
    setAskOpen(null);
    dismissToasts();
    (async () => {
      let saved = await loadOutSession(userId, hotelId);
      const savedKey = saved ? saved.sessionKey || saved.clientEventId : null;
      if (savedKey && (await listQueuedOuts(userId)).some((e) => e.clientEventId === savedKey)) {
        // The outbox already holds this session (the slot was being freed when
        // the page went): the queued copy wins, and is listed or reopened.
        await clearOutSessionIf(userId, hotelId, savedKey);
        saved = null;
      }
      if (savedKey && saved && Array.isArray(saved.lines) && saved.lines.length) {
        // The page went while this session was being sent: if the outbox has
        // it (waiting, sent or refused), it is a queued session now, not a
        // draft to edit and send again.
        await outboxReady();
        const held = getOutboxStatus(OUT_KIND, savedKey);
        if ((held === "pending" || held === "sent" || held === "failed") && queueRef.current) {
          const known = queueRef.current.itemFor(savedKey);
          await queueRef.current.track({
            ...saved,
            status: "queued",
            clientEventId: savedKey,
            sessionKey: savedKey,
            departmentName: saved.departmentName || null,
            queuedAt: Number(saved.savedAt) || Date.now(),
            sentPayload: known?.payload || saved.sentPayload || payloadOf({ ...saved, sessionKey: savedKey }),
          });
          await clearOutSessionIf(userId, hotelId, savedKey);
          saved = null;
        }
      }
      if (cancelled) return;
      const savedLines = Array.isArray(saved?.lines) ? saved.lines.filter((l) => l && l.invItemId != null) : [];
      if (savedLines.length > 0) {
        const savedStatus = saved.status === "uncertain" && saved.sentPayload ? "uncertain" : "open";
        showStored(saved, savedStatus);
        setFormError(
          savedStatus === "uncertain" ? { text: saved.lastError === "unconfirmed" ? unconfirmedText : uncertainText(saved.lastError) } : null
        );
        setRestoredNote(savedStatus === "open");
      } else {
        resetSession(true);
      }
      setRestoredFor(`${userId || "-"}:${hotelId}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId, userId, showStored, resetSession, dismissToasts]);

  const snapshot = (extra = {}) => ({
    savedAt: Date.now(),
    hotelId,
    sessionKey: sessionKeyRef.current,
    docType: mode,
    departmentId,
    departmentName: departments.find((d) => String(d.id) === String(departmentId))?.title || null,
    requestedByName: requestedBy,
    lines: linesRef.current.map(storedLine),
    status: "open",
    ...extra,
  });

  // The key of the session this render shows. The ref moves on as soon as
  // another session is put on screen, which can be before this render's
  // effects run, so the effects below use this copy.
  const shownSessionKey = sessionKeyRef.current;

  // An open session is saved on every change once it has a line, but not while
  // a post is in flight (the post writes what becomes of it); an uncertain one
  // was written when it changed state and is frozen since. A session with no
  // lines is cleared only while the slot still holds that session: an emptied
  // screen (Discard current and open) must never erase what is opened into the
  // slot next, however late its effect runs or its clear lands.
  useEffect(() => {
    if (!slotKey || restoredFor !== slotKey || done || posting || status !== "open") return;
    if (!lines.length) {
      clearOutSessionIf(userId, hotelId, shownSessionKey);
      return;
    }
    saveOutSession(userId, hotelId, snapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotKey, restoredFor, done, posting, status, mode, departmentId, requestedBy, lines]);

  // ── Line edits ─────────────────────────────────────────────────────────────
  const flash = (invItemId) => {
    setFlashId(invItemId);
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashId(null), FLASH_MS);
  };

  const clearProblem = (invItemId) =>
    setProblems((p) => {
      if (!p[invItemId]) return p;
      const next = { ...p };
      delete next[invItemId];
      return next;
    });

  const locked = () => postingRef.current || statusRef.current !== "open";

  // Scans don't carry the on-hand qty; fetch it once per line, so the line can
  // show it and a slip (or a stray scan into a qty field) can be caught. The
  // line's `onHand` says when the check has settled (known or not).
  const askOnHand = (id) => {
    const forHotel = hotelIdRef.current;
    if (!forHotel || onHandAskedRef.current.has(id)) return;
    onHandAskedRef.current.add(id);
    (async () => {
      let qty = null;
      try {
        const res = await getStockItem(forHotel, id);
        const n = res?.balance?.qty;
        if (n != null && Number.isFinite(Number(n))) qty = Number(n);
      } catch {
        // on-hand stays unknown; a big qty then needs a confirm, and the server still checks every line
      }
      if (!mountedRef.current || hotelIdRef.current !== forHotel) return;
      const cur = linesRef.current;
      if (!cur.some((l) => l.invItemId === id && l.onHand === "pending")) return;
      commitLines(
        cur.map((l) =>
          l.invItemId === id && l.onHand === "pending"
            ? { ...l, onHand: "done", available: l.available ?? qty }
            : l
        )
      );
    })();
  };

  // A line restored from the device, or put back by Undo, checks again.
  useEffect(() => {
    for (const l of lines) if (l.onHand === "pending") askOnHand(l.invItemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  /** Add `delta` stock units of `item`; returns the line's new total. */
  const addToSession = (item, delta) => {
    const cur = linesRef.current;
    const id = Number(item.invItemId);
    const idx = cur.findIndex((l) => l.invItemId === id);
    let total;
    let created = false;
    let next;
    if (idx >= 0) {
      // Keep the unrounded running total, so repeated pack-factor scans never
      // accumulate rounding.
      const exact = (Number(cur[idx].exact) || parseQty(cur[idx].qty) || 0) + delta;
      total = exact;
      next = cur.slice();
      next[idx] = { ...cur[idx], exact, qty: qtyText(exact) };
    } else {
      created = true;
      total = delta;
      next = [toLine(item, delta), ...cur];
    }
    commitLines(next);
    opSeqRef.current += 1;
    const op = { id: opSeqRef.current, invItemId: id, delta, created };
    opsRef.current = [...opsRef.current, op];
    setUndoCount(opsRef.current.length);
    clearProblem(id);
    setFormError(null);
    flash(id);
    return { total, op };
  };

  const undoOp = (opId) => {
    if (locked()) return;
    const op = opsRef.current.find((o) => o.id === opId);
    if (!op) return;
    opsRef.current = opsRef.current.filter((o) => o.id !== opId);
    setUndoCount(opsRef.current.length);
    const cur = linesRef.current;
    const idx = cur.findIndex((l) => l.invItemId === op.invItemId);
    if (idx < 0) return;
    const exact = (Number(cur[idx].exact) || parseQty(cur[idx].qty) || 0) - op.delta;
    if (exact <= 0.00005) {
      commitLines(cur.filter((_, i) => i !== idx));
      opsRef.current = opsRef.current.filter((o) => o.invItemId !== op.invItemId);
      setUndoCount(opsRef.current.length);
    } else {
      const next = cur.slice();
      next[idx] = { ...cur[idx], exact, qty: qtyText(exact) };
      commitLines(next);
    }
  };

  const undoLast = () => {
    const last = opsRef.current[opsRef.current.length - 1];
    if (last) undoOp(last.id);
  };

  const showToast = (toastId, content) => {
    toastIdsRef.current.add(toastId);
    toast(content, {
      toastId,
      autoClose: 4000,
      closeOnClick: false,
      hideProgressBar: true,
      onClose: () => toastIdsRef.current.delete(toastId),
    });
  };

  const showScanToast = (line, delta, total, op) => {
    const toastId = `out-scan-${op.id}`;
    showToast(
      toastId,
      <ScanToast
        name={line.displayName}
        unit={line.stockUom}
        delta={delta}
        total={total}
        lock={lock}
        onUndo={() => {
          if (locked()) return;
          undoOp(op.id);
          toast.dismiss(toastId);
        }}
      />
    );
  };

  /** One scan (or pick) of `packFactor` stock units. */
  const addItem = (item, packFactor = 1) => {
    if (locked()) return;
    const factor = Number(packFactor) > 0 ? Number(packFactor) : 1;
    if (isDecimalUnit(item.stockUom)) {
      setPad({ item, mode: "add", initial: factor !== 1 ? factor : null });
      return;
    }
    const { total, op } = addToSession(item, factor);
    showScanToast(item, factor, total, op);
  };

  const setLineQty = (invItemId, text) => {
    if (locked()) return;
    const clean = cleanQtyInput(text);
    const cur = linesRef.current;
    const next = cur.map((l) => (l.invItemId === invItemId ? { ...l, qty: clean, exact: parseQty(clean) ?? 0 } : l));
    commitLines(next);
    // A typed qty is its own undo: earlier scans of this line can't be undone.
    opsRef.current = opsRef.current.filter((o) => o.invItemId !== invItemId);
    setUndoCount(opsRef.current.length);
    clearProblem(invItemId);
  };

  const confirmQty = (invItemId) => {
    if (locked()) return;
    commitLines(linesRef.current.map((l) => (l.invItemId === invItemId ? { ...l, confirmedQty: l.qty } : l)));
    setFormError(null);
  };

  const stepLine = (line, step) => {
    const cur = parseQty(line.qty) ?? 0;
    const nextQty = Math.max(0, cur + step);
    if (nextQty <= 0) return;
    setLineQty(line.invItemId, qtyText(nextQty));
  };

  const removeLine = (line) => {
    if (locked()) return;
    const cur = linesRef.current;
    const index = cur.findIndex((l) => l.invItemId === line.invItemId);
    if (index < 0) return;
    const removed = cur[index];
    commitLines(cur.filter((_, i) => i !== index));
    opsRef.current = opsRef.current.filter((o) => o.invItemId !== line.invItemId);
    setUndoCount(opsRef.current.length);
    clearProblem(line.invItemId);
    // Added again later, it is a fresh line: its on-hand is checked again.
    onHandAskedRef.current.delete(line.invItemId);
    const toastId = `out-remove-${line.invItemId}-${Date.now()}`;
    showToast(
      toastId,
      <div className={s.toastRow}>
        <div className={s.toastName}>Removed {line.displayName}</div>
        <UndoButton
          lock={lock}
          onClick={() => {
            if (locked()) return;
            const now = linesRef.current;
            if (!now.some((l) => l.invItemId === removed.invItemId)) {
              const back = now.slice();
              back.splice(Math.min(index, back.length), 0, removed.available == null ? { ...removed, onHand: "pending" } : removed);
              commitLines(back);
            }
            toast.dismiss(toastId);
          }}
        />
      </div>
    );
  };

  // ── Scans ──────────────────────────────────────────────────────────────────
  const onResolved = (result) => {
    if (!result) return;
    if (result.kind !== "item" || !result.item) {
      toast.info(nonItemMessage(result));
      return;
    }
    const it = result.item;
    if (it.stockedAtHotel === false) {
      toast.warn(`${it.displayName || "That item"} isn't stocked at ${hotel?.name || "this hotel"} yet.`);
      return;
    }
    addItem({ invItemId: it.invItemId, displayName: it.displayName, stockUom: it.stockUom }, it.packFactor);
  };
  const onUnknown = (code) =>
    toast.warn(`${code || "That code"} isn't a known item. Find it by name below.`);

  const onPadDone = (qty) => {
    const p = pad;
    setPad(null);
    if (!p || !(qty > 0)) return;
    if (p.mode === "set") {
      setLineQty(Number(p.item.invItemId), qtyText(qty));
      return;
    }
    if (locked()) return;
    const { total, op } = addToSession(p.item, qty);
    showScanToast(p.item, qty, total, op);
  };

  // ── Post ───────────────────────────────────────────────────────────────────
  const verb = mode === "RETURN" ? "returns" : "marks out";
  const uomOf = (id) => linesRef.current.find((l) => l.invItemId === Number(id))?.stockUom || "";

  /** A definite refusal: nothing was recorded, and the session is editable. */
  const applyRefusal = (info, payload, { prefix = "" } = {}) => {
    const sentIds = (payload?.lines || []).map((l) => Number(l.invItemId));
    const say = (text, extra = {}) => setFormError({ text: `${prefix}${text}`, ...extra });
    if (info.code === "LOCKED") {
      say(`${freezeMessage(info.details)}: marking out and returns are refused until it's submitted or cancelled.`, {
        countId: info.details.countId,
      });
    } else if (info.code === "VALIDATION" && info.details.field === "departmentId") {
      setDeptError(info.message);
      say(info.message);
    } else if (info.code === "CONFLICT" && info.details.field === "clientEventId") {
      sessionKeyRef.current = newClientEventId();
      say(`${info.message} Post again to record it as a new session.`);
    } else {
      const probs = lineProblems(info, sentIds, { uomOf, verb });
      if (Object.keys(probs).length) {
        if (info.code === "NEGATIVE_STOCK") {
          commitLines(
            linesRef.current.map((l) =>
              probs[l.invItemId]?.available != null ? { ...l, available: probs[l.invItemId].available } : l
            )
          );
        }
        setProblems(probs);
        say(
          info.code === "NEGATIVE_STOCK"
            ? "Some items don't have that much in stock. Fix the highlighted lines, then post again."
            : "Fix the highlighted line, then post again."
        );
      } else {
        // C3: a hotel you can't see (or one that's gone) answers 404.
        say(messageOf(info));
      }
    }
  };

  // ── Sessions the outbox holds ─────────────────────────────────────────────
  const onSynced = (copy, result) => {
    const where = hotels.find((h) => h.id === Number(copy.hotelId))?.name || null;
    const label = `${kindLabel(copy.docType)}${copy.departmentName ? ` · ${copy.departmentName}` : ""}`;
    const number = result && typeof result === "object" ? result.outNumber : null;
    const mismatch =
      !!result?.replayed && Array.isArray(result?.lines) && !sameLines(copy.sentPayload?.lines || [], result.lines);
    const text = mismatch
      ? `${label} was already recorded${number ? ` as ${number}` : ""}, with different lines from the ones saved on this ` +
        "device. Check it, and mark out anything missing as a new session."
      : `${label} · ${plural(copy.lines?.length || 0, "item")} synced${number ? ` as ${number}` : ""}${where ? ` at ${where}` : ""}.`;
    setNotices((list) => [...list.filter((n) => n.id !== copy.clientEventId), {
      id: copy.clientEventId, hotelId: Number(copy.hotelId), tone: mismatch ? "warn" : "ok", text,
    }]);
    if (mismatch) toast.warn(text, { autoClose: false });
    else toast.success(text);
  };

  const queue = useQueuedOuts({ userId, onSynced });
  queueRef.current = queue;
  const hotelEntries = queue.entries.filter((e) => e.hotelId === Number(hotelId) && e.state !== "sent");

  /**
   * Take a queued copy back into the open slot: refused ones reopen editable
   * with the refusal; ones the outbox can't account for, or gave up on (no
   * answer for days, or out of server retries), reopen locked: they may be
   * recorded. The slot is written before the copy goes, so a reload in between
   * loses nothing.
   */
  const openQueued = async (entry) => {
    if (openingRef.current || postingRef.current || !entry) return;
    openingRef.current = true;
    try {
      // A waiting one (a try got no answer: it may be recorded) is taken back
      // from the outbox first, so it isn't sent behind the reopened session.
      if (entry.state === "pending") {
        const taken = await queue.discard(entry, { keepCopy: true });
        if (!taken) {
          if (mountedRef.current) toast.info("It was sent (or settled) before it could be opened. Its status below is up to date.");
          return;
        }
      }
      const copy = entry.copy;
      const forHotel = Number(copy.hotelId);
      const failed = entry.state === "failed";
      const lastError = entry.gaveUp
        ? { httpStatus: entry.error?.httpStatus ?? null, gaveUp: true, message: entry.error?.message || null }
        : entry.state === "pending"
          ? { httpStatus: null } // a try got no answer
          : "unconfirmed";
      const slot = {
        savedAt: Date.now(),
        hotelId: forHotel,
        sessionKey: copy.clientEventId,
        docType: copy.docType,
        departmentId: copy.departmentId,
        departmentName: copy.departmentName || null,
        requestedByName: copy.requestedByName,
        lines: copy.lines,
        status: failed ? "open" : "uncertain",
        ...(failed ? {} : { sentPayload: copy.sentPayload || payloadOf(copy), lastError }),
      };
      await saveOutSession(userId, forHotel, slot);
      await queue.forget(entry.clientEventId);
      if (entry.failed?.id != null) dismissFailed(entry.failed.id);
      if (!mountedRef.current || hotelIdRef.current !== forHotel) return;
      dismissToasts();
      setDone(null);
      setRestoredNote(false);
      showStored(slot, failed ? "open" : "uncertain");
      if (failed) {
        setFormError(null);
        applyRefusal(entry.error || {}, copy.sentPayload, { prefix: "This session was refused when it synced. " });
      } else {
        setFormError({ text: lastError === "unconfirmed" ? unconfirmedText : uncertainText(lastError) });
      }
    } finally {
      openingRef.current = false;
    }
  };

  const send = async (payload) => {
    if (postingRef.current) return;
    const postedHotel = Number(payload.hotelId);
    const base = snapshot({ sessionKey: payload.clientEventId, hotelId: postedHotel });
    const departmentName = departments.find((d) => d.id === Number(payload.departmentId))?.title || null;
    postingRef.current = true;
    lock.set(true);
    setPosting(true);
    setProblems({});
    setDeptError(null);
    setFormError(null);
    setConfirmDiscard(false);
    try {
      const { queued, result, persisted } = await submitOrQueue({
        kind: OUT_KIND,
        clientEventId: payload.clientEventId,
        payload,
        send: (p) => postOut(p),
        summary: `${kindLabel(payload.docType)}${departmentName ? ` · ${departmentName}` : ""} · ${plural(payload.lines.length, "item")}`,
      });
      if (queued) {
        // The outbox holds the event. Its copy moves out of the open slot (copy
        // first, then the slot), so the hotel is free for the next session.
        await queue.track({
          ...base,
          status: "queued",
          clientEventId: payload.clientEventId,
          departmentName,
          queuedAt: Date.now(),
          sentPayload: payload,
          persisted: persisted !== false,
        });
        await clearOutSessionIf(userId, postedHotel, payload.clientEventId);
        if (!mountedRef.current) return;
        dismissToasts();
        if (hotelIdRef.current === postedHotel) resetSession(true);
        setRestoredNote(false);
        if (persisted === false) {
          // The outbox couldn't store it on the device: it lives in this page only.
          toast.warn("Kept only while this page stays open: don't close or reload until it syncs. See Waiting to sync.", {
            autoClose: false,
          });
        } else {
          toast.info("Saved on this device. It will sync when the connection is back: see Waiting to sync.");
        }
        return;
      }
      await clearOutSessionIf(userId, postedHotel, payload.clientEventId);
      sessionKeyRef.current = newClientEventId();
      if (!mountedRef.current) return;
      dismissToasts();
      const replayed = !!result?.replayed;
      setStatus("open");
      setSentPayload(null);
      setDone({
        doc: result,
        replayed,
        mismatch: replayed && Array.isArray(result?.lines) && !sameLines(payload.lines, result.lines),
      });
    } catch (err) {
      const info = errorInfo(err, "Could not post this session.");
      if (isUncertainFailure(info)) {
        await saveOutSession(userId, postedHotel, {
          ...base,
          status: "uncertain",
          sentPayload: payload,
          lastError: { httpStatus: info.httpStatus },
        });
        if (!mountedRef.current) return;
        setStatus("uncertain");
        setSentPayload(payload);
        setFormError({ text: uncertainText(info) });
        return;
      }
      if (!mountedRef.current) return;
      setStatus("open");
      setSentPayload(null);
      applyRefusal(info, payload);
    } finally {
      postingRef.current = false;
      if (mountedRef.current) setPosting(false);
      lock.set(statusRef.current !== "open");
    }
  };

  const post = () => {
    if (postingRef.current || !hotelId || statusRef.current !== "open") return;
    const cur = linesRef.current;
    setFormError(null);
    if (!cur.length) {
      setFormError({ text: "Scan or add at least one item." });
      return;
    }
    const bad = {};
    for (const l of cur) {
      if (!isPositiveQty(l.qty)) bad[l.invItemId] = { message: "Enter a qty more than 0." };
    }
    if (!departmentId) setDeptError("Choose the department");
    if (Object.keys(bad).length || !departmentId) {
      setProblems(bad);
      setFormError({
        text: !departmentId ? "Choose the department before posting." : "Fix the highlighted lines, then post.",
      });
      return;
    }
    const checks = cur.map((l) => qtyCheck(l, mode));
    if (checks.includes("checking")) {
      setFormError({ text: "Still checking what's in stock for the highlighted qty. Post again in a moment." });
      return;
    }
    if (checks.includes("confirm")) {
      setFormError({ text: "Check the highlighted qty, then post." });
      return;
    }
    send({
      hotelId: Number(hotelId),
      docType: mode,
      departmentId: Number(departmentId),
      ...(requestedBy.trim() ? { requestedByName: requestedBy.trim() } : {}),
      clientEventId: sessionKeyRef.current,
      lines: cur.map((l) => ({ invItemId: l.invItemId, qty: parseQty(l.qty) })),
    });
  };

  const postAgain = () => {
    if (statusRef.current !== "uncertain" || !sentPayload) return;
    send(sentPayload);
  };

  const discard = () => {
    if (postingRef.current) return;
    setConfirmDiscard(false);
    if (hotelId) clearOutSession(userId, hotelId);
    dismissToasts();
    resetSession(true);
  };

  // A refused (or unaccounted-for) session reopens into the slot when it is empty.
  const slotEmpty =
    !!slotKey && restoredFor === slotKey && queue.loaded && status === "open" && lines.length === 0 && !posting && !done;
  const nextToReopen = slotEmpty
    ? hotelEntries.find((e) => e.state === "failed" || e.state === "uncertain") || null
    : null;
  useEffect(() => {
    if (nextToReopen && !openingRef.current) openQueued(nextToReopen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextToReopen?.clientEventId, nextToReopen?.state]);

  const requestOpen = (entry) => {
    if (postingRef.current) return;
    if (status === "open" && linesRef.current.length === 0) openQueued(entry);
    else setAskOpen(entry.clientEventId);
  };

  const replaceAndOpen = async (entry) => {
    setAskOpen(null);
    // A session on screen that may already be recorded is settled first (Post
    // again or Discard), never thrown away to make room.
    if (postingRef.current || statusRef.current === "uncertain") return;
    openingRef.current = true; // keep the empty slot from reopening another one first
    try {
      await clearOutSession(userId, hotelId);
      dismissToasts();
      resetSession(true);
    } finally {
      openingRef.current = false;
    }
    await openQueued(entry);
  };

  const discardQueued = async (entry) => {
    setAskDiscard(null);
    const ok = await queue.discard(entry);
    if (!mountedRef.current) return;
    if (ok) toast.info(`${kindLabel(entry.copy.docType)} · ${plural(entry.copy.lines?.length || 0, "item")} discarded from this device.`);
    else toast.info("It was sent (or settled) before it could be discarded. Its status below is up to date.");
  };

  const startAnother = () => {
    resetSession(true);
    setDone(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const title = mode === "RETURN" ? "Return to stock" : "Mark out";
  const postLabel = mode === "RETURN" ? "Post return" : "Post mark out";
  const department = departments.find((d) => String(d.id) === String(departmentId)) || null;
  const exclude = useMemo(() => new Set(lines.map((l) => l.invItemId)), [lines]);
  const sessionReady = !!slotKey && restoredFor === slotKey;

  const header = (
    <section className={r.pageHeader}>
      <div className={r.pageHeaderInner}>
        <div className={r.headMain}>
          <div className={r.eyebrow}>
            <Link href={stockRoutes.stock({ hotelId: hotelId || undefined })}>
              <ArrowLeft size={12} aria-hidden="true" /> Stock
            </Link>
          </div>
          <h1 className={r.pageTitle}>{title}</h1>
          <div className={r.pageSub}>
            {hotel ? (
              <span>
                At <strong>{hotel.name}</strong>
              </span>
            ) : (
              <span>Scan items to take them out of the store, or to bring them back.</span>
            )}
          </div>
        </div>
        {hotels.length > 1 && hotelId != null && (
          <div className={`${r.headerActions} ${r.headerActionsKeep}`}>
            <HotelSelect
              hotels={hotels}
              value={hotelId ?? ""}
              disabled={posting}
              onChange={(id) => {
                if (id && !postingRef.current) setHotelId(id);
              }}
            />
          </div>
        )}
      </div>
    </section>
  );

  if (hotelsLoading || (hotels.length > 0 && !hotelId)) {
    return (
      <div className={r.page}>
        {header}
        <main className={r.pageBody}>
          <div className={`${r.card} ${r.cardBody} ${s.narrow}`} aria-busy="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={r.sk} style={{ width: `${88 - i * 14}%`, marginBottom: 14 }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (hotelsError || hotels.length === 0) {
    return (
      <div className={r.page}>
        {header}
        <main className={r.pageBody}>
          <div className={r.stateCard} role={hotelsError ? "alert" : undefined}>
            <div className={r.stateIc}><PackageMinus size={20} aria-hidden="true" /></div>
            <h2 className={r.stateTitle}>{hotelsError || "You don't have stock access at any hotel"}</h2>
            {hotelsError && (
              <div className={r.stateActions}>
                <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={reloadHotels}>
                  <RotateCcw size={14} aria-hidden="true" /> Try again
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const lineSummary = (list, key) => (
    <ul className={r.successList} aria-label={key}>
      {list.map((l) => (
        <li key={l.id ?? l.invItemId}>
          <span style={{ flex: 1 }}>{l.displayName}</span>
          <span className={s.mono}>{fmtQty(l.qty)}</span>
          <span className={s.unit}>{l.stockUom}</span>
        </li>
      ))}
    </ul>
  );

  if (done) {
    const doc = done.doc;
    const returned = doc?.docType === "RETURN";
    return (
      <div className={r.page}>
        {header}
        <main className={r.pageBody}>
          <div className={r.stateCard} role="status">
            <div className={`${r.stateIc} ${r.stateIcOk}`}><CheckCircle2 size={20} aria-hidden="true" /></div>
            <h2 className={r.stateTitle}>{returned ? "Returned to stock" : "Marked out"}</h2>
            <p className={r.stateSub}>
              <span className={s.mono}>{doc?.outNumber}</span>
              {doc?.departmentName ? ` · ${doc.departmentName}` : ""}
              {doc?.hotelName ? ` · ${doc.hotelName}` : ""}
            </p>
            {done.replayed && !done.mismatch && (
              <p className={r.stateSub}>This session was already recorded, so nothing was posted twice.</p>
            )}
            {done.mismatch && (
              <div className={`${r.lineMsg} ${r.lineWarn}`} role="alert" style={{ textAlign: "left" }}>
                <AlertTriangle size={14} aria-hidden="true" />
                <span>
                  This session was already recorded, with different lines from the ones on this device. What the server
                  holds is listed below; check it, and mark out anything missing as a new session.
                </span>
              </div>
            )}
            {Array.isArray(doc?.lines) && doc.lines.length > 0 && lineSummary(doc.lines, "Recorded items")}
            <div className={r.stateActions}>
              <button type="button" className={`${r.btn} ${r.btnPrimary}`} onClick={startAnother}>
                Start another session
              </button>
              <Link href={stockRoutes.stock({ hotelId })} className={`${r.btn} ${r.btnSecondary}`}>
                View stock
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const uncertain = status === "uncertain";
  const hotelNotices = notices.filter((n) => n.hotelId === Number(hotelId));

  const stateText = (e) => {
    switch (e.state) {
      case "checking":
        return "Checking…";
      case "sending":
        return "Sending now";
      case "discarding":
        return "Discarding…";
      case "failed":
        return `Refused: ${e.error?.message || "the server refused it"}`;
      case "uncertain":
        return e.gaveUp && e.error?.message
          ? `Not confirmed: ${e.error.message.replace(/\.$/, "")}. Open it to post again or discard`
          : "Not confirmed: open it to post again or discard";
      default: {
        if (e.mayBeRecorded) return "Waiting to sync (a try got no answer: it may already be recorded)";
        const kept = e.item?.persisted === false || e.copy?.persisted === false ? " (only while this page stays open)" : "";
        return e.item?.lastError?.message
          ? `Waiting to sync${kept} (last try: ${e.item.lastError.message})`
          : `Waiting to sync${kept}`;
      }
    }
  };

  const waitingCard = hotelEntries.length > 0 && (
    <section className={r.card} aria-label="Waiting to sync">
      <div className={r.cardHead}>
        <h2 className={r.cardTitle}>
          <CloudOff size={15} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Waiting to sync{" "}
          <span className={r.count}>{hotelEntries.length}</span>
        </h2>
      </div>
      <div className={r.cardBody}>
        <p className={s.subtle} style={{ marginTop: 0 }}>
          Waiting to sync. If it&apos;s refused you&apos;ll see it here and can fix it.
        </p>
        <ul className={s.lineList} aria-label="Sessions waiting to sync">
          {hotelEntries.map((e) => {
            const copy = e.copy;
            const label = `${kindLabel(copy.docType)}${copy.departmentName ? ` · ${copy.departmentName}` : ""}`;
            const count = copy.lines?.length || 0;
            const open = viewing === e.clientEventId;
            const attention = e.state === "failed" || e.state === "uncertain";
            return (
              <li key={e.clientEventId} aria-label={label} className={`${s.line} ${attention ? s.lineBad : ""}`}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className={s.lineName}>{label}</div>
                  <div className={s.lineMeta}>
                    <span>{plural(count, "item")}</span>
                    {copy.queuedAt && <span>{fmtInstant(new Date(copy.queuedAt).toISOString())}</span>}
                    <span>{stateText(e)}</span>
                  </div>
                </div>
                <div className={s.footActions}>
                  <button
                    type="button"
                    className={`${r.btn} ${r.btnGhost} ${r.btnSm}`}
                    aria-expanded={open}
                    onClick={() => setViewing(open ? null : e.clientEventId)}
                  >
                    {open ? "Hide" : "View"}
                  </button>
                  {e.state === "pending" && (
                    <button
                      type="button"
                      className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
                      onClick={() => setAskDiscard(e.clientEventId)}
                    >
                      Discard from this device
                    </button>
                  )}
                  {attention && (
                    <button
                      type="button"
                      className={`${r.btn} ${r.btnPrimary} ${r.btnSm}`}
                      onClick={() => requestOpen(e)}
                      disabled={posting}
                    >
                      Open
                    </button>
                  )}
                </div>
                {open && lineSummary(copy.lines || [], `Items in ${label}`)}
                {askDiscard === e.clientEventId && (
                  <div className={`${r.lineMsg} ${r.lineWarn} ${s.lineProblem}`} role="alertdialog" aria-label="Discard from this device?">
                    <span style={{ flex: 1 }}>
                      {e.mayBeRecorded
                        ? "It may already have been recorded: a try to send it got no answer. Discarding stops it being " +
                          "sent, but if it went through it stays recorded. To find out, open it and post again: the same " +
                          "session is never recorded twice."
                        : `Discard this ${kindLabel(copy.docType).toLowerCase()} from this device? It won't be sent.`}
                    </span>
                    <div className={s.footActions}>
                      <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={() => setAskDiscard(null)}>
                        Keep it
                      </button>
                      {e.mayBeRecorded && (
                        <button
                          type="button"
                          className={`${r.btn} ${r.btnPrimary} ${r.btnSm}`}
                          onClick={() => {
                            setAskDiscard(null);
                            requestOpen(e);
                          }}
                          disabled={posting}
                        >
                          Open
                        </button>
                      )}
                      <button type="button" className={`${r.btn} ${r.btnDanger} ${r.btnSm}`} onClick={() => discardQueued(e)}>
                        Discard it
                      </button>
                    </div>
                  </div>
                )}
                {askOpen === e.clientEventId && status === "uncertain" && (
                  <div className={`${r.lineMsg} ${r.lineWarn} ${s.lineProblem}`} role="alertdialog" aria-label="Open this session?">
                    <span style={{ flex: 1 }}>
                      The session on screen may or may not be recorded. Post it again to find out (it is never
                      recorded twice), or discard it if you know it went through, then open this one.
                    </span>
                    <div className={s.footActions}>
                      <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={() => setAskOpen(null)}>
                        OK
                      </button>
                    </div>
                  </div>
                )}
                {askOpen === e.clientEventId && status !== "uncertain" && (
                  <div className={`${r.lineMsg} ${r.lineWarn} ${s.lineProblem}`} role="alertdialog" aria-label="Open this session?">
                    <span style={{ flex: 1 }}>
                      Opening it replaces the session you&apos;re working on, which is then discarded. Keep working on
                      the current one, or discard it and open this one?
                    </span>
                    <div className={s.footActions}>
                      <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={() => setAskOpen(null)}>
                        Keep current
                      </button>
                      <button type="button" className={`${r.btn} ${r.btnDanger} ${r.btnSm}`} onClick={() => replaceAndOpen(e)}>
                        Discard current and open
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
  const scanDisabled = !sessionReady || posting || !!pad || !editable;
  const lineCount = lines.length;
  const postDisabled = posting || !permReady || cannotPost || !sessionReady;
  const qtyLabel = mode === "RETURN" ? "Qty to return" : "Qty to mark out";
  const padLine = pad ? lines.find((l) => l.invItemId === Number(pad.item.invItemId)) || null : null;
  const padSoFar = parseQty(padLine?.qty) ?? 0;
  const padOnHand = padLine?.available ?? (pad?.item?.qty != null ? Number(pad.item.qty) : null);

  const footActions = uncertain ? (
    <>
      <button
        type="button"
        className={`${r.btn} ${r.btnSecondary}`}
        onClick={() => setConfirmDiscard(true)}
        disabled={posting || confirmDiscard}
      >
        Discard
      </button>
      <button type="button" className={`${r.btn} ${r.btnSuccess}`} onClick={postAgain} disabled={postDisabled}>
        {posting && <Loader2 size={14} className={r.spin} aria-hidden="true" />}
        Post again
      </button>
    </>
  ) : (
    <button type="button" className={`${r.btn} ${r.btnSuccess}`} onClick={post} disabled={postDisabled}>
      {posting && <Loader2 size={14} className={r.spin} aria-hidden="true" />}
      {postLabel}
    </button>
  );

  return (
    <div className={r.page}>
      {header}
      <main className={r.pageBody}>
        <div className={`${r.stack} ${s.narrow}`}>
          {hotelNotices.map((n) => (
            <div
              key={n.id}
              className={`${r.lineMsg} ${n.tone === "warn" ? r.lineWarn : r.lineNote}`}
              role={n.tone === "warn" ? "alert" : "status"}
            >
              {n.tone === "warn" ? <AlertTriangle size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
              <span style={{ flex: 1 }}>{n.text}</span>
              <button
                type="button"
                className={`${r.btn} ${r.btnGhost} ${r.btnSm}`}
                aria-label="Dismiss"
                onClick={() => setNotices((list) => list.filter((x) => x.id !== n.id))}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
          {waitingCard}
          {restoredNote && editable && (
            <div className={`${r.lineMsg} ${r.lineNote}`} role="status">
              Picked up the session saved on this device.
            </div>
          )}
          {permError && hotelId && (
            <div className={`${r.lineMsg} ${r.lineWarn}`} role="alert">
              <AlertTriangle size={14} aria-hidden="true" />
              <span>Couldn&apos;t check your rights at {hotel?.name || "this hotel"}.</span>
              <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={() => refetchPerms()}>
                <RotateCcw size={14} aria-hidden="true" /> Try again
              </button>
            </div>
          )}
          {cannotPost && (
            <div className={`${r.lineMsg} ${r.lineWarn}`} role="status">
              <AlertTriangle size={14} aria-hidden="true" />
              You can see stock at {hotel?.name}, but marking out there needs inventory create rights.
            </div>
          )}

          <section className={r.card} aria-label="Scan items">
            <div className={r.cardBody} style={{ paddingBottom: 0 }}>
              <div className={s.segment} role="radiogroup" aria-label="Session type">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.value}
                    className={`${s.segmentBtn} ${mode === m.value ? s.segmentOn : ""}`}
                    disabled={posting || !editable}
                    onClick={() => {
                      if (locked()) return;
                      setMode(m.value);
                      setProblems({});
                      setFormError(null);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={r.scanDock}>
              <ScanInput
                context={hotelId ? `hotel:${hotelId}` : undefined}
                onResolved={onResolved}
                onUnknown={onUnknown}
                disabled={scanDisabled}
              />
            </div>
            <div className={r.cardBody}>
              <div className={s.fieldRow}>
                <div>
                  <label className={`${r.label} ${s.requiredLabel}`} htmlFor="out-department">Department</label>
                  <select
                    id="out-department"
                    className={`${r.select} ${deptError ? r.inputInvalid : ""}`}
                    value={departmentId}
                    required
                    aria-required="true"
                    aria-invalid={deptError ? "true" : undefined}
                    aria-describedby={deptError ? "out-department-error" : undefined}
                    disabled={posting || !editable}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setDeptError(null);
                    }}
                  >
                    <option value="">{mode === "RETURN" ? "Returned by…" : "Issued to…"}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={String(d.id)}>{d.title}</option>
                    ))}
                  </select>
                  {deptError && <div id="out-department-error" className={s.fieldError}>{deptError}</div>}
                  {deptLoadError && <div className={s.fieldError}>{deptLoadError}</div>}
                </div>
                <div>
                  <label className={r.label} htmlFor="out-requested-by">Requested by</label>
                  <input
                    id="out-requested-by"
                    className={r.input}
                    value={requestedBy}
                    maxLength={120}
                    placeholder="Name (optional)"
                    disabled={posting || !editable}
                    onChange={(e) => setRequestedBy(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <ItemPicker
                  source="stock"
                  hotelId={hotelId}
                  exclude={exclude}
                  disabled={!sessionReady || posting || !editable}
                  onPick={(item) => addItem(item, 1)}
                />
              </div>
            </div>
          </section>

          <section className={r.card} aria-label="Session items">
            <div className={r.cardHead}>
              <h2 className={r.cardTitle}>
                Items <span className={r.count}>{lineCount}</span>
              </h2>
              <button
                type="button"
                className={`${r.btn} ${r.btnGhost} ${r.btnSm}`}
                onClick={undoLast}
                disabled={undoCount === 0 || posting || !editable}
              >
                <Undo2 size={14} aria-hidden="true" /> Undo last scan
              </button>
            </div>
            {lineCount === 0 ? (
              <div className={r.emptyState}>
                <div className={r.emptyTitle}>Nothing in this session yet</div>
                <div>Scan an item, or find it by name above.</div>
              </div>
            ) : (
              <ul className={s.lineList} aria-label="Items in this session">
                {lines.map((l) => {
                  const problem = problems[l.invItemId];
                  const checkState = editable ? qtyCheck(l, mode) : null;
                  const check = checkState === "confirm";
                  const decimal = isDecimalUnit(l.stockUom);
                  const problemId = `out-line-${l.invItemId}-problem`;
                  const checkId = `out-line-${l.invItemId}-check`;
                  const describedBy = [problem && problemId, checkState && checkId].filter(Boolean).join(" ") || undefined;
                  const frozen = posting || !editable;
                  return (
                    <li
                      key={l.invItemId}
                      aria-label={l.displayName}
                      className={`${s.line} ${problem || check ? s.lineBad : ""} ${flashId === l.invItemId ? s.lineFlash : ""}`}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div className={s.lineName}>{l.displayName}</div>
                        <div className={s.lineMeta}>
                          {l.itemCode && <span className={s.mono}>{l.itemCode}</span>}
                          <span>{l.stockUom}</span>
                          {l.available != null && (
                            <span>
                              <span className={s.mono}>{fmtQty(l.available)}</span> in stock
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={s.lineQty}>
                        {!decimal && (
                          <button
                            type="button"
                            className={s.stepBtn}
                            onClick={() => stepLine(l, -1)}
                            disabled={frozen || (parseQty(l.qty) ?? 0) <= 1}
                            aria-label={`One less ${l.displayName}`}
                          >
                            <Minus size={16} aria-hidden="true" />
                          </button>
                        )}
                        <input
                          className={s.qtyField}
                          inputMode="decimal"
                          maxLength={QTY_MAX_LENGTH}
                          aria-label={`Qty of ${l.displayName}`}
                          aria-invalid={problem || check ? "true" : undefined}
                          aria-describedby={describedBy}
                          value={l.qty}
                          onChange={(e) => setLineQty(l.invItemId, e.target.value)}
                          onKeyDown={(e) => {
                            // A scanner wedge ends its read with Enter: finish the
                            // edit so the next read doesn't land in this field.
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                          disabled={frozen}
                        />
                        {!decimal && (
                          <button
                            type="button"
                            className={s.stepBtn}
                            onClick={() => stepLine(l, 1)}
                            disabled={frozen}
                            aria-label={`One more ${l.displayName}`}
                          >
                            <Plus size={16} aria-hidden="true" />
                          </button>
                        )}
                        <span className={s.unit}>{l.stockUom}</span>
                        <button
                          type="button"
                          className={`${r.btn} ${r.btnGhost} ${s.removeBtn}`}
                          onClick={() => removeLine(l)}
                          disabled={frozen}
                          aria-label={`Remove ${l.displayName}`}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                      {checkState === "checking" && (
                        <div id={checkId} className={`${r.lineMsg} ${r.lineNote} ${s.lineProblem}`} role="status">
                          <Loader2 size={14} className={r.spin} aria-hidden="true" />
                          <span>Checking what&apos;s in stock before {fmtQty(parseQty(l.qty))} can be marked out…</span>
                        </div>
                      )}
                      {check && (
                        <div id={checkId} className={`${r.lineMsg} ${r.lineWarn} ${s.lineProblem}`}>
                          <AlertTriangle size={14} aria-hidden="true" />
                          <span>
                            {l.available != null
                              ? `${fmtQty(parseQty(l.qty))} ${l.stockUom} is far more than the ${fmtQty(l.available)} in stock.`
                              : `Couldn't check what's in stock. Is ${fmtQty(parseQty(l.qty))} ${l.stockUom} right?`}
                          </span>
                          <button
                            type="button"
                            className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
                            onClick={() => confirmQty(l.invItemId)}
                            disabled={posting}
                          >
                            Yes, {fmtQty(parseQty(l.qty))} is right
                          </button>
                        </div>
                      )}
                      {problem && (
                        <div id={problemId} className={`${r.lineMsg} ${r.lineError} ${s.lineProblem}`}>
                          <AlertTriangle size={14} aria-hidden="true" />
                          <span>{problem.message}</span>
                          {mode === "RETURN" && problem.maxReturnable > 0 && editable && (
                            <button
                              type="button"
                              className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
                              onClick={() => setLineQty(l.invItemId, qtyText(problem.maxReturnable))}
                            >
                              Return {fmtQty(problem.maxReturnable)} instead
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {formError && (
              <div className={r.formError} role="alert" style={{ marginTop: 12 }}>
                {formError.text}
                {formError.countId && (
                  <>
                    {" "}
                    <Link href={stockRoutes.count(formError.countId)} className={r.btnLink}>Open the count</Link>
                  </>
                )}
              </div>
            )}
            {uncertain && confirmDiscard && (
              <div
                className={`${r.lineMsg} ${r.lineWarn}`}
                role="alertdialog"
                aria-label="Discard this session?"
                style={{ marginTop: 12 }}
              >
                <AlertTriangle size={14} aria-hidden="true" />
                <span style={{ flex: 1 }}>
                  Discard this session? If it did go through it stays recorded; if it didn&apos;t, nothing is recorded.
                </span>
                <div className={s.footActions}>
                  <button type="button" className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`} onClick={() => setConfirmDiscard(false)}>
                    Keep it
                  </button>
                  <button type="button" className={`${r.btn} ${r.btnDanger} ${r.btnSm}`} onClick={discard} disabled={posting}>
                    Discard session
                  </button>
                </div>
              </div>
            )}
            {!isMobile && (
              <div className={r.cardFoot}>
                <span className={s.subtle}>
                  {plural(lineCount, "item")}
                  {department ? ` · ${department.title}` : ""}
                </span>
                <div className={s.footActions}>{footActions}</div>
              </div>
            )}
          </section>
        </div>
      </main>

      {isMobile && (
        <MobileActionBar
          label="Mark out actions"
          summary={
            <span>
              {plural(lineCount, "item")} · {department ? department.title : "Choose department"}
            </span>
          }
        >
          {uncertain ? (
            <>
              <MobileActionButton variant="secondary" onClick={() => setConfirmDiscard(true)} disabled={posting || confirmDiscard}>
                Discard
              </MobileActionButton>
              <MobileActionButton variant="primary" onClick={postAgain} disabled={postDisabled}>
                Post again
              </MobileActionButton>
            </>
          ) : (
            <>
              <MobileActionButton variant="secondary" onClick={undoLast} disabled={undoCount === 0 || posting}>
                <Undo2 size={16} aria-hidden="true" /> Undo
              </MobileActionButton>
              <MobileActionButton variant="primary" onClick={post} disabled={postDisabled}>
                {postLabel}
              </MobileActionButton>
            </>
          )}
        </MobileActionBar>
      )}

      {pad && (
        <QtyPad
          show
          title={pad.item.displayName}
          unit={pad.item.stockUom}
          initial={pad.initial ?? null}
          mode={pad.mode}
          receivedSoFar={padSoFar}
          openQty={mode === "OUT" && padOnHand != null ? padOnHand : null}
          labels={{
            qty: qtyLabel,
            soFar: padSoFar > 0 ? "In this session" : null,
            open: "In stock",
            fill: pad.mode === "add" ? "Rest of stock" : "All in stock",
          }}
          onDone={onPadDone}
          onHide={() => setPad(null)}
        />
      )}
    </div>
  );
};

export default MarkOutPage;
