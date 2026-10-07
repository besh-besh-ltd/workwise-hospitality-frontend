// Vendor network — Team (spec §5 "People", §9). Admin only.
// Every membership of the org (disabled included) from GET /members; the
// entity list for the selects and the principal's id come from GET /org.
// A never-accepted (INVITED) row offers Resend, not Enable. The principal's
// own admin access can be neither disabled nor changed, so it offers nothing.

import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { UserPlus } from "lucide-react";
import { getOrg, listMembers, resendMemberInvite, updateMember } from "@/services/vendorNetwork";
import NetworkAccessNotice from "@/components/dashboard/vendor/network/NetworkAccessNotice";
import { ConfirmModal } from "@/components/dashboard/vendor/network/NetworkModal";
import { InviteMemberModal, EditMemberModal } from "@/components/dashboard/vendor/network/MemberModals";
import { isNetworkAdmin } from "@/components/dashboard/vendor/network/networkProfile";
import { networkErrorMessage } from "@/components/dashboard/vendor/network/networkErrors";
import { MEMBER_STATUS, ROLE_LABEL, StatusPill, fmtDate } from "@/components/dashboard/vendor/network/networkFormat";

function TeamView() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [members, setMembers] = useState([]);
  const [entities, setEntities] = useState([]);
  const [principalId, setPrincipalId] = useState(null);
  const [modal, setModal] = useState(null); // { kind: 'invite' } | { kind: 'edit', member }
  const [disabling, setDisabling] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const [membersRes, orgRes] = await Promise.all([listMembers(), getOrg()]);
      setMembers(membersRes?.data || []);
      setEntities(orgRes?.data?.entities || []);
      setPrincipalId(orgRes?.data?.org?.principal_vendor_id ?? null);
    } catch (err) {
      setLoadError(networkErrorMessage(err, "Could not load your team."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = (m) => m.role === "ORG_ADMIN" && principalId != null && Number(m.person_user_id) === Number(principalId);

  const runAction = async (m, call, fallback) => {
    setBusyId(m.id);
    try {
      const res = await call();
      toast.success(res?.message || "Done");
      await load();
      return true;
    } catch (err) {
      toast.error(networkErrorMessage(err, fallback));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const enable = (m) => runAction(m, () => updateMember(m.id, { status: "ACTIVE" }), "Could not enable this person.");
  const resend = (m) => runAction(m, () => resendMemberInvite(m.id), "Could not resend the invitation.");
  const confirmDisable = async () => {
    const m = disabling;
    const ok = await runAction(m, () => updateMember(m.id, { status: "DISABLED" }), "Could not disable this person.");
    if (ok) setDisabling(null);
  };

  const closeAndReload = () => {
    setModal(null);
    load();
  };

  return (
    <main className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Team</h1>
          <p className="page-sub">People who sign in to your network: admins manage everything, entity members work for one entity.</p>
        </div>
        <button type="button" className="btn btn-blue" onClick={() => setModal({ kind: "invite" })}>
          <UserPlus size={15} /> Invite person
        </button>
      </div>

      {loadError && (
        <div className="section-card">
          <div className="section-body flex items-center justify-between gap-3">
            <span style={{ color: "var(--danger)", fontSize: 13 }}>{loadError}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
          </div>
        </div>
      )}

      <div className="section-card">
        <div className="section-head">
          <div className="h-left">
            <h2>People</h2>
          </div>
          <div className="h-right">
            <span className="pill outline">{members.length}</span>
          </div>
        </div>
        <div className="section-body flush table-scroll">
          {loading ? (
            <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>Loading team…</div>
          ) : (
            <table className="table" aria-label="Network people">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Entity</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const owner = isOwner(m);
                  const busy = busyId === m.id;
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--fg)" }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{m.email}</div>
                      </td>
                      <td>
                        <span className="pill">{ROLE_LABEL[m.role] || m.role}</span>
                        {owner && <span className="pill indigo" style={{ marginLeft: 6 }}>Owner</span>}
                      </td>
                      <td>{m.role === "ORG_ADMIN" ? <span style={{ color: "var(--fg-3)" }}>Whole network</span> : m.entity_name || "—"}</td>
                      <td>
                        <StatusPill map={MEMBER_STATUS} status={m.status} />
                        {m.status === "INVITED" && m.invite_expires_at && (
                          <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 3 }}>
                            Link expires {fmtDate(m.invite_expires_at)}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {!owner && (
                          <div className="flex items-center gap-2 justify-end">
                            {m.status === "INVITED" && (
                              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => resend(m)}>
                                Resend
                              </button>
                            )}
                            {m.status === "DISABLED" && (
                              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => enable(m)}>
                                Enable
                              </button>
                            )}
                            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setModal({ kind: "edit", member: m })}>
                              Edit
                            </button>
                            {m.status !== "DISABLED" && (
                              <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => setDisabling(m)}>
                                Disable
                              </button>
                            )}
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

      {modal?.kind === "invite" && <InviteMemberModal entities={entities} onClose={() => setModal(null)} onInvited={closeAndReload} />}
      {modal?.kind === "edit" && (
        <EditMemberModal member={modal.member} entities={entities} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
      {disabling && (
        <ConfirmModal
          title={`Disable ${disabling.name || disabling.email}?`}
          body={
            disabling.status === "INVITED"
              ? "Their invitation link stops working. You can enable them later to send a new one."
              : "They are signed out of this access at once. You can enable them again later."
          }
          confirmLabel="Disable"
          busy={busyId === disabling.id}
          onConfirm={confirmDisable}
          onCancel={() => setDisabling(null)}
        />
      )}
    </main>
  );
}

export default function NetworkTeamPage() {
  const profile = useSelector((state) => state.userProfile);
  return (
    <>
      <Head>
        <title>Workwise | Network team</title>
      </Head>
      {!profile ? null : isNetworkAdmin(profile) ? <TeamView /> : <NetworkAccessNotice profile={profile} />}
    </>
  );
}
