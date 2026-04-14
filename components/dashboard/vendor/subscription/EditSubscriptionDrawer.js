import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import { FiX, FiAlertTriangle } from "react-icons/fi";
import { nestedCategoryData } from "@/services/products";
import { getAllHotels } from "@/services/hospitality";
import useSubscriptionPreview from "./hooks/useSubscriptionPreview";
import styles from "./Subscription.module.css";
import { toast } from "react-toastify";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "#2E5BA8" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(46, 91, 168, 0.1)" : "none",
    borderRadius: "10px",
    minHeight: "42px",
    fontSize: "13px",
    "&:hover": { borderColor: "#cbd5e1" }
  }),
  multiValue: (base) => ({
    ...base,
    background: "#f2f6ff",
    borderRadius: "6px"
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#2E5BA8",
    fontSize: "12px",
    fontWeight: 500
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "13px",
    background: state.isSelected ? "#2E5BA8" : state.isFocused ? "#f2f6ff" : "#fff",
    color: state.isSelected ? "#fff" : "#334155"
  })
};

const EditSubscriptionDrawer = ({ open, onClose, currentData, onSubmit }) => {
  const [allCategories, setAllCategories] = useState([]);
  const [allSubcategories, setAllSubcategories] = useState([]);
  const [allHotels, setAllHotels] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [selectedCats, setSelectedCats] = useState([]);
  const [selectedSubs, setSelectedSubs] = useState([]);
  const [selectedHotels, setSelectedHotels] = useState([]);

  // Load available options
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingOptions(true);
      try {
        const [catRes, hotelRes] = await Promise.all([
          nestedCategoryData(0, "", false),
          getAllHotels()
        ]);

        const cats = [];
        const subs = [];
        const catData = catRes?.data || catRes || [];
        (Array.isArray(catData) ? catData : []).forEach((c) => {
          cats.push({ value: c.id, label: c.title || c.name, fee: c.fee_amount || 500 });
          if (Array.isArray(c.subcategories || c.children)) {
            (c.subcategories || c.children || []).forEach((sc) => {
              subs.push({
                value: sc.id,
                label: sc.title || sc.name,
                parentId: c.id,
                parentName: c.title || c.name
              });
            });
          }
        });
        setAllCategories(cats);
        setAllSubcategories(subs);

        const hotelData = hotelRes?.data || hotelRes || [];
        setAllHotels(
          (Array.isArray(hotelData) ? hotelData : []).map((h) => ({
            value: h.id,
            label: h.name,
            city: h.city
          }))
        );
      } catch (err) {
        console.error("Failed to load options:", err);
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, [open]);

  // Pre-select current items when options loaded
  useEffect(() => {
    if (!currentData?.subscription || loadingOptions) return;
    const sub = currentData.subscription;

    setSelectedCats(
      (sub.categories || []).map((c) => {
        const found = allCategories.find((ac) => ac.value === c.id);
        return found || { value: c.id, label: c.name, fee: c.fee_amount || 500 };
      })
    );

    const currentSubIds = [];
    (sub.categories || []).forEach((c) => {
      (c.sub_categories || []).forEach((sc) => {
        currentSubIds.push(sc.id);
      });
    });
    setSelectedSubs(
      currentSubIds.map((id) => {
        const found = allSubcategories.find((as) => as.value === id);
        return found || { value: id, label: `Sub-category ${id}` };
      })
    );

    setSelectedHotels(
      (sub.hotels || []).map((h) => {
        const found = allHotels.find((ah) => ah.value === h.id);
        return found || { value: h.id, label: h.name };
      })
    );
  }, [currentData, loadingOptions, allCategories, allSubcategories, allHotels]);

  const targetCatIds = useMemo(() => selectedCats.map((c) => c.value), [selectedCats]);
  const targetSubIds = useMemo(() => selectedSubs.map((s) => s.value), [selectedSubs]);
  const targetHotelIds = useMemo(() => selectedHotels.map((h) => h.value), [selectedHotels]);

  const hasChanges = useMemo(() => {
    if (!currentData?.subscription) return false;
    const sub = currentData.subscription;
    const curCatIds = (sub.categories || []).map((c) => c.id).sort();
    const curSubIds = [];
    (sub.categories || []).forEach((c) =>
      (c.sub_categories || []).forEach((sc) => curSubIds.push(sc.id))
    );
    curSubIds.sort();
    const curHotelIds = (sub.hotels || []).map((h) => h.id).sort();

    return (
      JSON.stringify(curCatIds) !== JSON.stringify([...targetCatIds].sort()) ||
      JSON.stringify(curSubIds) !== JSON.stringify([...targetSubIds].sort()) ||
      JSON.stringify(curHotelIds) !== JSON.stringify([...targetHotelIds].sort())
    );
  }, [currentData, targetCatIds, targetSubIds, targetHotelIds]);

  const { preview, loading: previewLoading, error: previewError } = useSubscriptionPreview(
    targetCatIds,
    targetSubIds,
    targetHotelIds,
    open && hasChanges && targetCatIds.length > 0 && targetHotelIds.length > 0
  );

  // Filter sub-categories to only show those whose parent is selected
  const availableSubs = useMemo(() => {
    const catIds = new Set(targetCatIds);
    return allSubcategories.filter((sc) => catIds.has(sc.parentId));
  }, [allSubcategories, targetCatIds]);

  // When a category is deselected, auto-remove its orphaned subcategories
  useEffect(() => {
    const catIds = new Set(targetCatIds);
    setSelectedSubs((prev) =>
      prev.filter((s) => {
        const meta = allSubcategories.find((as) => as.value === s.value);
        return meta ? catIds.has(meta.parentId) : false;
      })
    );
  }, [targetCatIds, allSubcategories]);

  const handleReviewConfirm = () => {
    if (!preview) return;
    onSubmit({
      target_categories: targetCatIds,
      target_subcategories: targetSubIds,
      target_hotels: targetHotelIds,
      preview
    });
  };

  if (!open) return null;

  return (
    <>
      <div className={styles.drawerOverlay} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <h3 className={styles.drawerTitle}>Edit Subscription</h3>
          <button className={styles.drawerClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.drawerSection}>
            <label className={styles.drawerLabel}>Categories</label>
            <Select
              isMulti
              options={allCategories}
              value={selectedCats}
              onChange={(newVal, meta) => {
                if(selectedCats.length == 1 && meta.action == 'remove-value') toast.error("At least one category must stay selected.");
                else setSelectedCats(newVal);
              }}
              styles={selectStyles}
              placeholder="Select categories..."
              isLoading={loadingOptions}
              formatOptionLabel={(opt) => (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{opt.label}</span>
                  {opt.fee > 0 && (
                    <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: 8 }}>
                      ₹{opt.fee}/yr
                    </span>
                  )}
                </div>
              )}
            />
          </div>

          {availableSubs.length > 0 && (
            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel}>Sub-categories (Free)</label>
              <Select
                isMulti
                options={availableSubs}
                value={selectedSubs}
                onChange={setSelectedSubs}
                styles={selectStyles}
                placeholder="Select sub-categories..."
                formatOptionLabel={(opt) => (
                  <div>
                    <span>{opt.label}</span>
                    <span style={{ fontSize: "10px", color: "#94a3b8", marginLeft: 6 }}>
                      ({opt.parentName})
                    </span>
                  </div>
                )}
              />
            </div>
          )}

          <div className={styles.drawerSection}>
            <label className={styles.drawerLabel}>Business Units</label>
            <Select
              isMulti
              options={allHotels}
              value={selectedHotels}
              onChange={(newVal, meta) => {
                if(selectedCats.length == 1 && meta.action == 'remove-value') toast.error("At least one business unit must stay selected.");
                else setSelectedHotels(newVal);
              }}
              styles={selectStyles}
              placeholder="Select business units..."
              isLoading={loadingOptions}
              formatOptionLabel={(opt) => (
                <div>
                  <span>{opt.label}</span>
                  {opt.city && (
                    <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: 6 }}>
                      {opt.city}
                    </span>
                  )}
                </div>
              )}
            />
          </div>

          {/* Live Preview */}
          {hasChanges && (
            <div className={styles.previewCard}>
              <p className={styles.previewTitle}>Live Preview</p>

              {previewLoading && (
                <p style={{ fontSize: "13px", color: "#94a3b8" }}>Calculating...</p>
              )}

              {previewError && (
                <p style={{ fontSize: "13px", color: "#ef4444" }}>{previewError}</p>
              )}

              {preview && !previewLoading && (
                <>
                  {preview.diff?.added_categories?.map((c) => (
                    <div key={`ac-${c.id}`} className={`${styles.previewItem} ${styles.previewAdd}`}>
                      + {c.name} (₹{c.fee_amount} × {preview.pricing?.new_total_hotels_count || 1}{(preview.pricing?.fy_periods_remaining || 1) > 1 ? ` × ${preview.pricing.fy_periods_remaining} yrs` : ""})
                    </div>
                  ))}
                  {preview.diff?.added_subcategories?.map((c) => (
                    <div key={`as-${c.id}`} className={`${styles.previewItem} ${styles.previewAdd}`}>
                      + {c.name} (Free)
                    </div>
                  ))}
                  {preview.diff?.added_hotels?.map((h) => (
                    <div key={`ah-${h.id}`} className={`${styles.previewItem} ${styles.previewAdd}`}>
                      + {h.name}
                    </div>
                  ))}
                  {preview.diff?.removed_categories?.map((c) => (
                    <div key={`rc-${c.id}`} className={`${styles.previewItem} ${styles.previewRemove}`}>
                      − {c.name}
                    </div>
                  ))}
                  {preview.diff?.removed_subcategories?.map((c) => (
                    <div key={`rs-${c.id}`} className={`${styles.previewItem} ${styles.previewRemove}`}>
                      − {c.name}
                    </div>
                  ))}
                  {preview.diff?.cascaded_subcategories?.map((c) => (
                    <div key={`cs-${c.id}`} className={`${styles.previewItem} ${styles.previewRemove}`}>
                      − {c.name} (auto-removed)
                    </div>
                  ))}
                  {preview.diff?.removed_hotels?.map((h) => (
                    <div key={`rh-${h.id}`} className={`${styles.previewItem} ${styles.previewRemove}`}>
                      − {h.name}
                    </div>
                  ))}

                  {preview.warnings?.map((w, i) => (
                    <div key={i} className={styles.previewWarning}>
                      <FiAlertTriangle size={36} />
                      {w}
                    </div>
                  ))}

                  <div className={styles.previewTotal}>
                    <span className={styles.previewTotalLabel}>Net cost</span>
                    {preview.pricing?.net_cost > 0 ? (
                      <span className={styles.previewTotalAmount}>
                        ₹{Number(preview.pricing.net_cost).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className={styles.previewFree}>Free</span>
                    )}
                  </div>
                  {(preview.pricing?.fy_periods_remaining || 1) > 1 && (
                    <p style={{ fontSize: "12px", color: "#64748b", textAlign: "right", margin: "4px 0 0" }}>
                      Covers {preview.pricing.fy_periods_remaining} financial years
                    </p>
                  )}
                  {preview.shared_end_date && (
                    <p className={styles.previewEndDate}>
                      Valid till {new Date(preview.shared_end_date).toLocaleDateString("en-IN", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.drawerFooter}>
          <button className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.btnGradient}
            disabled={
              !hasChanges ||
              previewLoading ||
              !!previewError ||
              !preview ||
              targetCatIds.length === 0 ||
              targetHotelIds.length === 0
            }
            onClick={handleReviewConfirm}
          >
            Review & Confirm
          </button>
        </div>
      </div>
    </>
  );
};

export default EditSubscriptionDrawer;
