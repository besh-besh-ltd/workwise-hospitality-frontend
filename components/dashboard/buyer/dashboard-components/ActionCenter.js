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
import { rfqListView, poTracking } from "@/components/dashboard/shared/dashboardLinks";
import styles from "./ActionCenter.module.scss";

// Order follows client request (Sr 231): Pending approvals → PO rejected
// (red, "To be Actioned") → No responses → RFQs ending → PO pending.
// Every tile is a live queue — none of them is filtered by the date range.
export const ACTION_CARDS = [
  {
    key: "pending_approvals",
    label: "Pending approvals",
    tooltip: "Decisions waiting for you right now — RFQs, technical evaluations, negotiated quotes, POs, ARCs. Several approval steps on the same item count once.",
    icon: ClipboardCheck,
    accent: "danger",
    statusLabel: "Urgent",
    href: null,
    modal: "approvals",
  },
  {
    key: "rejected_total",
    value: (d) => (d?.rejected_vendors ?? 0) + (d?.rejected_in_approval ?? 0),
    sub: (d) => `${d?.rejected_vendors ?? 0} by vendor · ${d?.rejected_in_approval ?? 0} in approval`,
    label: "POs rejected",
    tooltip: "Purchase orders rejected by the vendor or by an approver whose items have not been re-ordered yet.",
    icon: UserX,
    accent: "danger",
    statusLabel: "To be Actioned",
    href: null,
    modal: "rejected",
  },
  {
    key: "rfqs_awaiting",
    label: "No responses",
    tooltip: "Open, published RFQs that have not received a real quote yet (a regret does not count).",
    icon: FileText,
    accent: "warn",
    statusLabel: "Action",
    href: null,
    modal: "noresponse",
  },
  {
    key: "rfqs_ending_soon",
    label: "RFQs ending soon",
    tooltip: "RFQs still open for bidding whose deadline is within the next 72 hours.",
    icon: Clock,
    accent: "info",
    statusLabel: "Near",
    href: rfqListView("closing_soon"),
  },
  {
    key: "pos_awaiting",
    label: "PO pending",
    tooltip: "Approved purchase orders sent to vendors and waiting for them to accept.",
    icon: Package,
    accent: "muted",
    statusLabel: null,
    href: poTracking({ tab: "active" }),
  },
];

const ActionCenter = ({ filters }) => {
  // A work queue — polls while the tab is visible.
  const { data, loading, error, stale, refetch } = useDashboardQuery(getActionCenterData, filters, { poll: true });
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [showNoResponseModal, setShowNoResponseModal] = useState(false);

  const urgentCount =
    (data?.pending_approvals ?? 0) + (data?.rejected_vendors ?? 0) + (data?.rejected_in_approval ?? 0);

  return (
    <>
      <PersonaCardShell
        title="Action centre"
        icon={Zap}
        tooltip="What needs attention now across approvals, vendor responses and purchase orders. These are live queues, not filtered by the date range."
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
            const count = card.value ? card.value(data) : data?.[card.key] ?? 0;
            const sub = card.sub && count > 0 ? card.sub(data) : null;
            const isAttention = count > 0;

            const inner = (
              <>
                <div className={styles.actionHead}>
                  <div className={styles.actionLabel}>
                    {card.label}
                    {/* Sits above the stretched card target so it stays its own control. */}
                    <span className={styles.tipLayer}>
                      <InfoTip text={card.tooltip} />
                    </span>
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
                {sub && <div className={styles.actionSub}>{sub}</div>}
              </>
            );

            const itemClass = `${styles.actionItem} ${styles[card.accent]}`;
            // The whole tile is clickable through one stretched target (its
            // ::after covers the card) rather than by wrapping the tile in a
            // button: the info tip is itself a button, and a button inside a
            // button is invalid HTML that React flags on hydration.
            const targetLabel = `${card.label}: ${count}`;

            let target;
            if (!card.href) {
              const openModal = () => {
                if (card.modal === "rejected") setShowRejectedModal(true);
                else if (card.modal === "noresponse") setShowNoResponseModal(true);
                else setShowApprovalModal(true);
              };
              target = (
                <button
                  type="button"
                  className={styles.cardTarget}
                  onClick={openModal}
                  aria-label={targetLabel}
                />
              );
            } else {
              target = (
                <Link href={card.href} className={styles.cardTarget} aria-label={targetLabel} />
              );
            }

            return (
              <div key={card.key} className={itemClass} data-testid={`action-${card.key}`}>
                {inner}
                {target}
              </div>
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
