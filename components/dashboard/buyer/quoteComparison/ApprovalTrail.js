// Approval trail drawer for the Negotiation & Award tab.
//
// Upper management and moderators open this to answer three questions at a
// glance: who has already acted, who the thing is sitting with right now, and
// who is blocked behind that. The old drawer answered none of them past the
// first level — it drew one timeline row per LEVEL and, when a level held more
// than one approver, dropped the rest into an undifferentiated row of grey name
// chips with no state on them at all. A seven-person level showed one name and
// six anonymous chips; a cleared ANY level showed six people who were never
// asked as if they were still holding it up.
//
// So the level is now the unit: a collapsible card per level, the live one open
// by default, and inside it the roster split into groups that each say what
// that group means — outstanding first (that is what the reader came for),
// then the people who acted, then the ones no longer needed, then the
// tombstones. This is the same structure and the same words as the RFQ page's
// PO approval panel (rfq/stages/PurchaseOrderStage.js ApprovalLevel); the two
// describe the same approval engine and must not describe it differently. The
// shared reading rules live in buyer/approval/approverState.js — only the
// markup and the stylesheet differ, because that page is not CSS-modules.
//
// Two things this file is deliberately careful about:
//
//   • REMOVED approvers. A mid-flight reconciler tombstones an approver whose
//     role or scope was revoked while the approval was open. Those rows stay
//     visible for the audit trail, but they are their own group, last, struck
//     through, labelled with the literal word "Removed", and counted in a
//     separate aggregate that can never reach an "N of M". Rendering them as
//     live pending approvers was a P0 on this codebase once already.
//
//   • ANY vs ALL. Under ALL every unacted approver blocks; under ANY, once one
//     clears, the rest are moot. When `decision_rule` is missing from the
//     payload this file says NOTHING about the rule and never names who a
//     non-live level is waiting on, rather than assuming the friendlier of the
//     two readings.
import { useEffect, useRef, useState } from "react";
import moment from "moment";
import { ArrowRight, Check, ChevronDown, Clock, GitBranch, X } from "lucide-react";

import { removalReasonLabel } from "@/components/dashboard/buyer/rfq/stages/StageShared";
import {
  approverStateLabel,
  levelPill,
  namePreview,
  ruleLabel,
  tallyStep,
} from "@/components/dashboard/buyer/approval/approverState";
import styles from "./QuoteComparison.module.scss";

/* ── payload adapters ──────────────────────────────────────────────────── */

// The drawer's payload (quoteCompareViewModel.buildQuoteApprovalData) describes
// each node with a DISPLAY status — lowercase, and with "current" as a value,
// which the stored column has no equivalent for. The shared reading rules speak
// the stored uppercase vocabulary, so the node is translated into a step here
// rather than teaching those rules a second dialect. An unrecognised status is
// passed through untouched: `levelPill` title-cases it into a neutral chip and
// nothing downstream can turn it into a class name.
const STEP_STATUS_FROM_NODE = {
  done: "APPROVED",
  rejected: "REJECTED",
  current: "PENDING",
  pending: "PENDING",
  skipped: "SKIPPED",
  removed: "REMOVED",
};
const stepFromNode = (node) => ({
  status: STEP_STATUS_FROM_NODE[String(node?.status || "")] || node?.status || "",
  // Added to the payload alongside `user_id` / `acted_at`; absent on a build
  // that predates it, and absent is a state this file renders honestly rather
  // than papering over. Never defaulted.
  decision_rule: node?.decision_rule || null,
  approvers: Array.isArray(node?.approvers) ? node.approvers : [],
});

const isTerminal = (node) => node?.kind === "terminal";
// A trail node is a LEVEL if it stands for an approval step. The leading "Sent
// for approval" node and the trailing outcome node are milestones, not levels:
// nobody is an approver on them, so they get no toggle and no roster.
const isLevel = (node) =>
  !isTerminal(node) &&
  (/^step-\d+$/.test(String(node?.key || "")) ||
    (Array.isArray(node?.approvers) && node.approvers.length > 0));

// How many approvals this level actually needs. Under ANY, one — so a level
// that five people COULD have cleared and one of them did is "1 of 1", not
// "1 of 5", which reads as four approvals still owed on a level that closed.
// Under ALL it is every approver still standing (REMOVED rows are tombstones
// and can never be part of a requirement).
//
// When the rule is missing this returns the ALL count. That is the deliberate
// direction to fail in: it can overstate what is left, never understate it, and
// it is what the RFQ page's PO panel (PurchaseOrderStage) shows unconditionally
// — so on a payload without `decision_rule` the two surfaces agree exactly, and
// where they differ (an ANY level) the rule is named on the line above.
const approvalsNeeded = (decisionRule, activeTotal) =>
  String(decisionRule || "").toUpperCase() === "ANY" ? Math.min(1, activeTotal) : activeTotal;
const levelNoOf = (node) => {
  const m = /^step-(\d+)$/.exec(String(node?.key || ""));
  return m ? Number(m[1]) : null;
};
// "L3" for the header and for anything that has to point AT a level; falls back
// to the server's own title, which already reads "L3 approval".
const levelLabel = (node) => {
  const n = levelNoOf(node);
  return n ? `L${n}` : node?.title || "This level";
};

/* ── formatting ────────────────────────────────────────────────────────── */

// The ONE way this panel writes an instant. Every timestamp on the drawer is a
// full instant in the payload — `acted_at`, the level's `when` and `removed_at`
// all arrive as ISO strings off quoteCompareViewModel.buildQuoteApprovalData —
// so nothing here has any business rendering a date on its own.
//
// It used to. The milestone line ("Sent for approval — Ash I · 11 Aug 2026 ·
// 03:50 PM") used this; the approver rows and the level's "cleared" summary used
// a second, day-only formatter. That made the panel useless for the question it
// is actually opened to answer on a busy day — not WHETHER someone approved but
// WHEN, against a bid deadline or another approval on the same date. Two people
// clearing a level four hours apart both read "11 Aug 2026".
const fmtWhen = (d) => {
  if (d == null || d === "") return null;
  const m = moment(d);
  return m.isValid() ? m.format("DD MMM YYYY · hh:mm A") : null;
};

const initialsOf = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

// Tone tokens are a closed set — `levelPill` and the row states below only ever
// produce one of these four — so an unknown status can reach the TEXT of a chip
// but never its class name.
const TONE_CLASS = {
  success: styles.apToneSuccess,
  danger: styles.apToneDanger,
  warn: styles.apToneWarn,
  neutral: styles.apToneNeutral,
};
const toneClass = (tone) => TONE_CLASS[String(tone || "").split(" ")[0]] || TONE_CLASS.neutral;

// An approver row's tone follows its effective state. PENDING is the one that
// depends on where it sits: on the live level it is the thing holding the award
// up (amber); on a level nobody has reached yet it is simply not this person's
// turn, and colouring that as attention-needed would point the reader at the
// wrong row.
const rowTone = (eff, onLiveLevel) => {
  if (eff === "APPROVED") return "success";
  if (eff === "REJECTED") return "danger";
  if (eff === "PENDING") return onLiveLevel ? "warn" : "neutral";
  return "neutral";
};

/* ── pieces ────────────────────────────────────────────────────────────── */

const GroupLabel = ({ tone, children }) => (
  <div className={`${styles.apGroup} ${tone === "warn" ? styles.apGroupWarn : ""}`}>{children}</div>
);

function ApproverRow({ ap, eff, onLiveLevel }) {
  const when = fmtWhen(ap?.acted_at);
  const muted = eff === "NOT_REQUIRED" || eff === "NOT_REACHED";
  return (
    <div className={`${styles.apRow} ${muted ? styles.apRowMuted : ""}`}>
      <span className={styles.apAvatar}>{ap?.initials || initialsOf(ap?.name)}</span>
      <span className={styles.apRowMeta}>
        <span className={styles.apRowName}>{ap?.name || "Approver"}</span>
        {ap?.role ? <span className={styles.apRowRole}>{ap.role}</span> : null}
      </span>
      <span className={styles.apRowRight}>
        <span className={`${styles.apState} ${toneClass(rowTone(eff, onLiveLevel))}`}>
          {approverStateLabel(eff)}
        </span>
        {when ? <span className={styles.apWhen}>{when}</span> : null}
      </span>
    </div>
  );
}

// A tombstone. Struck through, spelled out in words, and — because grey text at
// reduced opacity is grey text nobody can read — muted with a solid colour
// rather than a stack of opacities.
function RemovedApproverRow({ ap }) {
  const reason = ap?.removal_reason ? removalReasonLabel(ap.removal_reason) : null;
  const when = fmtWhen(ap?.removed_at);
  return (
    <div className={`${styles.apRow} ${styles.apRowRemoved}`}>
      <span className={styles.apAvatar}>{ap?.initials || initialsOf(ap?.name)}</span>
      <span className={styles.apRowMeta}>
        <span className={`${styles.apRowName} ${styles.apStruck}`}>{ap?.name || "Approver"}</span>
        <span className={styles.apRowRole}>{reason ? `Removed · ${reason}` : "Removed"}</span>
      </span>
      <span className={styles.apRowRight}>
        <span className={`${styles.apState} ${styles.apToneNeutral}`}>Removed</span>
        {when ? <span className={styles.apWhen}>{when}</span> : null}
      </span>
    </div>
  );
}

// "Sent for approval" and the outcome node. Not levels: no toggle, no roster,
// nothing to expand.
function MilestoneNode({ node, last }) {
  const done = node?.status === "done";
  const sub = [node?.by, fmtWhen(node?.when), node?.note].filter(Boolean).join(" · ");
  return (
    <div className={`${styles.apMilestone} ${last ? styles.apMilestoneLast : ""}`}>
      <span className={`${styles.apMilestoneDot} ${toneClass(done ? "success" : "neutral")}`}>
        {done ? <Check size={12} strokeWidth={2.6} /> : <ArrowRight size={12} strokeWidth={2.6} />}
      </span>
      <span className={styles.apMilestoneMeta}>
        <span className={styles.apMilestoneTitle}>{node?.title}</span>
        {sub ? <span className={styles.apMilestoneSub}>{sub}</span> : null}
      </span>
    </div>
  );
}

// One collapsible level. A level can hold twenty approvers, so the ROSTER is
// what collapses — never the state: the header keeps the level number, the
// rule, the N-of-M, what it is blocked behind and (when shut) who it is waiting
// on, so a closed level still answers "what happened here?" in visible text.
// It is a real <button aria-expanded aria-controls>, not a div with a click
// handler, so it is reachable and operable from the keyboard and announces its
// own state.
function ApprovalLevelCard({ node, nodeKey, isCurrent, blockedBy, open, onToggle, idPrefix }) {
  const step = stepFromNode(node);
  const t = tallyStep(step);
  const needed = approvalsNeeded(step.decision_rule, t.total);
  const rule = ruleLabel(step.decision_rule);
  const pill = levelPill(step.status, isCurrent);
  // The same resolved key the open-state is filed under, so `aria-controls`
  // stays unique even on a payload whose nodes carry no key of their own —
  // several levels answering to one id would point every toggle at the first
  // roster on the panel.
  const bodyId = `${idPrefix}-${nodeKey}`;

  // Only ever the people genuinely outstanding on the LIVE level. On a level
  // nobody has reached, no one has been asked yet; on a settled level the
  // engine has moved past them. Naming either as "waiting on" would be a claim
  // about who is holding the award up that the payload does not support —
  // especially with `decision_rule` absent, where we cannot tell a blocker from
  // a bystander.
  const waitingOn = isCurrent ? namePreview(t.outstanding.map((r) => r.ap?.name)) : null;
  // Safe to carry a "·"-separated instant into a "·"-separated meta line only
  // because this clause is always the LAST one: `blockedBy` needs status
  // "pending" and `waitingOn` needs the live level, and a done/rejected level is
  // neither. Nothing can follow the time and be mistaken for part of it.
  const settledOn =
    (node?.status === "done" || node?.status === "rejected") && fmtWhen(node?.when)
      ? `${pill.text.toLowerCase()} ${fmtWhen(node.when)}`
      : null;

  return (
    <div className={`${styles.apLevel} ${isCurrent ? styles.apLevelCurrent : ""}`}>
      <button type="button" className={styles.apLevelBtn} onClick={onToggle} aria-expanded={open} aria-controls={bodyId}>
        <span className={styles.apLevelTitle}>
          <span className={styles.apLevelNo}>{levelLabel(node)}</span>
          {rule ? <span className={styles.apLevelRule}>· {rule}</span> : null}
        </span>
        <span className={styles.apLevelRight}>
          <span className={`${styles.apState} ${toneClass(pill.cls)}`}>{pill.text}</span>
          <ChevronDown size={14} strokeWidth={2.2} className={`${styles.apChev} ${open ? styles.apChevOpen : ""}`} />
        </span>
        {/* The state a collapsed level still has to answer for. Removed and
            not-required are separate counts so neither can inflate the
            fraction. */}
        <span className={styles.apLevelMeta}>
          {t.total > 0 ? `${t.approved} of ${needed} approved` : "No approvers on this level"}
          {t.notRequired.length > 0 ? ` · ${t.notRequired.length} not required` : ""}
          {t.notReached.length > 0 ? ` · ${t.notReached.length} not reached` : ""}
          {t.removed.length > 0 ? ` · ${t.removed.length} removed` : ""}
          {settledOn ? ` · ${settledOn}` : ""}
          {blockedBy ? ` · blocked until ${blockedBy} clears` : ""}
          {!open && waitingOn ? ` · waiting on ${waitingOn}` : ""}
        </span>
      </button>
      {/* Mounted and unmounted, not animated open: a height transition on a
          list this variable is a layout property the browser cannot cheaply
          animate, and a collapsed level's children must not stay in the
          accessibility tree. */}
      {open && (
        <div id={bodyId} className={styles.apLevelBody}>
          {t.outstanding.length > 0 && (
            <>
              <GroupLabel tone={isCurrent ? "warn" : undefined}>
                {isCurrent ? `Waiting on (${t.outstanding.length})` : `Not yet acted (${t.outstanding.length})`}
              </GroupLabel>
              {t.outstanding.map((r, i) => (
                <ApproverRow key={`p-${r.ap?.user_id ?? i}`} ap={r.ap} eff={r.eff} onLiveLevel={isCurrent} />
              ))}
            </>
          )}
          {t.acted.length > 0 && (
            <>
              <GroupLabel>Already acted ({t.acted.length})</GroupLabel>
              {t.acted.map((r, i) => (
                <ApproverRow key={`a-${r.ap?.user_id ?? i}`} ap={r.ap} eff={r.eff} onLiveLevel={false} />
              ))}
            </>
          )}
          {/* An ANY level clears on one approval and leaves everyone else
              stored as PENDING for good — they were never asked, so they read
              as such rather than as people we are still waiting on. */}
          {t.notRequired.length > 0 && (
            <>
              <GroupLabel>Not required ({t.notRequired.length})</GroupLabel>
              {t.notRequired.map((r, i) => (
                <ApproverRow key={`nr-${r.ap?.user_id ?? i}`} ap={r.ap} eff={r.eff} onLiveLevel={false} />
              ))}
            </>
          )}
          {/* Rejected or cancelled before their turn came round. */}
          {t.notReached.length > 0 && (
            <>
              <GroupLabel>Not reached ({t.notReached.length})</GroupLabel>
              {t.notReached.map((r, i) => (
                <ApproverRow key={`nx-${r.ap?.user_id ?? i}`} ap={r.ap} eff={r.eff} onLiveLevel={false} />
              ))}
            </>
          )}
          {t.removed.length > 0 && (
            <>
              <GroupLabel>Removed ({t.removed.length})</GroupLabel>
              {t.removed.map((r, i) => (
                <RemovedApproverRow key={`r-${r.ap?.user_id ?? i}`} ap={r.ap} />
              ))}
            </>
          )}
          {node?.reason ? <div className={styles.apReason}>Reason: “{node.reason}”</div> : null}
        </div>
      )}
    </div>
  );
}

/* ── the trail ─────────────────────────────────────────────────────────── */

export function ApprovalTrail({ trail, idPrefix }) {
  // Keyed by the server's own node key, never by array index: the drawer
  // refetches while it is open, and on an index key an approval that advances
  // (or a level the reconciler removes) would silently re-point every open
  // state at a different level. Only the reader's OVERRIDES are stored, so the
  // default — the live level, open — keeps following the data across refetches
  // instead of freezing at whatever was live when the drawer was first opened.
  const [openKeys, setOpenKeys] = useState({});
  const toggle = (key, current) => setOpenKeys((o) => ({ ...o, [key]: !current }));

  const nodes = Array.isArray(trail) ? trail : [];
  // Progress counts LEVELS. Skipped and removed nodes are excluded from both
  // sides — they will never be acted on (bypassed or voided) — and so is the
  // synthetic "Sent for approval" node, which the old drawer counted as a
  // cleared step: on a one-level approval that had not been touched yet it
  // rendered "1 of 2 done", where the 1 was the act of sending it.
  const levelNodes = nodes.filter(
    (n) => isLevel(n) && n.status !== "skipped" && n.status !== "removed"
  );
  const doneCount = levelNodes.filter((n) => n.status === "done").length;

  const currentIdx = nodes.findIndex((n) => !isTerminal(n) && n.status === "current");
  const currentNode = currentIdx >= 0 ? nodes[currentIdx] : null;
  const rejectedNode = nodes.find((n) => !isTerminal(n) && n.status === "rejected") || null;
  const completed = nodes.some((n) => isTerminal(n) && n.status === "done");

  // Who it is with right now: the outstanding roster of the live level — the
  // people who still owe it an action. Whether one of them is enough or all of
  // them are needed is the level's own rule, named on the level's header.
  const nowWith = currentNode
    ? namePreview(tallyStep(stepFromNode(currentNode)).outstanding.map((r) => r.ap?.name))
    : null;

  const headline = currentNode
    ? nowWith
      ? `Now with ${nowWith}`
      : `Now at ${levelLabel(currentNode)}`
    : rejectedNode
      ? `Rejected at ${levelLabel(rejectedNode)}`
      : completed
        ? "Approval complete"
        : "Not with an approver yet";

  return (
    <>
      <div className={styles.apSummary}>
        <span className={styles.apSummaryCount}>
          {levelNodes.length > 0
            ? `${doneCount} of ${levelNodes.length} ${levelNodes.length === 1 ? "level" : "levels"} cleared`
            : "No approval levels on this item"}
        </span>
        <span className={`${styles.apSummaryNow} ${currentNode ? styles.apSummaryLive : ""}`}>
          {currentNode ? <Clock size={12} strokeWidth={2.4} /> : null}
          {headline}
        </span>
      </div>

      <div className={styles.apTrail}>
        {nodes.map((node, i) => {
          if (!isLevel(node)) {
            return <MilestoneNode key={node.key || i} node={node} last={i === nodes.length - 1} />;
          }
          const isCurrent = currentIdx >= 0 && i === currentIdx;
          // A level after the live one has not been asked anything yet: it is
          // blocked, and saying what it is blocked behind is the third question
          // this drawer exists to answer.
          const blocked = currentIdx >= 0 && i > currentIdx && node.status === "pending";
          const key = node.key || `node-${i}`;
          // Open by default: the level that needs someone right now, and the
          // level a rejection ended on — where the reason lives, and the only
          // thing a rejected trail is read for.
          const fallbackOpen = isCurrent || node.status === "rejected";
          const open = key in openKeys ? openKeys[key] : fallbackOpen;
          return (
            <ApprovalLevelCard
              key={key}
              node={node}
              nodeKey={key}
              isCurrent={isCurrent}
              blockedBy={blocked ? levelLabel(currentNode) : null}
              open={open}
              onToggle={() => toggle(key, open)}
              idPrefix={idPrefix}
            />
          );
        })}
      </div>
    </>
  );
}

/* ── the drawer ────────────────────────────────────────────────────────── */

export default function ApprovalTrailDrawer({ product, vendorName, onClose }) {
  const shellRef = useRef(null);
  const titleId = `qc-ap-title-${product?.id ?? "x"}`;
  const trail = product?.approval?.trail || [];

  // The drawer is portaled to the end of <body>, so without this a keyboard
  // user who opens it has to tab the entire page to reach it and has nowhere to
  // land when it closes. Focus moves in on open and returns to whatever opened
  // it on close — including the Escape path, which unmounts this component and
  // so runs the same cleanup.
  useEffect(() => {
    const trigger = document.activeElement;
    shellRef.current?.focus({ preventScroll: true });
    return () => {
      if (
        trigger &&
        trigger !== document.body &&
        typeof trigger.focus === "function" &&
        document.contains(trigger)
      ) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <aside
      ref={shellRef}
      tabIndex={-1}
      className={styles.apDrawer}
      role="dialog"
      aria-labelledby={titleId}
    >
      <div className={styles.apHead}>
        <div className={styles.apHeadT}>
          <div className={`${styles.modalHeadIc} ${styles.modalHeadIcInfo}`}>
            <GitBranch size={15} />
          </div>
          <div>
            <h3 id={titleId}>Approval trail</h3>
            <div className={styles.sub}>
              <strong style={{ color: "var(--fg)" }}>{product?.name}</strong>
              {vendorName && <> · awarded to {vendorName}</>}
            </div>
          </div>
        </div>
        <button className={styles.iconBtn} onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className={styles.apBody}>
        {trail.length === 0 ? (
          <div className={styles.apEmpty}>No approval activity yet for this item.</div>
        ) : (
          <ApprovalTrail trail={trail} idPrefix={`qc-ap-${product?.id ?? "x"}`} />
        )}
      </div>
    </aside>
  );
}
