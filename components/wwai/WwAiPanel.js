import React, { useEffect, useRef } from "react";
import axiosInstance from "@/lib/axios";

/**
 * The signed-off AI panel, mounted inside the real portal.
 *
 * `lib/wwai/ai-engine.js` is the prototype's engine, copied across unchanged.
 * It is vanilla JS that renders into a DOM node, so React's job here is only
 * to produce the shell the engine expects and then get out of the way — which
 * is why the output is identical to the prototypes rather than a lookalike.
 *
 * The shell markup below is lifted from the prototype pages verbatim; the
 * engine finds `.ww-ai-body` and `.ww-ai-run` inside it by class.
 */

const SPARK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';

const WwAiPanel = ({
  id,
  title,
  sub,
  runLabel = "Run analysis",
  className = "",
  buildPlan,
  autoRun = false,
  // When the panel has nothing to analyse yet. The engine binds its own click
  // handler on the run button, so blocking has to happen at the button — and
  // the reason has to be visible, or it reads as a dead control.
  disabled = false,
  disabledHint,
}) => {
  const rootRef = useRef(null);
  // Held in a ref so re-renders never re-bind the click handler, and the
  // engine always calls the freshest builder.
  const planRef = useRef(buildPlan);
  planRef.current = buildPlan;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Imported for its side effect: the engine assigns window.WWAi.
      await import("@/lib/wwai/ai-engine");
      // The panels are vanilla JS lifted from the prototype, so they cannot
      // import the app's axios. The demo's API IS that axios instance (the
      // mock is an adapter on it), so a raw fetch from a panel would leave the
      // app and hit nothing. This is the bridge back in.
      if (!window.WWApi) {
        window.WWApi = {
          post: (url, body) => axiosInstance.post(url, body),
          get: (url, config) => axiosInstance.get(url, config),
        };
      }
      if (cancelled || !rootRef.current || !window.WWAi) return;

      window.WWAi.attach(rootRef.current, () => planRef.current());
      if (autoRun && !disabledRef.current) {
        setTimeout(() => {
          if (!cancelled && rootRef.current) window.WWAi.run(rootRef.current, planRef.current());
        }, 260);
      }
    })();

    return () => { cancelled = true; };
  }, [autoRun]);

  return (
    <section ref={rootRef} className={`ww-ai ${className}`} id={id} data-state="idle">
      <div className="ww-ai-head">
        <span className="ww-ai-mark" dangerouslySetInnerHTML={{ __html: SPARK }} />
        <div>
          <div className="ww-ai-title">{title}</div>
          <div className="ww-ai-sub">{sub}</div>
        </div>
        <div className="ww-ai-head-right">
          <span className="ww-ai-chip beta">Beta</span>
          <button
            type="button"
            className="ww-ai-run"
            disabled={disabled}
            title={disabled ? disabledHint : undefined}
          >
            <span dangerouslySetInnerHTML={{ __html: SPARK }} />
            {runLabel}
          </button>
        </div>
      </div>
      {disabled && disabledHint && <div className="ww-ai-waiting">{disabledHint}</div>}
      <div className="ww-ai-body" hidden />
    </section>
  );
};

export default WwAiPanel;
