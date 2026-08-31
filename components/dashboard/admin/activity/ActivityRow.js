import React, { useState, useCallback } from "react";
import { BsChevronDown, BsChevronRight } from "react-icons/bs";
import { getActivityChanges } from "@/services/activity";
import InfoTip from "@/components/shared/InfoTip";
import {
  severityMeta,
  actorMeta,
  timeLabel,
  diffFields,
  formatValue,
} from "./activityPresentation";
import styles from "./Activity.module.css";

/**
 * One line of the trail, expandable into exactly what changed.
 *
 * The sentence is the content; everything else is scaffolding around it. The
 * expansion is what makes the line checkable rather than merely readable — it
 * joins to the row-level audit log and shows the columns that actually moved,
 * which is the difference between an activity feed and an audit trail.
 */
const ActivityRow = ({ event }) => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | ready | error

  const severity = severityMeta(event.severity);
  const actor = actorMeta(event.actor_type);

  const toggle = useCallback(async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (state === "ready" || state === "loading") return;
    setState("loading");
    try {
      const res = await getActivityChanges(event.id);
      setDetail(res?.data || null);
      setState("ready");
    } catch (err) {
      setState("error");
    }
  }, [open, state, event.id]);

  const changes = detail?.changes || [];
  const hasDetail = changes.length > 0;

  return (
    <li className={`${styles.row} ${severity.loud ? styles.rowLoud : ""}`}>
      {/* Three fixed columns: risk, time, what happened.
          Severity used to sit at the far right, a thousand pixels from where
          the eye starts, so you had to read the whole sentence to find out
          whether it mattered — and because the badges were right-aligned
          behind a variable number of chips, no two rows agreed on where that
          signal lived. Putting it first, at a fixed width, means running your
          eye down the left edge tells you the shape of the day without
          reading anything. */}
      <div className={styles.rowMain}>
        <span className={`${styles.risk} ${styles[`riskLvl_${event.severity}`]}`}>
          {severity.label}
        </span>

        <time className={styles.time} dateTime={event.occurred_at}>
          {timeLabel(event.occurred_at)}
        </time>

        <div className={styles.rowBody}>
          <button
            type="button"
            className={styles.rowToggle}
            onClick={toggle}
            aria-expanded={open}
          >
            <span className={styles.summary}>{event.summary}</span>
          </button>

          {/* Context is a quiet second line rather than a row of pills. Only
              the actor keeps a badge, and only when it is NOT ordinary company
              staff — a vendor, the platform, or Workwise's own people is the
              fact that changes how a line should be read. */}
          <div className={styles.rowMeta}>
            {event.actor_type !== "USER" && (
              <span
                className={`${styles.actorChip} ${actor.alert ? styles.actorChipAlert : ""}`}
              >
                {actor.label}
                <InfoTip label={`What "${actor.label}" means`} text={actor.hint} size={11} />
              </span>
            )}
            <span className={styles.metaText}>{event.category}</span>
            {event.is_reconstructed && (
              <span className={styles.reconstructed}>
                Reconstructed
                <InfoTip
                  label="What reconstructed means"
                  text="This line was rebuilt from records kept before the activity trail existed. It is accurate about what happened, but some details — sometimes including who did it — were never recorded at the time."
                  size={11}
                />
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className={styles.expand}
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? "Hide what changed" : "Show what changed"}
        >
          {open ? <BsChevronDown size={11} /> : <BsChevronRight size={11} />}
        </button>
      </div>

      {open && (
        <div className={styles.detail}>
          {state === "loading" && <p className={styles.detailNote}>Loading what changed…</p>}
          {state === "error" && (
            <p className={styles.detailNote}>Could not load the detail for this entry.</p>
          )}
          {state === "ready" && !hasDetail && (
            <p className={styles.detailNote}>
              No column-level record for this entry.{" "}
              {event.is_reconstructed
                ? "Reconstructed history predates the row-level audit log."
                : "This action did not change any audited table."}
            </p>
          )}
          {state === "ready" &&
            changes.map((change, i) => {
              const fields = diffFields(change);
              return (
                <div key={`${change.table_name}-${change.record_id}-${i}`} className={styles.change}>
                  <div className={styles.changeHead}>
                    <span className={styles.changeOp}>{change.operation}</span>
                    <span className={styles.changeTable}>
                      {change.table_name} #{change.record_id}
                    </span>
                  </div>
                  {fields.length === 0 ? (
                    <p className={styles.detailNote}>No field values changed.</p>
                  ) : (
                    <table className={styles.diff}>
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Before</th>
                          <th>After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map(({ field, from, to }) => (
                          <tr key={field}>
                            <td className={styles.diffField}>{field}</td>
                            <td className={styles.diffFrom}>{formatValue(from)}</td>
                            <td className={styles.diffTo}>{formatValue(to)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </li>
  );
};

export default ActivityRow;
