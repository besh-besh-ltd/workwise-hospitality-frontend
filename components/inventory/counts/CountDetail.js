import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, EyeOff, Lock, RotateCcw } from "lucide-react";
import { getCount } from "@/services/inventory";
import { getApiErrorMessage } from "@/utils/apiError";
import CountSession, { stripFlags } from "./CountSession";
import CountReview from "./CountReview";
import { COUNTS_PATH, SCOPE_LABEL, errorInfo, fmtDateTime, statusMeta } from "./countUtils";
import styles from "./counts.module.scss";

// /dashboard/buyer/inventory/counts/[id]: an open count is counted here
// (CountSession); a submitted, approved or cancelled one is reviewed
// (CountReview). The server's `can:{count, approve}` decides the actions.

const CountDetail = ({ id }) => {
  const [count, setCount] = useState(null);
  const [failure, setFailure] = useState(null); // {notFound, message}
  // Every load and every count a save hands back takes a number; an answer
  // older than the latest is dropped, so a slow GET never puts back figures a
  // save has moved past.
  const seq = useRef(0);

  /** Fetch the count; resolves it, or null when it failed or a newer count arrived meanwhile. */
  const load = useCallback(async () => {
    const n = ++seq.current;
    setFailure(null);
    try {
      const data = await getCount(id);
      if (n !== seq.current) return null;
      if (!data) {
        setCount(null);
        setFailure({ notFound: true, message: "Count not found" });
        return null;
      }
      const fresh = stripFlags(data);
      setCount(fresh);
      return fresh;
    } catch (err) {
      if (n !== seq.current) return null;
      const { httpStatus, code } = errorInfo(err);
      const notFound = httpStatus === 404 || code === "NOT_FOUND";
      if (notFound) setCount(null); // gone (or out of reach) since it was opened
      setFailure({ notFound, message: getApiErrorMessage(err, "Could not load this count") });
      return null;
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onCountChange = useCallback((next) => {
    if (!next || typeof next !== "object") return;
    seq.current += 1;
    setCount(stripFlags(next));
  }, []);

  if (!count) {
    return (
      <div className={styles.page}>
        <div className={styles.pageBody}>
          {failure ? (
            <div className={styles.stateCard}>
              <h1 className={styles.stateTitle}>{failure.notFound ? "Count not found" : "Could not load this count"}</h1>
              <p className={styles.muted}>
                {failure.notFound ? "It may have been removed, or it belongs to a hotel you can't see." : failure.message}
              </p>
              <div className={styles.stateActions}>
                <Link href={COUNTS_PATH} className={`${styles.btn} ${styles.btnSecondary}`}>
                  <ChevronLeft size={15} aria-hidden="true" />
                  All counts
                </Link>
                {!failure.notFound && (
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={load}>
                    <RotateCcw size={15} aria-hidden="true" />
                    Try again
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.skeleton} aria-busy="true" aria-label="Loading count">
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
      </div>
    );
  }

  const meta = statusMeta(count.status);
  return (
    <div className={styles.page}>
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headMain}>
            <div className={styles.eyebrow}>
              <Link href={COUNTS_PATH}>
                <ChevronLeft size={12} aria-hidden="true" />
                Counts
              </Link>
            </div>
            <h1 className={styles.pageTitle}>
              <span className={styles.mono}>{count.countNumber || `Count #${count.id}`}</span>
              <span className={`${styles.pill} ${styles[`tone_${meta.tone}`]}`}>
                <span className={styles.dot} aria-hidden="true" />
                {meta.label}
              </span>
            </h1>
            <div className={styles.headMeta}>
              <span>{count.hotelName}</span>
              <span>{SCOPE_LABEL[count.scope] || count.scope}</span>
              {count.isBlind && (
                <span className={styles.metaFlag}>
                  <EyeOff size={12} aria-hidden="true" />
                  Blind
                </span>
              )}
              {count.startedAt && (
                <span>{`Started ${fmtDateTime(count.startedAt)}${count.createdByName ? ` by ${count.createdByName}` : ""}`}</span>
              )}
              {count.submittedAt && <span>{`Submitted ${fmtDateTime(count.submittedAt)}`}</span>}
            </div>
          </div>
        </div>
      </section>

      <main className={styles.pageBody}>
        {/* `countFreeze` is the hotel's effective setting, sent on the count. Only an open count freezes. */}
        {count.countFreeze === true && count.status === "open" && (
          <div className={`${styles.notice} ${styles.noticeWarn}`}>
            <Lock size={16} aria-hidden="true" />
            <span>
              {`Stock at ${count.hotelName || "this hotel"} is frozen while this count is open: mark-out, returns and adjustments wait until it is submitted or cancelled.`}
            </span>
          </div>
        )}
        {count.status === "open" ? (
          <CountSession count={count} onCountChange={onCountChange} onReload={load} />
        ) : (
          <CountReview count={count} onCountChange={onCountChange} onReload={load} />
        )}
      </main>
    </div>
  );
};

export default CountDetail;
