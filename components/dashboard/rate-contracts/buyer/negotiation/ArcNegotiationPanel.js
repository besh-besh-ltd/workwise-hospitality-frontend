// ArcNegotiationPanel — CommercialStage sub-panel showing ARC negotiation rounds.
// Sits inline within CommercialStage.
// On mount: fetches getArcNegotiationRounds; shows + Create round button (canEvaluate+editable).

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import * as ArcApi from "@/services/arc_v2";
import ArcRoundsList from "./ArcRoundsList";

export default function ArcNegotiationPanel({ arc, items, vendors, qualifiedMap, canEvaluate, editable, onAfterChange }) {
  const router = useRouter();
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);

  const fetchRounds = useCallback(async () => {
    if (!arc?.id) return;
    try {
      const res = await ArcApi.getArcNegotiationRounds(arc.id);
      if (!cancelledRef.current) {
        setRounds(Array.isArray(res?.data) ? res.data : []);
      }
    } catch { /* interceptor */ }
    finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [arc?.id]);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    fetchRounds();
    return () => { cancelledRef.current = true; };
  }, [fetchRounds]);

  const handleAfterChange = useCallback(async () => {
    await fetchRounds();
    onAfterChange && await onAfterChange();
  }, [fetchRounds, onAfterChange]);

  const canCreate = canEvaluate && editable;

  return (
    <div className="arc-neg-panel">
      <div className="arc-neg-panel-head">
        <div className="arc-neg-panel-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12l7-7 7 7" /></svg>
          Negotiation
          {rounds.length > 0 && (
            <span className="arc-neg-panel-count">{rounds.length}</span>
          )}
        </div>
        {canCreate && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => router.push(`/dashboard/buyer/rate-contracts/${arc.id}/negotiation/create`)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Create round
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--fg-3)", padding: "8px 0" }}>
          Loading negotiation rounds…
        </div>
      ) : rounds.length === 0 ? (
        <div className="guide" style={{ margin: 0 }}>
          <div className="g-ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          </div>
          <div>
            <strong>No negotiation rounds yet.</strong>
            {canCreate
              ? " Create one to invite vendors to revise their rates before you award."
              : " No rounds have been initiated on this ARC."}
          </div>
        </div>
      ) : (
        <ArcRoundsList
          rounds={rounds}
          arcId={arc.id}
          canEvaluate={canEvaluate}
          onAfterChange={handleAfterChange}
        />
      )}
    </div>
  );
}
