import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import { Search, Plus, Check, X, Package, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { searchProductsV2 } from "@/services/products";
import { getRecommendedProducts } from "@/services/rfq";
import { addRfqProduct } from "@/redux/slice";
import styles from "./AddProductsModal.module.scss";

/**
 * Modal that stages new products into the current RFQ's Redux store. The
 * actual persistence happens later via the existing PUT /rfq/update snapshot
 * flow (treated by the backend as `diff.products.added`), so this component
 * never calls any save API itself — it only mutates rfqProductsFromStore.
 *
 * Props:
 *   - isOpen / onClose            modal controls
 *   - hotelIds                    selected business-units (for product+vendor scoping)
 *   - isRestrictedEdit            when true, no products can be added (informational
 *                                 banner only — the trigger button should already be hidden,
 *                                 but the modal still guards defensively)
 *   - rfqLabel                    "RFQ" or "Tender" — used in copy
 */
const AddProductsModal = ({
  isOpen,
  onClose,
  hotelIds = [],
  isRestrictedEdit = false,
  rfqLabel = "RFQ",
}) => {
  const dispatch = useDispatch();
  const rfqProducts = useSelector((s) => s.rfqProducts?.rfqProducts || []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  // Track which variants were added during THIS modal session so we can show
  // an "Added" pill without re-querying Redux's full list on every keystroke.
  const [justAddedVariants, setJustAddedVariants] = useState({});
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

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
    setLoading(false);
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

  // ESC to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

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
    (item) => {
      if (isRestrictedEdit) {
        toast.info(`This ${rfqLabel} is in restricted edit mode — products cannot be added.`);
        return;
      }
      const variantId = Number(item.product_variant_id ?? item.variant_id ?? item.product_id);
      if (!variantId || Number.isNaN(variantId)) return;
      if (isAlreadyOnRfq(variantId)) return;

      // Dispatch the same reducer Start-RFQ uses. Includes product_variant_id
      // explicitly so the snapshot builder picks it up cleanly (the reducer
      // also stores product_id which the builder falls back to).
      dispatch(
        addRfqProduct({
          product_id: variantId,
          product_variant_id: variantId,
          product_name: item.variant_name || item.product_name || `Product ${variantId}`,
          variant: 0,
          vendors: [],
          pd_tds_file_url: item.predefined_tds_file || "",
          pd_qap_file_url: item.predefined_qap_file || "",
        })
      );

      setJustAddedVariants((prev) => ({ ...prev, [variantId]: true }));
    },
    [dispatch, isRestrictedEdit, rfqLabel, isAlreadyOnRfq]
  );

  if (!isOpen) return null;
  if (typeof window === "undefined") return null;

  const showingRecs = query.trim().length < 2;
  const list = showingRecs ? recommendations : results;
  const listLoading = showingRecs ? loadingRecs : loading;
  const addedCount = Object.keys(justAddedVariants).length;

  const renderRow = (item, idx) => {
    const variantId = Number(item.product_variant_id ?? item.variant_id ?? item.product_id);
    const wasAdded = isAlreadyOnRfq(variantId);
    const noVendors =
      item.vendor_count !== undefined && parseInt(item.vendor_count) === 0;
    return (
      <div
        key={`${variantId}-${idx}`}
        className={`${styles.row} ${wasAdded ? styles.rowAdded : ""}`}
        onClick={() => !wasAdded && handleAdd(item)}
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
    <div className={styles.backdrop} onClick={onClose}>
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
              Search the catalog or pick from recommendations. New items are
              added to this {rfqLabel} when you click Save Changes.
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
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
            {addedCount > 0
              ? `${addedCount} added — click Save Changes to persist.`
              : "Tip: changes are staged locally until you click Save Changes."}
          </span>
          <button type="button" className={styles.doneBtn} onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default AddProductsModal;
