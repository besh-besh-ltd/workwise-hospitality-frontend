import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const KEY = "ihg:demo";

/**
 * What the demo remembers between screens.
 *
 * Without this, every navigation resets the story and the client watches you
 * re-do work you already did in front of them. With it, inviting vendors in
 * the wizard shows up on the RFQ, accepting the evaluator's marks sticks, and
 * approving a PO actually drains the queue on the dashboard.
 *
 * sessionStorage rather than localStorage on purpose: a fresh tab is a fresh
 * demo, so the next run always starts from a known state.
 */

const EMPTY = {
  invitedVendorIds: null,   // null = wizard not run yet; array once chosen
  negotiationTargets: {},   // vendorId -> target rate
  evalMarks: {},            // "vendorId:clauseId" -> { mark, source }
  poDecisions: {},          // poId -> { decision, by, at }
  aiRun: {},                // featureKey -> true, so a screen can show it has run
};

const DemoContext = createContext(null);

export const DemoProvider = ({ children }) => {
  const [state, setState] = useState(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  // Restore after mount — reading storage during render would desync SSR.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch (_) {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }, [state, hydrated]);

  const patch = useCallback((fn) => setState((s) => ({ ...s, ...fn(s) })), []);

  const value = useMemo(
    () => ({
      ...state,
      hydrated,

      inviteVendors: (ids) => patch(() => ({ invitedVendorIds: ids })),

      setNegotiationTarget: (vendorId, rate) =>
        patch((s) => ({ negotiationTargets: { ...s.negotiationTargets, [vendorId]: rate } })),

      setNegotiationTargets: (map) => patch(() => ({ negotiationTargets: map })),

      setEvalMark: (vendorId, clauseId, mark, source = "human") =>
        patch((s) => ({ evalMarks: { ...s.evalMarks, [`${vendorId}:${clauseId}`]: { mark, source } } })),

      setEvalMarks: (map) => patch((s) => ({ evalMarks: { ...s.evalMarks, ...map } })),

      decidePo: (poId, decision, by) =>
        patch((s) => ({ poDecisions: { ...s.poDecisions, [poId]: { decision, by, at: Date.now() } } })),

      markAiRun: (key) => patch((s) => ({ aiRun: { ...s.aiRun, [key]: true } })),

      /** Back to a clean run. The presenter's undo button. */
      resetDemo: () => {
        try { window.sessionStorage.removeItem(KEY); } catch (_) {}
        setState(EMPTY);
      },
    }),
    [state, hydrated, patch]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside <DemoProvider>");
  return ctx;
};

export default DemoContext;
