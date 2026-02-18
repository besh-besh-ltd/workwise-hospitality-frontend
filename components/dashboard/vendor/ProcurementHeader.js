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
}) => {
  const draftHref =
    queryMeta.rfq_id != null
      ? `/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${queryMeta.rfq_id}${
          queryMeta.sheet_id ? `&sheet_id=${queryMeta.sheet_id}` : ""
        }`
      : "/dashboard/buyer/rfq-management?tab=draft-rfq";

  const draftLabel =
    queryMeta.rfq_id != null ? "View Current Draft" : "View My Drafts";

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
            Business Units
            {selectedHotelIds.length > 0 && (
              <span className={styles.hotelCount}>
                {selectedHotelIds.length} selected
              </span>
            )}
          </label>
          <div className={styles.hotelSelectWrapper}>
            <Select
              isMulti
              options={userHotelMappings.filter((opt) => opt.hotel_name)}
              value={userHotelMappings.filter(
                (opt) =>
                  opt.hotel_name &&
                  selectedHotelIds.includes(opt.hospitality_hotel_id)
              )}
              onChange={(selectedOptions) => {
                const ids = selectedOptions
                  ? selectedOptions.map((opt) => opt.hospitality_hotel_id)
                  : [];
                onHotelChange(ids);
              }}
              placeholder="Select the business units for this procurement..."
              closeMenuOnSelect={false}
              classNamePrefix="rs"
              getOptionValue={(option) => option.hospitality_hotel_id}
              getOptionLabel={(option) => option.hotel_name}
            />
            {selectedHotelIds.length === 0 && (
              <div className={styles.hotelWarning}>
                Select at least one business unit to start adding products
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProcurementHeader;
