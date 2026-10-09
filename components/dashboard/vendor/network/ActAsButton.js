import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { ArrowLeftRight } from "lucide-react";
import { switchActingEntity } from "@/components/layout/Header/switchActingEntity";

/**
 * "Act as" on an entity row of the network pages (spec §8): switches the
 * session to that entity (the header switcher's flow) and lands on its
 * dashboard. Rendered only for an entity this person may act for
 * (`network.actable_entities`) that is not the one already acted as.
 */
export default function ActAsButton({ entity, target = "/dashboard/vendor" }) {
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.userProfile);
  const network = profile?.network;
  const [busy, setBusy] = useState(false);
  const id = Number(entity?.vendor_id);
  const actable = (network?.actable_entities || []).some((e) => Number(e.vendor_id) === id);
  if (!network || !actable || id === Number(network.acting_entity_id)) return null;

  const actAs = async () => {
    if (busy) return;
    setBusy(true);
    const result = await switchActingEntity({ vendorId: id, profile, dispatch, target });
    if (!result.ok) {
      toast.error(result.message);
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={busy}
      onClick={actAs}
      aria-label={`Act as ${entity.name}`}
      title={`Switch to acting as ${entity.name}`}
    >
      <ArrowLeftRight size={13} /> {busy ? "Switching…" : "Act as"}
    </button>
  );
}
