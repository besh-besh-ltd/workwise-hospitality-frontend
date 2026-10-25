import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, CloudOff, Loader2, Minus, PackageMinus, Plus, RotateCcw, Trash2, Undo2,
} from "lucide-react";
import ScanInput from "@/components/inventory/scan/ScanInput";
import QtyPad from "@/components/inventory/receive/QtyPad";
import MobileActionBar, { MobileActionButton } from "@/components/shared/mobile/MobileActionBar";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import useIsMobile from "@/hooks/useIsMobile";
import { getStockItem, postOut } from "@/services/inventory";
import { getDepartments } from "@/services/rbac";
import {
  fmtQty, isDecimalUnit, newClientEventId, parseQty, qtyText,
} from "@/components/inventory/receive/receiveUtils";
import HotelSelect from "./HotelSelect";
import ItemPicker from "./ItemPicker";
import useInventoryHotels from "./useInventoryHotels";
import { submitOrQueue, useQueuedOutcome } from "./outboxBridge";
import { clearOutSession, loadOutSession, saveOutSession } from "./outSession";
import {
  QTY_MAX_LENGTH, cleanQtyInput, errorInfo, freezeMessage, isImplausibleQty, isPositiveQty, isUncertainFailure,
  lineProblems, sameLines, stockRoutes, toId,
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
// - The session lives on the device under `out-session:<hotelId>` (IndexedDB)
//   from its first line until it is recorded, together with its clientEventId:
//   a retry after a dropped reply replays the same document instead of posting
//   twice. An empty session is never kept.
// - The department is required before Post. Refusals land on their lines
//   (NEGATIVE_STOCK, the RETURN cap) or on the form (count freeze).
// - A session the outbox queued stays on the device, read-only, until it syncs
//   ("queued"); if the server then refuses it, it reopens here, editable, with
//   the refusal. A post whose answer never came (no reply, or a 5xx) locks the
//   lines under the same key ("uncertain"): Post again, or Discard.
//
// Props: initialHotelId, initialMode ("RETURN" opens in Return to stock; the page shell maps ?mode=return).

const FLASH_MS = 1100;
const MODES = [
  { value: "OUT", label: "Mark out" },
  { value: "RETURN", label: "Return to stock" },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

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
const toLine = (item, qty) => ({
  invItemId: Number(item.invItemId),
  displayName: item.displayName || `Item ${item.invItemId}`,
  itemCode: item.itemCode ?? null,
  stockUom: item.stockUom || "",
  qty: qtyText(qty),
  exact: Number(qty),
  available: item.qty != null ? Number(item.qty) : item.available != null ? Number(item.available) : null,
  confirmedQty: null,
});

const storedLine = ({ invItemId, displayName, itemCode, stockUom, qty, exact, available, confirmedQty }) => ({
  invItemId, displayName, itemCode, stockUom, qty, exact, available, confirmedQty: confirmedQty ?? null,
});

/** True when a line's qty is implausible and nobody has confirmed it. */
const needsCheck = (l) => isImplausibleQty(parseQty(l.qty), l.available) && l.confirmedQty !== l.qty;

const uncertainText = (info) =>
  `${info?.httpStatus ? "The server had a problem before it answered" : "The connection dropped before the server answered"}, ` +
  "so this session may or may not be recorded. Post again to find out: the same session is never recorded twice. " +
  "Discard it only if you know it went through, or you no longer want it.";

const MarkOutPage = ({ initialHotelId = null, initialMode = null }) => {
  const isMobile = useIsMobile();
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
  // "open" (editable), "queued" (the outbox holds it), "uncertain" (no answer came)
  const [status, setStatus] = useState("open");
  const [sentPayload, setSentPayload] = useState(null);

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
      if (!keepMode) setMode(initialMode === "RETURN" ? "RETURN" : "OUT");
      sessionKeyRef.current = newClientEventId();
    },
    [commitLines, initialMode]
  );

  useEffect(() => {
    if (!hotelId) return undefined;
    let cancelled = false;
    setRestoredFor(null);
    setRestoredNote(false);
    setDone(null);
    dismissToasts();
    (async () => {
      const saved = await loadOutSession(hotelId);
      if (cancelled) return;
      const savedLines = Array.isArray(saved?.lines) ? saved.lines.filter((l) => l && l.invItemId != null) : [];
      if (savedLines.length > 0) {
        commitLines(
          savedLines.map((l) => ({
            ...l,
            invItemId: Number(l.invItemId),
            exact: l.exact ?? parseQty(l.qty) ?? 0,
            confirmedQty: l.confirmedQty ?? null,
          }))
        );
        opsRef.current = [];
        onHandAskedRef.current = new Set();
        setUndoCount(0);
        setProblems({});
        setDeptError(null);
        setMode(saved.docType === "RETURN" ? "RETURN" : "OUT");
        setDepartmentId(saved.departmentId ? String(saved.departmentId) : "");
        setRequestedBy(saved.requestedByName || "");
        sessionKeyRef.current = saved.sessionKey || newClientEventId();
        const savedStatus =
          saved.status === "queued" && saved.queuedAs && saved.sentPayload
            ? "queued"
            : saved.status === "uncertain" && saved.sentPayload
              ? "uncertain"
              : "open";
        setStatus(savedStatus);
        setSentPayload(savedStatus === "open" ? null : saved.sentPayload);
        setFormError(savedStatus === "uncertain" ? { text: uncertainText(saved.lastError) } : null);
        setRestoredNote(savedStatus === "open");
      } else {
        resetSession(true);
      }
      setRestoredFor(hotelId);
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId, commitLines, resetSession, dismissToasts]);

  const snapshot = (extra = {}) => ({
    savedAt: Date.now(),
    hotelId,
    sessionKey: sessionKeyRef.current,
    docType: mode,
    departmentId,
    requestedByName: requestedBy,
    lines: linesRef.current.map(storedLine),
    status: "open",
    ...extra,
  });

  // An open session is saved on every change once it has a line; a queued or
  // uncertain one was written when it changed state and is frozen since.
  useEffect(() => {
    if (!hotelId || restoredFor !== hotelId || done || status !== "open") return;
    if (!lines.length) {
      clearOutSession(hotelId);
      return;
    }
    saveOutSession(hotelId, snapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, restoredFor, done, status, mode, departmentId, requestedBy, lines]);

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
  // show it and a slip (or a stray scan into a qty field) can be caught.
  const askOnHand = (id) => {
    const forHotel = hotelIdRef.current;
    if (!forHotel || onHandAskedRef.current.has(id)) return;
    onHandAskedRef.current.add(id);
    (async () => {
      try {
        const res = await getStockItem(forHotel, id);
        const qty = res?.balance?.qty;
        if (!mountedRef.current || hotelIdRef.current !== forHotel || qty == null || !Number.isFinite(Number(qty))) return;
        const cur = linesRef.current;
        if (!cur.some((l) => l.invItemId === id && l.available == null)) return;
        commitLines(cur.map((l) => (l.invItemId === id && l.available == null ? { ...l, available: Number(qty) } : l)));
      } catch {
        // on-hand stays unknown; the server still checks every line
      }
    })();
  };

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
    if (created && next[0].available == null) askOnHand(id);
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
              back.splice(Math.min(index, back.length), 0, removed);
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
        say(info.message);
      }
    }
  };

  const send = async (payload) => {
    if (postingRef.current) return;
    const postedHotel = Number(payload.hotelId);
    const base = snapshot({ sessionKey: payload.clientEventId });
    postingRef.current = true;
    lock.set(true);
    setPosting(true);
    setProblems({});
    setDeptError(null);
    setFormError(null);
    try {
      const { queued, result } = await submitOrQueue({
        kind: "out_post",
        clientEventId: payload.clientEventId,
        payload,
        send: (p) => postOut(p),
      });
      if (queued) {
        // The outbox holds the event; this copy stays (read-only) until it
        // syncs, so a refusal can reopen it.
        await saveOutSession(postedHotel, { ...base, status: "queued", queuedAs: payload.clientEventId, sentPayload: payload });
        if (!mountedRef.current) return;
        dismissToasts();
        setStatus("queued");
        setSentPayload(payload);
        return;
      }
      await clearOutSession(postedHotel);
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
        await saveOutSession(postedHotel, {
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
    if (cur.some(needsCheck)) {
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
    if (hotelId) clearOutSession(hotelId);
    dismissToasts();
    resetSession(true);
  };

  // The outbox settles a queued session: synced clears it, refused reopens it.
  useQueuedOutcome({
    kind: "out_post",
    clientEventId: status === "queued" ? sentPayload?.clientEventId ?? null : null,
    onSent: (result) => {
      const h = hotelIdRef.current;
      const sent = sentPayload;
      if (h) clearOutSession(h);
      sessionKeyRef.current = newClientEventId();
      setStatus("open");
      setSentPayload(null);
      setDone(
        result && typeof result === "object" && result.outNumber
          ? { doc: result, replayed: !!result.replayed }
          : { synced: true, docType: sent?.docType || mode, lines: linesRef.current }
      );
    },
    onFailed: (info) => {
      const sent = sentPayload;
      setStatus("open");
      setSentPayload(null);
      applyRefusal(info, sent, { prefix: "This session was refused when it synced. " });
    },
  });

  const startAnother = () => {
    resetSession(true);
    setDone(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const title = mode === "RETURN" ? "Return to stock" : "Mark out";
  const postLabel = mode === "RETURN" ? "Post return" : "Post mark out";
  const department = departments.find((d) => String(d.id) === String(departmentId)) || null;
  const exclude = useMemo(() => new Set(lines.map((l) => l.invItemId)), [lines]);
  const sessionReady = !!hotelId && restoredFor === hotelId;

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
    const returned = (doc?.docType || done.docType) === "RETURN";
    return (
      <div className={r.page}>
        {header}
        <main className={r.pageBody}>
          <div className={r.stateCard} role="status">
            <div className={`${r.stateIc} ${r.stateIcOk}`}><CheckCircle2 size={20} aria-hidden="true" /></div>
            <h2 className={r.stateTitle}>{returned ? "Returned to stock" : "Marked out"}</h2>
            {done.synced ? (
              <p className={r.stateSub}>The session saved on this device has synced.</p>
            ) : (
              <p className={r.stateSub}>
                <span className={s.mono}>{doc?.outNumber}</span>
                {doc?.departmentName ? ` · ${doc.departmentName}` : ""}
                {doc?.hotelName ? ` · ${doc.hotelName}` : ""}
              </p>
            )}
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
            {done.synced
              ? Array.isArray(done.lines) && done.lines.length > 0 && lineSummary(done.lines, "Synced items")
              : Array.isArray(doc?.lines) && doc.lines.length > 0 && lineSummary(doc.lines, "Recorded items")}
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

  if (status === "queued" && sessionReady) {
    return (
      <div className={r.page}>
        {header}
        <main className={r.pageBody}>
          <div className={r.stateCard} role="status">
            <div className={r.stateIc}><CloudOff size={20} aria-hidden="true" /></div>
            <h2 className={r.stateTitle}>Saved on this device</h2>
            <p className={r.stateSub}>Waiting to sync. If it&apos;s refused you&apos;ll see it here and can fix it.</p>
            <p className={r.stateSub}>
              {mode === "RETURN" ? "Return to stock" : "Mark out"}
              {department ? ` · ${department.title}` : ""} · {plural(lines.length, "item")}
            </p>
            {lineSummary(lines, "Waiting items")}
            <p className={r.stateSub}>The next session at {hotel?.name || "this hotel"} can start once this one syncs.</p>
            <div className={r.stateActions}>
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
  const scanDisabled = !sessionReady || posting || !!pad || !editable;
  const lineCount = lines.length;
  const postDisabled = posting || !permReady || cannotPost || !sessionReady;
  const qtyLabel = mode === "RETURN" ? "Qty to return" : "Qty to mark out";
  const padLine = pad ? lines.find((l) => l.invItemId === Number(pad.item.invItemId)) || null : null;
  const padSoFar = parseQty(padLine?.qty) ?? 0;
  const padOnHand = padLine?.available ?? (pad?.item?.qty != null ? Number(pad.item.qty) : null);

  const footActions = uncertain ? (
    <>
      <button type="button" className={`${r.btn} ${r.btnSecondary}`} onClick={discard} disabled={posting}>
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
                  const check = editable && needsCheck(l);
                  const decimal = isDecimalUnit(l.stockUom);
                  const problemId = `out-line-${l.invItemId}-problem`;
                  const checkId = `out-line-${l.invItemId}-check`;
                  const describedBy = [problem && problemId, check && checkId].filter(Boolean).join(" ") || undefined;
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
                      {check && (
                        <div id={checkId} className={`${r.lineMsg} ${r.lineWarn} ${s.lineProblem}`}>
                          <AlertTriangle size={14} aria-hidden="true" />
                          <span>
                            {fmtQty(parseQty(l.qty))} {l.stockUom} is far more than the {fmtQty(l.available)} in stock.
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
              <MobileActionButton variant="secondary" onClick={discard} disabled={posting}>
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
