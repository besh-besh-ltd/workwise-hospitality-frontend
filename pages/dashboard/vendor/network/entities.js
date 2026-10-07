// Vendor network — Entities & seats (spec §5, §5.1, §9). Admin only.
// GET /org gives the entities (with their current seat) and the pending
// outgoing link invitations. From here the admin links an existing account,
// creates a branch / distributor login, suspends / reactivates / removes an
// entity, cancels an invitation, and pays for pending seats.

import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Link2, Plus, CreditCard } from "lucide-react";
import { cancelLinkInvite, deleteEntity, getOrg, updateEntity } from "@/services/vendorNetwork";
import NetworkAccessNotice from "@/components/dashboard/vendor/network/NetworkAccessNotice";
import SeatBadge from "@/components/dashboard/vendor/network/SeatBadge";
import LinkAccountModal from "@/components/dashboard/vendor/network/LinkAccountModal";
import CreateEntityModal from "@/components/dashboard/vendor/network/CreateEntityModal";
import { ConfirmModal } from "@/components/dashboard/vendor/network/NetworkModal";
import useSeatPayment from "@/components/dashboard/vendor/network/useSeatPayment";
import { isNetworkAdmin } from "@/components/dashboard/vendor/network/networkProfile";
import { networkErrorMessage } from "@/components/dashboard/vendor/network/networkErrors";
import {
  ENTITY_STATUS,
  RELATIONSHIP_LABEL,
  StatusPill,
  fmtDate,
  fmtInr,
} from "@/components/dashboard/vendor/network/networkFormat";

// What each confirmable action asks and calls.
const ACTIONS = {
  suspend: {
    label: "Suspend",
    tone: "warn",
    title: (e) => `Suspend ${e.name}?`,
    body: "It stops receiving routed enquiries, its live assignments are revoked, and people who act only for it lose access until you reactivate it.",
    run: (e) => updateEntity(e.vendor_id, { status: "SUSPENDED" }),
  },
  reactivate: {
    label: "Reactivate",
    tone: "blue",
    title: (e) => `Reactivate ${e.name}?`,
    body: "It can receive routed enquiries again, and its people regain access.",
    run: (e) => updateEntity(e.vendor_id, { status: "ACTIVE" }),
  },
  remove: {
    label: "Remove",
    tone: "danger",
    title: (e) => `Remove ${e.name} from the network?`,
    body: "Its live assignments are revoked and people who act only for it lose access. The account itself stays on Workwise and can be invited again later.",
    run: (e) => deleteEntity(e.vendor_id),
  },
};

function EntitiesView() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [entities, setEntities] = useState([]);
  const [invites, setInvites] = useState([]);
  const [modal, setModal] = useState(null); // 'link' | 'create'
  const [confirm, setConfirm] = useState(null); // { action, entity }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await getOrg();
      setEntities(res?.data?.entities || []);
      setInvites(res?.data?.link_invites || []);
    } catch (err) {
      setLoadError(networkErrorMessage(err, "Could not load your network."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { payForSeats, inProgress: paying } = useSeatPayment({ onSuccess: load });

  const pendingSeats = useMemo(
    () => entities.filter((e) => e.seat_status === "pending" && e.seat_id),
    [entities]
  );
  const pendingTotal = pendingSeats.reduce((sum, e) => sum + Number(e.seat_fee_amount || 0), 0);

  const runConfirmed = async () => {
    const { action, entity } = confirm;
    setBusy(true);
    try {
      const res = await ACTIONS[action].run(entity);
      toast.success(res?.message || "Done");
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not update the entity."));
    } finally {
      setBusy(false);
    }
  };

  const cancelInvite = async (invite) => {
    try {
      const res = await cancelLinkInvite(invite.id);
      toast.success(res?.message || "Invitation cancelled");
      await load();
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not cancel the invitation."));
    }
  };

  const closeModalAndReload = () => {
    setModal(null);
    load();
  };

  return (
    <main className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Entities &amp; seats</h1>
          <p className="page-sub">The accounts in your network. Every entity except the principal needs an active seat to operate.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => setModal("link")}>
            <Link2 size={15} /> Link existing account
          </button>
          <button type="button" className="btn btn-blue" onClick={() => setModal("create")}>
            <Plus size={15} /> Create branch / distributor
          </button>
        </div>
      </div>

      {loadError && (
        <div className="section-card">
          <div className="section-body flex items-center justify-between gap-3">
            <span style={{ color: "var(--danger)", fontSize: 13 }}>{loadError}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
          </div>
        </div>
      )}

      {pendingSeats.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid #f0c14b",
            borderLeft: "3px solid #eab308",
            borderRadius: "var(--radius-lg)",
            padding: "13px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--fg)" }}>
              {pendingSeats.length} seat{pendingSeats.length > 1 ? "s" : ""} awaiting payment
              {pendingTotal > 0 ? ` · ${fmtInr(pendingTotal)}` : ""}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
              These entities can't operate until their seat for this financial year is paid.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-blue btn-sm"
            disabled={paying}
            onClick={() => payForSeats(pendingSeats.map((e) => Number(e.seat_id)))}
          >
            <CreditCard size={14} /> {paying ? "Opening payment…" : "Pay for seats"}
          </button>
        </div>
      )}

      <div className="section-card">
        <div className="section-head">
          <div className="h-left">
            <h2>Entities</h2>
          </div>
          <div className="h-right">
            <span className="pill outline">{entities.length}</span>
          </div>
        </div>
        <div className="section-body flush table-scroll">
          {loading ? (
            <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>Loading entities…</div>
          ) : (
            <table className="table" aria-label="Network entities">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Relationship</th>
                  <th>Status</th>
                  <th>Seat</th>
                  <th>Linked</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entities.map((e) => {
                  const isPrincipal = e.relationship === "PRINCIPAL";
                  return (
                    <tr key={e.vendor_id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--fg)" }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{e.email}</div>
                      </td>
                      <td>
                        <span className="pill">{RELATIONSHIP_LABEL[e.relationship] || e.relationship}</span>
                      </td>
                      <td>
                        <StatusPill map={ENTITY_STATUS} status={e.status} />
                      </td>
                      <td>
                        <SeatBadge
                          relationship={e.relationship}
                          seat={e.seat_status ? { status: e.seat_status, end_date: e.seat_end_date, fee_amount: e.seat_fee_amount } : null}
                        />
                      </td>
                      <td>{fmtDate(e.linked_at)}</td>
                      <td style={{ textAlign: "right" }}>
                        {!isPrincipal && (
                          <div className="flex items-center gap-2 justify-end">
                            {e.status === "SUSPENDED" ? (
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm({ action: "reactivate", entity: e })}>
                                Reactivate
                              </button>
                            ) : (
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm({ action: "suspend", entity: e })}>
                                Suspend
                              </button>
                            )}
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setConfirm({ action: "remove", entity: e })}>
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {invites.length > 0 && (
        <div className="section-card">
          <div className="section-head">
            <div className="h-left">
              <h2>Pending invitations</h2>
            </div>
          </div>
          <div className="section-body flush table-scroll">
            <table className="table" aria-label="Pending link invitations">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Relationship</th>
                  <th>Expires</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--fg)" }}>{i.target_name}</div>
                      {i.target_email && <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{i.target_email}</div>}
                    </td>
                    <td>
                      <span className="pill">{RELATIONSHIP_LABEL[i.relationship] || i.relationship}</span>
                    </td>
                    <td>{fmtDate(i.expires_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancelInvite(i)}>
                        Cancel invitation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === "link" && <LinkAccountModal onClose={() => setModal(null)} onSent={closeModalAndReload} />}
      {modal === "create" && <CreateEntityModal onClose={() => setModal(null)} onCreated={closeModalAndReload} />}
      {confirm && (
        <ConfirmModal
          title={ACTIONS[confirm.action].title(confirm.entity)}
          body={ACTIONS[confirm.action].body}
          confirmLabel={ACTIONS[confirm.action].label}
          tone={ACTIONS[confirm.action].tone}
          busy={busy}
          onConfirm={runConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </main>
  );
}

export default function NetworkEntitiesPage() {
  const profile = useSelector((state) => state.userProfile);
  return (
    <>
      <Head>
        <title>Workwise | Network entities</title>
      </Head>
      {!profile ? null : isNetworkAdmin(profile) ? <EntitiesView /> : <NetworkAccessNotice profile={profile} />}
    </>
  );
}
