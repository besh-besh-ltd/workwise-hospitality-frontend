// Vendor network — Routing queue (spec §6.2–6.4, §9). Admin only.
// GET /routing/queue gives four lists: unrouted subjects (open RFQs the
// principal is invited to, and group-contract hotels) with ranked candidates;
// PENDING and ACCEPTED assignments; and DECLINED / TIMED_OUT ones from the last
// 7 days with candidates that exclude whoever already refused. The admin
// assigns, reassigns or revokes from here, and sets the routing mode and the
// response time (PATCH /org).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { toast } from "react-toastify";
import { RefreshCw } from "lucide-react";
import { assignSubject, revokeAssignment } from "@/services/vendorNetwork";
import NetworkAccessNotice from "@/components/dashboard/vendor/network/NetworkAccessNotice";
import { ConfirmModal } from "@/components/dashboard/vendor/network/NetworkModal";
import RoutingCandidates from "@/components/dashboard/vendor/network/RoutingCandidates";
import RoutingSettingsCard from "@/components/dashboard/vendor/network/RoutingSettingsCard";
import useRoutingQueue from "@/components/dashboard/vendor/network/useRoutingQueue";
import { isNetworkAdmin, useNetworkProfile } from "@/components/dashboard/vendor/network/networkProfile";
import { networkErrorMessage } from "@/components/dashboard/vendor/network/networkErrors";
import { StatusPill } from "@/components/dashboard/vendor/network/networkFormat";
import {
  ASSIGNMENT_STATUS,
  DECLINE_REASON_LABEL,
  ROUTING_ERROR_OVERRIDES,
  SUBJECT_LABEL,
  fmtDateTime,
  subjectKey,
} from "@/components/dashboard/vendor/network/routingFormat";

const titleOf = (item) => item.title || `${SUBJECT_LABEL[item.subject_type] || item.subject_type} #${item.subject_id}`;
const keyOfItem = (item) => subjectKey(item.subject_type, item.subject_id, item.hotel_id);

/** The line under a subject's title: hotel(s) and bid end for an RFQ, contract status for a hotel. */
function SubjectMeta({ item }) {
  const meta = item.meta || {};
  const parts = [];
  if (item.subject_type === "RFQ") {
    if (meta.hotel_name) parts.push(meta.hotel_name);
    if (meta.bid_end_date) parts.push(`Bid ends ${fmtDateTime(meta.bid_end_date)}`);
  } else if (item.subject_type === "ARC_HOTEL") {
    if (meta.hotel_name) parts.push(`Hotel: ${meta.hotel_name}`);
    if (meta.contract_status) parts.push(`Contract ${String(meta.contract_status).replace(/_/g, " ")}`);
  }
  return (
    <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
      <span className="pill outline" style={{ marginRight: 6 }}>{SUBJECT_LABEL[item.subject_type] || item.subject_type}</span>
      {parts.join(" · ")}
    </div>
  );
}

// Only an app-relative path: a single leading "/" followed by neither "/", "\"
// nor whitespace. "//host" is protocol-relative and browsers read "/\host" (and
// "/\t/host", since tabs and newlines are stripped from URLs) the same way, so a
// control character anywhere in the URL is refused too.
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR = /[\u0000-\u001f\u007f]/;
const isAppPath = (url) => typeof url === "string" && /^\/(?![/\\\s])/.test(url) && !CONTROL_CHAR.test(url);

/** An assignment's title, linked to the subject when the server gave an action_url. */
function SubjectTitle({ row }) {
  const style = { fontWeight: 600, color: "var(--fg)" };
  const href = isAppPath(row.action_url) ? row.action_url : null;
  if (!href) return <div style={style}>{titleOf(row)}</div>;
  return (
    <div style={style}>
      <Link href={href} style={{ color: "inherit" }}>{titleOf(row)}</Link>
    </div>
  );
}

function Section({ title, count, empty, children }) {
  return (
    <div className="section-card">
      <div className="section-head">
        <div className="h-left">
          <h2>{title}</h2>
        </div>
        <div className="h-right">
          <span className="pill outline">{count}</span>
        </div>
      </div>
      {count === 0 ? (
        <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>{empty}</div>
      ) : (
        <ul aria-label={title} style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {children}
        </ul>
      )}
    </div>
  );
}

// "Recently accepted" shows assignments accepted (acted_at) in the last 30 days;
// older ones still count as live for the "Now with" line on declined items.
const RECENT_ACCEPTED_DAYS = 30;
const acceptedRecently = (row, now = Date.now()) => {
  const at = row.acted_at ? new Date(row.acted_at).getTime() : NaN;
  return Number.isFinite(at) && now - at <= RECENT_ACCEPTED_DAYS * 24 * 3600 * 1000;
};

const rowStyle = { padding: "14px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between" };

function RoutingView() {
  const { loading, reloading, loadError, queue, org, setOrg, entities, load } = useRoutingQueue();
  // Keys of the rows with an action in flight. A Set, so one row finishing never
  // re-enables another; the ref also refuses a second click on the same row
  // before React re-renders.
  const busyRef = useRef(new Set());
  const [busyKeys, setBusyKeys] = useState(() => new Set());
  const beginBusy = (key) => {
    if (busyRef.current.has(key)) return false;
    busyRef.current.add(key);
    setBusyKeys(new Set(busyRef.current));
    return true;
  };
  const endBusy = (key) => {
    busyRef.current.delete(key);
    setBusyKeys(new Set(busyRef.current));
  };
  const isBusy = (key) => busyKeys.has(key);
  const [reassigning, setReassigning] = useState(null); // assignment id with the picker open
  const [revoking, setRevoking] = useState(null); // assignment row

  // A declined item that has since been re-routed shows who has it now instead of candidates.
  const liveByKey = useMemo(() => {
    const map = new Map();
    for (const row of [...queue.accepted, ...queue.pending]) map.set(keyOfItem(row), row);
    return map;
  }, [queue.pending, queue.accepted]);

  // Hotels of an item when known: its own list, or the queue entry of the same subject.
  const unroutedByKey = useMemo(() => new Map(queue.unrouted.map((u) => [keyOfItem(u), u])), [queue.unrouted]);
  const totalHotelsOf = (row) => {
    const ids = row.hotel_ids || unroutedByKey.get(keyOfItem(row))?.hotel_ids;
    if (Array.isArray(ids) && ids.length) return ids.length;
    return row.hotel_id != null ? 1 : undefined;
  };

  const assign = async (item, vendorId, busyId) => {
    if (!beginBusy(busyId)) return;
    try {
      const payload = { subject_type: item.subject_type, subject_id: item.subject_id, assignee_vendor_id: Number(vendorId) };
      if (item.hotel_id != null) payload.hotel_id = item.hotel_id;
      const res = await assignSubject(payload);
      toast.success(res?.message || "Assigned");
      setReassigning(null);
      await load();
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not assign this item.", ROUTING_ERROR_OVERRIDES));
      const http = err?.response?.status;
      if (http === 404 || http === 409) await load();
    } finally {
      endBusy(busyId);
    }
  };

  const confirmRevoke = async () => {
    const row = revoking;
    const key = `a:${row.id}`;
    if (!beginBusy(key)) return;
    try {
      const res = await revokeAssignment(row.id);
      toast.success(res?.message || "Assignment revoked");
      setRevoking(null);
      await load();
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not revoke this assignment.", ROUTING_ERROR_OVERRIDES));
      setRevoking(null);
      const http = err?.response?.status;
      if (http === 404 || http === 409) await load();
    } finally {
      endBusy(key);
    }
  };

  const assignmentActions = (row) => {
    const busy = isBusy(`a:${row.id}`);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", minWidth: 260 }}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() => setReassigning((cur) => (cur === row.id ? null : row.id))}
          >
            Reassign
          </button>
          <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => setRevoking(row)}>
            Revoke
          </button>
        </div>
        {reassigning === row.id && (
          <RoutingCandidates
            candidates={[]}
            entities={entities}
            excludeIds={[row.assigned_vendor_id]}
            label={titleOf(row)}
            actionLabel="Reassign"
            busy={busy}
            onAssign={(vendorId) => assign(row, vendorId, `a:${row.id}`)}
          />
        )}
      </div>
    );
  };

  const { unrouted, pending, declined } = queue;
  const accepted = queue.accepted.filter((row) => acceptedRecently(row));

  return (
    <main className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Routing</h1>
          <p className="page-sub">Send each RFQ and contract hotel to the entity that should serve it. Suggestions come from each entity's coverage.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={load} disabled={loading || reloading}>
          <RefreshCw size={15} /> {reloading && !loading ? "Refreshing…" : "Refresh"}
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

      {!loadError && loading && (
        <div className="section-card">
          <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>Loading the routing queue…</div>
        </div>
      )}

      {!loadError && !loading && (
        <>
          {org && <RoutingSettingsCard org={org} onSaved={(saved) => saved && setOrg((o) => ({ ...o, ...saved }))} />}

          <Section title="Needs routing" count={unrouted.length} empty="Nothing is waiting to be routed.">
            {unrouted.map((item) => {
              const key = keyOfItem(item);
              return (
                <li key={key} style={rowStyle}>
                  <div style={{ flex: "1 1 280px" }}>
                    <div style={{ fontWeight: 600, color: "var(--fg)" }}>{titleOf(item)}</div>
                    <SubjectMeta item={item} />
                  </div>
                  <div style={{ flex: "1 1 340px", maxWidth: 520 }}>
                    <RoutingCandidates
                      candidates={item.candidates}
                      totalHotels={totalHotelsOf(item)}
                      entities={entities}
                      label={titleOf(item)}
                      busy={isBusy(key)}
                      onAssign={(vendorId) => assign(item, vendorId, key)}
                    />
                  </div>
                </li>
              );
            })}
          </Section>

          <Section title="Pending" count={pending.length} empty="No assignment is waiting for a reply.">
            {pending.map((row) => (
              <li key={row.id} style={rowStyle}>
                <div style={{ flex: "1 1 280px" }}>
                  <SubjectTitle row={row} />
                  <div style={{ fontSize: 12.5, color: "var(--fg-2)", marginTop: 4 }}>
                    With <strong>{row.assignee_name || `#${row.assigned_vendor_id}`}</strong>
                    {row.auto_routed && <span className="pill indigo" style={{ marginLeft: 6 }}>Auto-routed</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                    Assigned {fmtDateTime(row.created_at)} · Reply due {fmtDateTime(row.due_at)}
                  </div>
                </div>
                {assignmentActions(row)}
              </li>
            ))}
          </Section>

          <Section title="Declined & timed out" count={declined.length} empty="No entity declined or missed an assignment in the last 7 days.">
            {declined.map((row) => {
              const key = keyOfItem(row);
              const live = liveByKey.get(key);
              return (
                <li key={row.id} style={rowStyle}>
                  <div style={{ flex: "1 1 280px" }}>
                    <SubjectTitle row={row} />
                    <div style={{ fontSize: 12.5, color: "var(--fg-2)", marginTop: 4 }} className="flex items-center gap-2">
                      <StatusPill map={ASSIGNMENT_STATUS} status={row.status} />
                      <span>
                        {row.assignee_name || `#${row.assigned_vendor_id}`} · {fmtDateTime(row.acted_at || row.created_at)}
                      </span>
                    </div>
                    {row.status === "DECLINED" && row.decline_reason && (
                      <div style={{ fontSize: 12.5, color: "var(--fg-2)", marginTop: 4 }}>
                        Reason: {DECLINE_REASON_LABEL[row.decline_reason] || row.decline_reason}
                        {row.decline_note ? ` — “${row.decline_note}”` : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: "1 1 340px", maxWidth: 520 }}>
                    {live ? (
                      <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>
                        Now with <strong>{live.assignee_name || `#${live.assigned_vendor_id}`}</strong> (
                        {ASSIGNMENT_STATUS[live.status]?.label.toLowerCase() || live.status})
                      </div>
                    ) : (
                      <RoutingCandidates
                        candidates={row.candidates}
                        totalHotels={totalHotelsOf(row)}
                        entities={entities}
                        excludeIds={[row.assigned_vendor_id]}
                        label={titleOf(row)}
                        busy={isBusy(key)}
                        onAssign={(vendorId) => assign(row, vendorId, key)}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </Section>

          <Section title="Recently accepted" count={accepted.length} empty="Nothing was accepted in the last 30 days.">
            {accepted.map((row) => (
              <li key={row.id} style={rowStyle}>
                <div style={{ flex: "1 1 280px" }}>
                  <SubjectTitle row={row} />
                  <div style={{ fontSize: 12.5, color: "var(--fg-2)", marginTop: 4 }}>
                    Accepted by <strong>{row.assignee_name || `#${row.assigned_vendor_id}`}</strong> · {fmtDateTime(row.acted_at)}
                  </div>
                </div>
                {assignmentActions(row)}
              </li>
            ))}
          </Section>
        </>
      )}

      {revoking && (
        <ConfirmModal
          title={`Revoke ${titleOf(revoking)}?`}
          body={
            revoking.status === "ACCEPTED"
              ? `${revoking.assignee_name || "The entity"} stops serving this item and it returns to the queue. Orders already placed keep their supplier.`
              : `${revoking.assignee_name || "The entity"} can no longer accept it, and it returns to the queue.`
          }
          confirmLabel="Revoke"
          busy={isBusy(`a:${revoking.id}`)}
          onConfirm={confirmRevoke}
          onCancel={() => setRevoking(null)}
        />
      )}
    </main>
  );
}

export default function NetworkRoutingPage() {
  const { profile, pending } = useNetworkProfile();
  return (
    <>
      <Head>
        <title>Workwise | Network routing</title>
      </Head>
      {!profile || pending ? null : isNetworkAdmin(profile) ? <RoutingView /> : <NetworkAccessNotice profile={profile} />}
    </>
  );
}
