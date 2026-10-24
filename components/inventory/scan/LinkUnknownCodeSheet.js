import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { addItemBarcode, listItems } from "@/services/inventory";
import { getApiErrorMessage } from "@/utils/apiError";
import styles from "./Scan.module.scss";

// "Not recognised" → link the code to a stock item so the next scan finds it.
// Saves a MANUFACTURER barcode alias (POST /inventory/items/:id/barcodes,
// inventory.update) with how many stock units one scan of it means
// (1 for a single unit, 24 for a carton of 24).
//
// On a receive screen pass the PO's lines (`poLines`, from the receive
// context): the choice is limited to lines that already have a stock item.
// Anywhere else the item master is searched (`hotelId` narrows the search).
//
// Props: { show, code, onHide, onLinked({invItemId, displayName, stockUom,
//          packFactor, code, poLineId}), poLines?, hotelId? }

const SEARCH_DELAY_MS = 250;

const LinkUnknownCodeSheet = ({ show, code, onHide, onLinked, poLines, hotelId }) => {
  const [selected, setSelected] = useState(null);
  const [pack, setPack] = useState("1");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const searchSeq = useRef(0);

  const fromPo = Array.isArray(poLines);

  // Fresh form for every code.
  useEffect(() => {
    if (!show) return;
    setSelected(null);
    setPack("1");
    setSearch("");
    setResults([]);
    setError(null);
  }, [show, code]);

  const lineChoices = useMemo(
    () =>
      (poLines || [])
        .filter((l) => l?.invItemId)
        .map((l) => ({
          key: `line-${l.poLineId}`,
          invItemId: l.invItemId,
          displayName: l.productName,
          stockUom: l.stockUom || null,
          itemCode: null,
          poLineId: l.poLineId,
        })),
    [poLines]
  );

  useEffect(() => {
    if (!show || fromPo) return undefined;
    const term = search.trim();
    if (!term) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const params = hotelId ? { search: term, hotelId } : { search: term };
        const res = await listItems(params);
        if (seq !== searchSeq.current) return;
        setResults(
          (res?.rows || []).map((r) => ({
            key: `item-${r.id}`,
            invItemId: r.id,
            displayName: r.displayName,
            stockUom: r.stockUom || null,
            itemCode: r.itemCode || null,
            poLineId: null,
          }))
        );
      } catch (err) {
        if (seq === searchSeq.current) setError(getApiErrorMessage(err, "Could not search items."));
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, show, fromPo, hotelId]);

  const packFactor = Number(pack);
  const packValid = pack.trim() !== "" && Number.isFinite(packFactor) && packFactor > 0;
  const canSave = Boolean(selected) && packValid && !saving && Boolean(code);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await addItemBarcode(selected.invItemId, { code, packFactor, source: "MANUFACTURER" });
      toast.success(`Code linked to ${selected.displayName}`);
      onLinked?.({
        invItemId: selected.invItemId,
        displayName: selected.displayName,
        stockUom: selected.stockUom,
        packFactor,
        code,
        poLineId: selected.poLineId ?? null,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not link the code. Try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered dialogClassName={styles.sheetDialog} contentClassName={styles.sheet}>
      <Modal.Header closeButton>
        <Modal.Title as="h2" className={styles.sheetTitle}>
          Link this code
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.sheetBody}>
        <p className={styles.sheetLead}>
          <span className={styles.mono}>{code}</span>
          <span>is not linked to any item yet. Pick the item it belongs to; the next scan will find it.</span>
        </p>

        {fromPo ? (
          <fieldset className={styles.choices}>
            <legend className={styles.label}>Item on this PO</legend>
            {lineChoices.length === 0 && (
              <p className={styles.empty}>No line on this PO has a stock item yet. Map the lines to items first.</p>
            )}
            {lineChoices.map((c) => (
              <div key={c.key} className={`${styles.choice} ${selected?.key === c.key ? styles.choiceOn : ""}`}>
                <input
                  type="radio"
                  name="link-code-target"
                  id={`link-${c.key}`}
                  checked={selected?.key === c.key}
                  onChange={() => setSelected(c)}
                />
                <label htmlFor={`link-${c.key}`}>{c.displayName}</label>
                {c.stockUom && <span className={styles.choiceMeta}>{c.stockUom}</span>}
              </div>
            ))}
          </fieldset>
        ) : (
          <div className={styles.choices}>
            <label htmlFor="link-code-search" className={styles.label}>
              Find item
            </label>
            <input
              id="link-code-search"
              className={styles.textInput}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or item code"
              autoComplete="off"
            />
            {searching && (
              <p className={styles.empty}>
                <Loader2 size={14} className={styles.spin} aria-hidden="true" /> Searching…
              </p>
            )}
            {!searching && search.trim() && results.length === 0 && !error && (
              <p className={styles.empty}>No items match.</p>
            )}
            {results.map((c) => (
              <div key={c.key} className={`${styles.choice} ${selected?.key === c.key ? styles.choiceOn : ""}`}>
                <input
                  type="radio"
                  name="link-code-target"
                  id={`link-${c.key}`}
                  checked={selected?.key === c.key}
                  onChange={() => setSelected(c)}
                />
                <label htmlFor={`link-${c.key}`}>
                  {c.displayName}
                  {c.itemCode && <span className={`${styles.mono} ${styles.choiceCode}`}>{c.itemCode}</span>}
                </label>
                {c.stockUom && <span className={styles.choiceMeta}>{c.stockUom}</span>}
              </div>
            ))}
          </div>
        )}

        <div className={styles.packRow}>
          <label htmlFor="link-code-pack" className={styles.label}>
            Stock units per scan
          </label>
          <input
            id="link-code-pack"
            className={`${styles.textInput} ${styles.packInput}`}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={pack}
            onChange={(e) => setPack(e.target.value)}
            aria-invalid={!packValid}
          />
          <p className={styles.hint}>
            1 for a single unit; 24 for a carton of 24{selected?.stockUom ? ` ${selected.stockUom}` : ""}.
          </p>
        </div>

        {error && (
          <p className={styles.sheetError} role="alert">
            {error}
          </p>
        )}
      </Modal.Body>
      <Modal.Footer className={styles.sheetFooter}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onHide} disabled={saving}>
          Cancel
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={!canSave}>
          {saving ? <Loader2 size={15} className={styles.spin} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
          <span>Link code</span>
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default LinkUnknownCodeSheet;
