import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  ArrowLeft, Camera, FileDown, FileText, Loader2, PackageOpen, Printer, RefreshCw, ScanBarcode, Tag, Truck,
  Undo2, Upload, X,
} from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import {
  deleteGrnAttachment, getGrn, getGrnPdf, getPoDeliveries, printGrnLabels, uploadGrnAttachment,
} from "@/services/inventory";
import ReverseGrnModal from "./ReverseGrnModal";
import RtvModal from "./RtvModal";
import { addQty, errorInfo, fmtDay, fmtInstant, fmtQty, fmtQtyUnit, inr, rejectionLabel, routes, subQty } from "./receiveUtils";
import { AttachKindSelect, AttachmentList, StatusPill } from "./receiveShared";
import styles from "./receive.module.scss";

// One goods receipt: header, lines with where each qty was booked (delivery
// phases), documents, the GRN PDF and labels, and — for a GRN approver at the
// GRN's hotel — Reverse and Return to vendor. The GRN payload carries no
// `can`, so the gates come from grn.approve / grn.update at grn.hotelId; the
// server re-checks every action.

const RTV_STATUS = {
  draft: { label: "Draft", tone: "pillNeutral" },
  dispatched: { label: "Dispatched", tone: "pillInfo" },
  closed: { label: "Closed", tone: "pillOk" },
  cancelled: { label: "Cancelled", tone: "pillNeutral" },
};
const LAYOUTS = [
  { value: "A4_65", label: "A4 sheet · 65 small labels" },
  { value: "A4_24", label: "A4 sheet · 24 labels" },
  { value: "THERMAL_50x25", label: "Thermal roll · 50 × 25 mm" },
];
const openDoc = (url) => {
  if (url) window.open(url, "_blank", "noopener");
};

const PrintLabelsModal = ({ show, grn, onHide }) => {
  const titleId = useId();
  const layoutId = useId();
  const [layout, setLayout] = useState("A4_65");
  const [mode, setMode] = useState("per_unit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(null);

  const print = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await printGrnLabels(grn.id, { layout, mode });
      setUrl(res?.url || null);
      openDoc(res?.url);
    } catch (err) {
      setError(errorInfo(err, "Could not make the labels.").message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={busy ? undefined : onHide} centered aria-labelledby={titleId}
      dialogClassName={styles.sheetDialog} contentClassName={styles.sheet}>
      <div className={styles.sheetHead}>
        <div>
          <h2 id={titleId} className={styles.sheetTitle}>Print labels</h2>
          <div className={styles.sheetSub}>QR labels for the goods on <span className={styles.mono}>{grn.grnNumber}</span></div>
        </div>
        <button type="button" className={styles.sheetClose} onClick={onHide} disabled={busy} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.sheetBody}>
        <label className={styles.label} htmlFor={layoutId}>Layout</label>
        <select id={layoutId} className={styles.select} value={layout} onChange={(e) => setLayout(e.target.value)}>
          {LAYOUTS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <div className={styles.choiceRow} role="radiogroup" aria-label="How many labels" style={{ marginTop: 14 }}>
          {[
            { value: "per_unit", label: "One label per unit", hint: "Every bottle, piece or kg in stock units" },
            { value: "per_pack", label: "One label per pack", hint: "One per box or bag as ordered" },
          ].map((m) => (
            <label key={m.value} className={`${styles.choice} ${mode === m.value ? styles.choiceOn : ""}`}>
              <input
                type="radio"
                name={`${titleId}-mode`}
                aria-label={m.label}
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
              />
              <span><strong>{m.label}</strong>{m.hint}</span>
            </label>
          ))}
        </div>
        {url && (
          <p className={styles.sheetNote} role="status">
            Labels ready.{" "}
            <a href={url} target="_blank" rel="noopener noreferrer">Open the labels PDF</a>
          </p>
        )}
        {error && <div className={styles.sheetError} role="alert">{error}</div>}
      </div>
      <div className={styles.sheetFoot}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onHide} disabled={busy}>
          {url ? "Done" : "Cancel"}
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={print} disabled={busy}>
          {busy ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : <Printer size={14} aria-hidden="true" />}
          Print
        </button>
      </div>
    </Modal>
  );
};

const GrnDetail = ({ id }) => {
  const [grn, setGrn] = useState(null);
  const [loadState, setLoadState] = useState({ status: "loading", message: null });
  const [rtvs, setRtvs] = useState([]);
  const [modal, setModal] = useState(null); // {type:'reverse'|'labels'|'rtv', rtv?, step?}
  const [pdfBusy, setPdfBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState("CHALLAN");
  const seqRef = useRef(0);

  const hotelIds = useMemo(() => (grn?.hotelId ? [Number(grn.hotelId)] : []), [grn?.hotelId]);
  const perms = useModulePermissions({ moduleKey: "grn", hotelIds, enabled: hotelIds.length > 0 });

  const loadRtvs = useCallback(async (poId, grnId) => {
    // Fail-soft: the delivery view is optional context on this page.
    try {
      const res = await getPoDeliveries(poId);
      const list = Array.isArray(res?.rtvs) ? res.rtvs : [];
      setRtvs(list.filter((r) => Number(r.grnId) === Number(grnId)));
    } catch {
      setRtvs([]);
    }
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    const seq = ++seqRef.current;
    if (!silent) setLoadState({ status: "loading", message: null });
    try {
      const g = await getGrn(id);
      if (seq !== seqRef.current) return;
      setGrn(g);
      setLoadState({ status: "ready", message: null });
      if (g?.poId && g.docType === "RECEIPT" && g.status !== "draft") loadRtvs(g.poId, g.id);
      else setRtvs([]);
    } catch (err) {
      if (seq !== seqRef.current) return;
      const info = errorInfo(err, "Could not load this goods receipt.");
      if (silent) {
        setActionError(info.message);
        return;
      }
      setLoadState({ status: info.httpStatus === 404 ? "notFound" : "error", message: info.message });
    }
  }, [id, loadRtvs]);

  useEffect(() => {
    if (id != null) load();
  }, [id, load]);

  const heldByOtherRtvs = useMemo(() => {
    const held = {};
    for (const r of rtvs) {
      if (r.status === "cancelled") continue;
      for (const l of r.lines || []) held[l.grnLineId] = addQty(held[l.grnLineId] || 0, l.qty || 0);
    }
    return held;
  }, [rtvs]);

  if (loadState.status === "loading" && !grn) {
    return (
      <div className={styles.page}>
        <section className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <div className={styles.headMain} style={{ width: "40%" }}>
              <span className={styles.sk} style={{ width: "60%", height: 22 }} />
            </div>
          </div>
        </section>
        <main className={styles.pageBody} aria-busy="true">
          <div className={styles.card}>
            <div className={styles.cardBody}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={styles.sk} style={{ width: `${90 - i * 15}%`, marginBottom: 14 }} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loadState.status === "notFound" || loadState.status === "error") {
    return (
      <div className={styles.page}>
        <main className={styles.pageBody}>
          <div className={styles.stateCard} role="alert">
            <div className={styles.stateIc}><PackageOpen size={20} aria-hidden="true" /></div>
            <h2 className={styles.stateTitle}>
              {loadState.status === "notFound" ? "Goods receipt not found" : "Couldn't load this goods receipt"}
            </h2>
            <p className={styles.stateSub}>
              {loadState.status === "notFound"
                ? "It may have been discarded, or it is at a hotel you don't have access to."
                : loadState.message}
            </p>
            <div className={styles.stateActions}>
              {loadState.status === "error" && (
                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => load()}>
                  <RefreshCw size={14} aria-hidden="true" /> Try again
                </button>
              )}
              <Link href={routes.grnRegister()} className={`${styles.btn} ${styles.btnSecondary}`}>GRN register</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isDraft = grn.status === "draft";
  const isReceipt = grn.docType !== "REVERSAL";
  const live = isReceipt && (grn.status === "posted" || grn.status === "partially_reversed");
  const canApprove = !perms.loading && perms.canApprove;
  const canUpdate = !perms.loading && perms.canUpdate;
  const anyReturnable = (grn.lines || []).some(
    (l) => subQty(subQty(l.acceptedQty, l.reversedQty || 0), heldByOtherRtvs[l.id] || 0) > 0
  );
  const anyReversible = (grn.lines || []).some((l) => subQty(l.acceptedQty, l.reversedQty || 0) > 0);
  const showPrices = (grn.lines || []).some((l) => l.unitCost != null);
  const title = isDraft || !grn.grnNumber ? `GRN draft #${grn.id}` : grn.grnNumber;

  const onPdf = async () => {
    setPdfBusy(true);
    setActionError(null);
    try {
      const res = await getGrnPdf(grn.id);
      openDoc(res?.url);
    } catch (err) {
      setActionError(errorInfo(err, "Could not make the PDF.").message);
    } finally {
      setPdfBusy(false);
    }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setActionError(null);
    try {
      const att = await uploadGrnAttachment(grn.id, file, kind);
      if (att) setGrn((g) => ({ ...g, attachments: [...(g.attachments || []), att] }));
    } catch (err) {
      setActionError(errorInfo(err, "Could not upload that file.").message);
    } finally {
      setUploading(false);
    }
  };

  const onDeleteAttachment = async (att) => {
    setActionError(null);
    try {
      await deleteGrnAttachment(grn.id, att.id);
      setGrn((g) => ({ ...g, attachments: (g.attachments || []).filter((a) => a.id !== att.id) }));
    } catch (err) {
      setActionError(errorInfo(err, "Could not remove that file.").message);
    }
  };

  const onReversed = (reversal) => {
    setModal(null);
    toast.success(reversal?.grnNumber ? `Reversed as ${reversal.grnNumber}` : "Receipt reversed");
    load({ silent: true });
  };

  const meta = [
    ["PO", grn.poId != null ? <Link href={routes.po(grn.poId)} className={styles.docLink}>{grn.poNumber || `#${grn.poId}`}</Link> : "—"],
    ["Vendor", grn.vendorName || "—"],
    ["Hotel", grn.hotelName || "—"],
    ["Received on", fmtDay(grn.receivedAt)],
    ["Received by", grn.receivedByName || (grn.receivedByTokenId ? "Site rep (receive link)" : "—")],
    ["Posted", grn.postedAt ? `${fmtInstant(grn.postedAt)}${grn.postedByName ? ` · ${grn.postedByName}` : ""}` : "—"],
    ["Challan", grn.vendorChallanNo ? `${grn.vendorChallanNo}${grn.vendorChallanDate ? ` · ${fmtDay(grn.vendorChallanDate)}` : ""}` : "—"],
    ["Invoice", grn.vendorInvoiceNo ? `${grn.vendorInvoiceNo}${grn.vendorInvoiceDate ? ` · ${fmtDay(grn.vendorInvoiceDate)}` : ""}` : "—"],
    ["E-way bill", grn.ewayBillNo || "—"],
    ["Vehicle", grn.vehicleNo || "—"],
  ];

  return (
    <div className={styles.page}>
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headMain}>
            <div className={styles.eyebrow}>
              <Link href={routes.grnRegister()}>
                <ArrowLeft size={12} aria-hidden="true" /> GRN register
              </Link>
            </div>
            <h1 className={styles.pageTitle}>
              <span className={isDraft ? undefined : styles.titleMono}>{title}</span>
              <StatusPill status={grn.status} />
              {!isReceipt && <span className={`${styles.pill} ${styles.pillIndigo}`}>Reversal</span>}
            </h1>
            <div className={styles.pageSub}>
              {grn.vendorName && <span>{grn.vendorName}</span>}
              {grn.vendorName && <span className={styles.subSep} aria-hidden="true">·</span>}
              <span>{grn.hotelName}</span>
              <span className={styles.subSep} aria-hidden="true">·</span>
              <span>Received {fmtDay(grn.receivedAt)}</span>
            </div>
          </div>
          <div className={`${styles.headerActions} ${styles.headerActionsKeep}`}>
            {isDraft ? (
              <Link
                href={routes.receive(grn.poId, { hotelId: grn.hotelId })}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                <ScanBarcode size={14} aria-hidden="true" /> Continue receiving
              </Link>
            ) : (
              <>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onPdf} disabled={pdfBusy}>
                  {pdfBusy ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : <FileDown size={14} aria-hidden="true" />}
                  PDF
                </button>
                {live && (
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setModal({ type: "labels" })}>
                    <Tag size={14} aria-hidden="true" />
                    Print labels
                  </button>
                )}
                {live && canApprove && anyReturnable && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => setModal({ type: "rtv", step: "create", rtv: null })}
                  >
                    <Truck size={14} aria-hidden="true" />
                    Return to vendor
                  </button>
                )}
                {live && canApprove && anyReversible && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDangerQuiet}`}
                    onClick={() => setModal({ type: "reverse" })}
                  >
                    <Undo2 size={14} aria-hidden="true" />
                    Reverse
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <main className={styles.pageBody}>
        {actionError && (
          <div className={styles.formError} role="alert" style={{ margin: "0 0 14px" }}>
            {actionError}
          </div>
        )}
        <div className={styles.bodyGrid}>
          <div className={styles.stack}>
            <section className={styles.card} aria-labelledby="grn-lines-title">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="grn-lines-title">
                  Lines <span className={styles.count}>{(grn.lines || []).length}</span>
                </h2>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.linesTable} aria-label="GRN lines">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item</th>
                      <th className={styles.num}>Received</th>
                      <th className={styles.num}>Accepted</th>
                      <th className={styles.num}>Rejected</th>
                      <th className={styles.num}>Into stock</th>
                      {showPrices && <th className={styles.num}>Unit cost</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(grn.lines || []).map((l, i) => (
                      <tr key={l.id}>
                        <td className={styles.itIdx}>{i + 1}</td>
                        <td>
                          <div className={styles.itName}>{l.productName}</div>
                          <div className={styles.itMeta}>
                            {l.batchNo && <span>{`Batch ${l.batchNo}`}</span>}
                            {l.expiryDate && <span>{`Expires ${fmtDay(l.expiryDate)}`}</span>}
                            {l.markOutDepartmentName && <span>{`Marked out to ${l.markOutDepartmentName}`}</span>}
                            {Number(l.reversedQty) > 0 && (
                              <span className={`${styles.pill} ${styles.pillWarn}`}>
                                {`${fmtQty(l.reversedQty)} reversed`}
                              </span>
                            )}
                            {heldByOtherRtvs[l.id] > 0 && (
                              <span className={`${styles.pill} ${styles.pillInfo}`}>
                                {`${fmtQty(heldByOtherRtvs[l.id])} on returns`}
                              </span>
                            )}
                          </div>
                          {(l.allocations || []).length > 0 && (
                            <div className={styles.allocList} aria-label="Booked to delivery phases">
                              {l.allocations.map((a) => (
                                <span key={`${a.deliveryId}-${a.phaseNo}`} className={styles.alloc}>
                                  <span>{`Phase ${a.phaseNo}`}</span>
                                  <span className={styles.mono}>{fmtQty(a.acceptedQty)}</span>
                                  {Number(a.rejectedQty) > 0 && (
                                    <span className={styles.muted}>{`+${fmtQty(a.rejectedQty)} rej.`}</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className={styles.num} data-label="Received">{fmtQtyUnit(l.receivedQty, l.poUom)}</td>
                        <td className={styles.num} data-label="Accepted">{fmtQtyUnit(l.acceptedQty, l.poUom)}</td>
                        <td className={styles.num} data-label="Rejected">
                          {fmtQtyUnit(l.rejectedQty, l.poUom)}
                          {Number(l.rejectedQty) > 0 && l.rejectionReason && (
                            <div className={styles.muted}>{rejectionLabel(l.rejectionReason)}</div>
                          )}
                        </td>
                        <td className={styles.num} data-label="Into stock">
                          {l.stockQty != null ? fmtQtyUnit(l.stockQty, l.stockUom) : "—"}
                        </td>
                        {showPrices && (
                          <td className={styles.num} data-label="Unit cost">
                            {l.unitCost != null ? `${inr(l.unitCost)}${l.stockUom ? ` / ${l.stockUom}` : ""}` : "—"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {grn.remarks && (
                <div className={styles.cardBody} style={{ borderTop: "1px solid #e8e8e3" }}>
                  <span className={styles.label}>Remarks</span>
                  <div style={{ whiteSpace: "pre-wrap" }}>{grn.remarks}</div>
                </div>
              )}
            </section>

            {isReceipt && !isDraft && (rtvs.length > 0) && (
              <section className={styles.card} aria-labelledby="grn-rtv-title">
                <div className={styles.cardHead}>
                  <h2 className={styles.cardTitle} id="grn-rtv-title">
                    Returns to vendor <span className={styles.count}>{rtvs.length}</span>
                  </h2>
                </div>
                {rtvs.map((r) => (
                  <div key={r.id} className={styles.rtvRow}>
                    <div style={{ minWidth: 0 }}>
                      <div className={styles.flags}>
                        <span className={styles.docNo}>{r.rtvNumber || `Draft return #${r.id}`}</span>
                        <StatusPill status={r.status} map={RTV_STATUS} />
                        <span className={`${styles.pill} ${styles.pillNeutral}`}>
                          {r.disposition === "CREDIT" ? "Credit note" : "Replacement"}
                        </span>
                      </div>
                      <div className={styles.muted} style={{ marginTop: 4 }}>
                        {(r.lines || [])
                          .map((l) => `${l.productName} ${fmtQty(l.qty)}${l.reason ? ` (${rejectionLabel(l.reason)})` : ""}`)
                          .join(" · ")}
                      </div>
                      {(r.challanNo || r.creditNoteRef) && (
                        <div className={styles.muted}>
                          {[r.challanNo && `Challan ${r.challanNo}`, r.creditNoteRef && `Credit note ${r.creditNoteRef}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                    {canApprove && (r.status === "draft" || r.status === "dispatched") && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                        onClick={() => setModal({ type: "rtv", step: r.status === "draft" ? "dispatch" : "close", rtv: r })}
                      >
                        {r.status === "draft" ? "Dispatch" : "Close"}
                      </button>
                    )}
                  </div>
                ))}
              </section>
            )}
          </div>

          <aside className={styles.stack}>
            <section className={styles.card} aria-labelledby="grn-meta-title">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="grn-meta-title">
                  <span className={styles.cardIc}><FileText size={14} aria-hidden="true" /></span>
                  Details
                </h2>
              </div>
              <div className={styles.cardBody}>
                <dl className={styles.meta}>
                  {meta.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            {(grn.reverses || (grn.reversals || []).length > 0) && (
              <section className={styles.card} aria-labelledby="grn-rev-title">
                <div className={styles.cardHead}>
                  <h2 className={styles.cardTitle} id="grn-rev-title">
                    <span className={styles.cardIc}><Undo2 size={14} aria-hidden="true" /></span>
                    {grn.reverses ? "Reverses" : "Reversals"}
                  </h2>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.linkList}>
                    {grn.reverses && (
                      <Link href={routes.grn(grn.reverses.id)} className={styles.docLink}>
                        {grn.reverses.grnNumber || `#${grn.reverses.id}`}
                      </Link>
                    )}
                    {(grn.reversals || []).map((r) => (
                      <Link key={r.id} href={routes.grn(r.id)} className={styles.docLink}>
                        {r.grnNumber || `#${r.id}`}
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section className={styles.card} aria-labelledby="grn-att-title">
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle} id="grn-att-title">
                  <span className={styles.cardIc}><Camera size={14} aria-hidden="true" /></span>
                  Documents <span className={styles.count}>{(grn.attachments || []).length}</span>
                </h2>
              </div>
              <div className={styles.cardBody}>
                <AttachmentList
                  attachments={grn.attachments || []}
                  onDelete={isDraft && canUpdate ? onDeleteAttachment : undefined}
                  empty={<p className={styles.fieldHint} style={{ margin: 0 }}>No challan or invoice attached yet.</p>}
                />
                {canUpdate && grn.status !== "reversed" && (
                  <div className={styles.attActions}>
                    <AttachKindSelect value={kind} onChange={setKind} />
                    <label className={`${styles.btn} ${styles.btnSecondary} ${styles.fileBtn}`}>
                      {uploading ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
                      <span>Add file</span>
                      <input type="file" accept="image/*,application/pdf" onChange={onUpload} disabled={uploading} />
                    </label>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>

      {modal?.type === "labels" && <PrintLabelsModal show grn={grn} onHide={() => setModal(null)} />}
      {modal?.type === "reverse" && (
        <ReverseGrnModal show grn={grn} onHide={() => setModal(null)} onReversed={onReversed} />
      )}
      {modal?.type === "rtv" && (
        <RtvModal
          show
          grn={grn}
          rtv={modal.rtv}
          step={modal.step}
          heldByOtherRtvs={modal.step === "create" ? heldByOtherRtvs : {}}
          onHide={() => setModal(null)}
          onChanged={() => load({ silent: true })}
        />
      )}
    </div>
  );
};

export default GrnDetail;
