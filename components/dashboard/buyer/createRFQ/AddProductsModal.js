import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import { Search, Plus, Check, X, Package, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { searchProductsV2 } from "@/services/products";
import { getRecommendedProducts, addProductToDraft } from "@/services/rfq";
import { addRfqProduct } from "@/redux/slice";
import styles from "./AddProductsModal.module.scss";

/**
 * Modal for putting more products onto an RFQ. How that happens depends on
 * which flow is hosting it, and the two are not interchangeable.
 *
 * EDIT mode (`?id=`, an already-created RFQ) — stage into Redux. The save
 * builds a snapshot from the product list and `PUT /rfq/update` inserts
 * everything carrying `id: null` as `diff.products.added`, resolving vendors
 * and the next variant server-side. Nothing to do here but dispatch.
 *
 * DRAFT mode (`?draft_id=`, the wizard) — call the server now. The draft save
 * is `POST /rfq/save-draft`, which only ever reconciles specs, files, comments,
 * vendors and deletions against products that already have a row; it has no
 * channel for a new product and never inserts `tbl_rfq_products`. Staging into
 * Redux there meant the product existed nowhere but the browser: the save
 * returned 200, the post-save rehydrate replaced Redux with the server's list,
 * and the product vanished — with a success toast on top. So a draft add goes
 * straight to `/rfq/add-product-to-draft`, the same endpoint "Add variant" and
 * the Start-RFQ wizard already use, and "Added" only appears once the row
 * genuinely exists.
 *
 * Props:
 *   - isOpen / onClose            modal controls
 *   - hotelIds                    selected business-units (for product+vendor scoping)
 *   - isRestrictedEdit            when true, no products can be added (informational
 *                                 banner only — the trigger button should already be hidden,
 *                                 but the modal still guards defensively)
 *   - rfqLabel                    "RFQ" or "Tender" — used in copy
 *   - mode                        "draft" | "edit" — picks the persistence path above
 *   - rfqId                       draft mode: the draft being appended to
 *   - sheetId                     draft mode: the draft's sheet, when it has one. The draft
 *                                 read filters products by sheet_id, so omitting it on an
 *                                 Excel/magic draft writes a row the editor cannot see
 *   - onBeforeAdd                 draft mode: flush the wizard's unsaved edits before the
 *                                 first add, because adding rehydrates from the server
 *   - onAdded                     draft mode: reload the draft once, after the user is done
 */
const AddProductsModal = ({
  isOpen,
  onClose,
  hotelIds = [],
  isRestrictedEdit = false,
  rfqLabel = "RFQ",
  mode = "edit",
  rfqId,
  sheetId,
  onBeforeAdd,
  onAdded,
}) => {
  const dispatch = useDispatch();
  // The root reducer IS the rfqProducts slice (redux/store.js passes
  // slice.js's default export straight to configureStore), so this selector
  // returns the product ARRAY. Reading `s.rfqProducts.rfqProducts` was always
  // undefined, which left the duplicate guard below permanently open and let
  // a re-picked product mint a phantom second line at variant + 1.
  const rfqProducts = useSelector((s) => s.rfqProducts) || [];
  const isDraftMode = mode === "draft";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  // Track which variants were added during THIS modal session so we can show
  // an "Added" pill without re-querying Redux's full list on every keystroke.
  const [justAddedVariants, setJustAddedVariants] = useState({});
  // Draft mode writes to the server, so a row is briefly in flight.
  const [pendingVariants, setPendingVariants] = useState({});
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);
  // Whether this session has flushed the wizard's pending edits yet, and
  // whether it has anything worth reloading the draft for.
  const flushedRef = useRef(false);
  const addedAnythingRef = useRef(false);

  // Set of variant ids already on the RFQ (loaded products + just-added this session).
  const stagedVariantIds = useMemo(() => {
    const ids = new Set();
    for (const p of rfqProducts) {
      const v = Number(p?.product_variant_id ?? p?.product_id);
      if (!Number.isNaN(v)) ids.add(v);
    }
    return ids;
  }, [rfqProducts]);

  const isAlreadyOnRfq = (variantId) =>
    stagedVariantIds.has(Number(variantId)) || !!justAddedVariants[Number(variantId)];

  // Reset transient state every open.
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setResults([]);
    setJustAddedVariants({});
    setPendingVariants({});
    setLoading(false);
    flushedRef.current = false;
    addedAnythingRef.current = false;
    // autofocus the search input after the modal mounts
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Load recommendations once on open (they don't change with query).
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingRecs(true);
    getRecommendedProducts({
      hotel_ids: hotelIds,
      variant_ids: Array.from(stagedVariantIds),
      limit: 8,
    })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
        setRecommendations(list);
      })
      .catch(() => {
        if (!cancelled) setRecommendations([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecs(false);
      });
    return () => {
      cancelled = true;
    };
    // We intentionally only fire on open. The seed list of staged ids is OK
    // to be stale — adding a product mid-session just hides it via wasAdded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hotelIds.join(",")]);

  // Debounced search.
  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myReq = ++reqIdRef.current;
    debounceRef.current = setTimeout(() => {
      searchProductsV2({ search_key: trimmed, hotel_ids: hotelIds })
        .then((res) => {
          // Drop stale responses if a newer search has already started.
          if (myReq !== reqIdRef.current) return;
          const list = Array.isArray(res?.data) ? res.data : [];
          setResults(list);
        })
        .catch(() => {
          if (myReq !== reqIdRef.current) return;
          setResults([]);
        })
        .finally(() => {
          if (myReq === reqIdRef.current) setLoading(false);
        });
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, isOpen, hotelIds.join(",")]);

  // ESC to close. Goes through the same ref as every other close path so a
  // draft add is never left un-reloaded.
  const closeRef = useRef(null);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleAdd = useCallback(
    async (item) => {
      if (isRestrictedEdit) {
        toast.info(`This ${rfqLabel} is in restricted edit mode — products cannot be added.`);
        return;
      }
      const variantId = Number(item.product_variant_id ?? item.variant_id ?? item.product_id);
      if (!variantId || Number.isNaN(variantId)) return;
      if (isAlreadyOnRfq(variantId) || pendingVariants[variantId]) return;

      const productName =
        item.variant_name || item.product_name || `Product ${variantId}`;

      if (isDraftMode) {
        if (!rfqId || rfqId <= 0) {
          toast.error(<h6>Save this {rfqLabel} before adding products.</h6>);
          return;
        }
        setPendingVariants((prev) => ({ ...prev, [variantId]: true }));
        try {
          // Adding reloads the draft from the server, so anything the user
          // typed but has not saved yet has to go up first — same order
          // "Add variant" uses in Item.js.
          if (!flushedRef.current) {
            await onBeforeAdd?.();
            flushedRef.current = true;
          }
          await addProductToDraft({
            rfq_id: rfqId,
            sheet_id: sheetId,
            variant_id: variantId,
            // Vendors are resolved server-side from the variant's category
            // and these business units; the modal has no vendor picker.
            hotel_ids: (hotelIds || []).map(Number).filter((n) => !Number.isNaN(n)),
          });
          addedAnythingRef.current = true;
          setJustAddedVariants((prev) => ({ ...prev, [variantId]: true }));
        } catch (err) {
          // Leave the row addable. Marking it "Added" when the server refused
          // is the exact lie that made this bug invisible for a week.
          toast.error(<h6>Could not add {productName}. Please try again.</h6>, {
            position: "top-right",
          });
        } finally {
          setPendingVariants((prev) => {
            const next = { ...prev };
            delete next[variantId];
            return next;
          });
        }
        return;
      }

      // Edit mode: dispatch the same reducer Start-RFQ uses. Includes
      // product_variant_id explicitly so the snapshot builder picks it up
      // cleanly (the reducer also stores product_id which the builder falls
      // back to). PUT /rfq/update turns this into a real row on save.
      dispatch(
        addRfqProduct({
          product_id: variantId,
          product_variant_id: variantId,
          product_name: productName,
          variant: 0,
          vendors: [],
          pd_tds_file_url: item.predefined_tds_file || "",
          pd_qap_file_url: item.predefined_qap_file || "",
        })
      );

      setJustAddedVariants((prev) => ({ ...prev, [variantId]: true }));
    },
    [
      dispatch,
      isRestrictedEdit,
      rfqLabel,
      isAlreadyOnRfq,
      isDraftMode,
      rfqId,
      sheetId,
      hotelIds,
      onBeforeAdd,
      pendingVariants,
    ]
  );

  // Draft adds are already on the server; pull them into the editor once,
  // when the user is finished, rather than after every pick.
  const handleClose = useCallback(async () => {
    onClose?.();
    if (isDraftMode && addedAnythingRef.current) {
      addedAnythingRef.current = false;
      await onAdded?.();
    }
  }, [onClose, isDraftMode, onAdded]);
  closeRef.current = handleClose;

  if (!isOpen) return null;
  if (typeof window === "undefined") return null;

  const showingRecs = query.trim().length < 2;
  const list = showingRecs ? recommendations : results;
  const listLoading = showingRecs ? loadingRecs : loading;
  const addedCount = Object.keys(justAddedVariants).length;

  const renderRow = (item, idx) => {
    const variantId = Number(item.product_variant_id ?? item.variant_id ?? item.product_id);
    const wasAdded = isAlreadyOnRfq(variantId);
    const isPending = !!pendingVariants[variantId];
    const noVendors =
      item.vendor_count !== undefined && parseInt(item.vendor_count) === 0;
    return (
      <div
        key={`${variantId}-${idx}`}
        className={`${styles.row} ${wasAdded ? styles.rowAdded : ""}`}
        onClick={() => !wasAdded && !isPending && handleAdd(item)}
      >
        <span className={`${styles.rowIcon} ${showingRecs ? styles.rowIconRec : ""}`}>
          {showingRecs ? <Sparkles size={13} /> : <Package size={13} />}
        </span>
        <div className={styles.rowMain}>
          <div className={styles.rowName}>
            {item.variant_name || item.product_name || `Product ${variantId}`}
          </div>
          {item.category_name && (
            <div className={styles.rowMeta}>{item.category_name}</div>
          )}
        </div>
        <div className={styles.rowActions}>
          {noVendors && !wasAdded && (
            <span
              className={styles.noVendorsHint}
              title="No vendors are currently mapped for this product. You can still add it — assign vendors later from the product card."
            >
              <AlertCircle size={10} strokeWidth={2.4} /> No vendors
            </span>
          )}
          {wasAdded ? (
            <span className={`${styles.addBtn} ${styles.addBtnDone}`}>
              <Check size={11} strokeWidth={3} /> Added
            </span>
          ) : isPending ? (
            <span className={styles.addBtn}>
              <Loader2 size={11} className={styles.spinner} /> Adding…
            </span>
          ) : (
            <button
              type="button"
              className={styles.addBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleAdd(item);
              }}
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <div className={styles.backdrop} onClick={handleClose}>
      <div
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Add products"
      >
        <header className={styles.header}>
          <div>
            <h3 className={styles.title}>Add products</h3>
            <p className={styles.subtitle}>
              Search the catalog or pick from recommendations.{" "}
              {isDraftMode
                ? `Each item is added to this ${rfqLabel} straight away.`
                : `New items are added to this ${rfqLabel} when you click Save Changes.`}
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        {isRestrictedEdit && (
          <div className={styles.restrictedBanner}>
            <AlertCircle size={13} />
            <span>
              This {rfqLabel} has received quotes — adding new products is
              not allowed at this stage.
            </span>
          </div>
        )}

        <div className={styles.searchBar}>
          <Search size={14} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search products by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className={styles.sectionLabel}>
          {showingRecs ? "Recommended for you" : `Results for "${query.trim()}"`}
        </div>

        <div className={styles.list}>
          {listLoading ? (
            <div className={styles.loadingState}>
              <Loader2 size={14} className={styles.spinner} />
              <span>Searching…</span>
            </div>
          ) : list.length === 0 ? (
            <div className={styles.emptyState}>
              {showingRecs
                ? "No recommendations yet — try searching above."
                : "No products match your search."}
            </div>
          ) : (
            list.map(renderRow)
          )}
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>
            {isDraftMode
              ? addedCount > 0
                ? `${addedCount} added to this ${rfqLabel}. Set quantity and unit on each one.`
                : `Tip: items are added to this ${rfqLabel} as soon as you pick them.`
              : addedCount > 0
                ? `${addedCount} added — click Save Changes to persist.`
                : "Tip: changes are staged locally until you click Save Changes."}
          </span>
          <button type="button" className={styles.doneBtn} onClick={handleClose}>
            Done
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default AddProductsModal;
