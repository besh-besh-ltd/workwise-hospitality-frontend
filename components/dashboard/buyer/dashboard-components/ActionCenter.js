import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ClipboardCheck, FileText, Clock, Package, UserX, Zap } from "lucide-react";
import { getActionCenterData } from "@/services/dashboard";
import CardTooltip from "./CardTooltip";
import PendingApprovalsModal from "./PendingApprovalsModal";
import RejectedPOsModal from "./RejectedPOsModal";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import styles from "./ActionCenter.module.scss";

const ACTION_CARDS = [
  {
    key: "pending_approvals",
    label: "Pending approvals",
    tooltip: "RFQs, negotiations or POs waiting for your approval action",
    icon: ClipboardCheck,
    accent: "danger",
    statusLabel: "Urgent",
    href: null,
    modal: "approvals",
  },
  {
    key: "rfqs_awaiting",
    label: "No responses",
    tooltip: "Published RFQs that haven't received any vendor quotes yet",
    icon: FileText,
    accent: "warn",
    statusLabel: "Action",
    href: "/dashboard/buyer/rfq-management",
  },
  {
    key: "rfqs_ending_soon",
    label: "RFQs ending soon",
    tooltip: "RFQs whose bid deadline is within the next 3 days",
    icon: Clock,
    accent: "info",
    statusLabel: "Near",
    href: "/dashboard/buyer/rfq-management",
  },
  {
    key: "pos_awaiting",
    label: "PO pending",
    tooltip: "Purchase orders sent to vendors awaiting acceptance",
    icon: Package,
    accent: "muted",
    statusLabel: null,
    href: "/dashboard/buyer/purchase-order",
  },
  {
    key: "rejected_vendors",
    label: "PO rejected",
    tooltip: "POs rejected by vendors that need to be reassigned",
    icon: UserX,
    accent: "danger",
    statusLabel: "Reassign",
    href: null,
    modal: "rejected",
  },
];

const ActionCenter = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await getActionCenterData(filters);
      setData(res.data);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    intervalRef.current = setInterval(fetchData, 20000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.hotel_ids, filters.start_date, filters.end_date, filters._refresh]);

  const urgentCount = (data?.pending_approvals ?? 0) + (data?.rejected_vendors ?? 0);

  return (
    <>
      <PersonaCardShell
        title="Action centre"
        icon={Zap}
        tooltip="Top-of-mind queue across approvals, vendor responses, and PO state."
        actions={
          <>
            {urgentCount > 0 && (
              <span className={styles.urgentBadge}>
                {urgentCount} urgent
              </span>
            )}
            <span className={styles.liveBadge}>Live</span>
          </>
        }
        loading={loading}
        error={error}
        onRefresh={() => {
          setLoading(true);
          fetchData();
        }}
      >
        <div className={styles.actionGrid}>
          {ACTION_CARDS.map((card) => {
            const IconComponent = card.icon;
            const count = data?.[card.key] ?? 0;
            const isAttention = count > 0;

            const inner = (
              <>
                <div className={`${styles.iconChip} ${styles[card.accent]}`}>
                  <IconComponent size={14} />
                </div>
                <div className={styles.actionBody}>
                  <div className={styles.actionLabel}>
                    {card.label}
                    <CardTooltip text={card.tooltip} />
                  </div>
                  <div className={styles.countRow}>
                    <div className={`${styles.actionCount} ${isAttention ? styles[card.accent] : ""}`}>
                      {count}
                    </div>
                    {isAttention && card.statusLabel && (
                      <span className={`${styles.statusPill} ${styles[card.accent]}`}>
                        {card.statusLabel}
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
                <button
                  type="button"
                  key={card.key}
                  className={styles.actionItem}
                  onClick={openModal}
                >
                  {inner}
                </button>
              );
            }

            return (
              <Link key={card.key} href={card.href} className={styles.actionItem}>
                {inner}
              </Link>
            );
          })}
        </div>
      </PersonaCardShell>

      {showApprovalModal && (
        <PendingApprovalsModal onClose={() => setShowApprovalModal(false)} filters={filters} />
      )}
      {showRejectedModal && (
        <RejectedPOsModal onClose={() => setShowRejectedModal(false)} />
      )}
    </>
  );
};

export default ActionCenter;
