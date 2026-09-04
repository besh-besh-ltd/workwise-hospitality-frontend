import React from "react";
import { BsPeople, BsPersonCheck, BsPersonX, BsBuilding } from "react-icons/bs";
import styles from "./ManageAccounts.module.scss";

const StatCardContent = ({ value, label, isLoading }) => (
  <div>
    {isLoading ? (
      <>
        <div className={`${styles.skeletonPulse} ${styles.statValueSkeleton}`} />
        <div className={`${styles.skeletonPulse} ${styles.statLabelSkeleton}`} />
      </>
    ) : (
      <>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </>
    )}
  </div>
);

/**
 * One card. Clickable when it can narrow the list below it (UM-8).
 *
 * Reading "78 Inactive" and then having to find the same word in a dropdown to
 * see who they are is a needless step — the number is already the question.
 * Cards that cannot narrow anything stay inert rather than looking clickable
 * and doing nothing.
 */
const StatCard = ({ tone, icon, value, label, isLoading, onSelect, active }) => {
  const content = (
    <>
      <div className={styles.statIconWrap}>{icon}</div>
      <StatCardContent value={value} label={label} isLoading={isLoading} />
    </>
  );

  if (!onSelect) {
    return <div className={`${styles.statCard} ${styles[tone]}`}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={`${styles.statCard} ${styles[tone]} ${styles.statCardClickable} ${
        active ? styles.statCardActive : ""
      }`}
      onClick={onSelect}
      aria-pressed={active}
      title={active ? `Showing ${label} — click to clear` : `Show only ${label}`}
    >
      {content}
    </button>
  );
};

const StatsBar = ({
  totalUsers,
  activeCount,
  inactiveCount,
  mappedCount,
  isHospitality,
  isLoading,
  activeStatus = null,
  onSelectStatus,
}) => {
  // Always show 4 cards during initial load to prevent layout shift
  const showMappedCard = isHospitality || isLoading;

  const pick = (value) => () => {
    if (!onSelectStatus) return;
    // Clicking the card you are already filtered by clears it — the same
    // affordance both ways, so nobody has to hunt for how to get back.
    onSelectStatus(activeStatus === value ? null : value);
  };

  return (
    <div className={styles.statsRow}>
      <StatCard
        tone="statTeal"
        icon={<BsPeople />}
        value={totalUsers}
        label="Total Users"
        isLoading={isLoading}
        onSelect={onSelectStatus ? pick(null) : undefined}
        active={onSelectStatus ? activeStatus === null : false}
      />
      <StatCard
        tone="statGreen"
        icon={<BsPersonCheck />}
        value={activeCount}
        label="Active"
        isLoading={isLoading}
        onSelect={onSelectStatus ? pick("active") : undefined}
        active={activeStatus === "active"}
      />
      <StatCard
        tone="statRed"
        icon={<BsPersonX />}
        value={inactiveCount}
        label="Inactive"
        isLoading={isLoading}
        onSelect={onSelectStatus ? pick("inactive") : undefined}
        active={activeStatus === "inactive"}
      />
      {showMappedCard && (
        <StatCard
          tone="statIndigo"
          icon={<BsBuilding />}
          value={mappedCount}
          label="Mapped"
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default StatsBar;
