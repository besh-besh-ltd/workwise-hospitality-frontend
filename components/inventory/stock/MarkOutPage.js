import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, CloudOff, Loader2, Minus, PackageMinus, Plus, RotateCcw, Trash2, Undo2,
} from "lucide-react";
import ScanInput from "@/components/inventory/scan/ScanInput";
import QtyPad from "@/components/inventory/receive/QtyPad";
import MobileActionBar, { MobileActionButton } from "@/components/shared/mobile/MobileActionBar";
import { submitOrQueue } from "@/components/inventory/offline/outbox";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import useIsMobile from "@/hooks/useIsMobile";
import { postOut } from "@/services/inventory";
import { getDepartments } from "@/services/rbac";
import {
  fmtQty, isDecimalUnit, newClientEventId, parseQty, qtyText,
} from "@/components/inventory/receive/receiveUtils";
import HotelSelect from "./HotelSelect";
import ItemPicker from "./ItemPicker";
import useInventoryHotels from "./useInventoryHotels";
import { clearOutSession, loadOutSession, saveOutSession } from "./outSession";
import { errorInfo, freezeMessage, isPositiveQty, lineProblems, stockRoutes, toId } from "./stockUtils";
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
//   until it is posted, together with its clientEventId: a retry after a
//   dropped reply replays the same document instead of posting twice.
// - The department is required before Post. Refusals land on their lines
//   (NEGATIVE_STOCK, the RETURN cap) or on the form (count freeze).
//
// Props: initialHotelId, initialMode ("RETURN" opens in Return to stock; the page shell maps ?mode=return).

const FLASH_MS = 1100;
const MODES = [
  { value: "OUT", label: "Mark out" },
  { value: "RETURN", label: "Return to stock" },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const ScanToast = ({ name, unit, delta, total, onUndo }) => (
  <div className={s.toastRow}>
    <div style={{ minWidth: 0 }}>
      <div className={s.toastQty}>+{fmtQty(delta)} (now {fmtQty(total)})</div>
      <div className={s.toastName}>{name}{unit ? ` · ${unit}` : ""}</div>
    </div>
    <button type="button" className={s.toastUndo} onClick={onUndo}>
      Undo
    </button>
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
});

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

  const linesRef = useRef([]);
  const opsRef = useRef([]);
  const opSeqRef = useRef(0);
  const sessionKeyRef = useRef(newClientEventId());
  const postingRef = useRef(false);
  const flashTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(flashTimerRef.current);
    };
  }, []);

  // ── Hotel: the URL's choice when the server lists it, else the first ──────
  useEffect(() => {
    if (hotelsLoading || hotelId != null || !hotels.length) return;
    const wanted = toId(initialHotelId);
    setHotelId(wanted && hotels.some((h) => h.id === wanted) ? wanted : hotels[0].id);
  }, [hotels, hotelsLoading, hotelId, initialHotelId]);
  const hotel = hotels.find((h) => h.id === hotelId) || null;

  const hotelIds = useMemo(() => (hotelId ? [hotelId] : []), [hotelId]);
  const { canCreate, loading: permLoading } = useModulePermissions({
    moduleKey: "inventory",
    hotelIds,
    enabled: !!hotelId,
  });
  const cannotPost = !!hotelId && !permLoading && !canCreate;

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
      setUndoCount(0);
      setProblems({});
      setFormError(null);
      setDeptError(null);
      setDepartmentId("");
      setRequestedBy("");
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
    (async () => {
      const saved = await loadOutSession(hotelId);
      if (cancelled) return;
      if (saved && Array.isArray(saved.lines)) {
        commitLines(
          saved.lines
            .filter((l) => l && l.invItemId != null)
            .map((l) => ({ ...l, invItemId: Number(l.invItemId), exact: l.exact ?? parseQty(l.qty) ?? 0 }))
        );
        opsRef.current = [];
        setUndoCount(0);
        setProblems({});
        setFormError(null);
        setDeptError(null);
        setMode(saved.docType === "RETURN" ? "RETURN" : "OUT");
        setDepartmentId(saved.departmentId ? String(saved.departmentId) : "");
        setRequestedBy(saved.requestedByName || "");
        sessionKeyRef.current = saved.sessionKey || newClientEventId();
        setRestoredNote(saved.lines.length > 0);
      } else {
        resetSession(true);
      }
      setRestoredFor(hotelId);
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId, commitLines, resetSession]);

  useEffect(() => {
    if (!hotelId || restoredFor !== hotelId || done) return;
    saveOutSession(hotelId, {
      savedAt: Date.now(),
      hotelId,
      sessionKey: sessionKeyRef.current,
      docType: mode,
      departmentId,
      requestedByName: requestedBy,
      lines: lines.map(({ invItemId, displayName, itemCode, stockUom, qty, exact, available }) => ({
        invItemId, displayName, itemCode, stockUom, qty, exact, available,
      })),
    });
  }, [hotelId, restoredFor, done, mode, departmentId, requestedBy, lines]);

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

  const showScanToast = (line, delta, total, op) => {
    const toastId = `out-scan-${op.id}`;
    toast(
      <ScanToast
        name={line.displayName}
        unit={line.stockUom}
        delta={delta}
        total={total}
        onUndo={() => {
          undoOp(op.id);
          toast.dismiss(toastId);
        }}
      />,
      { toastId, autoClose: 4000, closeOnClick: false, hideProgressBar: true }
    );
  };

  /** One scan (or pick) of `packFactor` stock units. */
  const addItem = (item, packFactor = 1) => {
    if (isDecimalUnit(item.stockUom)) {
      setPad({ item, mode: "add" });
      return;
    }
    const delta = Number(packFactor) > 0 ? Number(packFactor) : 1;
    const { total, op } = addToSession(item, delta);
    showScanToast(item, delta, total, op);
  };

  const setLineQty = (invItemId, text) => {
    const cur = linesRef.current;
    const next = cur.map((l) => (l.invItemId === invItemId ? { ...l, qty: text, exact: parseQty(text) ?? 0 } : l));
    commitLines(next);
    // A typed qty is its own undo: earlier scans of this line can't be undone.
    opsRef.current = opsRef.current.filter((o) => o.invItemId !== invItemId);
    setUndoCount(opsRef.current.length);
    clearProblem(invItemId);
  };

  const stepLine = (line, step) => {
    const cur = parseQty(line.qty) ?? 0;
    const nextQty = Math.max(0, cur + step);
    if (nextQty <= 0) return;
    setLineQty(line.invItemId, qtyText(nextQty));
  };

  const removeLine = (line) => {
    const cur = linesRef.current;
    const index = cur.findIndex((l) => l.invItemId === line.invItemId);
    if (index < 0) return;
    commitLines(cur.filter((_, i) => i !== index));
    opsRef.current = opsRef.current.filter((o) => o.invItemId !== line.invItemId);
    setUndoCount(opsRef.current.length);
    clearProblem(line.invItemId);
    const toastId = `out-remove-${line.invItemId}-${Date.now()}`;
    toast(
      <div className={s.toastRow}>
        <div className={s.toastName}>Removed {line.displayName}</div>
        <button
          type="button"
          className={s.toastUndo}
          onClick={() => {
            const now = linesRef.current;
            if (!now.some((l) => l.invItemId === line.invItemId)) {
              const back = now.slice();
              back.splice(Math.min(index, back.length), 0, line);
              commitLines(back);
            }
            toast.dismiss(toastId);
          }}
        >
          Undo
        </button>
      </div>,
      { toastId, autoClose: 4000, closeOnClick: false, hideProgressBar: true }
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
    const { total, op } = addToSession(p.item, qty);
    showScanToast(p.item, qty, total, op);
  };

  // ── Post ───────────────────────────────────────────────────────────────────
  const verb = mode === "RETURN" ? "returns" : "marks out";
  const uomOf = (id) => linesRef.current.find((l) => l.invItemId === Number(id))?.stockUom || "";

  const post = async () => {
    if (postingRef.current || !hotelId) return;
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

    const clientEventId = sessionKeyRef.current;
    const payload = {
      hotelId: Number(hotelId),
      docType: mode,
      departmentId: Number(departmentId),
      ...(requestedBy.trim() ? { requestedByName: requestedBy.trim() } : {}),
      clientEventId,
      lines: cur.map((l) => ({ invItemId: l.invItemId, qty: parseQty(l.qty) })),
    };
    const sentIds = cur.map((l) => l.invItemId);
    const postedHotel = hotelId;

    postingRef.current = true;
    setPosting(true);
    setProblems({});
    setDeptError(null);
    try {
      const { queued, result } = await submitOrQueue({
        kind: "out_post",
        clientEventId,
        payload,
        send: (p) => postOut(p),
      });
      clearOutSession(postedHotel);
      sessionKeyRef.current = newClientEventId();
      if (!mountedRef.current) return;
      setDone(queued ? { queued: true, docType: payload.docType } : { doc: result, replayed: !!result?.replayed });
    } catch (err) {
      if (!mountedRef.current) return;
      const info = errorInfo(err, "Could not post this session.");
      if (!info.httpStatus) {
        setFormError({
          text: "The connection dropped before the server answered. Post again: the same session is never recorded twice.",
        });
      } else if (info.code === "LOCKED") {
        setFormError({ text: freezeMessage(info.details), countId: info.details.countId });
      } else if (info.code === "VALIDATION" && info.details.field === "departmentId") {
        setDeptError(info.message);
        setFormError({ text: info.message });
      } else if (info.code === "CONFLICT" && info.details.field === "clientEventId") {
        sessionKeyRef.current = newClientEventId();
        setFormError({ text: `${info.message} Post again to record it as a new session.` });
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
          setFormError({
            text: info.code === "NEGATIVE_STOCK"
              ? "Some items don't have that much in stock. Fix the highlighted lines, then post again."
              : "Fix the highlighted line, then post again.",
          });
        } else {
          setFormError({ text: info.message });
        }
      }
    } finally {
      postingRef.current = false;
      if (mountedRef.current) setPosting(false);
    }
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
              onChange={(id) => {
                if (id) setHotelId(id);
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

  if (done) {
    const doc = done.doc;
    return (
      <div className={r.page}>
        {header}
        <main className={r.pageBody}>
          <div className={r.stateCard} role="status">
            {done.queued ? (
              <>
                <div className={r.stateIc}><CloudOff size={20} aria-hidden="true" /></div>
                <h2 className={r.stateTitle}>Saved on this device</h2>
                <p className={r.stateSub}>
                  It will post as soon as the connection is back. Nothing is recorded twice.
                </p>
              </>
            ) : (
              <>
                <div className={`${r.stateIc} ${r.stateIcOk}`}><CheckCircle2 size={20} aria-hidden="true" /></div>
                <h2 className={r.stateTitle}>{doc?.docType === "RETURN" ? "Returned to stock" : "Marked out"}</h2>
                <p className={r.stateSub}>
                  <span className={s.mono}>{doc?.outNumber}</span>
                  {doc?.departmentName ? ` · ${doc.departmentName}` : ""}
                  {doc?.hotelName ? ` · ${doc.hotelName}` : ""}
                </p>
                {done.replayed && (
                  <p className={r.stateSub}>This session was already recorded, so nothing was posted twice.</p>
                )}
                {Array.isArray(doc?.lines) && doc.lines.length > 0 && (
                  <ul className={r.successList}>
                    {doc.lines.map((l) => (
                      <li key={l.id ?? l.invItemId}>
                        <span style={{ flex: 1 }}>{l.displayName}</span>
                        <span className={s.mono}>{fmtQty(l.qty)}</span>
                        <span className={s.unit}>{l.stockUom}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
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

  const scanDisabled = !sessionReady || posting || !!pad;
  const lineCount = lines.length;

  return (
    <div className={r.page}>
      {header}
      <main className={r.pageBody}>
        <div className={`${r.stack} ${s.narrow}`}>
          {restoredNote && (
            <div className={`${r.lineMsg} ${r.lineNote}`} role="status">
              Picked up the session saved on this device.
            </div>
          )}
          {cannotPost && (
            <div className={`${r.lineMsg} ${r.lineWarn}`} role="status">
              <AlertTriangle size={14} aria-hidden="true" />
              You can see stock at {hotel?.name}, but marking out there needs inventory create rights.
            </div>
          )}

          <section className={r.card} aria-label="Scan items">
            <div className={r.scanDock}>
              <div
                className={s.segment}
                role="radiogroup"
                aria-label="Session type"
                style={{ marginBottom: 10 }}
              >
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.value}
                    className={`${s.segmentBtn} ${mode === m.value ? s.segmentOn : ""}`}
                    onClick={() => {
                      setMode(m.value);
                      setProblems({});
                      setFormError(null);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
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
                  <label className={r.label} htmlFor="out-department">Department</label>
                  <select
                    id="out-department"
                    className={`${r.select} ${deptError ? r.inputInvalid : ""}`}
                    value={departmentId}
                    aria-required="true"
                    aria-invalid={deptError ? "true" : undefined}
                    aria-describedby={deptError ? "out-department-error" : undefined}
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
                    onChange={(e) => setRequestedBy(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <ItemPicker
                  source="stock"
                  hotelId={hotelId}
                  exclude={exclude}
                  disabled={!sessionReady || posting}
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
                disabled={undoCount === 0 || posting}
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
                  const decimal = isDecimalUnit(l.stockUom);
                  return (
                    <li
                      key={l.invItemId}
                      aria-label={l.displayName}
                      className={`${s.line} ${problem ? s.lineBad : ""} ${flashId === l.invItemId ? s.lineFlash : ""}`}
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
                            disabled={posting || (parseQty(l.qty) ?? 0) <= 1}
                            aria-label={`One less ${l.displayName}`}
                          >
                            <Minus size={16} aria-hidden="true" />
                          </button>
                        )}
                        <input
                          className={s.qtyField}
                          inputMode="decimal"
                          aria-label={`Qty of ${l.displayName}`}
                          aria-invalid={problem ? "true" : undefined}
                          value={l.qty}
                          onChange={(e) => setLineQty(l.invItemId, e.target.value.replace(/[^0-9.]/g, ""))}
                          disabled={posting}
                        />
                        {!decimal && (
                          <button
                            type="button"
                            className={s.stepBtn}
                            onClick={() => stepLine(l, 1)}
                            disabled={posting}
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
                          disabled={posting}
                          aria-label={`Remove ${l.displayName}`}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                      {problem && (
                        <div className={`${r.lineMsg} ${r.lineError} ${s.lineProblem}`}>
                          <AlertTriangle size={14} aria-hidden="true" />
                          <span>{problem.message}</span>
                          {mode === "RETURN" && problem.maxReturnable > 0 && (
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
                <button
                  type="button"
                  className={`${r.btn} ${r.btnSuccess}`}
                  onClick={post}
                  disabled={posting || cannotPost || !sessionReady}
                >
                  {posting && <Loader2 size={14} className={r.spin} aria-hidden="true" />}
                  {postLabel}
                </button>
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
          <MobileActionButton variant="secondary" onClick={undoLast} disabled={undoCount === 0 || posting}>
            <Undo2 size={16} aria-hidden="true" /> Undo
          </MobileActionButton>
          <MobileActionButton variant="primary" onClick={post} disabled={posting || cannotPost || !sessionReady}>
            {postLabel}
          </MobileActionButton>
        </MobileActionBar>
      )}

      {pad && (
        <QtyPad
          show
          title={pad.item.displayName}
          unit={pad.item.stockUom}
          initial={null}
          mode={pad.mode}
          receivedSoFar={parseQty(lines.find((l) => l.invItemId === Number(pad.item.invItemId))?.qty) ?? 0}
          openQty={null}
          onDone={onPadDone}
          onHide={() => setPad(null)}
        />
      )}
    </div>
  );
};

export default MarkOutPage;
