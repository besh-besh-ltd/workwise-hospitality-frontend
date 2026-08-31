import { useCallback, useEffect, useRef, useState } from "react";
import { checkIdentity } from "@/services/Auth";

/**
 * Tells the form whether an email or mobile is already in use, while it is
 * being filled in (UM-1).
 *
 * Duplicates were only caught on submit, after the whole form was complete,
 * and came back as a generic error. Production already holds four duplicated
 * emails and six duplicated mobile numbers, one across four accounts, so this
 * is not a hypothetical tidy-up.
 *
 * Checks are debounced and the response is discarded if a newer one has been
 * asked for since. Without that, a slow answer for "priya@" can land after the
 * fast answer for "priya@example.com" and mark a perfectly good address taken.
 */
export const useIdentityAvailability = ({ excludeUserId = null, delay = 450 } = {}) => {
  const [status, setStatus] = useState({ email: null, mobile: null });
  const timers = useRef({});
  const sequence = useRef({ email: 0, mobile: 0 });

  useEffect(
    () => () => Object.values(timers.current).forEach(clearTimeout),
    []
  );

  const check = useCallback(
    (field, value) => {
      clearTimeout(timers.current[field]);
      const trimmed = (value || "").trim();

      if (!trimmed) {
        setStatus((s) => ({ ...s, [field]: null }));
        return;
      }

      const ticket = (sequence.current[field] += 1);
      setStatus((s) => ({ ...s, [field]: { state: "checking" } }));

      timers.current[field] = setTimeout(async () => {
        try {
          const res = await checkIdentity({
            [field]: trimmed,
            ...(excludeUserId ? { exclude_user_id: excludeUserId } : {}),
          });
          if (ticket !== sequence.current[field]) return;
          setStatus((s) => ({
            ...s,
            [field]: { state: res?.data?.[field]?.taken ? "taken" : "free" },
          }));
        } catch (err) {
          if (ticket !== sequence.current[field]) return;
          // A failed check must not block the form. The server checks again on
          // submit; this is a courtesy, not the gate.
          setStatus((s) => ({ ...s, [field]: null }));
        }
      }, delay);
    },
    [excludeUserId, delay]
  );

  const reset = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout);
    setStatus({ email: null, mobile: null });
  }, []);

  return { status, check, reset };
};

export default useIdentityAvailability;
