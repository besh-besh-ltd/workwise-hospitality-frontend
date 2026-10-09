// Vendor network — Overview (spec §5, §8, §9).
// One path, three main states (the nav's "Overview" and "Set up network" items both
// point here and are mutually exclusive):
//   - a vendor who may set up a network (the nav's own rule: user_type 3,
//     network === null, not a guest session) → the "Set up network" form
//   - network admin                         → the HQ dashboard (GET /dashboard/summary,
//                                             /dashboard/pos, /dashboard/contracts)
//   - anyone else                           → NetworkAccessNotice

import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Building2, Inbox, Clock, XCircle, Hourglass, CreditCard, Users } from "lucide-react";
import { getNetworkDashboardSummary } from "@/services/vendorNetwork";
import SetupNetworkForm from "@/components/dashboard/vendor/network/SetupNetworkForm";
import NetworkAccessNotice from "@/components/dashboard/vendor/network/NetworkAccessNotice";
import SeatBadge from "@/components/dashboard/vendor/network/SeatBadge";
import { isNetworkAdmin, useNetworkProfile } from "@/components/dashboard/vendor/network/networkProfile";
import { canSetUpNetwork } from "@/components/layout/Header/headerConfig";
import { isGuestSession } from "@/utils/guestSession";
import { networkErrorMessage } from "@/components/dashboard/vendor/network/networkErrors";
import { RELATIONSHIP_LABEL, ENTITY_STATUS, StatusPill } from "@/components/dashboard/vendor/network/networkFormat";
import NetworkPoTable, { networkPoStatusLabel } from "@/components/dashboard/vendor/network/NetworkPoTable";
import NetworkContractsMap from "@/components/dashboard/vendor/network/NetworkContractsMap";
import ActAsButton from "@/components/dashboard/vendor/network/ActAsButton";

const Tile = ({ id, icon: Icon, tone, value, label }) => (
  <div className="stat-card" data-testid={`tile-${id}`}>
    <div className={`s-ic ${tone}`}>
      <Icon size={18} />
    </div>
    <div>
      <div className="s-val mono">{value}</div>
      <div className="s-label">{label}</div>
    </div>
  </div>
);

function NetworkDashboard({ network }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getNetworkDashboardSummary();
      setData(res?.data || null);
    } catch (err) {
      setError(networkErrorMessage(err, "Could not load the network dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const entities = useMemo(() => data?.entities || [], [data]);
  const routing = data?.routing || {};
  // Several raw statuses share a label (sent / acceptance_pending), so counts are
  // summed per label. These POs are spread across the network's entities, so the
  // single-vendor "Awaiting you" would mislabel a PO awaiting a member's acceptance.
  const poByStatus = useMemo(() => {
    const byLabel = new Map();
    for (const [status, n] of Object.entries(data?.pos?.by_status || {})) {
      const label = networkPoStatusLabel(status);
      byLabel.set(label, (byLabel.get(label) || 0) + Number(n || 0));
    }
    return [...byLabel.entries()];
  }, [data]);
  const pendingSeats = entities.filter((e) => e.seat?.status === "pending").length;

  return (
    <main className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">{network.org_name || "Vendor network"}</h1>
          <p className="page-sub">Your entities, how enquiries are being routed, and the purchase orders across the network.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/vendor/network/entities" className="btn btn-secondary">
            <Building2 size={15} /> Entities &amp; seats
          </Link>
          <Link href="/dashboard/vendor/network/team" className="btn btn-secondary">
            <Users size={15} /> Team
          </Link>
        </div>
      </div>

      {error && (
        <div className="section-card">
          <div className="section-body flex items-center justify-between gap-3">
            <span style={{ color: "var(--danger)", fontSize: 13 }}>{error}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              Retry
            </button>
          </div>
        </div>
      )}

      {loading && !data ? (
        <div className="section-card">
          <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>
            Loading network…
          </div>
        </div>
      ) : data ? (
        <>
          <section className="stat-strip cols-3">
            <Tile id="entities" icon={Building2} tone="indigo" value={entities.length} label="Entities" />
            <Tile id="pending-seats" icon={CreditCard} tone="violet" value={pendingSeats} label="Seats awaiting payment" />
            <Tile id="unrouted" icon={Inbox} tone="blue" value={routing.unrouted ?? 0} label="Not yet routed" />
            <Tile id="pending" icon={Hourglass} tone="green" value={routing.pending ?? 0} label="Awaiting an entity's reply" />
            <Tile id="declined_7d" icon={XCircle} tone="danger" value={routing.declined_7d ?? 0} label="Declined (7 days)" />
            <Tile id="timed_out_7d" icon={Clock} tone="amber" value={routing.timed_out_7d ?? 0} label="Timed out (7 days)" />
          </section>

          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <h2>Entities</h2>
              </div>
              <div className="h-right">
                <Link href="/dashboard/vendor/network/entities" className="btn btn-ghost btn-sm">
                  Manage
                </Link>
              </div>
            </div>
            <div className="section-body flush table-scroll">
              <table className="table" aria-label="Network entities">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Relationship</th>
                    <th>Status</th>
                    <th>Seat</th>
                    <th className="right">Live assignments</th>
                    <th className="right">Open POs</th>
                    <th className="right" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map((e) => (
                    <tr key={e.vendor_id}>
                      <td className="strong">{e.name}</td>
                      <td>
                        <span className="pill">{RELATIONSHIP_LABEL[e.relationship] || e.relationship}</span>
                      </td>
                      <td>
                        <StatusPill map={ENTITY_STATUS} status={e.status} />
                      </td>
                      <td>
                        <SeatBadge relationship={e.relationship} seat={e.seat} />
                      </td>
                      <td className="right">{e.live_assignments ?? 0}</td>
                      <td className="right">{e.open_pos ?? 0}</td>
                      <td className="right">
                        <ActAsButton entity={e} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <h2>Purchase orders by status</h2>
              </div>
            </div>
            <div className="section-body">
              {poByStatus.length === 0 ? (
                <span style={{ fontSize: 13, color: "var(--fg-3)" }}>No purchase orders in the network yet.</span>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {poByStatus.map(([label, n]) => (
                    <span key={label} className="pill outline">
                      <span>{label}</span>
                      <strong className="mono" style={{ marginLeft: 4 }}>{n}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <NetworkPoTable entities={entities} />
          <NetworkContractsMap />
        </>
      ) : null}
    </main>
  );
}

export default function NetworkOverviewPage() {
  // `pending` while the layout's one-time legacy-profile refetch is in flight.
  const { profile, pending } = useNetworkProfile();

  let body;
  if (!profile || pending) body = null;
  else if (isNetworkAdmin(profile)) body = <NetworkDashboard network={profile.network} />;
  else if (canSetUpNetwork(profile, isGuestSession())) body = <SetupNetworkForm />;
  else body = <NetworkAccessNotice profile={profile} />;

  return (
    <>
      <Head>
        <title>Workwise | Vendor network</title>
      </Head>
      {body}
    </>
  );
}
