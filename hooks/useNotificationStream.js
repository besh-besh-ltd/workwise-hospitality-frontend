import { useEffect, useRef } from "react";
import storageInstance from "@/utils/storageInstance";

/**
 * Live notification delivery.
 *
 * The backend has emitted `notification:new` to room `user:<id>` since the
 * notification service was written, and nothing has ever listened — the bell
 * has been driven entirely by a 30-second poll. That means up to half a minute
 * between an approval landing and the person who has to action it seeing it,
 * which is the single biggest reason a notification panel stops feeling
 * authoritative.
 *
 * Design decisions worth knowing:
 *
 * - **websocket transport only.** socket.io's default is to start on HTTP
 *   long-polling and upgrade. Long-polling behind a load balancer without
 *   sticky sessions produces a stream of session-not-found errors, and we
 *   cannot assume sticky sessions here. Pinning to `websocket` means that if
 *   the proxy does not pass WS through, the socket simply never connects and
 *   the app keeps working on the poll below.
 *
 * - **the poll is not removed.** This is an enhancement layer, not a
 *   replacement. If the socket is down for any reason the user still gets their
 *   notifications, just not instantly.
 *
 * - **the socket is a signal, not a source of truth.** On an event we refetch
 *   from the API rather than trusting the payload, so an out-of-order or
 *   duplicated frame cannot corrupt what is on screen.
 */
export const useNotificationStream = (onNotification, { enabled = true } = {}) => {
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const token = storageInstance.getStorage("token");
    if (!token) return undefined;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    // NEXT_PUBLIC_API_URL points at `<origin>/api/v1`; the socket lives at the
    // server root.
    let origin;
    try {
      origin = new URL(apiUrl, window.location.origin).origin;
    } catch (_) {
      return undefined;
    }

    let socket;
    let cancelled = false;

    // Imported lazily so the client bundle does not carry the socket code for
    // users who never reach a dashboard.
    // No backend in demo mode — there is nothing to stream from, and a
    // retrying socket fills the console with connection errors.
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") return undefined;

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

        socket.on("connect", () => {
          // The room is joined from the verified handshake token on the server;
          // this only registers presence.
          socket.emit("addNewUser");
        });

        socket.on("notification:new", (payload) => {
          if (typeof handlerRef.current === "function") handlerRef.current(payload);
        });

        // A failed connection is expected wherever WS is not proxied. Stay
        // quiet about it — the poll is already covering us, and an error in the
        // console every few seconds trains people to ignore the console.
        socket.on("connect_error", () => {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (socket) {
        socket.off("notification:new");
        socket.disconnect();
      }
    };
  }, [enabled]);
};

export default useNotificationStream;
