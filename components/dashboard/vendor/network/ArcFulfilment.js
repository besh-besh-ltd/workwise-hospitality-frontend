// Group rate contract fulfilment on the vendor contract pages (spec §6.4, §9).
//
//   FulfilledByPanel   the principal's ORG_ADMIN, acting as the principal, routes each
//                      hotel of a live group contract to a member entity
//                      (POST /routing/assign, subject ARC_HOTEL). Shows who supplies the
//                      hotel now (HQ until a member accepts) and the assignment's state.
//   FulfillingForNote  a fulfilment member's read-only view: which hotels it supplies.
//
// The server re-verifies every assignment (same org, ACTIVE, seated, group contract,
// routable status); these components only decide what to offer.

import React, { useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { assignSubject, revokeAssignment } from "@/services/vendorNetwork";
import { ConfirmModal } from "./NetworkModal";
import RoutingCandidates from "./RoutingCandidates";
import useRoutingQueue from "./useRoutingQueue";
import { isNetworkAdmin, useNetworkProfile } from "./networkProfile";
import { networkErrorMessage } from "./networkErrors";
import { StatusPill } from "./networkFormat";
import { ASSIGNMENT_STATUS, ROUTING_ERROR_OVERRIDES } from "./routingFormat";

/** Contract statuses whose hotels may be routed (backend ROUTABLE_CONTRACT_STATUSES). */
export const ROUTABLE_CONTRACT_STATUSES = ["awaiting_acceptance", "clarification", "active", "expiring_soon"];

/** The contract GET answered with a fulfilment member's read-only view. */
export const isFulfilmentMemberView = (data) => data?.viewer_role === "fulfilment_member";

const sameSubject = (row, contractId, hotelId) =>
  row.subject_type === "ARC_HOTEL" &&
  Number(row.subject_id) === Number(contractId) &&
  Number(row.hotel_id) === Number(hotelId);

/** "Fulfilling for: Orchid Mumbai, Orchid Pune" — the member's hotels on this contract. */
export function FulfillingForNote({ hotels = [], principalName }) {
  const names = hotels.map((h) => h.name).filter(Boolean);
  return (
    <div className="section-card" role="note" aria-label="Fulfilment member view">
      <div className="section-body" style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>
        <strong style={{ color: "var(--fg)" }}>Fulfilling for: {names.length ? names.join(", ") : "—"}</strong>
        <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--fg-3)" }}>
          You supply {names.length === 1 ? "this hotel" : "these hotels"} on behalf of
          {principalName ? ` ${principalName}` : " the contract holder"}. This is a read-only view: signing,
          clarifications and amendments stay with the contract holder.
        </div>
      </div>
    </div>
  );
}

/**
 * Renders nothing unless the viewer is the network admin acting as the principal and
 * the contract is a group contract in a routable status.
 *
 * contractId  the contract id (the ARC_HOTEL subject id)
 * contract    { status, vendor_name }
 * arc         { is_group }
 * hotels      the contract's hotels [{ hotel_id, name }]
 * viewerRole  the contract GET's viewer_role (a member never sees this panel)
 */
export default function FulfilledByPanel({ contractId, contract, arc, hotels = [], viewerRole }) {
  const { profile } = useNetworkProfile();
  const network = profile?.network;
  const eligible =
    !!contractId &&
    isNetworkAdmin(profile) &&
    !!network?.is_principal &&
    viewerRole !== "fulfilment_member" &&
    !!arc?.is_group &&
    ROUTABLE_CONTRACT_STATUSES.includes(contract?.status) &&
    hotels.length > 0;
  if (!eligible) return null;
  return <FulfilledByTable contractId={contractId} principalName={contract?.vendor_name} hotels={hotels} />;
}

function FulfilledByTable({ contractId, principalName, hotels }) {
  const { loading, loadError, queue, entities, load } = useRoutingQueue("Could not load who fulfils each hotel.");
  const [busyHotel, setBusyHotel] = useState(null);
  const busyRef = useRef(false);
  // { kind: "reassign", hotel, vendorId, name } | { kind: "revert", hotel, rows } | null
  const [confirm, setConfirm] = useState(null);
  const hq = `${principalName || "Head office"} (HQ)`;

  const rows = useMemo(
    () =>
      hotels.map((h) => {
        const find = (list) => list.find((r) => sameSubject(r, contractId, h.hotel_id)) || null;
        const accepted = find(queue.accepted);
        const pending = find(queue.pending);
        // Lists are newest first: the latest refusal, shown only when nothing is live.
        const refused = accepted || pending ? null : find(queue.declined);
        const unrouted = find(queue.unrouted);
        // The server's effective-supplier rule: an accepted entity supplies only while ACTIVE.
        const supplier = accepted && accepted.assignee_entity_status === "ACTIVE" ? accepted : null;
        // Suggestions: the queued item's, else the refusal's or the pending row's (the server
        // computes them for those); an accepted-only hotel has none (null), only a manual pick.
        const suggested = unrouted || refused || pending;
        return {
          hotel: h, accepted, pending, refused, supplier,
          candidates: suggested ? suggested.candidates || [] : null,
          excluded: suggested?.excluded || [],
        };
      }),
    [hotels, queue, contractId]
  );

  // One action at a time across the panel; the ref refuses a second click before React re-renders.
  const run = async (hotelId, action, fallback) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyHotel(hotelId);
    try {
      await action();
      setConfirm(null);
      await load();
    } catch (err) {
      toast.error(networkErrorMessage(err, fallback, ROUTING_ERROR_OVERRIDES));
      setConfirm(null);
      const http = err?.response?.status;
      if (http === 404 || http === 409) await load();
    } finally {
      busyRef.current = false;
      setBusyHotel(null);
    }
  };

  const assign = (hotelId, vendorId) =>
    run(
      hotelId,
      async () => {
        const res = await assignSubject({
          subject_type: "ARC_HOTEL",
          subject_id: Number(contractId),
          hotel_id: Number(hotelId),
          assignee_vendor_id: Number(vendorId),
        });
        toast.success(res?.message || "Assigned. The entity has to accept before it supplies this hotel.");
      },
      "Could not assign this hotel."
    );

  // Back to HQ: revoke every live row of the hotel (a pending reassignment first,
  // then the accepted one), so nothing is left that could still take the hotel.
  const revert = (hotelId, liveRows) =>
    run(
      hotelId,
      async () => {
        let res;
        for (const r of liveRows) res = await revokeAssignment(r.id);
        toast.success(res?.message || "Your head office supplies this hotel again.");
      },
      "Could not hand this hotel back to HQ."
    );

  const nameOf = (vendorId, candidates) =>
    entities.find((e) => Number(e.vendor_id) === Number(vendorId))?.name ||
    (candidates || []).find((c) => Number(c.vendor_id) === Number(vendorId))?.name ||
    "the selected entity";

  return (
    <section className="section-card" aria-label="Fulfilled by">
      <div className="section-head">
        <div className="h-left">
          <div>
            <h2>Fulfilled by</h2>
            <div className="h-sub">
              Route each hotel to an entity of your network. Until an entity accepts, your head office supplies it.
              Released POs already issued keep their supplier.
            </div>
          </div>
        </div>
      </div>
      {loadError ? (
        <div className="section-body flex items-center justify-between gap-3">
          <span style={{ color: "var(--danger)", fontSize: 13 }}>{loadError}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
        </div>
      ) : loading ? (
        <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>Loading…</div>
      ) : (
        <ul aria-label="Hotel fulfilment" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map(({ hotel, accepted, pending, refused, supplier, candidates, excluded }) => {
            const liveRows = [pending, accepted].filter(Boolean);
            const status = pending ? "PENDING" : accepted ? "ACCEPTED" : refused ? refused.status : null;
            const excludeIds = liveRows.map((r) => r.assigned_vendor_id);
            const busy = busyHotel != null;
            return (
              <li
                key={hotel.hotel_id}
                aria-label={hotel.name}
                style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between" }}
              >
                <div style={{ flex: "1 1 240px", fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: "var(--fg)" }}>{hotel.name}</div>
                  <div style={{ marginTop: 4, color: "var(--fg-2)" }}>
                    Supplied by <strong>{supplier ? supplier.assignee_name : hq}</strong>
                  </div>
                  {status && (
                    <div className="flex items-center gap-2" style={{ marginTop: 6, flexWrap: "wrap" }}>
                      <StatusPill map={ASSIGNMENT_STATUS} status={status} />
                      <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
                        {pending
                          ? `Waiting for ${pending.assignee_name} to accept`
                          : accepted
                            ? supplier
                              ? `${accepted.assignee_name} accepted`
                              : `${accepted.assignee_name} accepted but is not active, so HQ supplies this hotel`
                            : `${refused.assignee_name} ${refused.status === "TIMED_OUT" ? "did not reply in time" : "declined"}`}
                      </span>
                    </div>
                  )}
                  {liveRows.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 8 }}
                      disabled={busy}
                      aria-label={`Revert ${hotel.name} to HQ`}
                      onClick={() => setConfirm({ kind: "revert", hotel, rows: liveRows })}
                    >
                      Revert to HQ
                    </button>
                  )}
                </div>
                <div style={{ flex: "1 1 320px", maxWidth: 480 }}>
                  <RoutingCandidates
                    candidates={candidates}
                    excluded={excluded}
                    entities={entities}
                    excludeIds={excludeIds}
                    liveAssignee={pending || accepted ? { name: (pending || accepted).assignee_name, status: (pending || accepted).status } : null}
                    label={hotel.name}
                    actionLabel={liveRows.length ? "Reassign" : "Assign"}
                    busy={busy}
                    onAssign={(vendorId) =>
                      accepted
                        ? setConfirm({ kind: "reassign", hotel, vendorId, name: nameOf(vendorId, candidates) })
                        : assign(hotel.hotel_id, vendorId)
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {confirm?.kind === "reassign" && (
        <ConfirmModal
          title={`Reassign ${confirm.hotel.name}?`}
          body={`Future call-offs for ${confirm.hotel.name} will go to ${confirm.name} once it accepts. Until then the current supplier keeps the hotel, and released POs keep their supplier.`}
          confirmLabel="Reassign"
          tone="blue"
          busy={busyHotel != null}
          onConfirm={() => assign(confirm.hotel.hotel_id, confirm.vendorId)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === "revert" && (
        <ConfirmModal
          title={`Revert ${confirm.hotel.name} to HQ?`}
          body={`Your head office supplies ${confirm.hotel.name} again and future call-offs come to it. Released POs keep their supplier.`}
          confirmLabel="Revert to HQ"
          busy={busyHotel != null}
          onConfirm={() => revert(confirm.hotel.hotel_id, confirm.rows)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </section>
  );
}
