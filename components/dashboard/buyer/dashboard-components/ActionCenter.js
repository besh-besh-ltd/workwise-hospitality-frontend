import React, { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, FileText, Clock, Package, UserX, Zap } from "lucide-react";
import { getActionCenterData } from "@/services/dashboard";
import InfoTip from "@/components/shared/InfoTip";
import PendingApprovalsModal from "./PendingApprovalsModal";
import RejectedPOsModal from "./RejectedPOsModal";
import NoResponseModal from "./NoResponseModal";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonKpiGrid } from "@/components/dashboard/shared";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import styles from "./ActionCenter.module.scss";

// Order follows client request (Sr 231): Pending approvals → PO rejected by
// vendors (red, "To be Actioned") → No responses → RFQs ending → PO pending.
const ACTION_CARDS = [
  {
    key: "pending_approvals",
    label: "Pending approvals",
    tooltip: "RFQs, ARCs, negotiations or POs waiting for your approval action",
    icon: ClipboardCheck,
    accent: "danger",
    statusLabel: "Urgent",
    href: null,
    modal: "approvals",
  },
  {
    key: "rejected_vendors",
    label: "PO rejected",
    tooltip: "POs rejected by vendors that need to be reassigned",
    icon: UserX,
    accent: "danger",
    statusLabel: "To be Actioned",
    href: null,
    modal: "rejected",
  },
  {
    key: "rfqs_awaiting",
    label: "No responses",
    tooltip: "Published RFQs that haven't received any vendor quotes yet",
    icon: FileText,
    accent: "warn",
    statusLabel: "Action",
    href: null,
    modal: "noresponse",
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
];

const ActionCenter = ({ filters }) => {
  // A work queue — polls while the tab is visible.
  const { data, loading, error, stale, refetch } = useDashboardQuery(getActionCenterData, filters, { poll: true });
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [showNoResponseModal, setShowNoResponseModal] = useState(false);

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
        stale={stale}
        skeleton={<SkeletonKpiGrid count={ACTION_CARDS.length} />}
        onRefresh={refetch}
      >
        <div className={styles.actionGrid}>
          {ACTION_CARDS.map((card) => {
            const IconComponent = card.icon;
            const count = data?.[card.key] ?? 0;
            const isAttention = count > 0;

            const inner = (
              <>
                <div className={styles.actionHead}>
                  <div className={styles.actionLabel}>
                    {card.label}
                    <InfoTip text={card.tooltip} />
                  </div>
                  <div className={`${styles.iconChip} ${styles[card.accent]}`}>
                    <IconComponent size={13} />
                  </div>
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
              </>
            );

            const itemClass = `${styles.actionItem} ${styles[card.accent]}`;

            if (!card.href) {
              const openModal = () => {
                if (card.modal === "rejected") setShowRejectedModal(true);
                else if (card.modal === "noresponse") setShowNoResponseModal(true);
                else setShowApprovalModal(true);
              };
              return (
                <button
                  type="button"
                  key={card.key}
                  className={itemClass}
                  onClick={openModal}
                >
                  {inner}
                </button>
              );
            }

            return (
              <Link key={card.key} href={card.href} className={itemClass}>
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
        <RejectedPOsModal onClose={() => setShowRejectedModal(false)} filters={filters} />
      )}
      {showNoResponseModal && (
        <NoResponseModal onClose={() => setShowNoResponseModal(false)} filters={filters} />
      )}
    </>
  );
};

export default ActionCenter;
