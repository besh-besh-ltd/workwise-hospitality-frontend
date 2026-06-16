// Single-page RFQ workspace shell — mirrors the ARC lifecycle page
// (rate-contracts/[contractId]). Fetches GET /rfq/:id/lifecycle, renders a hero
// + horizontal RfqStageTimeline + the selected stage. The current stage
// auto-opens; ?stage= deep-links; drafts redirect to the edit flow.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import * as RfqApi from "@/services/rfq";
import RfqStageTimeline from "@/components/dashboard/buyer/rfq/RfqStageTimeline";
import { StageSkeleton } from "@/components/dashboard/buyer/rfq/stages/StageShared";
import OverviewStage from "@/components/dashboard/buyer/rfq/stages/OverviewStage";
import TechnicalStage from "@/components/dashboard/buyer/rfq/stages/TechnicalStage";
import NegotiationAwardStage from "@/components/dashboard/buyer/rfq/stages/NegotiationAwardStage";
import PurchaseOrderStage from "@/components/dashboard/buyer/rfq/stages/PurchaseOrderStage";

const STAGE_KEYS = ["overview", "technical", "negotiation-award", "purchase-order"];

export default function RfqLifecycleShell() {
  const router = useRouter();
  const rfqId = router.query.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stageKey, setStageKey] = useState(null);
  const [lockedNote, setLockedNote] = useState("");

  const load = useCallback(async () => {
    const res = await RfqApi.getRfqLifecycle(rfqId);
    const payload = res?.data || null;
    setData(payload);
    return payload;
  }, [rfqId]);

  useEffect(() => {
    if (!rfqId) return;
    let cancelled = false;
    setLoading(true);
    load()
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [rfqId, load]);

  // Drafts live in the edit flow, not here.
  useEffect(() => {
    if (data && (data.rfq?.status === "draft" || data.default_stage === null)) {
      router.replace(`/dashboard/buyer/rfq-management-edit?id=${rfqId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.rfq?.status, data?.default_stage]);

  // Stage selection — honour ?stage= when valid + unlocked, else default.
  useEffect(() => {
    if (!data || !data.stages?.length || !router.isReady) return;
    const q = typeof router.query.stage === "string" ? router.query.stage : null;
    const target = q && STAGE_KEYS.includes(q) ? data.stages.find((s) => s.key === q) : null;
    if (target && target.state !== "locked") {
      setStageKey(q);
      return;
    }
    if (target && target.state === "locked") {
      setLockedNote(`${target.label} isn't reachable yet — finish the current stage first.`);
    }
    setStageKey((prev) => prev || data.default_stage);
    if (!q) {
      router.replace(
        { pathname: router.pathname, query: { ...router.query, stage: data.default_stage } },
        undefined, { shallow: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, router.isReady]);

  const select = (key) => {
    setStageKey(key);
    setLockedNote("");
    router.replace(
      { pathname: router.pathname, query: { ...router.query, stage: key } },
      undefined, { shallow: true }
    );
  };

  const onRefresh = useCallback(async ({ advance = false } = {}) => {
    const fresh = await load();
    if (advance && fresh?.default_stage) {
      setStageKey(fresh.default_stage);
      router.replace(
        { pathname: router.pathname, query: { ...router.query, stage: fresh.default_stage } },
        undefined, { shallow: true }
      );
    }
    return fresh;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, router]);

  if (loading) {
    return <div className="arc-shell" style={{ padding: 20 }}><StageSkeleton /></div>;
  }
  if (!data?.rfq) {
    return (
      <div className="empty-state" style={{ padding: "60px 24px" }}>
        <h2>Unable to load this RFQ</h2>
        <p>The RFQ could not be found, or you don't have access to it.</p>
      </div>
    );
  }
  // Draft is mid-redirect (handled by the effect above).
  if (data.rfq.status === "draft" || data.default_stage === null) {
    return <div className="arc-shell" style={{ padding: 20 }}><StageSkeleton /></div>;
  }

  const rfq = data.rfq;
  const permissions = data.permissions || {};
  const stage = data.stages.find((s) => s.key === stageKey) || data.stages[0];
  const has = (resource, action) =>
    (permissions[resource] || []).includes(action) || (permissions["rfq"] || []).includes("admin");
  const stageProps = { rfq, lifecycle: data, stage, permissions, onRefresh };

  return (
    <div className="arc-shell" style={{ padding: "18px 20px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero */}
      <div className="arc-hero">
        <div className="arc-hero-top">
          <div>
            <div className="ah-eyebrow">RFQ workspace</div>
            <h1 className="ah-title">
              {rfq.title || `RFQ #${rfq.rfq_no || rfq.id}`}
              <span className="ah-num mono"> #{rfq.rfq_no || rfq.id}</span>
            </h1>
          </div>
        </div>
      </div>

      <RfqStageTimeline stages={data.stages} selectedKey={stageKey} onSelect={select} />

      {lockedNote && (
        <div className="guide warn" style={{ alignItems: "center" }}>
          <div>{lockedNote}</div>
        </div>
      )}

      <div className="arc-stage-body">
        {stage?.key === "overview" && (has("rfq", "read") || true ? <OverviewStage {...stageProps} /> : null)}
        {stage?.key === "technical" && <TechnicalStage {...stageProps} />}
        {stage?.key === "negotiation-award" && <NegotiationAwardStage {...stageProps} />}
        {stage?.key === "purchase-order" && <PurchaseOrderStage {...stageProps} />}
      </div>
    </div>
  );
}
