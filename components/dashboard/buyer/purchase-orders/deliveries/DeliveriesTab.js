import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { Truck, PackageCheck, Ban, Lock, Split, Info, ListChecks } from "lucide-react";
import {
  getPoDeliveries,
  savePoDeliveryPlan,
  patchDeliveryDueDate,
  shortClosePo,
  reopenShortClose,
} from "@/services/inventory";
import { getApiErrorMessage } from "@/utils/apiError";
import po from "../PurchaseOrders.module.scss";
import { inr, fmtDateOnly, fmtDateTime } from "../shared";
import s from "./deliveries.module.scss";
import DeliveryGrid from "./DeliveryGrid";
import PlanEditor from "./PlanEditor";
import ShortCloseModal, { ReopenModal } from "./ShortCloseModal";
import SiteRepPanel from "./SiteRepPanel";
import { deliveryLabel, fmtQ, fmtQty, isDay, manualShortClosed, reasonLabel, toQ } from "./planMath";

/*
  The PO detail page's Deliveries tab (spec §7): the hotel × phase plan with
  what each delivery has received, the plan editor, short-close and reopen,
  the PO's GRNs / dispatch notes / returns, and its site representatives.

  Everything comes from GET /inventory/po/:poId/deliveries. Every write
  (save plan, move a due date, short-close, reopen) answers with that same
  payload, so the tab replaces its state with the answer instead of
  refetching. What the user may do is the server's `can` block; nothing here
  re-derives permissions, and no tenant id is ever sent.

  Rendered inside the page's two-column body: a section stack and an aside.
*/

const RECEIPT_STATUS = {
  not_received: { label: "Nothing received", cls: "stOpen" },
  partial: { label: "Partly received", cls: "stPartial" },
  received: { label: "Fully received", cls: "stReceived" },
  closed_short: { label: "Closed short", cls: "stClosed" },
};

const DISPOSITION = { REPLACE: "Replacement", CREDIT: "Credit note" };

const words = (v) => {
  const t = String(v || "").replace(/_/g, " ").trim().toLowerCase();
  return t ? t[0].toUpperCase() + t.slice(1) : "—";
};

// Server refusals that mean "what you are looking at is stale".
const STALE = new Set([403, 404, 409]);

export default function DeliveriesTab({ poId }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null); // null | { initialAction }
  const [dateDraft, setDateDraft] = useState({});
  const [showShortClose, setShowShortClose] = useState(false);
  const [reopening, setReopening] = useState(null);

  const load = useCallback(async () => {
    try {
      const next = await getPoDeliveries(poId);
      setData(next);
      setLoadError(null);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Couldn't load deliveries."));
    }
  }, [poId]);

  useEffect(() => {
    if (poId) load();
  }, [poId, load]);

  const refreshIfStale = (err) => {
    if (STALE.has(err?.response?.status)) load();
  };

  const reopenable = useMemo(() => manualShortClosed(data?.shortCloses), [data]);

  if (loadError && !data) {
    return (
      <div className={po.sectionStack}>
        <section className={po.sectionCard}>
          <div className={s.sectionPad}>
            <div className={s.errorText} role="alert">
              {loadError}
            </div>
            <div>
              <button type="button" className={`${po.btn} ${po.btnSecondary} ${po.btnSm}`} onClick={load}>
                Try again
              </button>
            </div>
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
  const poLines = data.poLines || [];
  const grns = data.grns || [];
  const dispatches = data.dispatches || [];
  const rtvs = data.rtvs || [];
  const shortCloses = data.shortCloses || [];
  const receipt = RECEIPT_STATUS[data.receiptStatus] || { label: words(data.receiptStatus), cls: "stOpen" };
  const fullyDone = data.receiptStatus === "received" || data.receiptStatus === "closed_short";
  const anythingOpen = deliveries.some((d) => (d.lines || []).some((l) => toQ(l.openQty) > 0));
  const planEditable = !!can.editPlan && data.editable === "all" && !data.receiptLegacy;
  const unsplit = planEditable && hotels.length > 1 && deliveries.length > 0 && deliveries.every((d) => d.hotelId == null);

  // ── writes: each answer is the whole tab ──
  const savePlan = async (body) => {
    try {
      const next = await savePoDeliveryPlan(poId, body);
      setData(next);
      setEditing(null);
      toast.success("Delivery plan saved.");
    } catch (err) {
      refreshIfStale(err);
      throw err; // the editor shows why
    }
  };

  const canEditDate = (d) => !!can.editPlan && !d.hasReceipts && d.status === "open" && !editing;
  // Due dates save as soon as the input holds a whole date. Keyboard entry
  // passes through partial years ("0002-11-20"), so only a year from 2000
  // commits on change; clearing the field commits on blur. The draft shows
  // what was typed until the server answers.
  const dateValue = (d) => (d.id in dateDraft ? dateDraft[d.id] : d.dueDate || "");
  const dropDraft = (id, only) =>
    setDateDraft((m) => {
      if (!(id in m) || (only !== undefined && m[id] !== only)) return m;
      const rest = { ...m };
      delete rest[id];
      return rest;
    });
  const commitDueDate = async (d, day) => {
    try {
      const next = await patchDeliveryDueDate(poId, d.id, day);
      setData(next);
      toast.success(day ? `${deliveryLabel(d)} is now due ${fmtDateOnly(day)}.` : `${deliveryLabel(d)} has no due date now.`);
      dropDraft(d.id, day || "");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't change the due date."));
      dropDraft(d.id);
      refreshIfStale(err);
    }
  };
  const wholeDay = (v) => isDay(v) && v >= "2000-01-01";
  const changeDueDate = (d, day) => {
    if (day === (d.dueDate || "")) {
      dropDraft(d.id);
      return;
    }
    setDateDraft((m) => ({ ...m, [d.id]: day }));
    if (wholeDay(day)) commitDueDate(d, day);
  };
  const leaveDueDate = (d) => {
    if (!(d.id in dateDraft)) return;
    const v = dateDraft[d.id];
    if (v === "" && d.dueDate) commitDueDate(d, null);
    else if (!wholeDay(v)) dropDraft(d.id);
  };

  const shortClose = async (payload) => {
    try {
      const next = await shortClosePo(poId, payload);
      setData(next);
      setShowShortClose(false);
      toast.success("Short-closed. The vendor is no longer expected to deliver that quantity.");
    } catch (err) {
      refreshIfStale(err);
      throw err; // the dialog shows why
    }
  };

  const reopen = async (remarks) => {
    try {
      const next = await reopenShortClose(poId, { deliveryLineIds: [reopening.lineId], remarks });
      setData(next);
      setReopening(null);
      toast.success("Reopened. The vendor is expected to deliver it again.");
    } catch (err) {
      refreshIfStale(err);
      throw err;
    }
  };

  const shortCloseBlocked = !can.shortClose
    ? "Short-close isn't available to you on this PO"
    : !anythingOpen
      ? "Nothing is open to close"
      : null;

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
              {can.receive && !data.receiptLegacy && !fullyDone && (
                <Link
                  href={`/dashboard/buyer/inventory/receive/${poId}`}
                  className={`${po.btn} ${po.btnPrimary} ${po.btnSm}`}
                >
                  <PackageCheck size={13} aria-hidden="true" /> Receive goods
                </Link>
              )}
              {!data.receiptLegacy && (
                <button
                  type="button"
                  className={`${po.btn} ${po.btnSecondary} ${po.btnSm}`}
                  disabled={!!shortCloseBlocked || !!editing}
                  title={shortCloseBlocked || undefined}
                  onClick={() => setShowShortClose(true)}
                >
                  <Ban size={13} aria-hidden="true" /> Short-close
                </button>
              )}
              {planEditable && !editing && (
                <button
                  type="button"
                  className={`${po.btn} ${po.btnSecondary} ${po.btnSm}`}
                  onClick={() => setEditing({})}
                >
                  Edit plan
                </button>
              )}
            </div>
          </div>

          <div className={s.sectionPad}>
            {data.receiptLegacy && (
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

            {data.planLocked && !data.receiptLegacy && (
              <div className={`${s.banner} ${s.bannerInfo}`}>
                <Lock size={14} aria-hidden="true" />
                <div className={s.bBody}>
                  <div className={s.bTitle}>Plan locked: quantities can&apos;t change</div>
                  <div className={s.bSub}>
                    {data.planLockedAt
                      ? `Goods were first received ${fmtDateTime(data.planLockedAt)}.`
                      : "Goods have been received against this plan."}
                    {can.editPlan && " You can still move the due date of a delivery that hasn't received anything."}
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
                <button
                  type="button"
                  className={`${po.btn} ${po.btnPrimary} ${po.btnSm}`}
                  onClick={() => setEditing({ initialAction: "split" })}
                >
                  Split by hotel
                </button>
              </div>
            )}

            {editing ? (
              <PlanEditor
                hotels={hotels}
                poLines={poLines}
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
                onDueDate={changeDueDate}
                onDueDateBlur={leaveDueDate}
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

        {/* Receipts */}
        <section className={po.sectionCard}>
          <div className={po.sectionHead}>
            <div className={po.hLeft}>
              <div className={po.ic}>
                <PackageCheck size={13} />
              </div>
              <h2>Receipts</h2>
            </div>
          </div>
          {grns.length + dispatches.length + rtvs.length === 0 ? (
            <div className={s.sectionPad}>
              <div className={s.muted}>Nothing has been dispatched or received yet.</div>
            </div>
          ) : (
            <div className={s.list}>
              {grns.map((g) => (
                <div key={`g${g.id}`} className={s.listRow}>
                  <div className={s.lMain}>
                    <div className={s.lTitle}>
                      <Link href={`/dashboard/buyer/inventory/grn/${g.id}`} className={s.docLink}>
                        {g.grnNumber || `Draft GRN #${g.id}`}
                      </Link>
                      {g.docType === "REVERSAL" && <span className={s.muted}> · Reversal</span>}
                    </div>
                    <div className={s.lSub}>
                      {[
                        g.hotelName,
                        g.receivedAt ? `Received ${fmtDateOnly(g.receivedAt)}` : null,
                        `${g.lineCount} item${Number(g.lineCount) === 1 ? "" : "s"}`,
                        g.postedByName ? `by ${g.postedByName}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className={s.lRight}>
                    <span className={s.num}>{inr(g.acceptedValue)}</span>
                    <span className={`${s.status} ${g.status === "posted" ? s.stReceived : s.stOpen}`}>{words(g.status)}</span>
                  </div>
                </div>
              ))}
              {dispatches.map((dn) => (
                <div key={`d${dn.id}`} className={s.listRow}>
                  <div className={s.lMain}>
                    <div className={s.lTitle}>Dispatch note {dn.dispatchNumber || `#${dn.id}`}</div>
                    <div className={s.lSub}>
                      {[
                        dn.phaseNo ? `${dn.hotelName || "To be allocated"} · Phase ${dn.phaseNo}` : dn.hotelName,
                        dn.challanNo ? `Challan ${dn.challanNo}` : null,
                        dn.expectedDeliveryDate ? `Expected ${fmtDateOnly(dn.expectedDeliveryDate)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className={s.lRight}>
                    <span className={`${s.status} ${s.stPartial}`}>{words(dn.status)}</span>
                  </div>
                </div>
              ))}
              {rtvs.map((r) => (
                <div key={`r${r.id}`} className={s.listRow}>
                  <div className={s.lMain}>
                    <div className={s.lTitle}>Return {r.rtvNumber || `#${r.id} (draft)`}</div>
                    <div className={s.lSub}>
                      {[
                        r.hotelName,
                        DISPOSITION[r.disposition] || words(r.disposition),
                        r.creditNoteRef ? `Credit note ${r.creditNoteRef}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className={s.lRight}>
                    <span className={`${s.status} ${r.status === "closed" ? s.stReceived : r.status === "cancelled" ? s.stClosed : s.stWarn}`}>
                      {words(r.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Short-close history */}
        {shortCloses.length > 0 && (
          <section className={po.sectionCard}>
            <div className={po.sectionHead}>
              <div className={po.hLeft}>
                <div className={po.ic}>
                  <Ban size={13} />
                </div>
                <h2>Short-close history</h2>
              </div>
            </div>
            <div className={s.list}>
              {shortCloses.map((r) => {
                const where = `${r.hotelName || "To be allocated"} · Phase ${r.phaseNo}`;
                const what = r.rtvId != null
                  ? `Credit on ${r.rtvNumber || `return #${r.rtvId}`}`
                  : `${r.action === "reopen" ? "Reopened" : "Closed"} · ${reasonLabel(r.reasonCode)}`;
                return (
                  <div key={r.id} className={s.listRow}>
                    <div className={s.lMain}>
                      <div className={s.lTitle}>
                        {r.productName || `Line ${r.poLineId}`} · {where}
                      </div>
                      <div className={s.lSub}>{what}</div>
                      {r.rtvId == null && r.remarks && <div className={s.lSub}>{r.remarks}</div>}
                      <div className={s.lSub}>
                        {[r.actedByName, r.actedAt ? fmtDateTime(r.actedAt) : null].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className={s.lRight}>
                      <span className={s.num}>
                        {fmtQty(r.qty)} {r.unit || ""}
                      </span>
                      <span className={`${s.status} ${r.action === "reopen" ? s.stPartial : s.stClosed}`}>
                        {r.action === "reopen" ? "Reopened" : r.rtvId != null ? "Credited" : "Closed"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Aside */}
      <div>
        <div className={po.asideStack}>
          {poLines.length > 0 && (
            <section className={po.sectionCard}>
              <div className={po.sectionHead}>
                <div className={po.hLeft}>
                  <div className={po.ic}>
                    <ListChecks size={13} />
                  </div>
                  <h2>Progress by item</h2>
                </div>
              </div>
              <div className={s.progress}>
                {poLines.map((l) => {
                  const ordered = toQ(l.orderedQty);
                  const kept = Math.max(0, toQ(l.acceptedQty) - toQ(l.returnedReplaceQty) - toQ(l.returnedCreditQty));
                  const closed = toQ(l.shortClosedQty);
                  const pct = (q) => (ordered > 0 ? `${Math.min(100, (q / ordered) * 100)}%` : "0%");
                  return (
                    <div key={l.id} className={s.pRow}>
                      <div className={s.pName}>{l.productName || `Line ${l.id}`}</div>
                      <div className={s.pBar} aria-hidden="true">
                        <span className={s.pAccepted} style={{ width: pct(kept) }} />
                        <span className={s.pClosed} style={{ width: pct(closed) }} />
                      </div>
                      <div className={s.pNums}>
                        <span>
                          {fmtQ(kept)} accepted · {fmtQty(l.openQty)} open
                        </span>
                        <span>
                          of {fmtQty(l.orderedQty)} {l.unit || ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <SiteRepPanel poId={poId} hotels={hotels} canManage={!!can.receive} canAdd={!fullyDone && !data.receiptLegacy} />
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
