"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { BsDiagram2 } from "react-icons/bs";
import { getReviewRouting, saveReviewRouting, deleteReviewRouting, searchCategories } from "@/services/pr";
import { getDepartments } from "@/services/rbac";
import { getApiErrorMessage } from "@/utils/apiError";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import Loader from "@/components/shared/Loader";
import styles from "./Approvals.module.css";

/**
 * PR review routing — which department technically reviews which category.
 *
 * A purchase requisition line in a mapped category (or one of its
 * sub-categories) is reviewed by that department's PR Technical Reviewers
 * before the approval chain starts. One department per category: saving a
 * category that is already mapped changes its department.
 */

const SEARCH_DEBOUNCE_MS = 250;

const PrReviewRouting = () => {
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toRemove, setToRemove] = useState(null);

  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [category, setCategory] = useState(null);
  const [departmentId, setDepartmentId] = useState("");
  const searchSeq = useRef(0);

  const load = useCallback(async () => {
    try {
      const [routing, depts] = await Promise.all([getReviewRouting(), getDepartments()]);
      setRows(Array.isArray(routing?.data) ? routing.data : []);
      const list = depts?.data?.data || depts?.data || [];
      setDepartments(Array.isArray(list) ? list : []);
      setError(null);
    } catch (err) {
      setError("Could not load review routing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Category typeahead. Only the latest request may write results: a slow
  // response for "ste" must not overwrite the answer for "steel".
  useEffect(() => {
    const q = query.trim();
    if (category || q.length < 2) {
      setOptions([]);
      setSearchError(null);
      return undefined;
    }
    const seq = ++searchSeq.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchCategories(q);
        if (seq !== searchSeq.current) return;
        setOptions(res?.data?.categories || []);
        setSearchError(null);
      } catch (err) {
        if (seq !== searchSeq.current) return;
        setOptions([]);
        setSearchError("Could not search categories.");
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, category]);

  const pick = (c) => {
    setCategory(c);
    setQuery(c.title);
    setOptions([]);
  };

  const add = async () => {
    setBusy(true);
    try {
      const res = await saveReviewRouting({ category_id: category.id, department_id: Number(departmentId) });
      toast.success(res?.message || "Review routing saved");
      setCategory(null);
      setQuery("");
      setDepartmentId("");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    const row = toRemove;
    setToRemove(null);
    if (!row) return;
    setBusy(true);
    try {
      await deleteReviewRouting(row.id);
      toast.success("Review routing removed");
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className={styles.errorBanner}>{error}</div>;

  const complete = !!category && !!departmentId;

  return (
    <div className={styles.cover}>
      <p className={styles.coverHint}>
        Lines in a mapped category (or its sub-categories) are reviewed by that department&apos;s PR Technical
        Reviewers before approval.
      </p>

      <div className={styles.coverForm}>
        <div className={styles.reassignField} style={{ position: "relative" }}>
          <label htmlFor="pr-routing-category">Category</label>
          <input
            id="pr-routing-category"
            type="text"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-autocomplete="list"
            value={query}
            placeholder="Search categories…"
            onChange={(e) => {
              setCategory(null);
              setQuery(e.target.value);
            }}
          />
          {searching && <small>Searching…</small>}
          {searchError && <small role="alert" style={{ color: "#b42318" }}>{searchError}</small>}
          {options.length > 0 && (
            <ul role="listbox" className={styles.routingOptions}>
              {options.map((c) => (
                <li key={c.id} role="option" aria-selected={false}>
                  <button type="button" className={styles.routingOption} onClick={() => pick(c)}>
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && !searchError && !category && query.trim().length >= 2 && options.length === 0 && (
            <small>No matching category.</small>
          )}
        </div>

        <label className={styles.reassignField}>
          <span>Reviewing department</span>
          <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Choose a department…</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className={styles.coverConfirm} disabled={!complete || busy} onClick={add}>
          {busy ? "Saving…" : "Add routing"}
        </button>
      </div>

      {rows.length === 0 && (
        <div className={styles.emptyState}>
          <BsDiagram2 size={26} />
          <h2>No categories are routed for review</h2>
          <p>Requisitions skip technical review until you map a category to a department above.</p>
        </div>
      )}

      <ul className={styles.stuckList}>
        {rows.map((row) => (
          <li key={row.id} className={styles.stuckRow}>
            <div className={styles.coverRow}>
              <div className={styles.stuckWhat}>
                <span className={styles.stuckEntity}>{row.category_title}</span>
                <span className={styles.stuckUnit}>{row.parent_title ? `in ${row.parent_title}` : "Top-level category"}</span>
              </div>
              <span className={styles.coverState}>{row.department_title}</span>
              <button
                type="button"
                className={styles.reassignBtn}
                disabled={busy}
                aria-label={`Remove routing for ${row.category_title}`}
                onClick={() => setToRemove(row)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmationModal
        isOpen={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        title="Remove review routing?"
        description={toRemove ? `Lines in ${toRemove.category_title} will no longer go to ${toRemove.department_title} for technical review.` : ""}
        confirmButtonText="Remove"
        cancelButtonText="Keep"
      />
    </div>
  );
};

export default PrReviewRouting;
