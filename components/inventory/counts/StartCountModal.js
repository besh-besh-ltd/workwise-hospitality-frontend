import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { CloseButton, Modal } from "react-bootstrap";
import { CircleAlert, EyeOff, Info, Loader2, Lock, Search } from "lucide-react";
import { getCompanySettings, getStock, startCount } from "@/services/inventory";
import { getApiErrorMessage } from "@/utils/apiError";
import { countPath, errorInfo, plural } from "./countUtils";
import styles from "./counts.module.scss";

// Start a count at a hotel: FULL (every item stocked or levelled there) or
// SELECTED (a spot check of picked items, at most 2000). A CONFLICT means an
// item is already in an open or submitted count at that hotel: link to it.
//
// Props: { show, onHide, hotels:[{id, name}], defaultHotelId?, onStarted(count) }

export const MAX_SELECTED = 2000;
const SEARCH_DELAY_MS = 250;

const StartCountModal = ({ show, onHide, hotels = [], defaultHotelId, onStarted }) => {
  const uid = useId();
  const [hotelId, setHotelId] = useState("");
  const [scope, setScope] = useState("FULL");
  const [isBlind, setIsBlind] = useState(true);
  const [countFreeze, setCountFreeze] = useState(false);
  const [stockInfo, setStockInfo] = useState(null); // {stockStartedAt, total} for the hotel
  const [search, setSearch] = useState("");
  const [belowReorder, setBelowReorder] = useState(false);
  const [found, setFound] = useState({ rows: [], total: 0, loading: false, error: null });
  const [selected, setSelected] = useState(() => new Map());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [clash, setClash] = useState(null);
  const seq = useRef(0);

  // A fresh form each time it opens.
  useEffect(() => {
    if (!show) return;
    const only = hotels.length === 1 ? hotels[0].id : "";
    setHotelId(defaultHotelId ? String(defaultHotelId) : only ? String(only) : "");
    setScope("FULL");
    setIsBlind(true);
    setSearch("");
    setBelowReorder(false);
    setSelected(new Map());
    setError(null);
    setClash(null);
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count freeze is a company setting; best effort (the server enforces it).
  useEffect(() => {
    if (!show) return undefined;
    let alive = true;
    getCompanySettings()
      .then((s) => alive && setCountFreeze(s?.countFreeze === true))
      .catch(() => alive && setCountFreeze(false));
    return () => {
      alive = false;
    };
  }, [show]);

  // The hotel's stock list: whether stock has started, and the item picker.
  useEffect(() => {
    if (!show || !hotelId) {
      setStockInfo(null);
      setFound({ rows: [], total: 0, loading: false, error: null });
      return undefined;
    }
    const n = ++seq.current;
    const picking = scope === "SELECTED";
    const params = { hotelId: Number(hotelId) };
    if (picking && search.trim()) params.search = search.trim();
    if (picking && belowReorder) params.belowReorder = true;
    setFound((f) => ({ ...f, loading: true, error: null }));
    const timer = setTimeout(
      async () => {
        try {
          const res = await getStock(params);
          if (n !== seq.current) return;
          setFound({ rows: res?.rows || [], total: Number(res?.total) || 0, loading: false, error: null });
          if (!params.search && !params.belowReorder) {
            setStockInfo({ stockStartedAt: res?.stockStartedAt ?? null, total: Number(res?.total) || 0 });
          }
        } catch (err) {
          if (n !== seq.current) return;
          setFound({ rows: [], total: 0, loading: false, error: getApiErrorMessage(err, "Could not load the stock list") });
        }
      },
      search ? SEARCH_DELAY_MS : 0
    );
    return () => clearTimeout(timer);
  }, [show, hotelId, scope, search, belowReorder]);

  const changeHotel = (value) => {
    setHotelId(value);
    setSelected(new Map());
    setStockInfo(null);
    setClash(null);
    setError(null);
  };

  const toggle = (row) => {
    setSelected((cur) => {
      const next = new Map(cur);
      if (next.has(row.invItemId)) next.delete(row.invItemId);
      else next.set(row.invItemId, row.displayName);
      return next;
    });
    setClash(null);
  };

  const selectShown = () => {
    setSelected((cur) => {
      const next = new Map(cur);
      for (const r of found.rows) if (next.size < MAX_SELECTED) next.set(r.invItemId, r.displayName);
      return next;
    });
    setClash(null);
  };

  const dropClashing = () => {
    if (!clash?.invItemIds?.length) return;
    setSelected((cur) => {
      const next = new Map(cur);
      for (const id of clash.invItemIds) next.delete(Number(id));
      return next;
    });
    setClash(null);
  };

  const tooMany = selected.size > MAX_SELECTED;
  const canStart =
    !!hotelId && !saving && (scope === "FULL" || (selected.size > 0 && !tooMany));

  const start = async () => {
    if (!canStart) return;
    setSaving(true);
    setError(null);
    setClash(null);
    const payload = { hotelId: Number(hotelId), scope, isBlind };
    if (scope === "SELECTED") payload.invItemIds = [...selected.keys()];
    try {
      const count = await startCount(payload);
      onStarted?.(count);
    } catch (err) {
      const { code, details } = errorInfo(err);
      if (code === "CONFLICT" && details.countId != null) {
        setClash({ countId: details.countId, countNumber: details.countNumber, invItemIds: details.invItemIds || [] });
      } else {
        setError(getApiErrorMessage(err, "Could not start the count"));
      }
    } finally {
      setSaving(false);
    }
  };

  const hide = () => {
    if (!saving) onHide?.();
  };
  const hotelName = hotels.find((h) => String(h.id) === String(hotelId))?.name;

  return (
    <Modal
      show={show}
      onHide={hide}
      backdrop={saving ? "static" : true}
      keyboard={!saving}
      centered
      size="lg"
      dialogClassName={styles.sheetDialog}
      contentClassName={styles.sheet}
    >
      <Modal.Header>
        <Modal.Title as="h2" className={styles.sheetTitle}>
          Start a count
        </Modal.Title>
        <CloseButton aria-label="Close" onClick={hide} disabled={saving} />
      </Modal.Header>
      <Modal.Body className={styles.sheetBody}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-hotel`}>
            Hotel
          </label>
          <select
            id={`${uid}-hotel`}
            className={styles.select}
            value={hotelId}
            onChange={(e) => changeHotel(e.target.value)}
            disabled={saving}
          >
            <option value="">Choose a hotel</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className={styles.choices}>
          <legend className={styles.label}>What to count</legend>
          <label className={`${styles.choice} ${scope === "FULL" ? styles.choiceOn : ""}`}>
            <input type="radio" name={`${uid}-scope`} value="FULL" checked={scope === "FULL"} onChange={() => setScope("FULL")} />
            <span className={styles.choiceText}>
              <span className={styles.choiceTitle}>Full count</span>
              <span className={styles.choiceMeta}>
                Every item stocked or with levels at this hotel
                {stockInfo && stockInfo.total ? ` (about ${plural(stockInfo.total, "item")})` : ""}.
              </span>
            </span>
          </label>
          <label className={`${styles.choice} ${scope === "SELECTED" ? styles.choiceOn : ""}`}>
            <input
              type="radio"
              name={`${uid}-scope`}
              value="SELECTED"
              checked={scope === "SELECTED"}
              onChange={() => setScope("SELECTED")}
            />
            <span className={styles.choiceText}>
              <span className={styles.choiceTitle}>Selected items</span>
              <span className={styles.choiceMeta}>A spot check of the items you pick.</span>
            </span>
          </label>
        </fieldset>

        <label className={`${styles.choice} ${isBlind ? styles.choiceOn : ""}`}>
          <input type="checkbox" checked={isBlind} onChange={(e) => setIsBlind(e.target.checked)} />
          <span className={styles.choiceText}>
            <span className={styles.choiceTitle}>
              <EyeOff size={14} aria-hidden="true" /> Blind count
            </span>
            <span className={styles.choiceMeta}>Counters don&apos;t see system quantities, so they count what is really there.</span>
          </span>
        </label>

        {scope === "SELECTED" && hotelId && (
          <div className={styles.picker}>
            <div className={styles.pickerBar}>
              <label className={styles.searchField}>
                <Search size={15} aria-hidden="true" className={styles.searchIcon} />
                <span className={styles.srOnly}>Search items</span>
                <input
                  className={styles.searchInput}
                  type="search"
                  placeholder="Search items by name or code"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label className={styles.checkInline}>
                <input type="checkbox" checked={belowReorder} onChange={(e) => setBelowReorder(e.target.checked)} />
                Below reorder level
              </label>
            </div>
            <div className={styles.pickerHead}>
              <span>
                {`${selected.size} selected`}
                {tooMany ? ` (at most ${MAX_SELECTED})` : ""}
              </span>
              <span className={styles.pickerActions}>
                <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={selectShown} disabled={!found.rows.length}>
                  Select all shown
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={() => setSelected(new Map())} disabled={!selected.size}>
                  Clear
                </button>
              </span>
            </div>
            {found.loading ? (
              <p className={styles.pickerNote}>
                <Loader2 size={14} className={styles.spin} aria-hidden="true" /> Loading items…
              </p>
            ) : found.error ? (
              <p className={styles.errorText}>{found.error}</p>
            ) : found.rows.length ? (
              <>
                <ul className={styles.pickList}>
                  {found.rows.map((r) => (
                    <li key={r.invItemId}>
                      <label className={`${styles.pickRow} ${selected.has(r.invItemId) ? styles.pickRowOn : ""}`}>
                        <input type="checkbox" checked={selected.has(r.invItemId)} onChange={() => toggle(r)} />
                        <span className={styles.pickName}>{r.displayName}</span>
                        {r.itemCode && <span className={styles.mono}>{r.itemCode}</span>}
                        {r.binLabel && <span className={styles.faint}>{`Bin ${r.binLabel}`}</span>}
                        {r.belowReorder && <span className={`${styles.tag} ${styles.tagWarn}`}>Low</span>}
                      </label>
                    </li>
                  ))}
                </ul>
                {found.total > found.rows.length && (
                  <p className={styles.pickerNote}>{`Showing ${found.rows.length} of ${found.total}. Search to narrow the list.`}</p>
                )}
              </>
            ) : (
              <p className={styles.pickerNote}>No item at this hotel matches.</p>
            )}
          </div>
        )}

        {hotelId && stockInfo && !stockInfo.stockStartedAt && scope === "FULL" && (
          <div className={`${styles.notice} ${styles.noticeInfo}`}>
            <Info size={16} aria-hidden="true" />
            <span>Stock has not started at this hotel yet. Approving its first full count starts it.</span>
          </div>
        )}
        {hotelId && countFreeze && (
          <div className={`${styles.notice} ${styles.noticeWarn}`}>
            <Lock size={16} aria-hidden="true" />
            <span>
              {`Count freeze is on: while this count is open, mark-out, returns and adjustments at ${hotelName || "this hotel"} are blocked. Submit or cancel the count to release them.`}
            </span>
          </div>
        )}

        {clash && (
          <div className={`${styles.notice} ${styles.noticeDanger}`} role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            <span>
              Some of these items are already being counted in{" "}
              <Link href={countPath(clash.countId)} className={styles.inlineLink}>
                {clash.countNumber || `count #${clash.countId}`}
              </Link>
              . Finish or cancel that count first
              {scope === "SELECTED" && clash.invItemIds.length ? ", or leave those items out." : "."}
            </span>
            {scope === "SELECTED" && clash.invItemIds.length > 0 && (
              <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={dropClashing}>
                Leave them out
              </button>
            )}
          </div>
        )}
        {error && (
          <p className={styles.errorText} role="alert">
            {error}
          </p>
        )}
      </Modal.Body>
      <Modal.Footer className={styles.sheetFooter}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={hide} disabled={saving}>
          Cancel
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={start} disabled={!canStart}>
          {saving && <Loader2 size={15} className={styles.spin} aria-hidden="true" />}
          {scope === "SELECTED" && selected.size ? `Start count of ${plural(selected.size, "item")}` : "Start count"}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default StartCountModal;
