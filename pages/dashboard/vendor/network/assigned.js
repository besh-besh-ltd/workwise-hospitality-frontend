// Vendor network — Assigned to me (spec §6.2, §9). For a member entity (any
// person acting as a non-principal entity of a network): the items the
// network admin routed to it, PENDING (accept, or decline with a reason) and
// ACCEPTED. An RFQ opens on the vendor inquiry page (the entity can view it
// while pending, and quote once accepted); a rate-contract hotel opens on the
// contract page, where a pending one is reviewed before the entity replies.

import { useCallback, useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { toast } from "react-toastify";
import { Inbox } from "lucide-react";
import { getAssignedToMe, respondToAssignment } from "@/services/vendorNetwork";
import NetworkAccessNotice from "@/components/dashboard/vendor/network/NetworkAccessNotice";
import DeclineAssignmentModal from "@/components/dashboard/vendor/network/DeclineAssignmentModal";
import { useNetworkProfile, isNetworkAdmin } from "@/components/dashboard/vendor/network/networkProfile";
import { networkErrorMessage, respondErrorMessage } from "@/components/dashboard/vendor/network/networkErrors";
import { SUBJECT_LABEL, fmtDateTime } from "@/components/dashboard/vendor/network/routingFormat";
import GuestSignInNotice from "@/components/shared/GuestSignInNotice";
import { isGuestSessionRefusal } from "@/utils/arcGuestRefusal";

// The server refuses Assigned to me to an emailed-link guest session (Task 26).
const GUEST_TEXT =
  "Assigned work needs a full sign-in. You opened Workwise from an RFQ email link, which only covers that RFQ. Sign in with your email and password to continue.";

const titleOf = (row) => row.title || `${SUBJECT_LABEL[row.subject_type] || row.subject_type} #${row.subject_id}`;

/** Where an assignment opens: the RFQ, or the contract (a pending hotel is reviewed there before replying). */
function linkOf(row) {
  if (row.subject_type === "RFQ") return `/dashboard/vendor/inquiries-details?id=${row.subject_id}`;
  if (row.subject_type === "ARC_HOTEL") return `/dashboard/vendor/rate-contracts/${row.subject_id}`;
  return null;
}

function OpenLink({ row }) {
  const href = linkOf(row);
  if (!href) return null;
  const label = row.subject_type === "RFQ" ? "View RFQ" : row.status === "PENDING" ? "Review contract" : "View contract";
  return (
    <Link href={href} className="btn btn-ghost btn-sm">
      {label}
    </Link>
  );
}

/**
 * A PENDING row whose reply deadline has passed. Until the sweep times it out it is still
 * listed, but it can no longer be opened (the contract view refuses it) or answered (a
 * reply times it out), so the row says so instead.
 */
const replyWindowClosed = (row) =>
  row.status === "PENDING" && !!row.due_at && new Date(row.due_at).getTime() <= Date.now();

const rowStyle = { padding: "14px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" };

function AssignedView() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rows, setRows] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [guestRefused, setGuestRefused] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await getAssignedToMe({ status: ["PENDING", "ACCEPTED"] });
      setRows(res?.data || []);
    } catch (err) {
      if (isGuestSessionRefusal(err)) setGuestRefused(true);
      else setLoadError(networkErrorMessage(err, "Could not load your assignments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // One reply in flight at a time; the ref refuses a second click before React re-renders.
  const inFlight = useRef(false);
  const respond = async (row, payload) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusyId(row.id);
    try {
      const res = await respondToAssignment(row.id, payload);
      toast.success(res?.message || "Done");
      setDeclining(null);
      await load();
    } catch (err) {
      toast.error(respondErrorMessage(err));
      const http = err?.response?.status;
      if (http === 404 || http === 409) {
        setDeclining(null);
        await load();
      }
    } finally {
      inFlight.current = false;
      setBusyId(null);
    }
  };

  const pending = rows.filter((r) => r.status === "PENDING");
  const accepted = rows.filter((r) => r.status === "ACCEPTED");

  if (guestRefused) {
    return (
      <GuestSignInNotice
        label="Sign in to see your assignments"
        text={GUEST_TEXT}
        prefillMessage="Sign in with your email and password to see your assignments."
      />
    );
  }

  return (
    <main className="main-body">
      <div>
        <h1 className="page-h1">Assigned to me</h1>
        <p className="page-sub">Work your network admin routed to this entity. Accept it to quote or fulfil, or decline so it can go to someone else.</p>
      </div>

      {loadError && (
        <div className="section-card">
          <div className="section-body flex items-center justify-between gap-3">
            <span style={{ color: "var(--danger)", fontSize: 13 }}>{loadError}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
          </div>
        </div>
      )}

      {!loadError && loading && (
        <div className="section-card">
          <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>Loading your assignments…</div>
        </div>
      )}

      {!loadError && !loading && (
        <>
          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <h2>Waiting for your reply</h2>
              </div>
              <div className="h-right">
                <span className="pill outline">{pending.length}</span>
              </div>
            </div>
            {pending.length === 0 ? (
              <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>Nothing is waiting for your reply.</div>
            ) : (
              <ul aria-label="Waiting for your reply" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {pending.map((row) => {
                  const busy = busyId !== null; // one reply at a time
                  return (
                    <li key={row.id} style={rowStyle}>
                      <div style={{ flex: "1 1 300px" }}>
                        <div style={{ fontWeight: 600, color: "var(--fg)" }}>{titleOf(row)}</div>
                        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                          <span className="pill outline" style={{ marginRight: 6 }}>{SUBJECT_LABEL[row.subject_type] || row.subject_type}</span>
                          Assigned {fmtDateTime(row.created_at)} · Reply by {fmtDateTime(row.due_at)}
                        </div>
                      </div>
                      {replyWindowClosed(row) ? (
                        <span style={{ fontSize: 12.5, color: "var(--fg-3)" }}>Reply window closed — your network admin will re-route it.</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <OpenLink row={row} />
                          <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => setDeclining(row)}>
                            Decline
                          </button>
                          <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => respond(row, { decision: "ACCEPT" })}>
                            Accept
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="section-card">
            <div className="section-head">
              <div className="h-left">
                <h2>Accepted</h2>
              </div>
              <div className="h-right">
                <span className="pill outline">{accepted.length}</span>
              </div>
            </div>
            {accepted.length === 0 ? (
              <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>You haven't accepted anything yet.</div>
            ) : (
              <ul aria-label="Accepted" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {accepted.map((row) => (
                  <li key={row.id} style={rowStyle}>
                    <div style={{ flex: "1 1 300px" }}>
                      <div style={{ fontWeight: 600, color: "var(--fg)" }}>{titleOf(row)}</div>
                      <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                        <span className="pill outline" style={{ marginRight: 6 }}>{SUBJECT_LABEL[row.subject_type] || row.subject_type}</span>
                        Accepted {fmtDateTime(row.acted_at)}
                      </div>
                    </div>
                    <OpenLink row={row} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {declining && (
        <DeclineAssignmentModal
          title={titleOf(declining)}
          busy={busyId === declining.id}
          onClose={() => setDeclining(null)}
          onSubmit={({ reason, note }) => respond(declining, { decision: "DECLINE", reason, note })}
        />
      )}
    </main>
  );
}

/** The principal routes work rather than receiving it. Routing itself is for admins only. */
function PrincipalNotice({ isAdmin }) {
  return (
    <main className="main-body">
      <div className="section-card">
        <div className="empty-state">
          <div className="ic">
            <Inbox />
          </div>
          <h2>Assignments go to member entities</h2>
          {isAdmin ? (
            <>
              <p>You are acting as the network's principal, which routes work to its entities. Use Routing to see what is assigned.</p>
              <Link href="/dashboard/vendor/network/routing" className="btn btn-blue" style={{ marginTop: 16 }}>
                Open routing
              </Link>
            </>
          ) : (
            <p>You are acting as the network's principal, which routes work to its entities. Your network admin routes it.</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function NetworkAssignedPage() {
  const { profile, pending } = useNetworkProfile();
  const network = profile?.network;
  // Sign in from the guest notice clears the profile before the page leaves: keep showing
  // what was there instead of blanking the main area while the next page loads.
  const lastContent = useRef(null);
  let content = null;
  if (profile && !pending) {
    if (network && !network.is_principal) content = <AssignedView />;
    else if (network) content = <PrincipalNotice isAdmin={isNetworkAdmin(profile)} />;
    else content = <NetworkAccessNotice profile={profile} />;
    lastContent.current = content;
  } else if (!profile) {
    content = lastContent.current;
  }
  return (
    <>
      <Head>
        <title>Workwise | Assigned to me</title>
      </Head>
      {content}
    </>
  );
}
