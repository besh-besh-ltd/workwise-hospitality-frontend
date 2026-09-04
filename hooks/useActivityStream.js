import { useEffect, useRef } from "react";
import storageInstance from "@/utils/storageInstance";

/**
 * Live delivery for the company activity feed.
 *
 * Deliberately the same shape as useNotificationStream, for the same reasons
 * that file spells out: pinned to the websocket transport because long-polling
 * behind a load balancer without sticky sessions produces a stream of
 * session-not-found errors; layered over a poll rather than replacing it, so
 * the feed still works wherever WS is not proxied; and treated as a signal to
 * refetch rather than a payload to trust, so a duplicated or out-of-order frame
 * cannot corrupt what is on screen.
 *
 * The company room is joined server-side from the verified handshake identity
 * and a fresh check of what that user administers. `activity:subscribe` only
 * asks; it carries no company id, because a client naming one would be
 * subscribing to another client's audit trail.
 */
export const useActivityStream = (onActivity, { enabled = true } = {}) => {
  const handlerRef = useRef(onActivity);
  handlerRef.current = onActivity;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const token = storageInstance.getStorage("token");
    if (!token) return undefined;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    let origin;
    try {
      origin = new URL(apiUrl, window.location.origin).origin;
    } catch (_) {
      return undefined;
    }

    let socket;
    let cancelled = false;

    import("socket.io-client")
      .then(({ io }) => {
        if (cancelled) return;

        socket = io(origin, {
          transports: ["websocket"],
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
          reconnectionDelayMax: 30000,
          timeout: 8000,
          autoConnect: true,
        });

        socket.on("connect", () => socket.emit("activity:subscribe"));
        socket.on("activity:new", (payload) => {
          if (typeof handlerRef.current === "function") handlerRef.current(payload);
        });
        // Expected wherever WS is not proxied. The poll already covers us, and
        // an error every few seconds trains people to ignore the console.
        socket.on("connect_error", () => {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (socket) {
        socket.off("activity:new");
        socket.disconnect();
      }
    };
  }, [enabled]);
};

export default useActivityStream;
