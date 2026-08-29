"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { BsCheck2Circle } from "react-icons/bs";
import {
  getStuckApprovals,
  getReassignmentCandidates,
  reassignApprover,
} from "@/services/approval";
import Loader from "@/components/shared/Loader";
import InfoTip from "@/components/shared/InfoTip";
import styles from "./Approvals.module.css";

/**
 * What is stuck — the operational half of Approvals.
 *
 * The screen this replaces did not exist, and the reason it matters is a
 * number: production holds 332 pending approvals, 198 of them older than a
 * month. An admin asked "is anything stuck?" could only be told "332 things,
 * probably", which is the same as not being told.
 *
 * Almost none of them are waiting on a person. Classified, they are 215 whose
 * work has already moved past the point where approving changes anything, 114
 * waiting on somebody who could act right now, and 3 where nobody can act at
 * all. So the screen leads with those three counts and defaults to the one
 * that needs an administrator today, rather than opening on a list of 332.
 *
 * Each class carries its own recommended action, because "stuck" means three
 * different things and only one of them is fixed by chasing somebody.
 */

const CLASS_META = {
  blocked: {
    label: "Nobody can act",
    tone: "danger",
    hint: "Every approver on the current step has either been removed from it or had their account switched off. These cannot move without you.",
    action: "Reassign to someone who can approve",
  },
  waiting: {
    label: "Waiting on someone",
    tone: "warn",
    hint: "A person who can act has this. It is not broken — it may just need a reminder.",
    action: "Chase the approver, or reassign if they are away",
  },
  overtaken: {
    label: "No longer matters",
    tone: "muted",
    hint: "The work moved past this approval. An RFQ whose bid window has closed can take no more quotes, so approving it now changes nothing. These are better cancelled than chased.",
    action: "Cancel — approving changes nothing",
  },
};

const ENTITY_LABEL = {
  RFQ: "RFQ",
  PO: "Purchase order",
  NEGOTIATION: "Negotiation",
  NEGOTIATION_QUOTE: "Negotiation quote",
  TECHNICAL: "Technical evaluation",
  ARC: "Rate contract",
  ARC_PUBLISH: "Rate contract",
};

const ageLabel = (days) => {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 60) return `${days} days`;
  return `${Math.round(days / 30)} months`;
};

const StuckApprovals = () => {
  // Opens on the class that needs an administrator today. A screen that opens
  // on all 332 rows has already failed at the only question being asked.
  const [selectedClass, setSelectedClass] = useState("blocked");
  const [data, setData] = useState({ counts: null, items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reassigning, setReassigning] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStuckApprovals({ classes: selectedClass, limit: 100 });
      setData(res?.data || { counts: null, items: [], total: 0 });
      setError(null);
    } catch (err) {
      setError("Could not load what is waiting for approval.");
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = data.counts || { blocked: 0, waiting: 0, overtaken: 0, total: 0 };
  const meta = CLASS_META[selectedClass];

  const nothingAtAll = useMemo(
    () => counts.blocked === 0 && counts.waiting === 0 && counts.overtaken === 0,
    [counts]
  );

  if (loading && !data.counts) return <Loader />;

  if (error) return <div className={styles.errorBanner}>{error}</div>;

  if (nothingAtAll) {
    return (
      <div className={styles.emptyState}>
        <BsCheck2Circle size={28} />
        <h2>Nothing is waiting</h2>
        <p>Every approval in your company has been decided.</p>
      </div>
    );
  }

  return (
    <div className={styles.stuck}>
      {/* Counts are company-wide and do not move with the selection below —
          "3 blocked" has to mean three in the company. */}
      <div className={styles.classTabs} role="tablist" aria-label="Kind of hold-up">
        {Object.entries(CLASS_META).map(([key, m]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selectedClass === key}
            className={`${styles.classTab} ${styles[`tone_${m.tone}`]} ${
              selectedClass === key ? styles.classTabOn : ""
            }`}
            onClick={() => setSelectedClass(key)}
          >
            <span className={styles.classCount}>{counts[key] ?? 0}</span>
            <span className={styles.classLabel}>{m.label}</span>
          </button>
        ))}
      </div>

      <p className={styles.classHint}>
        {meta.hint}
        <InfoTip label={`What "${meta.label}" means`} text={meta.hint} />
      </p>

      {data.items.length === 0 && (
        <div className={styles.emptyState}>
          <BsCheck2Circle size={24} />
          <h2>Nothing in this state</h2>
          <p>Nothing in your company is currently {meta.label.toLowerCase()}.</p>
        </div>
      )}

      <ul className={styles.stuckList}>
        {data.items.map((item) => (
          <StuckRow
            key={item.id}
            item={item}
            recommendation={meta.action}
            onReassigned={load}
            reassigning={reassigning}
            setReassigning={setReassigning}
          />
        ))}
      </ul>
    </div>
  );
};

/** One held-up approval, and who it is held up on. */
const StuckRow = ({ item, recommendation, onReassigned, reassigning, setReassigning }) => {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState(null);
  const [toUserId, setToUserId] = useState("");
  const [fromUserId, setFromUserId] = useState("");
  const [reason, setReason] = useState("");

  const approvers = item.approvers || [];
  const busy = reassigning === item.id;

  const openReassign = async () => {
    setOpen(true);
    // Default to the approver who is actually in the way, so the common case
    // is one click rather than a lookup.
    const stuckOn = approvers.find((a) => !a.can_act) || approvers[0];
    setFromUserId(stuckOn ? String(stuckOn.user_id) : "");
    if (candidates === null) {
      try {
        const res = await getReassignmentCandidates(item.id);
        setCandidates(res?.data || []);
      } catch (err) {
        setCandidates([]);
      }
    }
  };

  const submit = async () => {
    setReassigning(item.id);
    try {
      await reassignApprover(item.id, {
        from_user_id: Number(fromUserId),
        to_user_id: Number(toUserId),
        reason: reason.trim(),
      });
      toast.success("Approval reassigned");
      setOpen(false);
      setReason("");
      onReassigned();
    } catch (err) {
      toast.error(
        err?.message?.response?.data?.message || "Could not reassign this approval"
      );
    } finally {
      setReassigning(null);
    }
  };

  return (
    <li className={styles.stuckRow}>
      <div className={styles.stuckMain}>
        <div className={styles.stuckWhat}>
          <span className={styles.stuckEntity}>
            {ENTITY_LABEL[item.entity_type] || item.entity_type} #{item.entity_id}
          </span>
          <span className={styles.stuckUnit}>
            {item.hotel_name || item.company_name || "—"}
          </span>
        </div>

        <div className={styles.stuckWho}>
          <span className={styles.stuckWhoLabel}>Waiting on</span>
          <span className={styles.stuckApprovers}>
            {approvers.length === 0 && <em>nobody — this step has no approvers</em>}
            {approvers.map((a) => (
              <span
                key={a.user_id}
                className={`${styles.approverChip} ${a.can_act ? "" : styles.approverDead}`}
              >
                {a.name || `User #${a.user_id}`}
                {/* Why they cannot act, in words. A greyed-out name alone
                    leaves the admin guessing between "left the company" and
                    "was taken off this step deliberately". */}
                {a.row_status === "REMOVED" && (
                  <span className={styles.approverWhy}>
                    removed{a.removal_reason ? ` — ${a.removal_reason}` : ""}
                  </span>
                )}
                {a.row_status !== "REMOVED" && !a.account_active && (
                  <span className={styles.approverWhy}>account deactivated</span>
                )}
              </span>
            ))}
          </span>
        </div>

        <div className={styles.stuckAge}>
          <span className={styles.stuckAgeValue}>{ageLabel(item.age_days)}</span>
          <span className={styles.stuckAgeLabel}>waiting</span>
        </div>

        <button
          type="button"
          className={styles.reassignBtn}
          onClick={() => (open ? setOpen(false) : openReassign())}
          disabled={busy}
        >
          {open ? "Cancel" : "Reassign"}
        </button>
      </div>

      <p className={styles.stuckAdvice}>{recommendation}</p>

      {open && (
        <div className={styles.reassignPanel}>
          <label className={styles.reassignField}>
            <span>Take it off</span>
            <select value={fromUserId} onChange={(e) => setFromUserId(e.target.value)}>
              {approvers.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.name || `User #${a.user_id}`}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.reassignField}>
            <span>Give it to</span>
            <select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
              <option value="">Choose a person…</option>
              {(candidates || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </label>

          <label className={styles.reassignField}>
            <span>Why</span>
            <input
              type="text"
              value={reason}
              placeholder="e.g. On leave until the end of the month"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          {/* The reason is recorded against the person taken off and shown in
              the activity trail. Saying so before the click is fairer than
              discovering it afterwards. */}
          <p className={styles.reassignNote}>
            This is recorded against {" "}
            {approvers.find((a) => String(a.user_id) === fromUserId)?.name || "the approver"} and
            shown in the activity trail.
          </p>

          <button
            type="button"
            className={styles.reassignConfirm}
            disabled={busy || !toUserId || reason.trim().length < 10}
            onClick={submit}
          >
            {busy ? "Reassigning…" : "Reassign approval"}
          </button>
        </div>
      )}
    </li>
  );
};

export default StuckApprovals;
