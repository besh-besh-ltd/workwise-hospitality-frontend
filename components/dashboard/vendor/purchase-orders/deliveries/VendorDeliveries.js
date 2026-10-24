import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Building2, FileText, RotateCcw, Truck, Upload, X } from "lucide-react";
import { getVendorPoDeliveries, cancelDispatch } from "@/services/inventory";
import { getApiErrorMessage } from "@/utils/apiError";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import po, { inr, fmtDateOnly, escapeHtml, Sk } from "@/components/dashboard/buyer/purchase-orders/shared";
import vd from "./vendorDeliveries.module.scss";
import {
  toQ,
  fromQ,
  qtyText,
  deliveryLabel,
  lineHasActivity,
  isOpenDelivery,
  phaseNeedsGoods,
  REJECTION_LABELS,
  SHORT_CLOSE_LABELS,
  DELIVERY_STATUS,
  DISPATCH_STATUS,
  GRN_STATUS,
  RTV_DISPOSITION,
  RTV_STATUS,
  RECEIPT_STATUS,
} from "./deliveryFormat";

/**
 * The vendor's deliveries payload (GET /inventory/vendor/po/:poId/deliveries),
 * fetched while `enabled`. `reload` refetches after a dispatch or invoice.
 * A late reply to an older request never overwrites a newer one.
 */
export function useVendorDeliveries(poId, enabled) {
  const [state, setState] = useState({ data: null, loading: false, error: "" });
  const seq = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled || !poId) return;
    const mine = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await getVendorPoDeliveries(poId);
      if (mine === seq.current) setState({ data: data || null, loading: false, error: "" });
    } catch (err) {
      if (mine === seq.current) {
        const message = getApiErrorMessage(err, "Couldn't load the deliveries. Please try again.");
        setState((s) => ({ ...s, loading: false, error: message }));
      }
    }
  }, [poId, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}

const Pill = ({ spec, children }) => (
  <span className={`${po.pill} ${spec ? po[spec.tone] || "" : ""}`}>{children ?? spec?.label}</span>
);

const Qty = ({ value, label, className = "" }) => {
  const zero = toQ(value) === 0;
  return (
    <td className={`num ${zero ? vd.zero : ""} ${className}`.trim()} data-label={label}>
      {qtyText(value ?? 0)}
    </td>
  );
};

/**
 * The Deliveries section of the vendor's PO page (spec §5.2, task C4): the
 * buyer's delivery plan (read-only, no prices), the vendor's dispatch notes
 * with the invoices raised against each, and what the hotels did with the
 * goods: receipts with rejections and reasons, returns, short-closes.
 *
 * Presentational over the payload; the page owns the dispatch-note and
 * invoice dialogs (the hero buttons open them too), and is told through
 * onDispatch({hotelId, deliveryId}) / onInvoice(dispatchId). Withdrawing a
 * dispatch still on the road happens here, then onChanged().
 */
export default function VendorDeliveries({
  poId,
  data,
  loading = false,
  error = "",
  onRetry,
  canDispatch = false,
  canInvoice = false,
  onDispatch,
  onInvoice,
  onChanged,
}) {
  const [withdrawing, setWithdrawing] = useState(null);

  const confirmWithdraw = async () => {
    const target = withdrawing;
    if (!target) return;
    try {
      await cancelDispatch(poId, target.id);
      toast.success(`Dispatch ${target.dispatchNumber} withdrawn.`);
      setWithdrawing(null);
      if (typeof onChanged === "function") await onChanged();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't withdraw the dispatch. Please try again."));
    }
  };

  const receipt = data ? RECEIPT_STATUS[data.receiptStatus] : null;

  let body;
  if (!data && loading) {
    body = (
      <div className={vd.skeleton} aria-busy="true" aria-label="Loading deliveries">
        <Sk w={160} h={12} />
        <Sk h={64} r={10} />
        <Sk h={64} r={10} />
      </div>
    );
  } else if (!data) {
    body = (
      <div className={vd.errorBox} role="alert">
        <span>{error || "Couldn't load the deliveries."}</span>
        <button type="button" className={`${po.btn} ${po.btnSecondary} ${po.btnSm}`} onClick={() => onRetry?.()}>
          <RotateCcw size={12} />
          Try again
        </button>
      </div>
    );
  } else {
    body = (
      <>
        {error && (
          <div className={vd.errorBox} role="alert">
            <span>{error}</span>
            <button type="button" className={`${po.btn} ${po.btnSecondary} ${po.btnSm}`} onClick={() => onRetry?.()}>
              <RotateCcw size={12} />
              Try again
            </button>
          </div>
        )}
        <PlanBlock data={data} canDispatch={canDispatch} onDispatch={onDispatch} />
        <DispatchBlock
          data={data}
          canInvoice={canInvoice}
          onInvoice={onInvoice}
          onWithdraw={setWithdrawing}
        />
        <ReceiptsBlock grns={data.grns || []} />
        <ReturnsBlock rtvs={data.rtvs || []} />
        <ShortClosesBlock rows={data.shortCloses || []} />
        <OtherInvoicesBlock data={data} />
      </>
    );
  }

  return (
    <section className={po.sectionCard} aria-labelledby="vendor-deliveries-title">
      <div className={po.sectionHead}>
        <div className={po.hLeft}>
          <div className={po.ic}>
            <Truck size={13} />
          </div>
          <h2 id="vendor-deliveries-title">Deliveries</h2>
          {receipt && <Pill spec={receipt} />}
        </div>
      </div>
      <div className={vd.body}>{body}</div>

      <ConfirmationModal
        isOpen={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        onConfirm={confirmWithdraw}
        title="Withdraw this dispatch note?"
        /* description is rendered as HTML: escape the number. */
        description={`${escapeHtml(withdrawing?.dispatchNumber || "")} will be cancelled and the hotel will stop expecting it. Withdraw it only if the goods did not leave.`}
        confirmButtonColor="danger"
        confirmButtonText="Yes, withdraw it"
        cancelButtonText="Keep it"
      />
    </section>
  );
}

/* ───────────── Delivery plan ───────────── */

function PlanBlock({ data, canDispatch, onDispatch }) {
  const phases = (data.deliveries || [])
    .map((d) => ({ ...d, rows: (d.lines || []).filter(lineHasActivity) }))
    .filter((d) => d.rows.length > 0);

  return (
    <section className={vd.block} aria-labelledby="vd-plan">
      <div className={vd.blockHead}>
        <h3 id="vd-plan" className={vd.blockTitle}>Delivery plan</h3>
        <p className={vd.blockHint}>Set by the buyer. Quantities are in each item&apos;s order unit.</p>
      </div>
      {phases.length === 0 ? (
        <p className={vd.empty}>The buyer has not planned the deliveries yet.</p>
      ) : (
        phases.map((d) => {
          const label = deliveryLabel(d);
          const status = DELIVERY_STATUS[d.status];
          // A phase whose open goods are all on the road needs no new note.
          const needsGoods = phaseNeedsGoods(data, d);
          return (
            <div key={d.id} className={vd.phase}>
              <div className={vd.phaseHead}>
                <span className={vd.phaseTitle}>
                  <Building2 size={13} />
                  <span id={`vd-phase-${d.id}`}>{label}</span>
                </span>
                <span className={vd.phaseMeta}>
                  <span>{d.dueDate ? `Due ${fmtDateOnly(d.dueDate)}` : "No due date"}</span>
                  {status && <Pill spec={status} />}
                  {d.overdue && <span className={`${po.pill} ${po.pillWarn}`}>Overdue</span>}
                  {canDispatch && isOpenDelivery(d) && !needsGoods && (
                    <span className={`${po.pill} ${po.pillInfo}`}>On the road</span>
                  )}
                  {canDispatch && needsGoods && (
                    <button
                      type="button"
                      className={`${po.btn} ${po.btnSecondary} ${po.btnSm}`}
                      aria-label={`Dispatch ${label}`}
                      onClick={() => onDispatch?.({ hotelId: d.hotelId ?? null, deliveryId: d.id })}
                    >
                      <Truck size={12} />
                      Dispatch
                    </button>
                  )}
                </span>
              </div>
              {d.remarks && <p className={vd.remarks}>{d.remarks}</p>}
              <table className={vd.qtyTable} aria-labelledby={`vd-phase-${d.id}`}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Planned</th>
                    <th className="num">Accepted</th>
                    <th className="num">Rejected</th>
                    <th className="num">Returned</th>
                    <th className="num">Short-closed</th>
                    <th className="num">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((l) => (
                    <tr key={l.id ?? l.poLineId}>
                      <td>
                        <div className={vd.itName}>{l.productName || "Item"}</div>
                        {l.unit && <div className={vd.itUnit}>{l.unit}</div>}
                      </td>
                      <Qty value={l.plannedQty} label="Planned" />
                      <Qty value={l.acceptedQty} label="Accepted" />
                      <Qty value={l.rejectedQty} label="Rejected" />
                      <Qty value={fromQ(toQ(l.returnedReplaceQty) + toQ(l.returnedCreditQty))} label="Returned" />
                      <Qty value={l.shortClosedQty} label="Short-closed" />
                      <Qty value={l.openQty} label="Open" className={vd.openCell} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </section>
  );
}

/* ───────────── Dispatch notes, each with its invoices ───────────── */

// Stored invoice links are our own S3 objects; anything else is not linked.
const httpsOnly = (url) => (typeof url === "string" && /^https:\/\//i.test(url) ? url : null);

const InvoiceLine = ({ inv }) => {
  const href = httpsOnly(inv.documentUrl);
  return (
    <li className={vd.invoiceRow}>
      <FileText size={13} />
      <span className={vd.docNo}>{inv.invoiceNumber || "Invoice without a number"}</span>
      {inv.invoiceDate && <span className={vd.muted}>{fmtDateOnly(inv.invoiceDate)}</span>}
      {href && (
        <a className={vd.link} href={href} target="_blank" rel="noopener noreferrer">
          View
        </a>
      )}
      {inv.invoiceAmount != null && <span className={vd.invoiceAmt}>{inr(inv.invoiceAmount)}</span>}
    </li>
  );
};

function DispatchBlock({ data, canInvoice, onInvoice, onWithdraw }) {
  const dispatches = data.dispatches || [];
  const units = new Map((data.poLines || []).map((l) => [Number(l.id), l.unit]));
  const invoicesBy = new Map();
  for (const inv of data.invoices || []) {
    if (inv.dispatchId == null) continue;
    if (!invoicesBy.has(inv.dispatchId)) invoicesBy.set(inv.dispatchId, []);
    invoicesBy.get(inv.dispatchId).push(inv);
  }

  return (
    <section className={vd.block} aria-labelledby="vd-dispatches">
      <div className={vd.blockHead}>
        <h3 id="vd-dispatches" className={vd.blockTitle}>Dispatch notes</h3>
      </div>
      {dispatches.length === 0 ? (
        <p className={vd.empty}>No dispatch notes yet. Use Mark dispatched when goods leave, so the hotel knows what is coming.</p>
      ) : (
        <ul className={vd.list}>
          {dispatches.map((ds) => {
            const where = ds.hotelId == null && ds.deliveryId == null
              ? "Destination not named"
              : [ds.hotelName, ds.phaseNo != null ? `Phase ${ds.phaseNo}` : null].filter(Boolean).join(" · ");
            const invoices = invoicesBy.get(ds.id) || [];
            const live = ds.status !== "cancelled";
            return (
              <li key={ds.id} className={vd.card}>
                <div className={vd.cardHead}>
                  <span className={vd.docNo}>{ds.dispatchNumber}</span>
                  <Pill spec={DISPATCH_STATUS[ds.status]}>{DISPATCH_STATUS[ds.status]?.label || ds.status}</Pill>
                  <span className={vd.cardWhere}>{where}</span>
                  {(live && canInvoice) || ds.status === "in_transit" ? (
                    <span className={vd.cardActions}>
                      {live && canInvoice && (
                        <button
                          type="button"
                          className={`${po.btn} ${po.btnSecondary} ${po.btnSm}`}
                          onClick={() => onInvoice?.(ds.id)}
                        >
                          <Upload size={12} />
                          Upload invoice
                        </button>
                      )}
                      {ds.status === "in_transit" && (
                        <button
                          type="button"
                          className={`${po.btn} ${po.btnSecondary} ${po.btnDangerQuiet} ${po.btnSm}`}
                          onClick={() => onWithdraw(ds)}
                        >
                          <X size={12} />
                          Withdraw
                        </button>
                      )}
                    </span>
                  ) : null}
                </div>
                <dl className={vd.facts}>
                  <div>
                    <dt>Challan</dt>
                    <dd className={vd.factMono}>
                      {ds.challanNo || "—"}
                      {ds.challanDate ? ` · ${fmtDateOnly(ds.challanDate)}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Expected</dt>
                    <dd>{ds.expectedDeliveryDate ? fmtDateOnly(ds.expectedDeliveryDate) : "—"}</dd>
                  </div>
                  {ds.vehicleNo && (
                    <div>
                      <dt>Vehicle</dt>
                      <dd className={vd.factMono}>{ds.vehicleNo}</dd>
                    </div>
                  )}
                  {ds.transporter && (
                    <div>
                      <dt>Transporter</dt>
                      <dd>{ds.transporter}</dd>
                    </div>
                  )}
                  {ds.ewayBillNo && (
                    <div>
                      <dt>E-way bill</dt>
                      <dd className={vd.factMono}>{ds.ewayBillNo}</dd>
                    </div>
                  )}
                </dl>
                {(ds.lines || []).length > 0 && (
                  <ul className={vd.goods} aria-label={`Goods on ${ds.dispatchNumber}`}>
                    {ds.lines.map((l) => (
                      <li key={l.poLineId}>
                        <span>{l.productName || "Item"}</span>
                        <span className={vd.goodsQty}>
                          {qtyText(l.qty)}
                          {units.get(Number(l.poLineId)) ? ` ${units.get(Number(l.poLineId))}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {invoices.length > 0 && (
                  <ul className={vd.invoices} aria-label={`Invoices for ${ds.dispatchNumber}`}>
                    {invoices.map((inv) => (
                      <InvoiceLine key={inv.id} inv={inv} />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ───────────── What the hotels did with the goods ───────────── */

function ReceiptsBlock({ grns }) {
  if (!grns.length) return null;
  return (
    <section className={vd.block} aria-labelledby="vd-grns">
      <div className={vd.blockHead}>
        <h3 id="vd-grns" className={vd.blockTitle}>Received at the hotel</h3>
      </div>
      <ul className={vd.list}>
        {grns.map((g, i) => {
          const status = g.docType === "REVERSAL" ? { label: "Reversal", tone: "pillWarn" } : GRN_STATUS[g.status];
          return (
            <li key={`${g.grnNumber}-${i}`} className={vd.card}>
              <div className={vd.cardHead}>
                <span className={vd.docNo}>{g.grnNumber}</span>
                {status && <Pill spec={status} />}
                <span className={vd.cardWhere}>
                  {[g.hotelName, g.receivedAt ? fmtDateOnly(g.receivedAt) : null].filter(Boolean).join(" · ")}
                </span>
              </div>
              <table className={vd.qtyTable} aria-label={`Lines of ${g.grnNumber}`}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Accepted</th>
                    <th className="num">Rejected</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(g.lines || []).map((l, j) => (
                    <tr key={j}>
                      <td>
                        <div className={vd.itName}>{l.productName || "Item"}</div>
                      </td>
                      <Qty value={l.acceptedQty} label="Accepted" />
                      <Qty value={l.rejectedQty} label="Rejected" />
                      <td data-label="Reason">
                        {toQ(l.rejectedQty) > 0
                          ? REJECTION_LABELS[l.rejectionReason] || l.rejectionReason || "Not given"
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ReturnsBlock({ rtvs }) {
  if (!rtvs.length) return null;
  return (
    <section className={vd.block} aria-labelledby="vd-rtvs">
      <div className={vd.blockHead}>
        <h3 id="vd-rtvs" className={vd.blockTitle}>Returned to you</h3>
      </div>
      <ul className={vd.list}>
        {rtvs.map((r, i) => (
          <li key={`${r.rtvNumber}-${i}`} className={vd.card}>
            <div className={vd.cardHead}>
              <span className={vd.docNo}>{r.rtvNumber}</span>
              {RTV_STATUS[r.status] && <Pill spec={RTV_STATUS[r.status]} />}
              <span className={vd.cardWhere}>
                {[r.hotelName, RTV_DISPOSITION[r.disposition] || r.disposition].filter(Boolean).join(" · ")}
              </span>
            </div>
            {(r.challanNo || r.creditNoteRef) && (
              <dl className={vd.facts}>
                {r.challanNo && (
                  <div>
                    <dt>Challan</dt>
                    <dd className={vd.factMono}>{r.challanNo}</dd>
                  </div>
                )}
                {r.creditNoteRef && (
                  <div>
                    <dt>Credit note</dt>
                    <dd className={vd.factMono}>{r.creditNoteRef}</dd>
                  </div>
                )}
              </dl>
            )}
            <ul className={vd.goods}>
              {(r.lines || []).map((l, j) => (
                <li key={j}>
                  <span>
                    {l.productName || "Item"}
                    {l.reason && <span className={vd.goodsReason}> · {l.reason}</span>}
                  </span>
                  <span className={vd.goodsQty}>{qtyText(l.qty)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShortClosesBlock({ rows }) {
  if (!rows.length) return null;
  return (
    <section className={vd.block} aria-labelledby="vd-short">
      <div className={vd.blockHead}>
        <h3 id="vd-short" className={vd.blockTitle}>Short-closed</h3>
        <p className={vd.blockHint}>Quantities the buyer no longer expects from you.</p>
      </div>
      <div className={vd.phase}>
        <table className={vd.qtyTable} aria-label="Short-closed quantities">
          <thead>
            <tr>
              <th>Item</th>
              <th>Where</th>
              <th className="num">Qty</th>
              <th>Reason</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={i}>
                <td>
                  <div className={vd.itName}>{s.productName || "Item"}</div>
                </td>
                <td data-label="Where">
                  {[s.hotelName || "Not yet split by hotel", s.phaseNo != null ? `Phase ${s.phaseNo}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </td>
                <Qty value={s.qty} label="Qty" />
                <td data-label="Reason">
                  {s.action === "reopen" ? "Reopened" : SHORT_CLOSE_LABELS[s.reasonCode] || s.reasonCode || "—"}
                  {s.remarks && <div className={vd.goodsReason}>{s.remarks}</div>}
                </td>
                <td data-label="When">{s.actedAt ? fmtDateOnly(s.actedAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OtherInvoicesBlock({ data }) {
  const dispatchIds = new Set((data.dispatches || []).map((d) => d.id));
  const rows = (data.invoices || []).filter((inv) => inv.dispatchId == null || !dispatchIds.has(inv.dispatchId));
  if (!rows.length) return null;
  return (
    <section className={vd.block} aria-labelledby="vd-invoices">
      <div className={vd.blockHead}>
        <h3 id="vd-invoices" className={vd.blockTitle}>Other invoices</h3>
        <p className={vd.blockHint}>Raised on this purchase order without naming a dispatch.</p>
      </div>
      <ul className={`${vd.list} ${vd.card} ${vd.invoices}`}>
        {rows.map((inv) => (
          <InvoiceLine key={inv.id} inv={inv} />
        ))}
      </ul>
    </section>
  );
}
