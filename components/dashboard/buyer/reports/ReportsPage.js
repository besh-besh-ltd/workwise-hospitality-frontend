import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileBarChart, Lock, ChevronRight } from "lucide-react";
import { getReportCatalogue } from "@/services/reports";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ReportRunner from "./ReportRunner";
import RecentDownloads from "./RecentDownloads";

/* ─────────────────────────────────────────────────────────────────────────
   The report catalogue.

   There is no client-side permission check here, deliberately. The catalogue
   endpoint already returns only what this user may run, so the page renders
   straight from it: nothing can be offered that the API would refuse, and
   there is no second copy of the entitlement rules to drift.

   An empty catalogue is the access-denied state. That is also why a
   `not_configured` report still appears — it is something the user IS entitled
   to, which the platform cannot yet produce. Hiding it would turn "we don't
   hold budgets yet" into "you don't have permission", which sends people to
   their administrator for a problem no administrator can fix.
   ───────────────────────────────────────────────────────────────────────── */

const FAMILY_ORDER = [
  "Spend Analytics",
  "Vendor Reports",
  "Purchase Orders",
  "Budget & Cost Control",
  "Compliance & Audit",
  "Operational KPIs",
];

function ReportCard({ report, onOpen }) {
  const { runnable, readiness } = report;
  const blocked = readiness?.state === "not_configured";

  return (
    <button
      type="button"
      className="kpi-tile"
      onClick={() => runnable && onOpen(report)}
      disabled={!runnable}
      aria-label={`${report.title}${runnable ? "" : " — not available"}`}
      style={{
        textAlign: "left",
        cursor: runnable ? "pointer" : "default",
        opacity: runnable ? 1 : 0.62,
        width: "100%",
      }}
    >
      <div className="kt-row">
        <span className="kt-label">{report.number}</span>
        <span className="kt-ic">{runnable ? <FileBarChart size={15} /> : <Lock size={15} />}</span>
      </div>
      <div className="kt-val" style={{ fontSize: 15, lineHeight: 1.35 }}>
        {report.title}
      </div>
      <div className="kt-sub" style={{ whiteSpace: "normal" }}>
        {report.description}
      </div>

      {blocked && (
        <div className="kt-sub" style={{ whiteSpace: "normal", marginTop: 8, fontStyle: "italic" }}>
          {readiness.missing}
        </div>
      )}
      {!runnable && !blocked && (
        <div className="kt-sub" style={{ marginTop: 8, fontStyle: "italic" }}>
          Being built — not available yet.
        </div>
      )}
      {runnable && (
        <div className="kt-sub" style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
          Open <ChevronRight size={13} />
        </div>
      )}
    </button>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(null);
  const seq = useRef(0);

  const load = useCallback(() => {
    const id = ++seq.current;
    setLoading(true);
    getReportCatalogue()
      .then((res) => {
        if (id !== seq.current) return;
        setReports(res?.data?.reports || []);
        setFailed(false);
      })
      .catch(() => {
        if (id !== seq.current) return;
        setReports([]);
        setFailed(true);
      })
      .finally(() => {
        if (id === seq.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const families = useMemo(() => {
    const byFamily = new Map();
    for (const r of reports) {
      if (!byFamily.has(r.family)) byFamily.set(r.family, []);
      byFamily.get(r.family).push(r);
    }
    const ordered = FAMILY_ORDER.filter((f) => byFamily.has(f));
    // Anything the backend adds later still renders, just after the known ones.
    for (const f of byFamily.keys()) if (!ordered.includes(f)) ordered.push(f);
    return ordered.map((name) => ({
      name,
      items: byFamily.get(name).sort((a, b) => String(a.number).localeCompare(String(b.number))),
    }));
  }, [reports]);

  // The history endpoint returns report KEYS; the catalogue is where their
  // titles live, and we already have it.
  const titleFor = useMemo(() => {
    const byKey = new Map(reports.map((r) => [r.key, r.title]));
    return (key) => byKey.get(key) || null;
  }, [reports]);

  if (selected) {
    return <ReportRunner report={selected} onBack={() => setSelected(null)} />;
  }

  if (loading) {
    return (
      <main className="main-body">
        <h1 className="page-h1">Reports</h1>
        <div className="kpi-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="arc-sk" style={{ height: 116, borderRadius: 10 }} />
          ))}
        </div>
      </main>
    );
  }

  // No entitlement and a failed fetch land in the same place on purpose: from
  // the user's side "you cannot see this" is the same answer either way, and
  // the banner tells them who to ask.
  if (failed || reports.length === 0) {
    return (
      <main className="main-body">
        <AccessDeniedPage
          title="No reports available"
          message="You do not have permission to download any reports. Contact your administrator to request access."
          showBackButton={false}
        />
      </main>
    );
  }

  return (
    <main className="main-body">
      <div>
        <h1 className="page-h1">Reports</h1>
        <div className="page-sub">
          Download spend, vendor, order and compliance reports as Excel workbooks. Each report
          covers only the business units you have access to.
        </div>
      </div>

      {families.map((family) => (
        <section key={family.name}>
          <div className="section-label">{family.name}</div>
          <div className="kpi-grid">
            {family.items.map((r) => (
              <ReportCard key={r.key} report={r} onOpen={setSelected} />
            ))}
          </div>
        </section>
      ))}

      {/* Renders nothing until this user has actually downloaded something. */}
      <RecentDownloads titleFor={titleFor} />
    </main>
  );
}
