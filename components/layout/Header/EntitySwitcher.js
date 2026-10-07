import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { ArrowLeftRight, Check, ChevronDown } from "lucide-react";
import { switchEntity } from "@/services/vendorNetwork";
import { getProfile } from "@/services/Auth";
import { setUserProfile } from "@/redux/slice";
import { persistor } from "@/redux/store";
import storageInstance from "@/utils/storageInstance";
import { hardNavigate } from "@/utils/hardNavigate";

const RELATIONSHIP_LABEL = {
  PRINCIPAL: "Principal",
  BRANCH: "Branch",
  DISTRIBUTOR: "Distributor",
  DEALER: "Dealer",
};

/**
 * "Acting as {entity} · {org}" — the vendor-network entity switcher (spec §9).
 *
 * Rendered only for a person who can act for more than one entity. Switching
 * asks the server for a token bound to the chosen entity, stores it, then does
 * a HARD navigation to the vendor dashboard: every page state and entity-scoped
 * cache starts over, and the fresh page load opens the realtime socket with the
 * new token (the server joins `user:<entity>` at handshake).
 *
 * The profile is the one thing a page load does not refetch: it is persisted by
 * redux-persist and only fetched at login. So it is reloaded (its `id` is now
 * the new acting entity) and flushed to storage before navigating. If that
 * fails, the previous token and profile are put back and nothing navigates, so
 * the session is never half-switched (server acting as B, UI showing A).
 */
const EntitySwitcher = () => {
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.userProfile);
  const network = profile?.network;
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef(null);
  const itemRefs = useRef([]);

  // Keyboard: the first entity takes focus when the menu opens.
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const entities = network?.actable_entities || [];
  if (entities.length <= 1) return null;

  const actingId = Number(network.acting_entity_id);
  const acting = entities.find((e) => Number(e.vendor_id) === actingId);
  const actingName = acting?.name || "Unknown entity";

  const handleSelect = async (vendorId) => {
    setOpen(false);
    if (switching || Number(vendorId) === actingId) return;
    setSwitching(true);
    try {
      const res = await switchEntity(Number(vendorId));
      const token = res?.data?.token;
      if (!token) throw new Error("No token");
      const previousToken = storageInstance.getStorage("token");
      storageInstance.setStorage("token", token);
      try {
        const profileRes = await getProfile();
        if (!profileRes?.data) throw new Error("No profile");
        dispatch(setUserProfile(profileRes.data));
        await persistor.flush();
      } catch (_) {
        // Roll back: keep acting as the entity the UI still shows.
        if (previousToken) storageInstance.setStorage("token", previousToken);
        else storageInstance.removeStorege("token");
        dispatch(setUserProfile(profile));
        toast.error("Could not switch entity. Please try again.");
        setSwitching(false);
        return;
      }
      hardNavigate("/dashboard/vendor");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not switch entity. Please try again.");
      setSwitching(false);
    }
  };

  // ArrowUp/ArrowDown move focus between entities; Enter picks the focused one.
  const handleMenuKeyDown = (e) => {
    const items = itemRefs.current.filter(Boolean);
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = idx < 0 ? 0 : (idx + step + items.length) % items.length;
      items[next].focus();
    } else if (e.key === "Enter" && idx >= 0) {
      e.preventDefault();
      handleSelect(entities[idx].vendor_id);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Switch the entity you are acting for"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          height: 32,
          padding: "0 10px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface)",
          color: "var(--fg-2)",
          fontSize: 12.5,
          maxWidth: 340,
          cursor: switching ? "progress" : "pointer",
        }}
      >
        <ArrowLeftRight size={13} strokeWidth={1.75} style={{ color: "var(--fg-3)", flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {switching ? "Switching…" : (
            <>
              Acting as <strong style={{ color: "var(--fg)", fontWeight: 600 }}>{actingName}</strong>
              {network.org_name ? <span style={{ color: "var(--fg-3)" }}> · {network.org_name}</span> : null}
            </>
          )}
        </span>
        <ChevronDown size={13} strokeWidth={1.75} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Act as entity"
          onKeyDown={handleMenuKeyDown}
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            minWidth: 260,
            maxHeight: 360,
            overflowY: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-md)",
            padding: 6,
            zIndex: 1050,
          }}
        >
          <div className="section-label" style={{ padding: "6px 8px 4px" }}>Act as</div>
          {entities.map((e, i) => {
            const selected = Number(e.vendor_id) === actingId;
            return (
              <button
                key={e.vendor_id}
                ref={(el) => { itemRefs.current[i] = el; }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => handleSelect(e.vendor_id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px",
                  border: 0,
                  borderRadius: "var(--radius-sm)",
                  background: selected ? "var(--surface-3)" : "transparent",
                  color: "var(--fg)",
                  fontSize: 13,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.name}
                </span>
                {e.relationship && (
                  <span className="pill">
                    {RELATIONSHIP_LABEL[e.relationship] || e.relationship}
                  </span>
                )}
                <Check size={14} strokeWidth={2} style={{ color: "var(--primary)", visibility: selected ? "visible" : "hidden" }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EntitySwitcher;
