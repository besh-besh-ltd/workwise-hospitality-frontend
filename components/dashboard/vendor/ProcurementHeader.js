import React from "react";
import Link from "next/link";
import Select from "react-select";
import {
  BsCheck,
  BsClipboardData,
  BsFileText,
  BsBuilding,
  BsSearch,
  BsArrowRight,
} from "react-icons/bs";
import styles from "./Search.module.css";

const STEPS = [
  { num: 1, label: "Select Type", icon: <BsClipboardData /> },
  { num: 2, label: "Business Units", icon: <BsBuilding /> },
  { num: 3, label: "Add Items", icon: <BsSearch /> },
];

const ProcurementHeader = ({
  currentStep,
  orderType,
  selectedHotelIds,
  userHotelMappings,
  queryMeta,
  onHotelChange,
  isLoading,
  disableHotelSelect = false,
  // Per-hotel permission resolver from usePerHotelModulePermissions.
  // When provided, the picker:
  //   - HIDES options where the user has no `<moduleKey>.read` perm,
  //   - DISABLES options where the user has read but not create,
  //   - keeps the option selectable when the user has read+create.
  // If absent (legacy callers), behaviour falls back to the previous
  // mapping-based listing.
  getHotelPerm = null,
  perHotelPermsLoading = false,
}) => {
  const draftHref =
    queryMeta.rfq_id != null
      ? `/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${queryMeta.rfq_id}${
          queryMeta.sheet_id ? `&sheet_id=${queryMeta.sheet_id}` : ""
        }`
      : "/dashboard/buyer/rfq-management?tab=draft-rfq";

  const draftLabel =
    queryMeta.rfq_id != null ? "View Current Draft" : "View My Drafts";

  const isRfq = orderType === "rfq";

  return (
    <>
      {/* Step Indicator */}
      <div className={styles.stepsBar}>
        {STEPS.map((step, i) => {
          const isCompleted = step.num < currentStep;
          const isCurrent = step.num === currentStep;

          return (
            <div className={styles.stepGroup} key={step.num}>
              {i > 0 && (
                <div
                  className={`${styles.stepLine} ${
                    isCompleted ? styles.stepLineCompleted : ""
                  }`}
                />
              )}
              <div
                className={`${styles.step} ${
                  isCompleted ? styles.stepClickable : ""
                }`}
              >
                <div
                  className={`${styles.stepCircle} ${
                    isCompleted
                      ? styles.stepCircleCompleted
                      : isCurrent
                      ? styles.stepCircleCurrent
                      : styles.stepCirclePending
                  }`}
                >
                  {isCompleted ? <BsCheck size={16} /> : step.num}
                </div>
                <span
                  className={`${styles.stepLabel} ${
                    isCompleted
                      ? styles.stepLabelCompleted
                      : isCurrent
                      ? styles.stepLabelCurrent
                      : ""
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Header Card */}
      <div className={styles.procurementHeader}>
        <div className={styles.procurementHeaderTop}>
          {/* Order Type Badge */}
          {orderType && (
            <span
              className={`${styles.orderTypeBadge} ${
                orderType === "tender"
                  ? styles.orderTypeTender
                  : styles.orderTypeRfq
              }`}
            >
              {orderType === "tender" ? (
                <BsClipboardData size={14} />
              ) : (
                <BsFileText size={14} />
              )}
              Creating {orderType === "tender" ? "Tender" : "RFQ"}
            </span>
          )}

          {/* Action Buttons */}
          <div className={styles.headerActions}>
            <Link
              href={draftHref}
              className={`${styles.btnOutline} ${
                isLoading ? styles.btnPrimaryDisabled : ""
              }`}
            >
              {draftLabel}
              <BsArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Business Unit Selector */}
        <div className={styles.hotelSelectGroup}>
          <label className={styles.hotelSelectLabel}>
            <BsBuilding size={14} />
            {isRfq ? "Business Unit" : "Business Units"}
            {disableHotelSelect && selectedHotelIds.length > 0 && (
              <span className={styles.hotelLocked}>Locked</span>
            )}
          </label>
          <div className={styles.hotelSelectWrapper}>
            {disableHotelSelect && selectedHotelIds.length > 0 ? (
              <div className={styles.hotelBadges}>
                {userHotelMappings
                  .filter((opt) => opt.hotel_name && selectedHotelIds.includes(opt.hospitality_hotel_id))
                  .map((opt) => (
                    <span key={opt.hospitality_hotel_id} className={styles.hotelBadge}>
                      <BsBuilding size={11} />
                      {opt.hotel_name}
                    </span>
                  ))
                }
              </div>
            ) : (
              <>
                <Select
                  isMulti={!isRfq}
                  isLoading={perHotelPermsLoading}
                  options={
                    // Filter out hotels the user has no read access on.
                    // Read-only hotels stay (rendered as disabled options
                    // with a hint badge) so the user understands why the
                    // BU exists in their mappings but isn't selectable.
                    userHotelMappings
                      .filter((opt) => opt.hotel_name)
                      .filter((opt) => {
                        if (!getHotelPerm) return true; // legacy: no filtering
                        const perm = getHotelPerm(opt.hospitality_hotel_id);
                        return perm.canRead;
                      })
                  }
                  value={
                    isRfq
                      ? userHotelMappings.find(
                          (opt) =>
                            opt.hotel_name &&
                            selectedHotelIds[0] === opt.hospitality_hotel_id
                        ) || null
                      : userHotelMappings.filter(
                          (opt) =>
                            opt.hotel_name &&
                            selectedHotelIds.includes(opt.hospitality_hotel_id)
                        )
                  }
                  onChange={(selected) => {
                    if (isRfq) {
                      const ids = selected ? [selected.hospitality_hotel_id] : [];
                      onHotelChange(ids);
                    } else {
                      const ids = selected
                        ? selected.map((opt) => opt.hospitality_hotel_id)
                        : [];
                      onHotelChange(ids);
                    }
                  }}
                  placeholder={
                    isRfq
                      ? "Select the business unit for this RFQ..."
                      : "Select the business units for this procurement..."
                  }
                  closeMenuOnSelect={!isRfq ? false : true}
                  isClearable={isRfq}
                  classNamePrefix="rs"
                  getOptionValue={(option) => option.hospitality_hotel_id}
                  getOptionLabel={(option) => option.hotel_name}
                  // Disable options where the user has read but no create
                  // for this module — they can SEE the BU in lists but
                  // can't author here, so we prevent selection and show
                  // a "View only" hint inline.
                  isOptionDisabled={(option) => {
                    if (!getHotelPerm) return false;
                    const perm = getHotelPerm(option.hospitality_hotel_id);
                    return !perm.canCreate;
                  }}
                  formatOptionLabel={(option, { context }) => {
                    if (context === "value") return option.hotel_name;
                    if (!getHotelPerm) return option.hotel_name;
                    const perm = getHotelPerm(option.hospitality_hotel_id);
                    const isViewOnly = perm.canRead && !perm.canCreate;
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, width: "100%" }}>
                        <span>{option.hotel_name}</span>
                        {isViewOnly && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "1px 6px",
                              borderRadius: 8,
                              background: "#fef3c7",
                              color: "#92400e",
                              border: "1px solid #fcd34d",
                              marginLeft: "auto",
                            }}
                            title="You have read access but cannot create here"
                          >
                            View only
                          </span>
                        )}
                      </span>
                    );
                  }}
                  noOptionsMessage={() =>
                    perHotelPermsLoading
                      ? "Checking permissions…"
                      : "No business units available — you don't have read access to any of your mapped units for this module."
                  }
                />
                {selectedHotelIds.length === 0 && (
                  <div className={styles.hotelWarning}>
                    {isRfq
                      ? "Select a business unit to start adding products"
                      : "Select at least one business unit to start adding products"}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProcurementHeader;
