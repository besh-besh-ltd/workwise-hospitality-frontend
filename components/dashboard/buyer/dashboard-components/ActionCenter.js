import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ClipboardCheck, FileText, Clock, Package, UserX } from "lucide-react";
import { getActionCenterData } from "@/services/dashboard";
import CardError from "./CardError";
import CardTooltip from "./CardTooltip";
import PendingApprovalsModal from "./PendingApprovalsModal";
import RejectedPOsModal from "./RejectedPOsModal";
import styles from "./ActionCenter.module.scss";

const ACTION_CARDS = [
  {
    key: "pending_approvals",
    label: "Pending Approvals",
    tooltip: "RFQs, negotiations or POs waiting for your approval action",
    icon: ClipboardCheck,
    colorClass: "red",
    badgeClass: "urgent",
    badgeText: "URGENT",
    href: null,
  },
  {
    key: "rfqs_awaiting",
    label: "No Responses",
    tooltip: "Published RFQs that haven't received any vendor quotes yet",
    icon: FileText,
    colorClass: "orange",
    badgeClass: "action",
    badgeText: "ACTION",
    href: "/dashboard/buyer/rfq-management",
  },
  {
    key: "rfqs_ending_soon",
    label: "RFQs Ending Soon",
    tooltip: "RFQs whose bid deadline is within the next 3 days",
    icon: Clock,
    colorClass: "green",
    badgeClass: "near",
    badgeText: "NEAR",
    href: "/dashboard/buyer/rfq-management",
  },
  {
    key: "pos_awaiting",
    label: "PO Pending",
    tooltip: "Purchase orders sent to vendors awaiting their acceptance or rejection",
    icon: Package,
    colorClass: "blue",
    badgeClass: null,
    badgeText: null,
    href: "/dashboard/buyer/purchase-order",
  },
  {
    key: "rejected_vendors",
    label: "PO Rejected",
    tooltip: "POs rejected by vendors that need to be reassigned to another vendor",
    icon: UserX,
    colorClass: "red",
    badgeClass: "reassign",
    badgeText: "REASSIGN",
    href: null,
    modal: "rejected",
  },
];

const ActionCenter = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getActionCenterData(filters);
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 20000);
    return () => clearInterval(intervalRef.current);
  }, [filters.hotel_ids, filters.start_date, filters.end_date, filters._refresh]);

  return (
    <section className={styles.actionSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Action Center</h3>
        <span className={styles.liveBadge}>LIVE</span>
      </div>

      {error && <CardError onRetry={fetchData} inline />}
      <div className={styles.actionGrid}>
        {ACTION_CARDS.map((card) => {
          const IconComponent = card.icon;
          const count = data?.[card.key] ?? 0;
          const showBadge = card.badgeText && count > 0;

          const inner = (
            <>
              <div className={`${styles.iconContainer} ${styles[card.colorClass]}`}>
                <IconComponent size={22} />
              </div>
              <div className={styles.cardContent}>
                <p className={styles.cardLabel}>
                  {card.label}
                  <CardTooltip text={card.tooltip} />
                </p>
                <div className={styles.cardMetric}>
                  <span className={styles.metricValue}>
                    {loading ? "–" : count}
                  </span>
                  {showBadge && (
                    <span className={`${styles.urgencyBadge} ${styles[card.badgeClass]}`}>
                      {card.badgeText}
                    </span>
                  )}
                </div>
              </div>
            </>
          );

          if (!card.href) {
            const openModal = () => {
              if (card.modal === "rejected") setShowRejectedModal(true);
              else setShowApprovalModal(true);
            };
            return (
              <div key={card.key} className={styles.actionCard} onClick={openModal}>
                {inner}
              </div>
            );
          }

          return (
            <Link key={card.key} href={card.href} className={styles.actionCard}>
              {inner}
            </Link>
          );
        })}
      </div>

      {showApprovalModal && (
        <PendingApprovalsModal onClose={() => setShowApprovalModal(false)} filters={filters} />
      )}
      {showRejectedModal && (
        <RejectedPOsModal onClose={() => setShowRejectedModal(false)} />
      )}
    </section>
  );
};

export default ActionCenter;
