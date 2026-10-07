import React from "react";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";
import { formatDisplayDate, formatRemainingDuration } from "@/utils/sharedFunctions";
import useRemainingMs from "@/hooks/useRemainingMs";

// The "locked until deadline" banner on Quote Compare, with its own 1 s
// countdown. It lives in its own component so the tick re-renders this banner
// only — the page used to hold the clock, which re-rendered the whole
// products × vendors workspace every second while quotes were locked.
const QuoteLockCountdownBanner = ({ deadline, deadlineEpoch, fallbackRemainingMs = 0 }) => {
  const liveRemaining = useRemainingMs(deadlineEpoch);
  const remainingMs = deadlineEpoch != null ? liveRemaining : fallbackRemainingMs;
  return (
    <ReadOnlyBanner
      title="Quote Comparison Locked Until Deadline"
      message={`Quotes will appear after the quote submission deadline passes. Deadline: ${formatDisplayDate(
        deadline,
        { includeTime: true }
      )}. Time remaining: ${formatRemainingDuration(remainingMs)}.`}
      badgeText="View Only"
      className="mt-0"
    />
  );
};

export default QuoteLockCountdownBanner;
