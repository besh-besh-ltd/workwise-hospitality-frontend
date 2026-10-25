import { useCallback, useEffect, useRef, useState } from "react";
import { resolveScan } from "@/services/inventory";
import { getApiErrorMessage } from "@/utils/apiError";
import { parseScan } from "./parseScan";
import { useWedgeScanner } from "./useWedgeScanner";
import scanFeedback from "./scanFeedback";

// One pipeline for every scan source: camera, keyboard-wedge scanner, typed.
//
//   read → parseScan → (camera duplicate guard) → GET /inventory/scan/resolve
//        → beep/buzz → onScan(result, { source, parsed })
//
// Duplicate guard: the camera sees a code many times a second while it sits
// in frame, so a camera read of a code already seen in the last 1.5 s is
// dropped, and every sighting restarts that 1.5 s (a code held in front of
// the lens is one scan). To count the same item again, take it out of frame
// for 1.5 s. Wedge and typed reads always count: each is a deliberate
// trigger pull or Enter.
//
// Resolves run one at a time in scan order, so results never arrive out of
// order when the network is slow.

export const CAMERA_DUPLICATE_WINDOW_MS = 1500;

export function useScanner({ onScan, context, enabled = true, wedge = true } = {}) {
  const [active, setActive] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const onScanRef = useRef(onScan);
  const contextRef = useRef(context);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    onScanRef.current = onScan;
    contextRef.current = context;
    enabledRef.current = enabled;
  });

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const seenByCamera = useRef(new Map());
  const queue = useRef(Promise.resolve());
  const inFlight = useRef(0);

  const isCameraRepeat = (code) => {
    const now = Date.now();
    const seen = seenByCamera.current;
    for (const [c, at] of seen) if (now - at >= CAMERA_DUPLICATE_WINDOW_MS) seen.delete(c);
    const repeat = seen.has(code);
    seen.set(code, now);
    return repeat;
  };

  const submit = useCallback((raw, source = "manual") => {
    if (!enabledRef.current) return false;
    const parsed = parseScan(raw);
    if (!parsed) return false;
    if (source === "camera" && isCameraRepeat(parsed.code)) return false;

    inFlight.current += 1;
    setPending(true);
    const job = async () => {
      let result = null;
      try {
        result = await resolveScan(parsed.code, contextRef.current);
      } catch (err) {
        scanFeedback.error();
        if (mounted.current) {
          setLastResult(null);
          // A hotel or PO the user can't see answers 404 exactly like one that
          // doesn't exist, so say both.
          const status = err?.response?.status ?? err?.message?.response?.status;
          setError(
            status === 404
              ? "This hotel or PO isn't available to you, or no longer exists."
              : getApiErrorMessage(err, "Could not look up that code. Try again.")
          );
        }
        return;
      } finally {
        inFlight.current -= 1;
        if (mounted.current && inFlight.current === 0) setPending(false);
      }
      if (!result || result.kind === "unknown") scanFeedback.error();
      else scanFeedback.success();
      if (!mounted.current) return;
      setError(null);
      setLastResult(result);
      onScanRef.current?.(result, { source, parsed });
    };
    queue.current = queue.current.then(job, job);
    return true;
  }, []);

  const onCameraCode = useCallback((raw) => submit(raw, "camera"), [submit]);
  const onWedgeCode = useCallback((raw) => submit(raw, "wedge"), [submit]);

  useWedgeScanner({ onCode: onWedgeCode, enabled: enabled && wedge });

  const start = useCallback(() => {
    scanFeedback.unlock();
    setActive(true);
  }, []);
  // `enabled` does not switch the camera off: tearing the stream down and
  // starting a new one costs a permission prompt on iOS home-screen apps.
  // While disabled, reads are simply dropped (submit returns false).
  const stop = useCallback(() => setActive(false), []);

  return { start, stop, active, lastResult, error, pending, submit, onCameraCode };
}

export default useScanner;
