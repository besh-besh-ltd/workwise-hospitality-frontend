import React, { useId, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { approveCount, cancelCount } from "@/services/inventory";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import MobileActionBar, { MobileActionButton } from "@/components/shared/mobile/MobileActionBar";
import { getApiErrorMessage } from "@/utils/apiError";
import { byBinThenName, errorInfo, escapeHtml, fmtDateTime, fmtQty, fmtSignedMoney, fmtSignedQty, plural } from "./countUtils";
import styles from "./counts.module.scss";

// The variance review of a submitted (or finished) count.
//
// Counted lines are listed by the size of their difference in value, largest
// first, with the qty and value of each difference. An approver gives every
// non-zero line a reason, then approves: the server posts the differences to
// stock (COUNT_IN / COUNT_OUT). A gain on an item that has no cost anywhere
// yet comes back VALIDATION {field:'unitCosts'}; those lines then ask for a
// unit cost and the approval is sent again with `unitCosts`.
//
// Figures the server withholds (a blind count, viewer without approve) are
// null: their columns are not rendered at all, never shown as 0.
//
// Props: { count, onCountChange(nextCount), onReload() }

const COMMON_REASONS = [
  "Breakage",
  "Wastage",
  "Expired",
  "Theft or loss",
  "Miscount at receipt",
  "Issued without a mark-out",
  "Found in another bin",
  "Wrong unit at receipt",
];
const COST_RE = /^(\d+(\.\d{0,4})?|\.\d{1,4})$/;
const MAX_UNIT_COST = 1e9;
// A unit cost the server accepts: above 0, at most 1e9, up to 4 decimals.
const parseCost = (text) => {
  const s = String(text ?? "").trim();
  if (!COST_RE.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n <= MAX_UNIT_COST ? n : null;
};
const lineIds = (list) => (Array.isArray(list) ? list.map((x) => Number(x?.lineId)).filter(Number.isFinite) : []);
const abs = (n) => (n == null ? 0 : Math.abs(Number(n)) || 0);
const isSet = (n) => n !== null && n !== undefined;

const CountReview = ({ count, onCountChange, onReload }) => {
  const listId = useId();
  const decide = count?.status === "submitted" && count?.can?.approve === true;
  const lines = useMemo(() => count?.lines || [], [count]);

  const countedLines = lines.filter((l) => isSet(l.countedQty));
  const notCounted = lines.filter((l) => !isSet(l.countedQty));
  const hasSystem = countedLines.some((l) => isSet(l.systemQtyAtCount));
  const hasVariance = countedLines.some((l) => isSet(l.varianceQty));
  const hasValue = countedLines.some((l) => isSet(l.varianceValue));

  const sorted = useMemo(() => {
    const rows = (count?.lines || []).filter((l) => isSet(l.countedQty));
    if (!rows.some((l) => isSet(l.varianceQty) || isSet(l.varianceValue))) return rows;
    return [...rows].sort(
      (a, b) => abs(b.varianceValue) - abs(a.varianceValue) || abs(b.varianceQty) - abs(a.varianceQty) || byBinThenName(a, b)
    );
  }, [count]);

  const needsReason = (l) => isSet(l.varianceQty) && Number(l.varianceQty) !== 0;

  const [reasons, setReasons] = useState(() => Object.fromEntries(lines.map((l) => [l.id, l.reason || ""])));
  const [flagged, setFlagged] = useState(() => new Set()); // lines the server says still need a reason
  const [askedCost, setAskedCost] = useState(() => new Set()); // lines an approve refusal said need a unit cost
  const [costs, setCosts] = useState({});
  const [confirm, setConfirm] = useState(null); // 'approve' | 'cancel'
  const [busy, setBusy] = useState(false);

  // Lines that need a unit cost: the server's hint on each line (computed without a lock, so
  // the approve refusal can still add more). Only a viewer who can approve is ever asked.
  const costLines = useMemo(() => {
    if (!decide) return new Set();
    const ids = lines.filter((l) => l.needsUnitCost === true).map((l) => Number(l.id));
    return new Set([...ids, ...askedCost]);
  }, [decide, lines, askedCost]);

  const missingReasons = decide ? sorted.filter((l) => needsReason(l) && !String(reasons[l.id] ?? "").trim()) : [];
  const missingCosts = decide ? [...costLines].filter((id) => parseCost(costs[id]) === null) : [];
  const ready = decide && !missingReasons.length && !missingCosts.length && !busy;
  const showReasonCol = decide || sorted.some((l) => l.reason);
  const differences = sorted.filter(needsReason);

  const setReason = (id, text) => {
    setReasons((r) => ({ ...r, [id]: text }));
    if (flagged.has(id)) {
      const next = new Set(flagged);
      next.delete(id);
      setFlagged(next);
    }
  };

  const doApprove = async () => {
    const payload = {};
    for (const l of sorted) if (needsReason(l)) payload[l.id] = String(reasons[l.id] ?? "").trim();
    const unitCosts = costLines.size ? Object.fromEntries([...costLines].map((id) => [id, parseCost(costs[id])])) : null;
    setBusy(true);
    try {
      const next = unitCosts ? await approveCount(count.id, payload, unitCosts) : await approveCount(count.id, payload);
      setConfirm(null);
      toast.success("Count approved; the differences are posted to stock");
      onCountChange?.(next);
    } catch (err) {
      setConfirm(null);
      const { code, details } = errorInfo(err);
      const message = getApiErrorMessage(err, "Could not approve the count");
      // One refusal names every line still missing a reason and every line still missing a
      // unit cost; highlight both in one pass. (`field` + `lines` is the older single-list shape.)
      const named = lineIds(details.lines);
      const needReason = Array.isArray(details.reasons) ? lineIds(details.reasons) : details.field === "reasons" ? named : [];
      const needCost = Array.isArray(details.unitCosts) ? lineIds(details.unitCosts) : details.field === "unitCosts" ? named : [];
      if (code === "VALIDATION" && (needReason.length || needCost.length)) {
        setFlagged(new Set(needReason));
        if (needCost.length) setAskedCost((prev) => new Set([...prev, ...needCost]));
        toast.error(message);
      } else {
        toast.error(message);
        if (code === "CONFLICT" || code === "NOT_FOUND") onReload?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    try {
      const next = await cancelCount(count.id);
      setConfirm(null);
      toast.success("Count cancelled");
      onCountChange?.(next);
    } catch (err) {
      setConfirm(null);
      toast.error(getApiErrorMessage(err, "Could not cancel the count"));
      const { code } = errorInfo(err);
      if (code === "CONFLICT" || code === "NOT_FOUND") onReload?.();
    }
  };

  const net = count?.summary?.varianceValue;
  const approveText =
    `${escapeHtml(plural(differences.length, "line"))} with a difference will be posted to stock` +
    (isSet(net) ? ` (net ${escapeHtml(fmtSignedMoney(net))}).` : ".") +
    " This cannot be undone; a later correction needs an adjustment.";

  const blockers = [
    missingReasons.length ? `${plural(missingReasons.length, "reason")} needed` : null,
    missingCosts.length ? `${plural(missingCosts.length, "unit cost")} needed` : null,
  ].filter(Boolean);

  return (
    <div className={styles.review}>
      {count?.status === "submitted" && !decide && (
        <div className={`${styles.notice} ${styles.noticeWarn}`}>
          <span>Submitted. Waiting for an approver to review the differences.</span>
        </div>
      )}
      {count?.status === "approved" && (
        <div className={`${styles.notice} ${styles.noticeSuccess}`}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>
            {[
              "Approved",
              count.approvedByName ? `by ${count.approvedByName}` : null,
              count.approvedAt ? `on ${fmtDateTime(count.approvedAt)}` : null,
            ]
              .filter(Boolean)
              .join(" ")}
            . The differences are posted to stock.
          </span>
        </div>
      )}
      {count?.status === "cancelled" && (
        <div className={`${styles.notice} ${styles.noticeNeutral}`}>
          <span>This count was cancelled. Nothing was posted to stock.</span>
        </div>
      )}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Counted</span>
          <span className={styles.statValue}>{`${countedLines.length} of ${lines.length}`}</span>
        </div>
        {isSet(count?.summary?.varianceLines) && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Lines with a difference</span>
            <span className={styles.statValue}>{String(count.summary.varianceLines)}</span>
          </div>
        )}
        {isSet(net) && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Net difference</span>
            <span className={`${styles.statValue} ${Number(net) < 0 ? styles.neg : Number(net) > 0 ? styles.pos : ""}`}>
              {fmtSignedMoney(net)}
            </span>
          </div>
        )}
        {decide && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Reasons needed</span>
            <span className={`${styles.statValue} ${missingReasons.length ? styles.warnText : ""}`}>
              {String(missingReasons.length)}
            </span>
          </div>
        )}
      </div>

      <section className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Counted items">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" className={styles.right}>Counted</th>
                {hasSystem && <th scope="col" className={styles.right}>System</th>}
                {hasVariance && <th scope="col" className={styles.right}>Variance</th>}
                {hasValue && <th scope="col" className={styles.right}>Value</th>}
                {showReasonCol && <th scope="col">Reason</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((l) => {
                const diff = needsReason(l);
                const isFlagged = flagged.has(Number(l.id));
                const wantsCost = decide && costLines.has(Number(l.id));
                const costId = `${listId}-cost-${l.id}`;
                const costBad = wantsCost && costs[l.id] !== undefined && costs[l.id] !== "" && parseCost(costs[l.id]) === null;
                const tone = !isSet(l.varianceQty) ? "" : Number(l.varianceQty) < 0 ? styles.neg : Number(l.varianceQty) > 0 ? styles.pos : styles.muted;
                return (
                  <tr key={l.id} className={isFlagged || wantsCost ? styles.rowFlagged : ""}>
                    <td data-label="Item">
                      <div className={styles.itemName} data-item-name="">{l.displayName}</div>
                      <div className={styles.itemMeta}>
                        {[l.itemCode, l.binLabel ? `Bin ${l.binLabel}` : null].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td data-label="Counted" className={styles.right}>
                      <span className={styles.num}>{fmtQty(l.countedQty)}</span>
                      <span className={styles.uom}>{l.stockUom}</span>
                    </td>
                    {hasSystem && (
                      <td data-label="System" className={styles.right}>
                        {isSet(l.systemQtyAtCount) && <span className={styles.num}>{fmtQty(l.systemQtyAtCount)}</span>}
                      </td>
                    )}
                    {hasVariance && (
                      <td data-label="Variance" className={styles.right}>
                        {isSet(l.varianceQty) && <span className={`${styles.num} ${tone}`}>{fmtSignedQty(l.varianceQty)}</span>}
                      </td>
                    )}
                    {hasValue && (
                      <td data-label="Value" className={styles.right}>
                        {isSet(l.varianceValue) && <span className={`${styles.num} ${tone}`}>{fmtSignedMoney(l.varianceValue)}</span>}
                      </td>
                    )}
                    {showReasonCol && (
                      <td data-label="Reason" className={styles.reasonCell}>
                        {decide && diff ? (
                          <>
                            <input
                              className={`${styles.textInput} ${isFlagged ? styles.inputInvalid : ""}`}
                              type="text"
                              list={listId}
                              maxLength={1000}
                              aria-label={`Reason for ${l.displayName}`}
                              aria-invalid={isFlagged ? true : undefined}
                              placeholder="Why is it different?"
                              value={reasons[l.id] ?? ""}
                              onChange={(e) => setReason(Number(l.id), e.target.value)}
                            />
                            {isFlagged && <span className={styles.fieldError}>Reason needed</span>}
                          </>
                        ) : l.reason ? (
                          <span>{l.reason}</span>
                        ) : decide ? (
                          <span className={styles.faint}>No difference</span>
                        ) : null}
                        {wantsCost && (
                          <div className={styles.costField}>
                            <label htmlFor={costId} className={styles.costLabel}>{`Unit cost (₹ per ${l.stockUom})`}</label>
                            <input
                              id={costId}
                              className={`${styles.textInput} ${styles.costInput} ${costBad ? styles.inputInvalid : ""}`}
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              aria-invalid={costBad ? true : undefined}
                              placeholder="0.00"
                              value={costs[l.id] ?? ""}
                              onChange={(e) => setCosts((c) => ({ ...c, [l.id]: e.target.value }))}
                            />
                            <span className={styles.faint}>No cost on record yet: this values the gain.</span>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {!sorted.length && (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>Nothing was counted.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <datalist id={listId}>
          {COMMON_REASONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>

        {notCounted.length > 0 && (
          <div className={styles.notCounted}>
            <h3 className={styles.subHead}>{`${plural(notCounted.length, "item")} not counted — left out of the posting`}</h3>
            <ul className={styles.plainList}>
              {[...notCounted].sort(byBinThenName).map((l) => (
                <li key={l.id}>
                  <span>{l.displayName}</span>
                  {l.binLabel && <span className={styles.faint}>{`Bin ${l.binLabel}`}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {decide && (
        <div className={styles.actionRow}>
          {blockers.length > 0 && (
            <span className={styles.blockers}>
              <CircleAlert size={14} aria-hidden="true" />
              {blockers.join(" · ")}
            </span>
          )}
          <button type="button" className={`${styles.btn} ${styles.btnGhostDanger}`} onClick={() => setConfirm("cancel")} disabled={busy}>
            Cancel count
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setConfirm("approve")} disabled={!ready}>
            {busy ? <Loader2 size={15} className={styles.spin} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
            Approve and post
          </button>
        </div>
      )}

      {decide && (
        <MobileActionBar
          label="Count approval"
          summary={<span>{blockers.length ? blockers.join(" · ") : `${plural(differences.length, "difference")} to post`}</span>}
        >
          <MobileActionButton variant="approve" onClick={() => setConfirm("approve")} disabled={!ready}>
            Approve and post
          </MobileActionButton>
        </MobileActionBar>
      )}

      <ConfirmationModal
        isOpen={confirm === "approve"}
        onClose={() => setConfirm(null)}
        onConfirm={doApprove}
        title="Approve this count?"
        description={approveText}
        confirmButtonColor="success"
        confirmButtonText="Post differences"
        cancelButtonText="Not yet"
      />
      <ConfirmationModal
        isOpen={confirm === "cancel"}
        onClose={() => setConfirm(null)}
        onConfirm={doCancel}
        title="Cancel this count?"
        description="Nothing is posted to stock. The counted figures stay on the cancelled count for reference."
        confirmButtonColor="danger"
        confirmButtonText="Yes, cancel it"
        cancelButtonText="Keep it"
      />
    </div>
  );
};

export default CountReview;
