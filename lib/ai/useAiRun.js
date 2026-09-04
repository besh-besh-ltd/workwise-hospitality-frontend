import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The engine behind all five AI features.
 *
 * Every feature supplies the same shape — a list of reasoning steps and a
 * function that produces the result — and this hook plays them back: steps
 * tick past one at a time with their own dwell, then the result appears.
 *
 * Why scripted rather than a live model call: this runs in front of a client.
 * A scripted run cannot rate-limit, time out, cost money, or say something
 * about IHG's own data that we have not read first. The staging is what sells
 * it — a result that snaps in instantly reads as a lookup, not as work.
 *
 * An engine looks like:
 *   { steps: [{ label, detail?, ms }], compute: (input) => result }
 */
export const useAiRun = (engine, input) => {
  const [status, setStatus] = useState("idle"); // idle | running | done
  const [stepIndex, setStepIndex] = useState(-1);
  const [result, setResult] = useState(null);

  // Bumped on reset/unmount so an in-flight run knows to abandon itself
  // rather than writing state into a component that has moved on.
  const runToken = useRef(0);

  useEffect(() => () => { runToken.current += 1; }, []);

  const run = useCallback(async () => {
    const token = ++runToken.current;
    setStatus("running");
    setResult(null);
    setStepIndex(-1);

    for (let i = 0; i < engine.steps.length; i += 1) {
      if (runToken.current !== token) return;
      setStepIndex(i);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, engine.steps[i].ms ?? 600));
    }

    if (runToken.current !== token) return;
    setStepIndex(engine.steps.length);
    setResult(engine.compute(input));
    setStatus("done");
  }, [engine, input]);

  const reset = useCallback(() => {
    runToken.current += 1;
    setStatus("idle");
    setStepIndex(-1);
    setResult(null);
  }, []);

  return {
    status,
    isIdle: status === "idle",
    isRunning: status === "running",
    isDone: status === "done",
    steps: engine.steps.map((s, i) => ({
      ...s,
      state: i < stepIndex ? "done" : i === stepIndex ? "active" : "pending",
    })),
    result,
    run,
    reset,
  };
};

export default useAiRun;
