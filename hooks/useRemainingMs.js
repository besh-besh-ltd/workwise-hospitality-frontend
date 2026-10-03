import { useEffect, useState } from "react";

/**
 * Milliseconds left until `deadlineEpoch`, re-rendering ONLY the component
 * that calls it once a second while time remains (and never after it hits 0).
 *
 * Put this in the small leaf that displays a countdown — not in a page: a 1 s
 * state tick at page level re-renders everything below it every second.
 *
 * @param {number|null} deadlineEpoch - epoch ms; null/undefined → always 0, no timer
 * @returns {number} remaining ms (>= 0)
 */
const useRemainingMs = (deadlineEpoch) => {
  const compute = () =>
    deadlineEpoch == null ? 0 : Math.max(Number(deadlineEpoch) - Date.now(), 0);
  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    setRemaining(compute());
    if (deadlineEpoch == null || Number(deadlineEpoch) <= Date.now()) return undefined;
    const timer = setInterval(() => {
      const next = compute();
      setRemaining(next);
      if (next <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineEpoch]);

  return remaining;
};

export default useRemainingMs;
