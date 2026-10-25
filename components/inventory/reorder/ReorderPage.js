import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { ClipboardList, ExternalLink, FileText, Info, RefreshCw, Send, ShoppingCart, TriangleAlert } from "lucide-react";
import { createReorderMrDraft, getReorder } from "@/services/inventory";
import { addProductsToDraft } from "@/services/rfq";
import { submit as submitMr } from "@/services/mr";
import { getApiErrorData, getApiErrorMessage } from "@/utils/apiError";
import { newClientEventId } from "@/components/inventory/receive/receiveUtils";
import styles from "./Reorder.module.scss";

// Reorder worklist (spec §9): items at or below their reorder level at one
// hotel, with what is already on order and a suggested quantity. Selected rows
// go to a draft material requisition (contracted items, against the ARC line
// for the chosen department) or to an RFQ draft (any item with a product).
// The hotel list, departments and contract lines all come from GET /reorder,
// which scopes them to the caller; the page only chooses among them. The MR
// controls show only when the server says the caller may raise one here
// (`can.createMrDraft`); a missing flag hides them. An MR draft carries a
// clientEventId, kept while the request stays the same, so a double click or
// a retry after a lost answer returns the same draft.

const QTY_RE = /^\d+(\.\d{1,4})?$/;
const parseQty = (text) => {
  const s = String(text ?? "").trim();
  if (!QTY_RE.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
};
const fmtQty = (n) =>
  n == null || Number.isNaN(Number(n)) ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 4 });
const fmtRate = (n) =>
  n == null || Number.isNaN(Number(n))
    ? null
    : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const qtyText = (n) => (n == null ? "" : String(Number(n)));

const lineFor = (row, departmentId) =>
  (row.contractedLines || []).find((l) => Number(l.departmentId) === Number(departmentId)) || null;

/** The department whose contracts cover the most rows (ties: the server's order). */
const bestDepartment = (departments, rows) => {
  let best = departments[0]?.id ?? "";
  let bestCount = -1;
  for (const d of departments) {
    const n = rows.filter((r) => lineFor(r, d.id)).length;
    if (n > bestCount) {
      best = d.id;
      bestCount = n;
    }
  }
  return best;
};

const ReorderPage = () => {
  const router = useRouter();
  const hotelSelectId = useId();
  const deptSelectId = useId();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState({}); // invItemId -> bool
  const [qtys, setQtys] = useState({}); // invItemId -> text
  const [departmentId, setDepartmentId] = useState("");
  const [busy, setBusy] = useState(null); // "mr" | "rfq" | "submit" | null
  const [actionError, setActionError] = useState(null);
  const [created, setCreated] = useState(null); // {mrId, mrNumber, count, skipped, submitted, warnings}
  const reqRef = useRef(0);
  const mrKeyRef = useRef({ sig: null, key: null });
  const routerRef = useRef(router);
  routerRef.current = router;

  const queryHotel = router.isReady ? router.query.hotelId : undefined;

  const load = useCallback(async (hotelId) => {
    const req = ++reqRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      let res;
      try {
        res = await getReorder(hotelId || undefined);
      } catch (err) {
        // A hotel in the link the caller can't see (or one that no longer
        // exists): show their default hotel instead, and drop it from the URL.
        const gone = hotelId && (getApiErrorData(err)?.code === "NOT_FOUND" || err?.response?.status === 404);
        if (!gone) throw err;
        if (req !== reqRef.current) return;
        res = await getReorder(undefined);
        if (req !== reqRef.current) return;
        const r = routerRef.current;
        const rest = { ...r.query };
        delete rest.hotelId;
        r.replace({ pathname: r.pathname, query: rest }, undefined, { shallow: true });
      }
      if (req !== reqRef.current) return;
      const rows = res?.rows || [];
      setData(res || null);
      setSelected(Object.fromEntries(rows.map((r) => [r.invItemId, Number(r.suggestedQty) > 0])));
      setQtys(Object.fromEntries(rows.map((r) => [r.invItemId, Number(r.suggestedQty) > 0 ? qtyText(r.suggestedQty) : ""])));
      setDepartmentId(bestDepartment(res?.departments || [], rows));
      setActionError(null);
    } catch (err) {
      if (req !== reqRef.current) return;
      setData(null);
      setLoadError(getApiErrorMessage(err, "Could not load the reorder list."));
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    load(queryHotel);
  }, [router.isReady, queryHotel, load]);

  const rows = useMemo(() => data?.rows || [], [data]);
  const hotels = data?.hotels || [];
  const departments = data?.departments || [];
  const canCreateMr = data?.can?.createMrDraft === true;
  const hotelId = data?.hotelId ?? null;
  const hotelName = hotels.find((h) => h.id === hotelId)?.name || "";
  const nameOf = useMemo(() => new Map(rows.map((r) => [r.invItemId, r.displayName])), [rows]);

  const chosen = rows.filter((r) => selected[r.invItemId]);
  const badQty = chosen.filter((r) => parseQty(qtys[r.invItemId]) == null);
  const mrRows = chosen.filter((r) => lineFor(r, departmentId));
  const notContracted = chosen.filter((r) => !lineFor(r, departmentId));
  const rfqRows = chosen.filter((r) => r.productVariantId != null);
  const allChecked = rows.length > 0 && chosen.length === rows.length;

  const changeHotel = (id) => {
    setCreated(null);
    router.replace({ pathname: router.pathname, query: { ...router.query, hotelId: id } }, undefined, { shallow: true });
  };

  const toggle = (id) => setSelected((cur) => ({ ...cur, [id]: !cur[id] }));
  const toggleAll = () => setSelected(Object.fromEntries(rows.map((r) => [r.invItemId, !allChecked])));

  const createMr = async () => {
    if (busy || !mrRows.length || badQty.some((r) => lineFor(r, departmentId))) return;
    setBusy("mr");
    setActionError(null);
    setCreated(null);
    const request = {
      hotelId,
      departmentId: Number(departmentId),
      items: mrRows.map((r) => ({
        invItemId: r.invItemId,
        qty: parseQty(qtys[r.invItemId]),
        arcContractLineId: lineFor(r, departmentId).arcContractLineId,
      })),
    };
    // Same request, same key: the server answers a repeat with the draft it made.
    const sig = JSON.stringify(request);
    if (mrKeyRef.current.sig !== sig) mrKeyRef.current = { sig, key: newClientEventId() };
    try {
      const res = await createReorderMrDraft({ ...request, clientEventId: mrKeyRef.current.key });
      setCreated({
        mrId: res?.mrId,
        mrNumber: res?.mrNumber || `#${res?.mrId}`,
        count: res?.items?.length ?? mrRows.length,
        skipped: notContracted.length,
        submitted: false,
        warnings: 0,
      });
      setSelected((cur) => {
        const next = { ...cur };
        for (const r of mrRows) next[r.invItemId] = false;
        return next;
      });
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Could not create the requisition."));
    } finally {
      setBusy(null);
    }
  };

  const submitCreated = async () => {
    if (busy || !created?.mrId) return;
    setBusy("submit");
    setActionError(null);
    try {
      const res = await submitMr(created.mrId);
      const warnings = res?.data?.warnings || res?.warnings || [];
      setCreated((c) => ({ ...c, submitted: true, warnings: warnings.length }));
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Could not submit the requisition. Open it to check the details."));
    } finally {
      setBusy(null);
    }
  };

  const copyToRfq = async () => {
    if (busy || !rfqRows.length || !hotelId) return;
    setBusy("rfq");
    setActionError(null);
    try {
      const response = await addProductsToDraft({
        is_tender: 0,
        hotel_ids: [hotelId],
        variants: rfqRows.map((r) => ({ variant_id: r.productVariantId })),
      });
      const result = response?.data || response;
      const rfqId = result?.rfq_id;
      if (!rfqId) throw new Error("The RFQ draft was not created. Please try again.");
      toast.success(`${rfqRows.length} ${rfqRows.length === 1 ? "item" : "items"} copied to an RFQ draft. Add the quantities there.`);
      router.push(`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${rfqId}`);
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Could not copy the items to an RFQ."));
      setBusy(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const header = (
    <section className={styles.pageHeader}>
      <div className={styles.headInner}>
        <div>
          <h1 className={styles.title}>Reorder</h1>
          <p className={styles.sub}>
            Items at or below their reorder level{hotelName ? ` at ${hotelName}` : ""}, with what is already on order.
          </p>
        </div>
        <div className={styles.headControls}>
          {hotels.length > 1 && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor={hotelSelectId}>Hotel</label>
              <select
                id={hotelSelectId}
                className={styles.select}
                value={hotelId == null ? "" : String(hotelId)}
                disabled={loading || !!busy}
                onChange={(e) => changeHotel(Number(e.target.value))}
              >
                {hotels.map((h) => (
                  <option key={h.id} value={String(h.id)}>{h.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => load(hotelId || queryHotel)}
            disabled={loading || !!busy}
          >
            <RefreshCw size={13} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>
    </section>
  );

  if (loading && !data) {
    return (
      <div className={styles.page}>
        {header}
        <main className={styles.pageBody}>
          <div className={styles.card} aria-busy="true">
            <p className={styles.muted}>Loading the reorder list…</p>
          </div>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        {header}
        <main className={styles.pageBody}>
          <div className={`${styles.card} ${styles.empty}`} role="alert">
            <TriangleAlert size={16} aria-hidden="true" />
            <p>{loadError}</p>
            <button type="button" className={styles.btn} onClick={() => load(queryHotel)}>Try again</button>
          </div>
        </main>
      </div>
    );
  }

  if (!hotels.length) {
    return (
      <div className={styles.page}>
        {header}
        <main className={styles.pageBody}>
          <div className={`${styles.card} ${styles.empty}`}>
            <p>You don&apos;t have stock access at any hotel yet.</p>
          </div>
        </main>
      </div>
    );
  }

  const groupOpen = data?.groupOrdersOpen || [];

  return (
    <div className={styles.page}>
      {header}
      <main className={styles.pageBody}>
        {!data?.stockStartedAt && (
          <div className={`${styles.notice} ${styles.noticeWarn}`} role="note">
            <Info size={13} aria-hidden="true" />
            <span>
              Stock has not started at this hotel yet, so on-hand figures may be incomplete. They are reliable after
              the first full count is approved.
            </span>
          </div>
        )}
        {groupOpen.length > 0 && (
          <div className={styles.notice} role="note">
            <Info size={13} aria-hidden="true" />
            <span>
              Group orders not yet split by hotel also cover{" "}
              {groupOpen
                .map((g) => `${nameOf.get(g.invItemId) || `item ${g.invItemId}`} (${fmtQty(g.openQty)})`)
                .join(", ")}
              . They are not counted as on order here until the delivery plan assigns them to this hotel.
            </span>
          </div>
        )}

        {created && (
          <div className={`${styles.notice} ${styles.noticeOk}`} role="status">
            <ClipboardList size={13} aria-hidden="true" />
            <span className={styles.grow}>
              {created.submitted ? (
                <>
                  <span className={styles.mono}>{created.mrNumber}</span> submitted for approval
                  {created.warnings > 0
                    ? `: ${created.warnings} ${created.warnings === 1 ? "item is" : "items are"} over this hotel's share, head office will be told.`
                    : "."}
                </>
              ) : (
                <>
                  Draft requisition <span className={styles.mono}>{created.mrNumber}</span> created with {created.count}{" "}
                  {created.count === 1 ? "item" : "items"}.
                  {created.skipped > 0 &&
                    ` ${created.skipped} selected ${created.skipped === 1 ? "item has" : "items have"} no contract for this department: copy ${created.skipped === 1 ? "it" : "them"} to an RFQ.`}
                </>
              )}
            </span>
            <span className={styles.noticeActions}>
              {!created.submitted && (
                <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={submitCreated} disabled={!!busy}>
                  <Send size={13} aria-hidden="true" /> {busy === "submit" ? "Submitting…" : "Submit for approval"}
                </button>
              )}
              <Link className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`} href={`/dashboard/buyer/material-requisitions/${created.mrId}`}>
                <ExternalLink size={13} aria-hidden="true" /> Open MR
              </Link>
            </span>
          </div>
        )}

        {actionError && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            <TriangleAlert size={13} aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}

        <section className={styles.card}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              {rows.length > 0 && (
                <label className={styles.selectAll}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} disabled={!!busy} />
                  <span>Select all</span>
                </label>
              )}
              <span className={styles.count}>
                <span className={styles.mono}>{rows.length}</span> {rows.length === 1 ? "item" : "items"} to reorder
                {chosen.length > 0 && (
                  <>
                    {" · "}
                    <span className={styles.mono}>{chosen.length}</span> selected
                  </>
                )}
              </span>
            </div>
            <div className={styles.toolbarRight}>
              {!canCreateMr ? null : departments.length > 0 ? (
                <div className={styles.fieldInline}>
                  <label className={styles.label} htmlFor={deptSelectId}>Department (MR)</label>
                  <select
                    id={deptSelectId}
                    className={styles.select}
                    value={departmentId === "" ? "" : String(departmentId)}
                    disabled={!!busy}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={String(d.id)}>{d.title}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className={styles.muted}>No department here you can raise a requisition for.</span>
              )}
              {canCreateMr && departments.length > 0 && (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={createMr}
                  disabled={!!busy || !mrRows.length || mrRows.some((r) => parseQty(qtys[r.invItemId]) == null)}
                  title={!mrRows.length ? "Select contracted items for this department" : undefined}
                >
                  <ClipboardList size={13} aria-hidden="true" />
                  {busy === "mr" ? "Creating…" : `Create MR draft (${mrRows.length})`}
                </button>
              )}
              <button
                type="button"
                className={styles.btn}
                onClick={copyToRfq}
                disabled={!!busy || !rfqRows.length}
                title={!rfqRows.length ? "Select items to copy" : undefined}
              >
                <FileText size={13} aria-hidden="true" />
                {busy === "rfq" ? "Copying…" : `Copy to RFQ (${rfqRows.length})`}
              </button>
            </div>
          </div>

          {canCreateMr && departments.length > 0 && notContracted.length > 0 && mrRows.length > 0 && (
            <p className={styles.toolbarNote}>
              {notContracted.length} selected {notContracted.length === 1 ? "item has" : "items have"} no contract for this
              department and will stay off the requisition.
            </p>
          )}

          {rows.length === 0 ? (
            <div className={styles.empty}>
              <ShoppingCart size={16} aria-hidden="true" />
              <p>Nothing is at or below its reorder level at this hotel.</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.colCheck}>
                      <span className={styles.srOnly}>Selected</span>
                    </th>
                    <th>Item</th>
                    <th className={styles.num}>On hand</th>
                    <th className={styles.num}>Reorder at</th>
                    <th className={styles.num}>Max</th>
                    <th className={styles.num}>On order</th>
                    <th className={styles.num}>Suggested</th>
                    <th className={styles.num}>Order qty</th>
                    <th>Contract</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const line = lineFor(r, departmentId);
                    const text = qtys[r.invItemId] ?? "";
                    const invalid = selected[r.invItemId] && parseQty(text) == null;
                    return (
                      <tr key={r.invItemId} className={selected[r.invItemId] ? styles.rowOn : undefined}>
                        <td className={styles.colCheck} data-label="">
                          <label className={styles.checkHit}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${r.displayName}`}
                              checked={!!selected[r.invItemId]}
                              onChange={() => toggle(r.invItemId)}
                              disabled={!!busy}
                            />
                          </label>
                        </td>
                        <td data-label="Item">
                          <div className={styles.itemName}>{r.displayName}</div>
                          <div className={styles.itemMeta}>
                            {r.itemCode && <span className={styles.mono}>{r.itemCode}</span>}
                            {r.binLabel && <span>Bin {r.binLabel}</span>}
                            <span>{r.stockUom}</span>
                          </div>
                        </td>
                        <td className={styles.num} data-label="On hand">{fmtQty(r.qty)}</td>
                        <td className={styles.num} data-label="Reorder at">{fmtQty(r.reorderLevel)}</td>
                        <td className={styles.num} data-label="Max">{fmtQty(r.maxQty)}</td>
                        <td className={styles.num} data-label="On order">
                          <span>
                            {fmtQty(r.onOrder)}
                            {r.onOrderIncomplete && (
                              <span
                                className={styles.flag}
                                title="Some open orders use a unit with no conversion to the stock unit, so they are not counted."
                              >
                                <span aria-hidden="true">{" "}+?</span>
                                <span className={styles.srOnly}>
                                  {" "}plus open orders in a unit with no conversion to the stock unit, not counted
                                </span>
                              </span>
                            )}
                            {Number(r.openMrQty) > 0 && (
                              <span className={styles.cellNote}>{fmtQty(r.openMrQty)} in open MRs</span>
                            )}
                          </span>
                        </td>
                        <td className={styles.num} data-label="Suggested">
                          {r.suggestedQty == null ? (
                            <span className={styles.muted} title="Set a max level to get a suggestion">
                              <span aria-hidden="true">—</span>
                              <span className={styles.srOnly}>No suggestion: set a max level to get one</span>
                            </span>
                          ) : (
                            fmtQty(r.suggestedQty)
                          )}
                        </td>
                        <td className={styles.num} data-label="Order qty">
                          <input
                            className={`${styles.qtyInput} ${invalid ? styles.qtyBad : ""}`}
                            inputMode="decimal"
                            aria-label={`Order qty for ${r.displayName}`}
                            aria-invalid={invalid || undefined}
                            value={text}
                            disabled={!!busy}
                            onChange={(e) => setQtys((cur) => ({ ...cur, [r.invItemId]: e.target.value }))}
                          />
                        </td>
                        <td data-label="Contract">
                          {line ? (
                            <span className={styles.contract}>
                              <span className={`${styles.dot} ${styles.dotOk}`} aria-hidden="true" />
                              <span>
                                {line.arcNumber || "ARC"}
                                {line.vendorName ? ` · ${line.vendorName}` : ""}
                                {fmtRate(line.unitRate) ? (
                                  <span className={styles.mono}> · {fmtRate(line.unitRate)}{line.uom ? `/${line.uom}` : ""}</span>
                                ) : null}
                              </span>
                            </span>
                          ) : r.contracted ? (
                            <span className={styles.muted}>Contract in another department</span>
                          ) : (
                            <span className={styles.muted}>No contract: RFQ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {badQty.length > 0 && (
            <p className={styles.toolbarNote}>Enter an order qty above 0 for every selected item.</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default ReorderPage;
