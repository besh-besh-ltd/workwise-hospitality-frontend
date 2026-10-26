import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { Truck, PackageCheck, Ban, Lock, Split, Info } from "lucide-react";
import {
  getPoDeliveries,
  savePoDeliveryPlan,
  patchDeliveryDueDate,
  shortClosePo,
  reopenShortClose,
} from "@/services/inventory";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError";
import po from "../PurchaseOrders.module.scss";
import { fmtDateOnly, fmtDateTime } from "../shared";
import s from "./deliveries.module.scss";
import DeliveryGrid from "./DeliveryGrid";
import PlanEditor from "./PlanEditor";
import ShortCloseModal, { ReopenModal } from "./ShortCloseModal";
import SiteRepPanel from "./SiteRepPanel";
import Receipts, { words } from "./Receipts";
import ShortCloseHistory from "./ShortCloseHistory";
import ProgressByItem from "./ProgressByItem";
import { deliveryLabel, isDay, manualShortClosed, toQ } from "./planMath";

/*
  The PO detail page's Deliveries tab (spec §7): the hotel × phase plan with
  what each delivery has received, the plan editor, short-close and reopen,
  the PO's GRNs / dispatch notes / returns, and its site representatives.

  Everything comes from GET /inventory/po/:poId/deliveries. Every plan write
  (save plan, move a due date, short-close, reopen) answers with that same
  payload, so the tab replaces its state with the answer instead of
  refetching; an answer older than the latest request is dropped, so a slow
  reply can't overwrite a newer one. What the user may do is the server's
  `can` block; nothing here re-derives permissions, and no tenant id is sent.

  "Received in the old flow" is receiptLegacy AND receiptStatus 'received'
  (the server's predicate). The go-live backlog is flagged legacy with
  nothing received and is received, planned and short-closed like any PO.

  Rendered inside the page's two-column body: a section stack and an aside.
*/

const RECEIPT_STATUS = {
  not_received: { label: "Nothing received", cls: "stOpen" },
  partial: { label: "Partly received", cls: "stPartial" },
  received: { label: "Fully received", cls: "stReceived" },
  closed_short: { label: "Closed short", cls: "stClosed" },
};

// Server refusals that mean "what you are looking at is stale".
const STALE = new Set([403, 404, 409]);
const NOT_FOUND_COPY = "Deliveries aren't available to you on this PO, or it no longer exists.";

// A due date is sent once it is a whole date. Keyboard entry passes through
// years like 0002 and 0020; those are never sent.
const wholeDay = (v) => isDay(v) && v >= "2000-01-01";

export default function DeliveriesTab({ poId }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null); // null | { initialAction }
  const [dateDraft, setDateDraft] = useState({});
  const [showShortClose, setShowShortClose] = useState(false);
  const [reopening, setReopening] = useState(null);

  // Request ordering: every request that answers with the payload takes a
  // number; only the latest one's answer is applied.
  const latest = useRef(0);
  const dropped = useRef(false);
  const begin = () => ++latest.current;
  const settle = (seq, next) => {
    if (seq !== latest.current) {
      dropped.current = true;
      return false;
    }
    dropped.current = false;
    setData(next);
    return true;
  };

  const load = useCallback(async () => {
    const seq = ++latest.current;
    try {
      const next = await getPoDeliveries(poId);
      if (seq !== latest.current) return;
      dropped.current = false;
      setData(next);
      setLoadError(null);
    } catch (err) {
      if (seq !== latest.current) return;
      // A 404 is the same for a PO that's gone and one at a hotel this user
      // can't see: one message, and no retry that can't succeed.
      if (err?.response?.status === 404) setLoadError({ message: NOT_FOUND_COPY, retry: false });
      else setLoadError({ message: getApiErrorMessage(err, "Couldn't load deliveries."), retry: true });
    }
  }, [poId]);

  useEffect(() => {
    if (poId) load();
  }, [poId, load]);

  // The latest request failed: reload when the screen may be stale (the
  // server said so, or an earlier answer was dropped in its favour).
  const failed = (seq, err) => {
    if (seq === latest.current && (STALE.has(err?.response?.status) || dropped.current)) load();
  };

  const reopenable = useMemo(() => manualShortClosed(data?.shortCloses), [data]);

  // ── due dates: draft on change, commit on blur or Enter ──
  const inFlightDate = useRef({});
  const dropDraft = (id, only) =>
    setDateDraft((m) => {
      if (!(id in m) || (only !== undefined && m[id] !== only)) return m;
      const rest = { ...m };
      delete rest[id];
      return rest;
    });

  if (loadError && !data) {
    return (
      <div className={po.sectionStack}>
        <section className={po.sectionCard}>
          <div className={s.sectionPad}>
            <div className={s.errorText} role="alert">
              {loadError.message}
            </div>
            {loadError.retry && (
              <div>
                <button type="button" className={`${po.btn} ${po.btnSecondary} ${po.btnSm} ${s.act}`} onClick={load}>
                  Try again
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }
  if (!data) {
    return (
      <div className={po.sectionStack}>
        <section className={po.sectionCard} aria-busy="true">
          <div className={s.sectionPad}>
            <div className={s.muted}>Loading deliveries…</div>
          </div>
        </section>
      </div>
    );
  }

  const can = data.can || {};
  const hotels = data.hotels || [];
  const deliveries = data.deliveries || [];
  const legacyReceived = !!data.receiptLegacy && data.receiptStatus === "received";
  const receipt = RECEIPT_STATUS[data.receiptStatus] || { label: words(data.receiptStatus), cls: "stOpen" };
  const fullyDone = data.receiptStatus === "received" || data.receiptStatus === "closed_short";
  const anythingOpen = deliveries.some((d) => (d.lines || []).some((l) => toQ(l.openQty) > 0));
  const planEditable = !!can.editPlan && data.editable === "all" && !legacyReceived;
  const unsplit = planEditable && hotels.length > 1 && deliveries.length > 0 && deliveries.every((d) => d.hotelId == null);

  // ── writes: each answer is the whole tab ──
  const savePlan = async (body) => {
    const seq = begin();
    try {
      const next = await savePoDeliveryPlan(poId, body);
      settle(seq, next);
      setEditing(null);
      toast.success("Delivery plan saved.");
    } catch (err) {
      if (getApiErrorData(err)?.code === "LOCKED" || err?.response?.status === 409) {
        // The plan locked under the editor (goods dispatched or received
        // meanwhile): nothing to fix there, so close it and show the plan.
        setEditing(null);
        toast.error(getApiErrorMessage(err, "The delivery plan can no longer change."));
        load();
        return;
      }
      failed(seq, err);
      throw err; // the editor shows why
    }
  };

  // Matches the server's patchDueDate: a live delivery (open, or partial by a
  // short-close) with nothing received against it.
  const canEditDate = (d) =>
    !!can.editPlan && !legacyReceived && !d.hasReceipts && (d.status === "open" || d.status === "partial") && !editing;
  const dateValue = (d) => (d.id in dateDraft ? dateDraft[d.id] : d.dueDate || "");
  const draftDueDate = (d, v) => {
    if (v === (d.dueDate || "")) dropDraft(d.id);
    else setDateDraft((m) => ({ ...m, [d.id]: v }));
  };
  const commitDueDate = async (d) => {
    if (!(d.id in dateDraft)) return;
    const v = dateDraft[d.id];
    if (v !== "" && !wholeDay(v)) {
      dropDraft(d.id); // half-typed: put the saved date back
      return;
    }
    const day = v || null;
    if (day === (d.dueDate || null)) {
      dropDraft(d.id);
      return;
    }
    if (inFlightDate.current[d.id] === v) return; // already on its way (Enter, then blur)
    inFlightDate.current[d.id] = v;
    const seq = begin();
    try {
      const next = await patchDeliveryDueDate(poId, d.id, day);
      settle(seq, next);
      toast.success(day ? `${deliveryLabel(d)} is now due ${fmtDateOnly(day)}.` : `${deliveryLabel(d)} has no due date now.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't change the due date."));
      failed(seq, err);
    } finally {
      if (inFlightDate.current[d.id] === v) delete inFlightDate.current[d.id];
      dropDraft(d.id, v);
    }
  };

  const shortClose = async (payload) => {
    const seq = begin();
    try {
      const next = await shortClosePo(poId, payload);
      settle(seq, next);
      setShowShortClose(false);
      toast.success("Short-closed. The vendor is no longer expected to deliver that quantity.");
    } catch (err) {
      failed(seq, err);
      throw err; // the dialog shows why
    }
  };

  const reopen = async (remarks) => {
    const seq = begin();
    try {
      const next = await reopenShortClose(poId, { deliveryLineIds: [reopening.lineId], remarks });
      settle(seq, next);
      setReopening(null);
      toast.success("Reopened. The vendor is expected to deliver it again.");
    } catch (err) {
      failed(seq, err);
      throw err;
    }
  };

  const shortCloseBlocked = !can.shortClose
    ? "Short-close isn't available to you on this PO"
    : !anythingOpen
      ? "Nothing is open to close"
      : null;
  const actBtn = (kind) => `${po.btn} ${kind} ${po.btnSm} ${s.act}`;

  return (
    <>
      <div className={po.sectionStack}>
        {/* Delivery plan */}
        <section className={po.sectionCard}>
          <div className={po.sectionHead}>
            <div className={po.hLeft}>
              <div className={po.ic}>
                <Truck size={13} />
              </div>
              <h2>Delivery plan</h2>
              <span className={`${s.status} ${s[receipt.cls]}`}>{receipt.label}</span>
            </div>
            <div className={s.headActions}>
              {can.receive && !legacyReceived && !fullyDone && (
                <Link href={`/dashboard/buyer/inventory/receive/${poId}`} className={actBtn(po.btnPrimary)}>
                  <PackageCheck size={13} aria-hidden="true" /> Receive goods
                </Link>
              )}
              {!legacyReceived && (
                <button
                  type="button"
                  className={actBtn(po.btnSecondary)}
                  disabled={!!shortCloseBlocked || !!editing}
                  title={shortCloseBlocked || undefined}
                  onClick={() => setShowShortClose(true)}
                >
                  <Ban size={13} aria-hidden="true" /> Short-close
                </button>
              )}
              {planEditable && !editing && (
                <button type="button" className={actBtn(po.btnSecondary)} onClick={() => setEditing({})}>
                  Edit plan
                </button>
              )}
            </div>
          </div>

          <div className={s.sectionPad}>
            {legacyReceived && (
              <div className={`${s.banner} ${s.bannerInfo}`}>
                <Info size={14} aria-hidden="true" />
                <div className={s.bBody}>
                  <div className={s.bTitle}>Received before stock tracking</div>
                  <div className={s.bSub}>
                    This PO was marked received in the old flow, so it has no delivery-by-delivery record.
                  </div>
                </div>
              </div>
            )}

            {data.planLocked && !legacyReceived && (
              <div className={`${s.banner} ${s.bannerInfo}`}>
                <Lock size={14} aria-hidden="true" />
                <div className={s.bBody}>
                  <div className={s.bTitle}>
                    Plan locked: goods have been dispatched, received or short-closed, so quantities can&apos;t change.
                  </div>
                  <div className={s.bSub}>
                    {can.editPlan ? "Due dates of phases with nothing received can still move." : null}
                    {data.planLockedAt ? ` Locked ${fmtDateTime(data.planLockedAt)}.` : null}
                  </div>
                </div>
              </div>
            )}

            {unsplit && !editing && (
              <div className={`${s.banner} ${s.bannerWarn}`}>
                <Split size={14} aria-hidden="true" />
                <div className={s.bBody}>
                  <div className={s.bTitle}>Split this PO by hotel</div>
                  <div className={s.bSub}>
                    It delivers to {hotels.length} hotels but nothing says how much goes where. Each hotel can only
                    receive what is planned for it.
                  </div>
                </div>
                <button type="button" className={actBtn(po.btnPrimary)} onClick={() => setEditing({ initialAction: "split" })}>
                  Split by hotel
                </button>
              </div>
            )}

            {editing ? (
              <PlanEditor
                hotels={hotels}
                poLines={data.poLines || []}
                deliveries={deliveries}
                initialAction={editing.initialAction}
                onSave={savePlan}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <DeliveryGrid
                deliveries={deliveries}
                canEditDate={canEditDate}
                dateValue={dateValue}
                onDueDate={draftDueDate}
                onDueDateCommit={commitDueDate}
                onDueDateCancel={(d) => dropDraft(d.id)}
                reopenable={reopenable}
                onReopen={
                  can.shortClose
                    ? (line, d) =>
                        setReopening({
                          lineId: line.id,
                          productName: line.productName || `Line ${line.poLineId}`,
                          unit: line.unit || "",
                          label: deliveryLabel(d),
                          q: reopenable.get(line.id) || 0,
                        })
                    : undefined
                }
              />
            )}
          </div>
        </section>

        <Receipts grns={data.grns} dispatches={data.dispatches} rtvs={data.rtvs} />
        <ShortCloseHistory shortCloses={data.shortCloses} />
      </div>

      {/* Aside */}
      <div>
        <div className={po.asideStack}>
          <ProgressByItem poLines={data.poLines} />
          <SiteRepPanel
            poId={poId}
            hotels={hotels}
            siteReps={data.siteReps || []}
            canManage={!!can.manageSiteRep}
            hotelIds={can.siteRepHotelIds || []}
            canAdd={!fullyDone && !legacyReceived}
            onChanged={load}
          />
        </div>
      </div>

      <ShortCloseModal
        show={showShortClose}
        onHide={() => setShowShortClose(false)}
        deliveries={deliveries}
        hotels={hotels}
        onSubmit={shortClose}
      />
      <ReopenModal show={!!reopening} onHide={() => setReopening(null)} row={reopening} onSubmit={reopen} />
    </>
  );
}
