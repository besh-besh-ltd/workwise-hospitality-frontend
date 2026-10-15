import React from "react";
import { FiShield, FiAlertTriangle } from "react-icons/fi";
import { networkCoverageView } from "@/components/dashboard/vendor/network/networkCoverage";
import styles from "./Subscription.module.css";

// A network member's subscription page: its network's subscription covers it and it
// holds a seat. It cannot buy or change the subscription, so there is no action here;
// anything to change is for the network admin.
const NetworkCoveredState = ({ coverage }) => {
  const view = networkCoverageView(coverage);
  if (!view) return null;
  const covered = view.key === "covered";
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{covered ? <FiShield /> : <FiAlertTriangle />}</div>
      <h3 className={styles.emptyTitle}>{view.label}</h3>
      <p className={styles.emptyText}>{view.detail}</p>
      <p className={styles.emptyText}>
        {coverage.principal_name ? `${coverage.principal_name} manages` : "Your network admin manages"} the
        subscription for every member of {coverage.org_name || "your network"}. Ask your network admin to
        change it.
      </p>
    </div>
  );
};

export default NetworkCoveredState;
