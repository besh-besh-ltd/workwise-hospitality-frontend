// ARC — single authoritative lifecycle page (buyer).
//
// One page for the entire ARC journey. A server-computed stage timeline
// (GET /v1/arc-v2/:id/lifecycle) drives five working tabs:
//   Overview → Technical Evaluation → Commercial → Awarding → Contract Active
// Locked stages can't be opened; completed stages stay viewable read-only;
// partial stages remain editable. Per-stage permission gating happens inside
// each stage component using lifecycle.permissions (computed server-side
// from the ARC's own hotel/department scope).
//
// Deep links: ?stage=<key> selects a stage (?tab= passes through to the
// Contract Active stage's internal sub-tabs). The old per-status routes
// (/tech-eval, /comm-eval, /committee, /active) redirect here.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import * as ArcApi from "@/services/arc_v2";
import ArcStageTimeline from "@/components/dashboard/rate-contracts/buyer/stages/ArcStageTimeline";
import { StageNoPermission } from "@/components/dashboard/rate-contracts/buyer/stages/StageShared";
import OverviewStage from "@/components/dashboard/rate-contracts/buyer/stages/OverviewStage";
import TechnicalStage from "@/components/dashboard/rate-contracts/buyer/stages/TechnicalStage";
import CommercialStage from "@/components/dashboard/rate-contracts/buyer/stages/CommercialStage";
import AwardingStage from "@/components/dashboard/rate-contracts/buyer/stages/AwardingStage";
import ActiveStage from "@/components/dashboard/rate-contracts/buyer/stages/ActiveStage";
import LifecycleHero from "@/components/dashboard/shared/LifecycleHero";

const STAGE_KEYS = ["overview", "technical", "commercial", "awarding", "active"];

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Status chip from the real lifecycle enum.
function statusChip(status) {
  if (!status) return { cls: "draft", label: "—" };
  if (status === "draft") return { cls: "draft", label: "Draft" };
  if (["floated", "submission_closed"].includes(status)) return { cls: "floated", label: status === "floated" ? "Floated" : "Submission closed" };
  if (status.startsWith("tech_eval")) return { cls: "eval", label: "Technical evaluation" };
  if (status.startsWith("comm_eval")) return { cls: "eval", label: "Commercial evaluation" };
  if (status.startsWith("committee")) return { cls: "committee", label: "Committee review" };
  if (["contract_generated", "awaiting_vendor_acceptance"].includes(status)) return { cls: "awaiting", label: "Awaiting vendor sign" };
  if (status === "contract_active") return { cls: "active", label: "Active" };
  if (status === "expiring_soon") return { cls: "expiring", label: "Expiring soon" };
  if (status === "expired") return { cls: "expired", label: "Expired" };
  if (status === "terminated") return { cls: "expired", label: "Terminated" };
  if (status === "closed_no_award") return { cls: "expired", label: "Closed · no award" };
  return { cls: "draft", label: status };
}

export default function ArcLifecyclePage() {
  const router = useRouter();
  const { contractId } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stageKey, setStageKey] = useState(null);
  const [lockedNote, setLockedNote] = useState("");

  const load = useCallback(async () => {
    const res = await ArcApi.getLifecycle(contractId);
    const payload = res?.data || null;
    setData(payload);
    return payload;
  }, [contractId]);

  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    setLoading(true);
    load()
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractId, load]);

  // Drafts live in the create wizard, not here.
  useEffect(() => {
    if (data?.arc?.status === "draft") {
      router.replace(`/dashboard/buyer/rate-contracts/create?c=${contractId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.arc?.status]);

  // Stage selection — honour ?stage= when valid + unlocked, else default.
  useEffect(() => {
    if (!data || !router.isReady) return;
    const q = typeof router.query.stage === "string" ? router.query.stage : null;
    const target = q && STAGE_KEYS.includes(q) ? data.stages.find((s) => s.key === q) : null;
    if (target && target.state !== "locked") {
      setStageKey(q);
      return;
    }
    if (target && target.state === "locked") {
      setLockedNote(`${target.label} is locked — ${target.reason === "window_open" ? "it unlocks when the quotation window closes" : target.reason === "technical_incomplete" ? "complete Technical Evaluation first" : target.reason === "commercial_incomplete" ? "complete Commercial first" : "it isn't reachable yet"}.`);
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

  // Stage components call this after mutations. `advance: true` jumps to the
  // fresh default stage (used right after the user's action completed their
  // current stage, e.g. finalize → Awarding); plain refresh never yanks.
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

  if (loading) return <ShellSkeleton />;
  if (!data?.arc) {
    return (
      <main className="main-body">
        <div className="empty-state">
          <h2>Rate contract not found</h2>
          <p>It may have been removed, or you may not have access to it.</p>
        </div>
      </main>
    );
  }

  const { arc, stages, permissions } = data;
  const chip = statusChip(arc.status);
  const stage = stages.find((s) => s.key === stageKey) || stages[0];
  const perms = permissions || {};
  const has = (resource, action) => (perms[resource] || []).includes(action) || (perms["arc"] || []).includes("admin");

  const stageProps = { arc, lifecycle: data, stage, permissions: perms, onRefresh };

  return (
    <main className="main-body">
      {/* ── HERO (shared LifecycleHero — same component as the RFQ details page) ── */}
      <LifecycleHero
        eyebrow="Rate Contract · lifecycle"
        title={arc.title}
        status={{ label: chip.label, tone: chip.cls }}
        idText={`#${arc.arc_number}`}
        back={{ label: "Back to rate contracts", href: "/dashboard/buyer/rate-contracts" }}
        sub={
          <>
            {arc.category_title && (<><span>{arc.category_title}</span><span className="sep">·</span></>)}
            {arc.hotel_name && (<><span>{arc.hotel_name}</span><span className="sep">·</span></>)}
            {arc.department_title && (<><span>{arc.department_title}</span><span className="sep">·</span></>)}
            <span>
              Created by <span className="em">{arc.created_by_name || `User #${arc.created_by}`}</span> · {fmtDate(arc.created_at)}
            </span>
          </>
        }
        actions={<HeroActions arc={arc} onRefresh={onRefresh} />}
        meta={[
          { label: "Submission window", value: <><span className="em">{fmtDate(arc.submission_start_at)}</span> → <span className="em">{fmtDate(arc.submission_end_at)}</span></> },
          { label: "Contract term", value: <><span className="em">{fmtDate(arc.contract_start_at)}</span> → <span className="em">{fmtDate(arc.contract_end_at)}</span></> },
          { label: "Eligibility", value: <span className="em">{arc.eligibility_type === "open" ? "Open tender" : "Invitation-only"}</span> },
          { label: "Lifecycle", value: <><span className="em">{stages.filter((s) => ["complete", "skipped"].includes(s.state)).length} of {stages.length}</span> stages complete</> },
          { label: "Scope", value: <span className="em">Single-BU</span> },
        ]}
      />

      {/* ── STAGE RAIL ── */}
      <ArcStageTimeline stages={stages} selectedKey={stage.key} onSelect={select} />

      {lockedNote && (
        <div className="guide warn" style={{ alignItems: "center" }}>
          <div className="g-ic" style={{ marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <div>{lockedNote}</div>
        </div>
      )}

      {/* ── SELECTED STAGE ── */}
      {stage.key === "overview" && (
        has("arc", "read")
          ? <OverviewStage {...stageProps} />
          : <StageNoPermission stageLabel="the Overview" />
      )}
      {stage.key === "technical" && <TechnicalStage {...stageProps} />}
      {stage.key === "commercial" && <CommercialStage {...stageProps} />}
      {stage.key === "awarding" && <AwardingStage {...stageProps} />}
      {stage.key === "active" && (
        has("arc", "read")
          ? <ActiveStage {...stageProps} />
          : <StageNoPermission stageLabel="Contract Active" />
      )}
    </main>
  );
}

// Withdraw — lifted from the old detail hero. (Terminate ARC is not offered in V1.)
function HeroActions({ arc, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const canWithdraw = ["floated"].includes(arc.status);
  if (!canWithdraw) return null;

  const withdraw = async () => {
    if (!window.confirm("Withdraw this rate contract? Vendors will be notified.")) return;
    setBusy(true);
    try { await ArcApi.withdraw(arc.id); await onRefresh(); } finally { setBusy(false); }
  };

  return (
    <>
      {canWithdraw && (
        <button className="btn" disabled={busy} onClick={withdraw}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
          Withdraw
        </button>
      )}
    </>
  );
}

// ── shell skeleton: hero + timeline + stage body ──
const Sk = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

function ShellSkeleton() {
  return (
    <main className="main-body">
      <section className="arc-sk-hero">
        <Sk w={170} h={11} style={{ marginBottom: 12 }} />
        <Sk w="48%" h={24} style={{ marginBottom: 10 }} />
        <Sk w="62%" h={12} style={{ marginBottom: 18 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <Sk w="70%" h={9} style={{ marginBottom: 7 }} />
              <Sk w="85%" h={14} />
            </div>
          ))}
        </div>
      </section>
      <div style={{ display: "flex", gap: 8, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 6 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "10px 16px" }}>
            <Sk w={28} h={28} r={999} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Sk w="75%" h={12} style={{ marginBottom: 5 }} />
              <Sk w="55%" h={9} />
            </div>
          </div>
        ))}
      </div>
      <div className="arc-sk-tile">
        <Sk w={220} h={15} style={{ marginBottom: 16 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < 3 ? "1px dashed var(--border)" : "none" }}>
            <Sk w={34} h={34} r={8} style={{ flexShrink: 0 }} />
            <Sk w="50%" h={13} style={{ flex: 1 }} />
            <Sk w={90} h={20} r={99} />
          </div>
        ))}
      </div>
    </main>
  );
}
