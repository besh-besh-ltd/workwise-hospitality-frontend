import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import {
  ArrowLeft, ChevronLeft, ChevronRight, FilePen, PackageMinus, PackageX, Printer, RefreshCw, Save,
} from "lucide-react";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { getStockItem, getStockLedger, saveHotelItem } from "@/services/inventory";
import { fmtDay, fmtInstant, fmtQty, inr } from "@/components/inventory/receive/receiveUtils";
import {
  LEVEL_FIELDS, checkLevels, errorInfo, fmtSigned, levelsForm, movementDocHref, movementLabel, reasonLabel, stockRoutes, toId,
} from "./stockUtils";
import r from "@/components/inventory/receive/receive.module.scss";
import s from "./stock.module.scss";

// One item at one hotel (GET /stock/:hotelId/items/:invItemId): balance,
// levels (editable with inventory.update), batches, barcodes and the bin card
// (the ledger, 50 rows a page, filterable by IST day). An item the hotel has
// never held still opens (qty 0, no movements) so levels can be set up ahead
// of the first receipt.
//
// Props: hotelId, invItemId (route params).

const LEDGER_PAGE = 50;
const ItemCard = ({ hotelId: hotelParam, invItemId: itemParam }) => {
  const hotelId = toId(hotelParam);
  const invItemId = toId(itemParam);
  const hotelIds = useMemo(() => (hotelId ? [hotelId] : []), [hotelId]);
  const { canUpdate } = useModulePermissions({ moduleKey: "inventory", hotelIds, enabled: !!hotelId });

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(levelsForm(null));
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [ledger, setLedger] = useState({ rows: [], total: 0 });
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const ledgerSeq = useRef(0);

  const loadCard = useCallback(async ({ quiet = false } = {}) => {
    if (!hotelId || !invItemId) {
      setLoading(false);
      setLoadError("Item not found");
      return;
    }
    if (!quiet) setLoading(true);
    setLoadError(null);
    try {
      const res = await getStockItem(hotelId, invItemId);
      setCard(res);
      setForm(levelsForm(res?.levels));
      setFormErrors({});
    } catch (err) {
      const info = errorInfo(err, "Could not load this item.");
      setLoadError(info.httpStatus === 404 ? info.message || "Item not found" : info.message);
    } finally {
      setLoading(false);
    }
  }, [hotelId, invItemId]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  const loadLedger = useCallback(async () => {
    if (!hotelId || !invItemId) return;
    const seq = ++ledgerSeq.current;
    setLedgerLoading(true);
    setLedgerError(null);
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    params.page = ledgerPage;
    try {
      const res = await getStockLedger(hotelId, invItemId, params);
      if (seq !== ledgerSeq.current) return;
      setLedger({ rows: Array.isArray(res?.rows) ? res.rows : [], total: Number(res?.total) || 0 });
    } catch (err) {
      if (seq !== ledgerSeq.current) return;
      setLedgerError(errorInfo(err, "Could not load the bin card.").message);
    } finally {
      if (seq === ledgerSeq.current) setLedgerLoading(false);
    }
  }, [hotelId, invItemId, from, to, ledgerPage]);

  // The bin card loads once the item is known, and again when a filter or the
  // page changes (a quiet card refresh after saving levels doesn't refetch it).
  const cardItemId = card?.item?.id ?? null;
  useEffect(() => {
    if (cardItemId != null) loadLedger();
  }, [cardItemId, loadLedger]);

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaveError(null);
    const checked = checkLevels(form);
    if (checked.errors) {
      setFormErrors(checked.errors);
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      await saveHotelItem(hotelId, invItemId, checked.payload);
      toast.success("Levels saved");
      loadCard({ quiet: true });
    } catch (err) {
      const info = errorInfo(err, "Could not save the levels.");
      const field = info.details?.field;
      if (info.code === "VALIDATION" && field && Object.prototype.hasOwnProperty.call(form, field)) {
        setFormErrors({ [field]: info.message });
      } else {
        setSaveError(info.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading && !card) {
    return (
      <div className={r.page}>
        <main className={r.pageBody} aria-busy="true">
          <div className={r.stack}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={r.sk} style={{ width: `${80 - i * 15}%`, height: 22, marginBottom: 16 }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (loadError && !card) {
    return (
      <div className={r.page}>
        <main className={r.pageBody}>
          <div className={r.stateCard} role="alert">
            <div className={r.stateIc}><PackageX size={20} aria-hidden="true" /></div>
            <h1 className={r.stateTitle}>{loadError}</h1>
            <p className={r.stateSub}>It may have been removed, or it isn&apos;t at a hotel you can see.</p>
            <div className={r.stateActions}>
              <Link href={stockRoutes.stock({ hotelId })} className={`${r.btn} ${r.btnSecondary}`}>
                <ArrowLeft size={14} aria-hidden="true" /> Back to stock
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { item = {}, hotel = {}, balance = {}, levels = {}, barcodes = [], batches = [], recentMovements = [] } = card || {};
  const unit = item.stockUom || "";
  const notStocked =
    balance.lastMovementAt == null && Number(balance.qty || 0) === 0 && (recentMovements || []).length === 0;
  const pages = Math.max(1, Math.ceil(ledger.total / LEDGER_PAGE));
  const ledgerFiltered = !!(from || to);

  return (
    <div className={r.page}>
      <section className={r.pageHeader}>
        <div className={r.pageHeaderInner}>
          <div className={r.headMain}>
            <div className={r.eyebrow}>
              <Link href={stockRoutes.stock({ hotelId })} className={r.btnLink}>Stock</Link> · {hotel.name}
            </div>
            <h1 className={r.pageTitle}>{item.displayName}</h1>
            <div className={r.pageSub}>
              {item.itemCode && <span className={s.mono}>{item.itemCode}</span>}
              {item.itemCode && " · "}Counted in {unit || "—"}
              {item.trackExpiry && <> · Tracks expiry{item.minShelfLifeDays ? ` (min ${item.minShelfLifeDays} days shelf life)` : ""}</>}
              {item.isActive === false && <> · <span className={`${r.pill} ${r.pillNeutral}`}>Inactive</span></>}
            </div>
          </div>
          <div className={`${r.headerActions} ${r.headerActionsKeep}`}>
            <Link href={stockRoutes.labels({ hotelId, items: [invItemId] })} className={`${r.btn} ${r.btnSecondary}`}>
              <Printer size={14} aria-hidden="true" /> Print labels
            </Link>
            <Link href={stockRoutes.adjustments({ hotelId })} className={`${r.btn} ${r.btnSecondary}`}>
              <FilePen size={14} aria-hidden="true" /> Adjustment
            </Link>
            <Link href={stockRoutes.markOut({ hotelId })} className={`${r.btn} ${r.btnPrimary}`}>
              <PackageMinus size={14} aria-hidden="true" /> Mark out
            </Link>
          </div>
        </div>
      </section>

      <main className={r.pageBody}>
        <div className={r.stack}>
          {notStocked && (
            <div className={s.banner} role="status">
              <span className={s.bannerIc}><PackageX size={16} aria-hidden="true" /></span>
              <div className={s.bannerBody}>
                <h2 className={s.bannerTitle}>Not stocked at {hotel.name} yet</h2>
                <p className={s.bannerText}>
                  Nothing has been received, counted or imported for this item here. You can set its levels now, ahead of the first receipt.
                </p>
              </div>
            </div>
          )}

          <div className={s.tiles}>
            <div className={s.tile}>
              <div className={s.tileLabel}>On hand</div>
              <div className={s.tileValue}>{fmtQty(balance.qty)}<span className={s.unit}>{unit}</span></div>
              {levels.belowReorder && <div className={s.tileNote}><span className={`${r.pill} ${r.pillWarn}`}><span className={r.dot} />Below reorder</span></div>}
            </div>
            <div className={s.tile}>
              <div className={s.tileLabel}>Value</div>
              <div className={s.tileValue}>{inr(balance.value)}</div>
            </div>
            <div className={s.tile}>
              <div className={s.tileLabel}>Avg cost</div>
              <div className={s.tileValue}>{inr(balance.avgCost)}</div>
              <div className={s.tileNote}>per {unit || "unit"}</div>
            </div>
            <div className={s.tile}>
              <div className={s.tileLabel}>Last movement</div>
              <div className={s.tileValue} style={{ fontSize: 15 }}>{balance.lastMovementAt ? fmtInstant(balance.lastMovementAt) : "—"}</div>
            </div>
          </div>

          <div className={s.cardGrid}>
            <section className={r.card}>
              <div className={r.cardHead}>
                <h2 className={r.cardTitle}>Levels at this hotel</h2>
              </div>
              {canUpdate ? (
                <form className={r.cardBody} aria-label="Levels at this hotel" onSubmit={save} noValidate>
                  <div className={s.levelsGrid}>
                    {LEVEL_FIELDS.map((f) => (
                      <div key={f.key} className={s.fieldRow}>
                        <label className={r.label} htmlFor={`lvl-${f.key}`}>{f.label}</label>
                        <input
                          id={`lvl-${f.key}`}
                          className={`${r.input} ${formErrors[f.key] ? r.inputInvalid : ""}`}
                          type="text"
                          inputMode="decimal"
                          value={form[f.key]}
                          aria-invalid={formErrors[f.key] ? "true" : undefined}
                          aria-describedby={formErrors[f.key] ? `lvl-${f.key}-err` : undefined}
                          onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                        />
                        {formErrors[f.key] && <div id={`lvl-${f.key}-err`} className={s.fieldError}>{formErrors[f.key]}</div>}
                      </div>
                    ))}
                    <div className={s.fieldRow}>
                      <label className={r.label} htmlFor="lvl-binLabel">Bin</label>
                      <input
                        id="lvl-binLabel"
                        className={`${r.input} ${formErrors.binLabel ? r.inputInvalid : ""}`}
                        type="text"
                        value={form.binLabel}
                        placeholder="e.g. C-02"
                        aria-invalid={formErrors.binLabel ? "true" : undefined}
                        onChange={(e) => setForm((p) => ({ ...p, binLabel: e.target.value }))}
                      />
                      {formErrors.binLabel && <div className={s.fieldError}>{formErrors.binLabel}</div>}
                    </div>
                  </div>
                  <p className={r.meta} style={{ marginTop: 10 }}>In {unit || "stock units"}. Leave a level blank to clear it.</p>
                  {saveError && <div className={r.formError} role="alert">{saveError}</div>}
                  <div style={{ marginTop: 12 }}>
                    <button type="submit" className={`${r.btn} ${r.btnPrimary}`} disabled={saving}>
                      <Save size={14} aria-hidden="true" /> {saving ? "Saving…" : "Save levels"}
                    </button>
                  </div>
                </form>
              ) : (
                <dl className={r.cardBody} style={{ margin: 0 }}>
                  <div className={s.levelsGrid}>
                    {LEVEL_FIELDS.map((f) => (
                      <div key={f.key} className={s.fieldRow}>
                        <dt className={r.label}>{f.label}</dt>
                        <dd style={{ margin: 0 }}>{levels[f.key] != null ? `${fmtQty(levels[f.key])} ${unit}` : "—"}</dd>
                      </div>
                    ))}
                    <div className={s.fieldRow}>
                      <dt className={r.label}>Bin</dt>
                      <dd style={{ margin: 0 }} className={s.mono}>{levels.binLabel || "—"}</dd>
                    </div>
                  </div>
                </dl>
              )}
            </section>

            <section className={r.card}>
              <div className={r.cardHead}>
                <h2 className={r.cardTitle}>Barcodes</h2>
                <span className={r.count}>{barcodes.length}</span>
              </div>
              <div className={r.cardBody}>
                {barcodes.length === 0 ? (
                  <p className={r.meta} style={{ margin: 0 }}>
                    No barcode yet. Print labels to give this item one, or add the maker&apos;s code in Setup.
                  </p>
                ) : (
                  <ul className={s.chips} aria-label="Barcodes">
                    {barcodes.map((b) => (
                      <li key={b.id || b.code} className={s.codeChip}>
                        <span className={s.mono}>{b.code}</span>
                        {Number(b.packFactor) !== 1 && <span className={s.subtle}> · pack of {fmtQty(b.packFactor)} {unit}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {batches.length > 0 && (
            <section className={r.card}>
              <div className={r.cardHead}>
                <h2 className={r.cardTitle}>Batches</h2>
                <span className={r.count}>{batches.length}</span>
              </div>
              <div className={r.tableWrap}>
                <table className={r.listTable} aria-label="Batches">
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th className={r.num}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b, i) => (
                      <tr key={`${b.batchNo || ""}|${b.expiryDate || ""}|${i}`}>
                        <td className={s.mono}>{b.batchNo || <span className={r.faint}>No batch</span>}</td>
                        <td data-label="Expiry">{b.expiryDate ? fmtDay(b.expiryDate) : "—"}</td>
                        <td className={r.num} data-label="Qty">{fmtQty(b.qty)}<span className={s.unit}>{unit}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!notStocked && (
            <section className={r.card}>
              <div className={r.cardHead}>
                <h2 className={r.cardTitle}>Bin card</h2>
                <span className={r.count}>{ledger.total}</span>
              </div>
              <div className={`${r.filterBar} ${s.filterRow}`}>
                <div className={s.dateField}>
                  <label className={r.label} htmlFor="ledger-from">From</label>
                  <input
                    id="ledger-from"
                    className={r.input}
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setLedgerPage(1);
                    }}
                  />
                </div>
                <div className={s.dateField}>
                  <label className={r.label} htmlFor="ledger-to">To</label>
                  <input
                    id="ledger-to"
                    className={r.input}
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setLedgerPage(1);
                    }}
                  />
                </div>
                {ledgerFiltered && (
                  <button
                    type="button"
                    className={`${r.btn} ${r.btnGhost} ${r.btnSm}`}
                    style={{ alignSelf: "flex-end" }}
                    onClick={() => {
                      setFrom("");
                      setTo("");
                      setLedgerPage(1);
                    }}
                  >
                    Clear dates
                  </button>
                )}
              </div>
              {ledgerError ? (
                <div className={r.emptyState} role="alert">
                  <div className={r.emptyTitle}>{ledgerError}</div>
                  <button type="button" className={`${r.btn} ${r.btnSecondary}`} style={{ marginTop: 12 }} onClick={loadLedger}>
                    <RefreshCw size={14} aria-hidden="true" /> Try again
                  </button>
                </div>
              ) : ledgerLoading && ledger.rows.length === 0 ? (
                <div className={r.cardBody} aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={r.sk} style={{ width: `${90 - i * 12}%`, marginBottom: 14 }} />
                  ))}
                </div>
              ) : ledger.rows.length === 0 ? (
                <div className={r.emptyState}>
                  <div className={r.emptyTitle}>{ledgerFiltered ? "No movement in these dates" : "No movement yet"}</div>
                </div>
              ) : (
                <div className={r.tableWrap} aria-busy={ledgerLoading || undefined}>
                  <table className={r.listTable} aria-label="Bin card">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Movement</th>
                        <th>Document</th>
                        <th>Department / reason</th>
                        <th className={r.num}>Qty</th>
                        <th className={r.num}>Balance</th>
                        <th className={r.num}>Unit cost</th>
                        <th>By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.rows.map((m) => {
                        const href = movementDocHref(m);
                        const qty = Number(m.qty) || 0;
                        return (
                          <tr key={m.id}>
                            <td data-label="When" className={r.muted}>{fmtInstant(m.postedAt)}</td>
                            <td data-label="Movement">{movementLabel(m.type)}</td>
                            <td data-label="Document">
                              {m.docNumber ? (
                                href ? (
                                  <Link href={href} className={r.docLink}>{m.docNumber}</Link>
                                ) : (
                                  <span className={s.mono}>{m.docNumber}</span>
                                )
                              ) : (
                                <span className={r.faint}>—</span>
                              )}
                              {m.batchNo && <div className={s.subtle}>Batch <span className={s.mono}>{m.batchNo}</span>{m.expiryDate ? ` · exp ${fmtDay(m.expiryDate)}` : ""}</div>}
                            </td>
                            <td data-label="Department / reason">
                              {m.departmentName || (m.reasonCode ? reasonLabel(m.reasonCode) : <span className={r.faint}>—</span>)}
                            </td>
                            <td className={`${r.num} ${qty < 0 ? s.qtyOut : s.qtyIn}`} data-label="Qty">
                              {fmtSigned(qty, { plus: true })}
                            </td>
                            <td className={r.num} data-label="Balance">{fmtQty(m.qtyAfter)}</td>
                            <td className={r.num} data-label="Unit cost">{inr(m.unitCost)}</td>
                            <td data-label="By" className={r.muted}>{m.postedByName || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {ledger.total > LEDGER_PAGE && (
                <div className={r.pagination}>
                  <span>
                    Page <span className={s.mono}>{ledgerPage}</span> of <span className={s.mono}>{pages}</span>
                  </span>
                  <div className={r.pages}>
                    <button
                      type="button"
                      className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
                      onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                      disabled={ledgerPage <= 1 || ledgerLoading}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`${r.btn} ${r.btnSecondary} ${r.btnSm}`}
                      onClick={() => setLedgerPage((p) => Math.min(pages, p + 1))}
                      disabled={ledgerPage >= pages || ledgerLoading}
                      aria-label="Next page"
                    >
                      <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default ItemCard;
