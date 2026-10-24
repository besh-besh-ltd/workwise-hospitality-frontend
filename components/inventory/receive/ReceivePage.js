import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  ArrowLeft, Building2, CheckCircle2, CloudOff, FileText, Loader2, PackageCheck, PackageOpen, RefreshCw, Save,
  ScanBarcode, Send,
} from "lucide-react";
import ScanInput from "@/components/inventory/scan/ScanInput";
import LinkUnknownCodeSheet from "@/components/inventory/scan/LinkUnknownCodeSheet";
import MobileActionBar, { MobileActionButton } from "@/components/shared/mobile/MobileActionBar";
import useIsMobile from "@/hooks/useIsMobile";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { submitOrQueue, usePendingCount } from "@/components/inventory/offline/outbox";
import ReceiveLineRow from "./ReceiveLineRow";
import ReceiveLineCard from "./ReceiveLineCard";
import QtyPad from "./QtyPad";
import UomFactorPrompt from "./UomFactorPrompt";
import DeliveryDocuments from "./DeliveryDocuments";
import ReceiveConfirmModal from "./ReceiveConfirmModal";
import { buyerReceiveAdapter } from "./receiveAdapter";
import { clearLocalDraft, grnDraftKey, loadLocalDraft, saveLocalDraft } from "./draftStore";
import {
  HEADER_FIELDS, addQty, blankHeader, blankLine, buildGrnInput, errorInfo, fmtQty, fmtQtyUnit, hasContent,
  isDecimalUnit, lineFromDraft, lineQty, newClientEventId, parseQty, qtyText, routes, subQty, toQ, validateForPost,
} from "./receiveUtils";
import styles from "./receive.module.scss";

// Receive one delivery against one PO at one hotel: pick the hotel, scan or
// type what arrived, note rejects / batches / documents, confirm, post.
//
// The same screen runs for a signed-in receiver and (task D5) for a site rep
// on an emailed link. Everything mode-specific comes in through props:
//
//   poId              PO id (the buyer adapter loads by it; a token adapter ignores it)
//   initialHotelId    preselected hotel (?hotelId=); otherwise the server picks or we ask
//   dispatchId        ?dispatch=: prefill received qty + challan from that dispatch note
//   adapter           service calls (receiveAdapter.js); default buyerReceiveAdapter
//   showPrices        false hides every price (token views never show prices)
//   fixedHotel        true hides "Change hotel"
//   allowItemSetup    false: no unit-conversion prompt, no "Is this the same as…?",
//                     no linking unknown codes (all need inventory.update)
//   allowMarkOut      false hides "Mark out on arrival" and never sends it
//   buyerLinks        false hides links into buyer pages (GRN register, PO, awaiting)
//   renderScanner     ({context, disabled, onResolved, onUnknown, lines}) => node, to
//                     replace the default ScanInput (which calls the buyer resolve route)
//   renderBlocked     ({reason, message, context, reload}) => node, to replace a
//                     "nothing to receive" state
//   onPosted(grn)     after a successful post
//   onHotelChange(id) after the receiver picks a hotel (the page syncs ?hotelId=)
//
// Drafts: an adapter with createDraft keeps a server draft (autosaved every
// 10 s while dirty, on blur and when the tab hides) plus a device copy in
// IndexedDB; posting saves the draft, then posts it by id through the outbox
// with a fresh clientEventId (replay-safe: a posted draft answers as itself).
// Without drafts the receipt posts in one request keyed by the session's
// clientEventId, kept with the device copy so a retry never posts twice.

const AUTOSAVE_MS = 10000;
const BLUR_SAVE_MS = 800;
const LOCAL_SAVE_MS = 400;
const FLASH_MS = 1200;

const sameUnit = (a, b) =>
  !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/** 'YYYY-MM-DD' stays; an ISO instant becomes its IST calendar day. */
const dayOf = (v) => {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return "";
  return new Date(t + 330 * 60000).toISOString().slice(0, 10);
};

const withoutPoId = (input) => {
  const out = { ...input };
  delete out.poId;
  return out;
};

/** createGrn replayed a session key whose receipt is already posted. */
class AlreadyPosted extends Error {
  constructor(grn) {
    super("This receipt is already posted");
    this.postedGrn = grn;
  }
}

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

const BLOCKED_COPY = {
  received: {
    title: "Everything on this PO has been received",
    sub: "Nothing is left to receive here. Its goods receipts show what came in.",
    ok: true,
  },
  closed_short: {
    title: "This PO was closed short",
    sub: "The buyer closed the rest of this order, so nothing is left to receive.",
    ok: true,
  },
  not_ready: { title: "This PO can't be received yet", sub: null },
  not_found: { title: "Purchase order not found", sub: "It may have been removed, or it isn't at a hotel you receive for." },
  forbidden: { title: "You can't receive this PO", sub: null },
  no_hotel: { title: "No hotel to receive at", sub: "None of this PO's hotels is one you receive for." },
};

const ReceivePage = ({
  poId,
  initialHotelId,
  dispatchId = null,
  adapter = buyerReceiveAdapter,
  showPrices = true,
  fixedHotel = false,
  allowItemSetup = true,
  allowMarkOut = true,
  buyerLinks = true,
  renderScanner,
  renderBlocked,
  onPosted,
  onHotelChange,
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const pendingCount = usePendingCount();
  const drafts = typeof adapter?.createDraft === "function";

  const [view, setView] = useState({ phase: "loading" });
  const [ctx, setCtx] = useState(null);
  const [hotelId, setHotelId] = useState(
    initialHotelId != null && initialHotelId !== "" ? Number(initialHotelId) : undefined
  );
  const [header, setHeader] = useState(blankHeader);
  const [entries, setEntries] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState({ status: "idle", at: null });
  const [posting, setPosting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uomPrompt, setUomPrompt] = useState(null);
  const [pad, setPad] = useState(null);
  const [unknownCode, setUnknownCode] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [attachError, setAttachError] = useState(null);
  const [restored, setRestored] = useState(false);

  // Synchronous mirrors: scans, autosave timers and the post path read the
  // latest values, not the ones captured by a render.
  const adapterRef = useRef(adapter);
  const ctxRef = useRef(null);
  const hotelIdRef = useRef(hotelId);
  const headerRef = useRef(header);
  const entriesRef = useRef(entries);
  const dirtyRef = useRef(false);
  const editVersionRef = useRef(0);
  const touchedRef = useRef(false);
  const grnIdRef = useRef(null);
  const sessionKeyRef = useRef(null);
  const createUncertainRef = useRef(false);
  const saveChainRef = useRef(Promise.resolve());
  const postingRef = useRef(false);
  const loadSeqRef = useRef(0);
  const toastSeqRef = useRef(0);
  const flashTimerRef = useRef(null);
  const blurTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const pendingFilesRef = useRef(pendingFiles);

  useEffect(() => {
    adapterRef.current = adapter;
  });
  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(flashTimerRef.current);
      clearTimeout(blurTimerRef.current);
    };
  }, []);

  const commitEntries = useCallback((next) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);
  const commitHeader = useCallback((next) => {
    headerRef.current = next;
    setHeader(next);
  }, []);
  const commitDirty = useCallback((v) => {
    dirtyRef.current = v;
    setDirty(v);
  }, []);
  const markEdited = useCallback(() => {
    editVersionRef.current += 1;
    touchedRef.current = true;
    commitDirty(true);
  }, [commitDirty]);

  const lines = useMemo(() => ctx?.lines || [], [ctx]);
  const lineById = useMemo(() => new Map(lines.map((l) => [Number(l.poLineId), l])), [lines]);
  const hotel = ctx?.hotel || null;
  const po = ctx?.po || null;

  const invHotelIds = useMemo(() => (hotelId ? [Number(hotelId)] : []), [hotelId]);
  const invPerms = useModulePermissions({ moduleKey: "inventory", hotelIds: invHotelIds, enabled: allowItemSetup });
  const canSetupItems = allowItemSetup && (invPerms.loading || invPerms.canUpdate);

  // ── Form initialisation ───────────────────────────────────────────────────
  const initForm = useCallback((data) => {
    const deptDefault = data.po?.departmentId ?? null;
    const draft = drafts ? data.draft : null;
    const draftLines = new Map((draft?.lines || []).map((d) => [Number(d.poLineId), d]));
    let nextEntries = {};
    for (const l of data.lines || []) {
      const d = draftLines.get(Number(l.poLineId));
      nextEntries[l.poLineId] = d
        ? lineFromDraft(d, l, { departmentId: deptDefault })
        : blankLine(l, { departmentId: deptDefault });
    }
    let nextHeader = blankHeader();
    if (draft) {
      for (const k of HEADER_FIELDS) {
        if (draft[k] == null) continue;
        nextHeader[k] = /Date$|^receivedAt$/.test(k) ? dayOf(draft[k]) || nextHeader[k] : String(draft[k]);
      }
      nextHeader.dispatchId = draft.dispatchId ? String(draft.dispatchId) : "";
    } else if (dispatchId) {
      const dsp = (data.dispatches || []).find((x) => String(x.id) === String(dispatchId));
      if (dsp) {
        for (const dl of dsp.lines || []) {
          const e = nextEntries[dl.poLineId];
          if (e && !(toQ(e.received) > 0)) nextEntries = { ...nextEntries, [dl.poLineId]: { ...e, received: qtyText(dl.qty) } };
        }
        nextHeader = {
          ...nextHeader,
          dispatchId: String(dsp.id),
          vendorChallanNo: dsp.challanNo || "",
          vendorChallanDate: dayOf(dsp.challanDate) || "",
          ewayBillNo: dsp.ewayBillNo || "",
          vehicleNo: dsp.vehicleNo || "",
        };
      }
    }
    grnIdRef.current = draft?.id ?? null;
    sessionKeyRef.current = draft?.clientEventId || newClientEventId();
    createUncertainRef.current = false;
    editVersionRef.current = 0;
    touchedRef.current = false;
    commitEntries(nextEntries);
    commitHeader(nextHeader);
    commitDirty(false);
    setAttachments(draft?.attachments || []);
    setPendingFiles([]);
    setLineErrors({});
    setFormError(null);
    setAttachError(null);
    setRestored(false);
    setSaveState({ status: draft ? "saved" : "idle", at: null });
    return draft;
  }, [drafts, dispatchId, commitEntries, commitHeader, commitDirty]);

  /** The device copy wins only if it is newer than the server draft and nobody typed yet. */
  const restoreLocal = useCallback(async (data, draft, seq) => {
    const hid = data.hotel?.id;
    if (!hid) return;
    const local = await loadLocalDraft(grnDraftKey(data.po?.id ?? poId, hid));
    if (!local || seq !== loadSeqRef.current || touchedRef.current || !mountedRef.current) return;
    if (draft && local.draftId != null && Number(local.draftId) !== Number(draft.id)) return;
    const serverAt = draft?.updatedAt ? Date.parse(draft.updatedAt) || 0 : 0;
    if (!(Number(local.savedAt) > serverAt)) return;
    const deptDefault = data.po?.departmentId ?? null;
    const next = {};
    for (const l of data.lines || []) {
      next[l.poLineId] = { ...blankLine(l, { departmentId: deptDefault }), ...(local.entries?.[l.poLineId] || {}) };
    }
    if (!draft && local.sessionKey) {
      sessionKeyRef.current = local.sessionKey;
      createUncertainRef.current = true; // a create may have landed without us hearing back
    }
    commitEntries(next);
    commitHeader({ ...blankHeader(), ...(local.header || {}) });
    commitDirty(true);
    setRestored(true);
  }, [poId, commitEntries, commitHeader, commitDirty]);

  // ── Loading ───────────────────────────────────────────────────────────────
  const load = useCallback(async (hid) => {
    const seq = ++loadSeqRef.current;
    setView({ phase: "loading" });
    try {
      const data = await adapterRef.current.getContext(poId, hid);
      if (seq !== loadSeqRef.current || !mountedRef.current) return;
      ctxRef.current = data;
      setCtx(data);
      if (data?.receivable === false) {
        setView({ phase: "blocked", reason: data.notReceivableReason || "not_ready", message: null });
        return;
      }
      if (!data?.hotel) {
        const choices = data?.hotelChoices || [];
        if (choices.length === 1 && hid == null) {
          hotelIdRef.current = Number(choices[0].id);
          setHotelId(Number(choices[0].id));
          load(Number(choices[0].id));
          return;
        }
        setView(choices.length ? { phase: "pickHotel" } : { phase: "blocked", reason: "no_hotel", message: null });
        return;
      }
      hotelIdRef.current = Number(data.hotel.id);
      setHotelId(Number(data.hotel.id));
      const draft = initForm(data);
      setView({ phase: "ready" });
      restoreLocal(data, draft, seq);
    } catch (err) {
      if (seq !== loadSeqRef.current || !mountedRef.current) return;
      const info = errorInfo(err, "Could not load this purchase order.");
      if (info.code === "CONFLICT" && info.details.reason === "PO_NOT_RECEIVABLE") {
        const rs = info.details.receiptStatus;
        const reason = rs === "received" || rs === "closed_short" ? rs : "not_ready";
        setView({ phase: "blocked", reason, message: info.message });
      } else if (info.httpStatus === 404) {
        setView({ phase: "blocked", reason: "not_found", message: info.message });
      } else if (info.httpStatus === 403) {
        setView({ phase: "blocked", reason: "forbidden", message: info.message });
      } else {
        setView({ phase: "error", message: info.message });
      }
    }
  }, [poId, initForm, restoreLocal]);

  const initialHotelRef = useRef(hotelId);
  useEffect(() => {
    load(initialHotelRef.current);
  }, [load]);

  const chooseHotel = (id) => {
    const hid = Number(id);
    hotelIdRef.current = hid;
    setHotelId(hid);
    onHotelChange?.(hid);
    load(hid);
  };

  // ── Drafts ────────────────────────────────────────────────────────────────
  /**
   * Save the server draft. Saves run one at a time (a second create with the
   * same session key would answer with the first draft, unchanged).
   * `snapshot` overrides {header, entries} for a save that must include an
   * edit made in the same tick (the post path).
   */
  const saveDraft = useCallback(({ force = false, snapshot = null } = {}) => {
    const job = async () => {
      const ad = adapterRef.current;
      const data = ctxRef.current;
      if (typeof ad.createDraft !== "function" || !data?.hotel) return null;
      const hdr = snapshot?.header || headerRef.current;
      const ents = snapshot?.entries || entriesRef.current;
      if (!force && !dirtyRef.current) return null;
      if (!force && !grnIdRef.current && !hasContent(hdr, ents)) return null;
      const version = editVersionRef.current;
      const input = buildGrnInput({
        poId: data.po.id, hotelId: data.hotel.id, header: hdr, ctxLines: data.lines || [], entries: ents, allowMarkOut,
      });
      if (mountedRef.current) setSaveState({ status: "saving", at: null });
      try {
        let grn;
        if (grnIdRef.current) {
          grn = await ad.updateDraft(grnIdRef.current, { ...withoutPoId(input), post: false });
        } else {
          grn = await ad.createDraft({ ...input, post: false, clientEventId: sessionKeyRef.current });
          if (grn?.status && grn.status !== "draft") throw new AlreadyPosted(grn);
          grnIdRef.current = grn?.id ?? null;
          if (createUncertainRef.current && grnIdRef.current) {
            createUncertainRef.current = false;
            grn = await ad.updateDraft(grnIdRef.current, { ...withoutPoId(input), post: false });
          }
        }
        if (mountedRef.current) {
          if (editVersionRef.current === version) commitDirty(false);
          setSaveState({ status: "saved", at: Date.now() });
        }
        return grn;
      } catch (err) {
        if (!grnIdRef.current && errorInfo(err).httpStatus == null) createUncertainRef.current = true;
        if (mountedRef.current) setSaveState({ status: "error", at: null });
        throw err;
      }
    };
    const run = saveChainRef.current.then(job, job);
    saveChainRef.current = run.catch(() => {});
    return run;
  }, [allowMarkOut, commitDirty]);

  const finishPosted = useCallback(async (result, ad) => {
    const grn = result && result.id == null && result.grn && typeof result.grn === "object" ? result.grn : result;
    const data = ctxRef.current;
    const uploadFailures = [];
    if (typeof ad.createDraft !== "function" && grn?.id) {
      for (const p of pendingFilesRef.current) {
        try {
          await ad.uploadAttachment(grn.id, p.file, p.kind);
        } catch (err) {
          uploadFailures.push({ name: p.file.name, message: errorInfo(err, "Upload failed").message });
        }
      }
    }
    if (data?.hotel) clearLocalDraft(grnDraftKey(data.po?.id ?? poId, data.hotel.id));
    grnIdRef.current = null;
    sessionKeyRef.current = newClientEventId();
    createUncertainRef.current = false;
    commitDirty(false);
    if (!mountedRef.current) return;
    setPendingFiles([]);
    setView({ phase: "posted", grn, warnings: Array.isArray(grn?.warnings) ? grn.warnings : [], uploadFailures });
    onPosted?.(grn);
  }, [poId, commitDirty, onPosted]);

  // Autosave while dirty.
  useEffect(() => {
    if (!drafts || view.phase !== "ready") return undefined;
    const t = setInterval(() => {
      if (dirtyRef.current && !postingRef.current) saveDraft().catch(() => {});
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [drafts, view.phase, saveDraft]);

  // Save when the tab hides (phone locked, app switched).
  useEffect(() => {
    if (!drafts || view.phase !== "ready") return undefined;
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current && !postingRef.current) saveDraft().catch(() => {});
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [drafts, view.phase, saveDraft]);

  // Device copy, a moment after each edit.
  useEffect(() => {
    if (view.phase !== "ready" || !dirty || !hotelId || !ctxRef.current) return undefined;
    const key = grnDraftKey(ctxRef.current.po?.id ?? poId, hotelId);
    const t = setTimeout(() => {
      saveLocalDraft(key, {
        savedAt: Date.now(),
        draftId: grnIdRef.current,
        sessionKey: sessionKeyRef.current,
        header: headerRef.current,
        entries: entriesRef.current,
      });
    }, LOCAL_SAVE_MS);
    return () => clearTimeout(t);
  }, [header, entries, dirty, hotelId, view.phase, poId]);

  const onFormBlur = () => {
    if (!drafts) return;
    clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      if (dirtyRef.current && !postingRef.current) saveDraft().catch(() => {});
    }, BLUR_SAVE_MS);
  };

  const onSaveDraftClick = async () => {
    try {
      const grn = await saveDraft({ force: true });
      if (grn) toast.success("Draft saved");
    } catch (err) {
      if (err instanceof AlreadyPosted) {
        await finishPosted(err.postedGrn, adapterRef.current);
        return;
      }
      setFormError(errorInfo(err, "Could not save the draft. Your entries are kept on this device.").message);
    }
  };

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
    markEdited();
  }, [commitEntries, markEdited]);

  const patchHeader = useCallback((patch) => {
    commitHeader({ ...headerRef.current, ...patch });
    setFormError(null);
    markEdited();
  }, [commitHeader, markEdited]);

  const pickDispatch = useCallback((id) => {
    const dsp = (ctxRef.current?.dispatches || []).find((x) => String(x.id) === String(id));
    const hdr = headerRef.current;
    if (!dsp) {
      patchHeader({ dispatchId: "" });
      return;
    }
    // Fill only what the receiver has not entered yet.
    let next = entriesRef.current;
    for (const dl of dsp.lines || []) {
      const e = next[dl.poLineId];
      if (e && !(toQ(e.received) > 0)) next = { ...next, [dl.poLineId]: { ...e, received: qtyText(dl.qty) } };
    }
    if (next !== entriesRef.current) commitEntries(next);
    patchHeader({
      dispatchId: String(dsp.id),
      vendorChallanNo: hdr.vendorChallanNo || dsp.challanNo || "",
      vendorChallanDate: hdr.vendorChallanDate || dayOf(dsp.challanDate) || "",
      ewayBillNo: hdr.ewayBillNo || dsp.ewayBillNo || "",
      vehicleNo: hdr.vehicleNo || dsp.vehicleNo || "",
    });
  }, [commitEntries, patchHeader]);

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

  const undoScan = (poLineId, delta) => {
    const e = entriesRef.current[poLineId];
    if (!e) return;
    const total = Math.max(0, subQty(parseQty(e.received) ?? 0, delta));
    patchLine(poLineId, { received: qtyText(total) });
  };

  const showScanToast = (line, delta, total) => {
    toastSeqRef.current += 1;
    const toastId = `receive-scan-${line.poLineId}-${toastSeqRef.current}`;
    toast(
      <ScanToast
        name={line.productName}
        unit={line.unit}
        delta={delta}
        total={total}
        onUndo={() => {
          undoScan(line.poLineId, delta);
          toast.dismiss(toastId);
        }}
      />,
      { toastId, autoClose: 4000, closeOnClick: false, hideProgressBar: true }
    );
  };

  /** One scan (or linked code) of `packFactor` stock units onto a PO line. */
  const applyItemScan = (line, packFactor, gs1 = null) => {
    const e = entriesRef.current[line.poLineId];
    if (!e) return;
    const factor = Number(e.uomFactor) > 0
      ? Number(e.uomFactor)
      : Number(line.uomFactor) > 0
        ? Number(line.uomFactor)
        : sameUnit(line.unit, line.stockUom) ? 1 : null;
    if (isDecimalUnit(line.unit) || factor == null) {
      const received = parseQty(e.received) ?? 0;
      setPad({
        poLineId: line.poLineId, mode: "add", scanned: true, gs1,
        initial: Math.max(0, subQty(line.openAtHotel, received)),
      });
      return;
    }
    const delta = Number(qtyText((Number(packFactor) > 0 ? Number(packFactor) : 1) / factor));
    const total = addToLine(line, delta, { scanned: true, gs1 });
    flash(line.poLineId);
    showScanToast(line, delta, total);
  };

  const onScanResolved = (result, meta) => {
    const data = ctxRef.current;
    if (!result || !data) return;
    const thisPo = Number(data.po?.id);
    if (result.kind === "item") {
      const it = result.item || {};
      const line = it.poLineId != null
        ? lineById.get(Number(it.poLineId))
        : lines.find((l) => l.invItemId != null && Number(l.invItemId) === Number(it.invItemId));
      if (!line) {
        toast.warn(`${it.displayName || "That item"} isn't on this PO`);
        return;
      }
      applyItemScan(line, it.packFactor, result.gs1 || meta?.parsed?.gs1 || null);
    } else if (result.kind === "dispatch") {
      if (result.poId != null && Number(result.poId) !== thisPo) {
        if (buyerLinks) router.push(routes.receive(result.poId, { dispatchId: result.dispatchId }));
        else toast.warn("That dispatch note is for another order");
        return;
      }
      pickDispatch(String(result.dispatchId));
      toast.info("Receiving against that dispatch note");
    } else if (result.kind === "po") {
      if (Number(result.poId) === thisPo) toast.info("You are already receiving this PO");
      else if (buyerLinks) router.push(routes.receive(result.poId));
      else toast.warn("That code is for another order");
    } else if (result.kind === "grn") {
      toast.info("That is a goods receipt, not an item on this delivery");
    }
  };

  const onScanUnknown = (code) => {
    if (allowItemSetup && canSetupItems && code) setUnknownCode(code);
    else toast.warn(`${code || "That code"} isn't recognised. Enter the qty by hand.`);
  };

  const onCodeLinked = (info) => {
    setUnknownCode(null);
    const line = info?.poLineId != null
      ? lineById.get(Number(info.poLineId))
      : lines.find((l) => l.invItemId != null && Number(l.invItemId) === Number(info?.invItemId));
    if (line) applyItemScan(line, info.packFactor);
  };

  // ── Pad, unit conversion ──────────────────────────────────────────────────
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

  const applyFactor = (factor) => {
    const p = uomPrompt;
    setUomPrompt(null);
    if (!p || !(Number(factor) > 0)) return;
    const prev = entriesRef.current;
    const next = { ...prev, [p.poLineId]: { ...prev[p.poLineId], uomFactor: qtyText(factor) } };
    commitEntries(next);
    setLineErrors((errs) => {
      const n = { ...errs };
      delete n[p.poLineId];
      return n;
    });
    markEdited();
    if (p.thenPost) runPost(next);
  };

  // ── Posting ───────────────────────────────────────────────────────────────
  const handlePostError = (err) => {
    const info = errorInfo(err, "Could not post this receipt. Try again.");
    const d = info.details || {};
    const lineId = d.poLineId != null ? Number(d.poLineId) : null;
    const line = lineId != null ? lineById.get(lineId) : null;

    if (info.code === "OVER_RECEIPT" && line) {
      const asked = d.requested != null ? `; this receipt has ${fmtQty(d.requested)}` : "";
      setLineErrors({ [lineId]: `Max acceptable ${fmtQtyUnit(d.maxAcceptable, line.unit)} at this hotel${asked}` });
      setFormError("One line is more than this PO allows. Fix it, then post again.");
    } else if (info.code === "VALIDATION" && d.code_detail === "UOM_FACTOR_REQUIRED" && line) {
      if (canSetupItems) {
        setUomPrompt({ mode: "required", poLineId: lineId, poUnit: d.poUnit, stockUom: d.stockUom, thenPost: true });
      } else {
        setLineErrors({ [lineId]: info.message });
      }
    } else if (info.code === "VALIDATION" && d.code_detail === "UOM_FACTOR_MISMATCH" && line) {
      setUomPrompt({
        mode: "mismatch", poLineId: lineId, currentFactor: d.currentFactor, suppliedFactor: d.suppliedFactor, thenPost: true,
      });
    } else if (info.code === "CONFLICT" && d.reason === "PO_NOT_RECEIVABLE") {
      const rs = d.receiptStatus;
      setView({ phase: "blocked", reason: rs === "received" || rs === "closed_short" ? rs : "not_ready", message: info.message });
    } else if (line) {
      setLineErrors({ [lineId]: info.message });
    } else if (info.httpStatus == null) {
      setFormError(
        "The connection dropped before the server answered. Post again when you have signal; a receipt is never recorded twice."
      );
    } else {
      setFormError(info.message);
    }
  };

  const runPost = async (entriesOverride = null) => {
    if (postingRef.current) return;
    const data = ctxRef.current;
    if (!data?.hotel) return;
    postingRef.current = true;
    setPosting(true);
    setFormError(null);
    const ad = adapterRef.current;
    const ents = entriesOverride || entriesRef.current;
    const hdr = headerRef.current;
    try {
      let grnId = null;
      if (typeof ad.createDraft === "function") {
        const draft = await saveDraft({ force: true, snapshot: { header: hdr, entries: ents } });
        grnId = draft?.id ?? grnIdRef.current;
      }
      const input = buildGrnInput({
        poId: data.po.id, hotelId: data.hotel.id, header: hdr, ctxLines: data.lines || [], entries: ents, allowMarkOut,
      });
      // A saved draft posts by id, so every attempt gets a fresh key; a
      // one-shot post keeps the session key so a retry replays, never doubles.
      const clientEventId = grnId ? newClientEventId() : sessionKeyRef.current;
      const { queued, result } = await submitOrQueue({
        kind: ad.postKind || "grn.post",
        clientEventId,
        payload: { grnId, clientEventId, input },
        send: (payload) => ad.post(payload),
      });
      if (queued) {
        clearLocalDraft(grnDraftKey(data.po.id, data.hotel.id));
        grnIdRef.current = null;
        sessionKeyRef.current = newClientEventId();
        commitDirty(false);
        if (mountedRef.current) setView({ phase: "queued" });
        return;
      }
      await finishPosted(result, ad);
    } catch (err) {
      if (err instanceof AlreadyPosted) await finishPosted(err.postedGrn, ad);
      else if (mountedRef.current) handlePostError(err);
    } finally {
      postingRef.current = false;
      if (mountedRef.current) setPosting(false);
    }
  };

  const requestPost = () => {
    if (postingRef.current) return;
    const errs = validateForPost(lines, entriesRef.current, { allowMarkOut });
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

  // ── Attachments ───────────────────────────────────────────────────────────
  const onUpload = async (file, kind) => {
    setAttachError(null);
    const ad = adapterRef.current;
    if (typeof ad.createDraft !== "function") {
      setPendingFiles((list) => [...list, { file, kind }]);
      return;
    }
    setUploading(true);
    try {
      let id = grnIdRef.current;
      if (!id) {
        const g = await saveDraft({ force: true });
        id = g?.id ?? grnIdRef.current;
      }
      const att = await ad.uploadAttachment(id, file, kind);
      if (mountedRef.current && att) setAttachments((list) => [...list, att]);
    } catch (err) {
      if (err instanceof AlreadyPosted) {
        await finishPosted(err.postedGrn, ad);
        return;
      }
      if (mountedRef.current) setAttachError(errorInfo(err, "Could not upload that file. Try again.").message);
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  };

  const onDeleteAttachment = async (att) => {
    const ad = adapterRef.current;
    if (!grnIdRef.current || typeof ad.deleteAttachment !== "function") return;
    setAttachError(null);
    try {
      await ad.deleteAttachment(grnIdRef.current, att.id);
      setAttachments((list) => list.filter((a) => a.id !== att.id));
    } catch (err) {
      setAttachError(errorInfo(err, "Could not remove that file.").message);
    }
  };

  const changeHotel = async () => {
    if (dirtyRef.current) {
      try {
        await saveDraft();
      } catch {
        // The device copy still holds the entries.
      }
    }
    setView({ phase: "pickHotel" });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    let withQty = 0;
    let scanned = 0;
    for (const l of lines) {
      const e = entries[l.poLineId];
      if (!e) continue;
      const { received, rejected } = lineQty(e);
      if ((received || 0) > 0 || (rejected || 0) > 0) withQty += 1;
      if (e.scannedAt > 0) scanned += 1;
    }
    return { withQty, scanned };
  }, [lines, entries]);

  const cardOrder = useMemo(() => {
    const idx = new Map(lines.map((l, i) => [l.poLineId, i]));
    return [...lines].sort((a, b) => {
      const sa = entries[a.poLineId]?.scannedAt || 0;
      const sb = entries[b.poLineId]?.scannedAt || 0;
      if (sa !== sb) return sb - sa;
      return idx.get(a.poLineId) - idx.get(b.poLineId);
    });
  }, [lines, entries]);

  const overlayOpen = confirmOpen || !!pad || !!uomPrompt || !!unknownCode;
  const scanPaused = overlayOpen || posting;
  const canChangeHotel = !fixedHotel && (ctx?.hotelChoices?.length || 0) > 1;

  const saveLabel = (() => {
    if (!drafts) return null;
    if (saveState.status === "saving") return "Saving…";
    if (saveState.status === "error") return "Not saved yet";
    if (dirty) return "Unsaved changes";
    if (saveState.status === "saved") return "Draft saved";
    return null;
  })();

  // ── Render: non-form states ───────────────────────────────────────────────
  const frame = (body, { title = po?.poNumber, sub = null } = {}) => (
    <div className={styles.page}>
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headMain}>
            <div className={styles.eyebrow}>
              {buyerLinks ? (
                <Link href={routes.awaiting()}>
                  <ArrowLeft size={12} aria-hidden="true" /> Awaiting deliveries
                </Link>
              ) : (
                "Receive goods"
              )}
            </div>
            <h1 className={styles.pageTitle}>
              {title ? <span className={styles.titleMono}>{title}</span> : "Receive goods"}
            </h1>
            {sub}
          </div>
        </div>
      </section>
      <main className={styles.pageBody}>{body}</main>
    </div>
  );

  if (view.phase === "loading") {
    return frame(
      <div className={styles.card} aria-busy="true" aria-label="Loading the purchase order">
        <div className={styles.cardBody}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={styles.sk} style={{ width: `${88 - i * 14}%`, marginBottom: 14 }} />
          ))}
        </div>
      </div>,
      { title: null }
    );
  }

  if (view.phase === "error") {
    return frame(
      <div className={styles.stateCard} role="alert">
        <div className={styles.stateIc}><PackageOpen size={20} aria-hidden="true" /></div>
        <h2 className={styles.stateTitle}>Couldn&apos;t load this PO</h2>
        <p className={styles.stateSub}>{view.message}</p>
        <div className={styles.stateActions}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => load(hotelIdRef.current)}>
            <RefreshCw size={14} aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  }

  if (view.phase === "blocked") {
    const custom = renderBlocked?.({
      reason: view.reason, message: view.message, context: ctx, reload: () => load(hotelIdRef.current),
    });
    if (custom) return custom;
    const copy = BLOCKED_COPY[view.reason] || BLOCKED_COPY.not_ready;
    const poRef = po?.id ?? poId;
    return frame(
      <div className={styles.stateCard}>
        <div className={`${styles.stateIc} ${copy.ok ? styles.stateIcOk : ""}`}>
          {copy.ok ? <CheckCircle2 size={20} aria-hidden="true" /> : <PackageOpen size={20} aria-hidden="true" />}
        </div>
        <h2 className={styles.stateTitle}>{copy.title}</h2>
        <p className={styles.stateSub}>{copy.sub || view.message || "Check with the buyer."}</p>
        {buyerLinks && (
          <div className={styles.stateActions}>
            {(view.reason === "received" || view.reason === "closed_short") && poRef != null && (
              <Link href={routes.grnRegister({ poId: poRef })} className={`${styles.btn} ${styles.btnPrimary}`}>
                View its GRNs
              </Link>
            )}
            <Link href={routes.awaiting()} className={`${styles.btn} ${styles.btnSecondary}`}>
              Back to awaiting deliveries
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (view.phase === "pickHotel") {
    const choices = ctx?.hotelChoices || [];
    return frame(
      <div className={styles.stateCard} style={{ maxWidth: 720 }}>
        <div className={styles.stateIc}><Building2 size={20} aria-hidden="true" /></div>
        <h2 className={styles.stateTitle}>Which hotel is receiving?</h2>
        <p className={styles.stateSub}>This PO delivers to more than one hotel. Pick the one these goods arrived at.</p>
        <div className={styles.hotelPicker}>
          {choices.map((h) => (
            <button key={h.id} type="button" className={styles.hotelBtn} onClick={() => chooseHotel(h.id)}>
              <Building2 size={16} aria-hidden="true" />
              <span>{h.name}</span>
            </button>
          ))}
        </div>
      </div>,
      { sub: po?.vendorName ? <div className={styles.pageSub}>{po.vendorName}</div> : null }
    );
  }

  if (view.phase === "queued") {
    return frame(
      <div className={styles.stateCard} role="status">
        <div className={styles.stateIc}><CloudOff size={20} aria-hidden="true" /></div>
        <h2 className={styles.stateTitle}>Saved on this device</h2>
        <p className={styles.stateSub}>
          There is no connection right now. The receipt posts by itself when the signal is back
          {pendingCount > 0 ? ` (${pendingCount} waiting)` : ""}.
        </p>
        {buyerLinks && (
          <div className={styles.stateActions}>
            <Link href={routes.awaiting()} className={`${styles.btn} ${styles.btnSecondary}`}>
              Back to awaiting deliveries
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (view.phase === "posted") {
    const { grn, warnings = [], uploadFailures = [] } = view;
    const anyOpen = lines.some((l) => {
      const { accepted } = lineQty(entries[l.poLineId]);
      return subQty(l.openAtHotel, accepted || 0) > 0;
    });
    return frame(
      <div className={styles.stateCard} role="status">
        <div className={`${styles.stateIc} ${styles.stateIcOk}`}><PackageCheck size={20} aria-hidden="true" /></div>
        <h2 className={styles.stateTitle}>Receipt posted</h2>
        <p className={styles.stateSub}>
          {grn?.grnNumber ? <span className={styles.mono}>{grn.grnNumber}</span> : null}
          {grn?.grnNumber ? <br /> : null}
          Accepted goods are in stock{hotel?.name ? ` at ${hotel.name}` : ""}.
        </p>
        {warnings.length > 0 && (
          <ul className={styles.successList} aria-label="Warnings">
            {warnings.map((w, i) => (
              <li key={`${w.poLineId}-${w.code}-${i}`} className={styles.lineWarn}>
                <strong>{lineById.get(Number(w.poLineId))?.productName || "Line"}</strong>
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}
        {uploadFailures.length > 0 && (
          <ul className={styles.successList} aria-label="Files not uploaded">
            {uploadFailures.map((f) => (
              <li key={f.name} className={styles.lineError}>
                <strong>{f.name}</strong>
                <span>{f.message}</span>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.stateActions}>
          {buyerLinks && grn?.id != null && (
            <Link href={routes.grn(grn.id)} className={`${styles.btn} ${styles.btnPrimary}`}>
              <FileText size={14} aria-hidden="true" /> View GRN
            </Link>
          )}
          {anyOpen && (
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => load(hotelIdRef.current)}>
              Receive another delivery
            </button>
          )}
          {buyerLinks && (
            <Link href={routes.awaiting()} className={`${styles.btn} ${styles.btnSecondary}`}>
              Back to awaiting deliveries
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── Render: the receive form ──────────────────────────────────────────────
  const scanner = renderScanner ? (
    renderScanner({
      context: `po:${po.id}`, disabled: scanPaused, onResolved: onScanResolved, onUnknown: onScanUnknown, lines,
    })
  ) : (
    <ScanInput context={`po:${po.id}`} onResolved={onScanResolved} onUnknown={onScanUnknown} disabled={scanPaused} />
  );

  const lineProps = (l) => ({
    line: l,
    entry: entries[l.poLineId],
    onChange: (patch) => patchLine(l.poLineId, patch),
    error: lineErrors[l.poLineId] || null,
    flash: flashId === l.poLineId,
    showPrices,
    allowMarkOut,
    departments: ctx?.departments || [],
    allowItemSetup: allowItemSetup && canSetupItems,
    suggestions: ctx?.itemSuggestions?.[l.poLineId] || [],
    receivedAt: header.receivedAt,
    onOpenUom: allowItemSetup && canSetupItems
      ? () => setUomPrompt({ mode: "required", poLineId: l.poLineId, poUnit: l.unit, stockUom: l.stockUom, thenPost: false })
      : undefined,
  });

  const itemsCard = (
    <section className={styles.card} aria-labelledby="receive-items-title">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="receive-items-title">
          <span className={styles.cardIc}><ScanBarcode size={14} aria-hidden="true" /></span>
          Items
          <span className={styles.count}>{lines.length}</span>
        </h2>
        <span className={styles.saveState}>
          {counts.withQty} of {lines.length} entered{counts.scanned ? ` · ${counts.scanned} scanned` : ""}
        </span>
      </div>
      <div className={styles.scanDock} data-testid="scan-dock">{scanner}</div>
      {formError && (
        <div className={styles.formError} role="alert" style={{ marginTop: 14 }}>
          {formError}
        </div>
      )}
      {lines.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Nothing is open on this PO at {hotel?.name || "this hotel"}</div>
        </div>
      ) : isMobile ? (
        <div className={styles.cardList}>
          {cardOrder.map((l) => (
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
          ))}
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
                {allowMarkOut && <th>Mark out</th>}
              </tr>
            </thead>
            {lines.map((l, i) => (
              <ReceiveLineRow key={l.poLineId} index={i} {...lineProps(l)} />
            ))}
          </table>
        </div>
      )}
    </section>
  );

  const documentsCard = (
    <section className={styles.card} aria-labelledby="receive-docs-title">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="receive-docs-title">
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
          attachments={attachments}
          pendingFiles={pendingFiles}
          onUpload={onUpload}
          onDelete={drafts ? onDeleteAttachment : undefined}
          onRemovePending={(i) => setPendingFiles((list) => list.filter((_, j) => j !== i))}
          uploading={uploading}
          canDelete={drafts}
        />
        {attachError && (
          <div className={styles.formError} role="alert" style={{ margin: "12px 0 0" }}>
            {attachError}
          </div>
        )}
      </div>
    </section>
  );

  const postLabel = (
    <>
      {posting ? <Loader2 size={15} className={styles.spin} aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
      Post receipt
    </>
  );

  return (
    <div className={styles.page} onBlur={onFormBlur}>
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headMain}>
            <div className={styles.eyebrow}>
              {buyerLinks ? (
                <Link href={routes.awaiting()}>
                  <ArrowLeft size={12} aria-hidden="true" /> Awaiting deliveries
                </Link>
              ) : (
                "Receive goods"
              )}
            </div>
            <h1 className={styles.pageTitle}>
              <span className={styles.titleMono}>{po.poNumber}</span>
              {po.isCallOff && <span className={`${styles.pill} ${styles.pillIndigo}`}>Call-off</span>}
            </h1>
            <div className={styles.pageSub}>
              {po.vendorName && <span>{po.vendorName}</span>}
              {po.vendorName && <span className={styles.subSep} aria-hidden="true">·</span>}
              <span>
                Receiving at <strong data-testid="receiving-hotel">{hotel.name}</strong>
              </span>
              {canChangeHotel && (
                <button type="button" className={styles.btnLink} onClick={changeHotel}>
                  Change hotel
                </button>
              )}
              {buyerLinks && po.id != null && (
                <>
                  <span className={styles.subSep} aria-hidden="true">·</span>
                  <Link href={routes.po(po.id)} className={styles.btnLink}>Open PO</Link>
                </>
              )}
            </div>
          </div>
          {!isMobile && (
            <div className={styles.headerActions}>
              {pendingCount > 0 && (
                <span className={`${styles.pill} ${styles.pillWarn}`}>{pendingCount} waiting to sync</span>
              )}
              {saveLabel && (
                <span className={styles.saveState} aria-live="polite">
                  {saveState.status === "saving" && <Loader2 size={12} className={styles.spin} aria-hidden="true" />}
                  {saveLabel}
                </span>
              )}
              {drafts && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={onSaveDraftClick}
                  disabled={posting}
                >
                  <Save size={14} aria-hidden="true" />
                  Save draft
                </button>
              )}
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSuccess}`}
                onClick={requestPost}
                disabled={posting || lines.length === 0}
              >
                {postLabel}
              </button>
            </div>
          )}
        </div>
      </section>

      <main className={styles.pageBody}>
        <div className={styles.stack}>
          {restored && (
            <div className={`${styles.lineMsg} ${styles.lineNote}`} role="status">
              Restored the entries you had not saved yet on this device.
            </div>
          )}
          {isMobile ? (
            <>
              {itemsCard}
              {documentsCard}
            </>
          ) : (
            <>
              {documentsCard}
              {itemsCard}
            </>
          )}
        </div>
      </main>

      {isMobile && (
        <MobileActionBar
          label="Receive actions"
          summary={
            <span>
              {counts.withQty} of {lines.length} lines entered
              {saveLabel ? ` · ${saveLabel}` : ""}
              {pendingCount > 0 ? ` · ${pendingCount} waiting to sync` : ""}
            </span>
          }
        >
          {drafts && (
            <MobileActionButton variant="secondary" onClick={onSaveDraftClick} disabled={posting}>
              <Save size={16} aria-hidden="true" />
              Save draft
            </MobileActionButton>
          )}
          <MobileActionButton variant="primary" onClick={requestPost} disabled={posting || lines.length === 0}>
            {postLabel}
          </MobileActionButton>
        </MobileActionBar>
      )}

      {confirmOpen && (
        <ReceiveConfirmModal
          show
          lines={lines}
          entries={entries}
          hotelName={hotel.name}
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
      {uomPrompt && lineById.get(Number(uomPrompt.poLineId)) && (
        <UomFactorPrompt
          show
          mode={uomPrompt.mode}
          productName={lineById.get(Number(uomPrompt.poLineId)).productName}
          poUnit={uomPrompt.poUnit || lineById.get(Number(uomPrompt.poLineId)).unit}
          stockUom={uomPrompt.stockUom || lineById.get(Number(uomPrompt.poLineId)).stockUom}
          receivedQty={lineQty(entries[uomPrompt.poLineId]).received || 0}
          currentFactor={uomPrompt.currentFactor}
          suppliedFactor={uomPrompt.suppliedFactor}
          canSet={canSetupItems}
          busy={posting}
          submitLabel={uomPrompt.thenPost ? "Save and post" : "Use this conversion"}
          onSubmit={applyFactor}
          onHide={() => setUomPrompt(null)}
        />
      )}
      {unknownCode && (
        <LinkUnknownCodeSheet
          show
          code={unknownCode}
          poLines={lines}
          hotelId={hotel.id}
          onHide={() => setUnknownCode(null)}
          onLinked={onCodeLinked}
        />
      )}
    </div>
  );
};

export default ReceivePage;
