import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { AdminGuard } from "@/utils/authGuard";
import { getApprovalPolicies, getGlobalArcApproverOptions } from "@/services/approval";
import GlobalArcWizard from "@/components/dashboard/admin/hospitality-manager/approval-hierarchy/wizard/GlobalArcWizard";
import { TENDER_PROCESS_STAGES } from "@/components/dashboard/admin/hospitality-manager/approval-hierarchy/constants";

// Page route for the Hospitality Network admin to configure the single
// network-wide Group ARC hierarchy. SECURITY: this page sends NO company_id
// to the backend — the server pins everything to req.user.company_id and
// scopes reads/writes to that tenant only.
//
// PICKER OPTIONS: per-stage. We fetch one approver-options endpoint per
// tender-chain entity_type (TENDER / TECHNICAL / NEGOTIATION /
// NEGOTIATION_QUOTE / ARC) — each returns ONLY roles + users that hold
// the matching <entity>.approve permission. The previous implementation
// pulled ALL company users + ALL roles, which let admins assign
// approvers who couldn't actually act on the entity.

const GlobalArcHierarchyPage = () => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);
  const hasAccess = userProfile?.is_hospitality === 1 || userProfile?.is_hospitality === "1";
  const companyName = userProfile?.company_name || "";

  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState([]);
  // Map of entity_type → { roles: [{id, title}], users: [{id, name, email}] }.
  // Each entry is the slice of approver candidates for that stage —
  // pre-filtered server-side to those holding <entity>.approve.
  const [approverOptionsByEntity, setApproverOptionsByEntity] = useState({});

  const refreshPolicies = useCallback(async () => {
    try {
      const res = await getApprovalPolicies({ is_global: 1, include: "steps" });
      setPolicies(res?.data?.data || res?.data || []);
    } catch (err) {
      toast.error(err?.message?.response?.data?.message || "Failed to load global hierarchy");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Fan out: one policies fetch + one approver-options fetch per
        // tender-chain stage. The 5 stage fetches run in parallel; total
        // round-trip cost is dominated by the slowest.
        const stageEntityTypes = TENDER_PROCESS_STAGES.map((st) => st.value);
        const [policiesRes, ...stageRes] = await Promise.all([
          getApprovalPolicies({ is_global: 1, include: "steps" }),
          ...stageEntityTypes.map((et) => getGlobalArcApproverOptions(et)),
        ]);
        if (cancelled) return;

        setPolicies(policiesRes?.data?.data || policiesRes?.data || []);

        const map = {};
        stageEntityTypes.forEach((et, idx) => {
          const data = stageRes[idx]?.data?.data || stageRes[idx]?.data || {};
          map[et] = {
            roles: (data.roles || []).map((r) => ({ id: r.id, title: r.title || r.name })),
            users: (data.users || []).map((u) => ({
              user_id: u.id || u.user_id,
              name: u.name,
              email: u.email,
            })),
          };
        });
        setApproverOptionsByEntity(map);
      } catch (err) {
        if (!cancelled) {
          toast.error("Failed to load admin data for the global hierarchy");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The wizard's StepConfigureStages calls getApproverOptions(sourceType,
  // entity_type). The per-stage map narrows the pool to candidates that
  // actually hold the matching approve permission for that entity.
  const getApproverOptions = useCallback(
    (sourceType, entityType) => {
      const slice = approverOptionsByEntity[entityType] || { roles: [], users: [] };
      if (sourceType === "USER") {
        return slice.users.map((u) => ({
          value: u.user_id,
          label: `${u.name}${u.email ? ` (${u.email})` : ""}`,
        }));
      }
      if (sourceType === "ROLE") {
        return slice.roles.map((r) => ({ value: r.id, label: r.title }));
      }
      return [];
    },
    [approverOptionsByEntity]
  );

  // Display info for an already-saved step. We may not have a slice for
  // the step's entity_type if the user navigated directly (defensive
  // fallback to scanning every slice for the id).
  const getApproverDisplayInfo = useCallback(
    (step, entityType) => {
      const lookupUser = (id) => {
        const slices = entityType
          ? [approverOptionsByEntity[entityType]]
          : Object.values(approverOptionsByEntity);
        for (const s of slices) {
          if (!s) continue;
          const u = s.users.find((x) => x.user_id === id);
          if (u) return u;
        }
        return null;
      };
      const lookupRole = (id) => {
        const slices = entityType
          ? [approverOptionsByEntity[entityType]]
          : Object.values(approverOptionsByEntity);
        for (const s of slices) {
          if (!s) continue;
          const r = s.roles.find((x) => x.id === id);
          if (r) return r;
        }
        return null;
      };
      if (step.approver_source_type === "USER") {
        const u = lookupUser(step.approver_source_id);
        return {
          name: u?.name || "Unknown User",
          email: u?.email || "",
          type: "User",
          typeLabel: "Specific User",
          users: u ? [u] : [],
        };
      }
      if (step.approver_source_type === "ROLE") {
        const r = lookupRole(step.approver_source_id);
        return {
          name: r?.title || "Unknown Role",
          email: "",
          type: "Role",
          typeLabel: "User Role",
          users: [],
        };
      }
      return { name: "Unknown", email: "", type: "", typeLabel: "", users: [] };
    },
    [approverOptionsByEntity]
  );

  if (!hasAccess) {
    return (
      <section className="buyer-sec-1">
        <div className="container-fluid">
          <div className="card buyer-card">
            <div className="card-body text-center py-5">
              <h4 className="mb-3">Hospitality access not enabled</h4>
              <p className="text-muted mb-4">
                Only hospitality companies can configure the Group ARC global hierarchy. Please contact Workwise support to enable hospitality access.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Status summary: which stages already have a global policy configured.
  const stageStatus = TENDER_PROCESS_STAGES.map((st) => {
    const policy = policies.find((p) => p.entity_type === st.value);
    return {
      ...st,
      configured: !!policy,
      stepCount: (policy?.steps || []).length,
    };
  });

  return (
    <AdminGuard>
      <Head>
        <title>Group ARC Global Hierarchy | Hospitality Manager</title>
      </Head>
      <section className="mb-4" style={{ marginTop: 64 }}>
        <div className="container-fluid" style={{ maxWidth: 1800 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#6c757d",
                  fontSize: 13,
                  padding: 0,
                  cursor: "pointer",
                  marginBottom: 6,
                }}
              >
                ← Back
              </button>
              <h2 style={{ margin: 0, fontWeight: 600, fontSize: 22 }}>Group ARC Global Hierarchy</h2>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <span className="spinner-border" role="status" />
              <p className="text-muted mt-3">Loading hierarchy…</p>
            </div>
          ) : (
            <>
              {/* Quick status grid: which stages are configured. */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {stageStatus.map((st) => (
                  <div
                    key={st.value}
                    style={{
                      background: "#fff",
                      border: `1px solid ${st.configured ? "#bbf7d0" : "#e9ecef"}`,
                      borderLeft: `3px solid ${st.configured ? "#22c55e" : "#cbd5e1"}`,
                      borderRadius: 8,
                      padding: "12px 14px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#6c757d", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>
                      {st.shortLabel}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1A2730", marginTop: 4 }}>
                      {st.label}
                    </div>
                    <div style={{ fontSize: 12, color: st.configured ? "#15803d" : "#dc2626", marginTop: 6 }}>
                      {st.configured
                        ? `${st.stepCount} approval level${st.stepCount === 1 ? "" : "s"}`
                        : "Not configured"}
                    </div>
                  </div>
                ))}
              </div>

              <GlobalArcWizard
                companyName={companyName}
                existingPolicies={policies}
                getApproverOptions={getApproverOptions}
                getApproverDisplayInfo={getApproverDisplayInfo}
                onSave={async () => {
                  await refreshPolicies();
                }}
                onCancel={() => router.back()}
              />
            </>
          )}
        </div>
      </section>
    </AdminGuard>
  );
};

export default GlobalArcHierarchyPage;
