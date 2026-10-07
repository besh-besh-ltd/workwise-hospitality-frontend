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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { assignSubject, getOrg, getRoutingQueue } from "@/services/vendorNetwork";
import RoutingCandidates from "./RoutingCandidates";
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [queue, setQueue] = useState({ unrouted: [], pending: [], accepted: [], declined: [] });
  const [entities, setEntities] = useState([]);
  const [busyHotel, setBusyHotel] = useState(null);
  const busyRef = useRef(false);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++loadSeq.current;
    setLoadError("");
    try {
      const [queueRes, orgRes] = await Promise.all([getRoutingQueue(), getOrg()]);
      if (mine !== loadSeq.current) return;
      const q = queueRes?.data || {};
      setQueue({ unrouted: q.unrouted || [], pending: q.pending || [], accepted: q.accepted || [], declined: q.declined || [] });
      const o = orgRes?.data?.org || null;
      setEntities(
        (orgRes?.data?.entities || []).filter(
          (e) => e.status === "ACTIVE" && e.relationship !== "PRINCIPAL" && Number(e.vendor_id) !== Number(o?.principal_vendor_id)
        )
      );
    } catch (err) {
      if (mine === loadSeq.current) setLoadError(networkErrorMessage(err, "Could not load who fulfils each hotel."));
    } finally {
      if (mine === loadSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, contractId]);

  const rows = useMemo(
    () =>
      hotels.map((h) => {
        const find = (list) => list.find((r) => sameSubject(r, contractId, h.hotel_id)) || null;
        const accepted = find(queue.accepted);
        const pending = find(queue.pending);
        // Lists are newest first: the latest refusal, shown only when nothing is live.
        const refused = accepted || pending ? null : find(queue.declined);
        const unrouted = find(queue.unrouted);
        return { hotel: h, accepted, pending, refused, candidates: unrouted?.candidates || refused?.candidates || [] };
      }),
    [hotels, queue, contractId]
  );

  const assign = async (hotelId, vendorId) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyHotel(hotelId);
    try {
      const res = await assignSubject({
        subject_type: "ARC_HOTEL",
        subject_id: Number(contractId),
        hotel_id: Number(hotelId),
        assignee_vendor_id: Number(vendorId),
      });
      toast.success(res?.message || "Assigned. The entity has to accept before it supplies this hotel.");
      await load();
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not assign this hotel.", ROUTING_ERROR_OVERRIDES));
      const http = err?.response?.status;
      if (http === 404 || http === 409) await load();
    } finally {
      busyRef.current = false;
      setBusyHotel(null);
    }
  };

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
          {rows.map(({ hotel, accepted, pending, refused, candidates }) => {
            const live = pending || accepted;
            const status = pending ? "PENDING" : accepted ? "ACCEPTED" : refused ? refused.status : null;
            const excludeIds = [accepted?.assigned_vendor_id, pending?.assigned_vendor_id].filter((v) => v != null);
            return (
              <li
                key={hotel.hotel_id}
                aria-label={hotel.name}
                style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between" }}
              >
                <div style={{ flex: "1 1 240px", fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: "var(--fg)" }}>{hotel.name}</div>
                  <div style={{ marginTop: 4, color: "var(--fg-2)" }}>
                    Supplied by{" "}
                    <strong>{accepted ? accepted.assignee_name : `${principalName || "Head office"} (HQ)`}</strong>
                  </div>
                  {status && (
                    <div className="flex items-center gap-2" style={{ marginTop: 6, flexWrap: "wrap" }}>
                      <StatusPill map={ASSIGNMENT_STATUS} status={status} />
                      <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
                        {pending
                          ? `Waiting for ${pending.assignee_name} to accept`
                          : accepted
                            ? `${accepted.assignee_name} accepted`
                            : `${refused.assignee_name} ${refused.status === "TIMED_OUT" ? "did not reply in time" : "declined"}`}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ flex: "1 1 320px", maxWidth: 480 }}>
                  <RoutingCandidates
                    candidates={candidates}
                    entities={entities}
                    excludeIds={excludeIds}
                    label={hotel.name}
                    actionLabel={live ? "Reassign" : "Assign"}
                    busy={busyHotel != null}
                    onAssign={(vendorId) => assign(hotel.hotel_id, vendorId)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
