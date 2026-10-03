import { useEffect } from "react";
import { useRealtimeEvent } from "@/hooks/useRealtime";
import {
  emitRealtime,
  isRealtimeConnected,
  subscribeRealtime,
} from "@/lib/realtimeSocket";

/**
 * Live delivery for the company activity feed.
 *
 * Shares the tab's single socket (lib/realtimeSocket.js) with the notification
 * and approval listeners. The design matches useNotificationStream: layered
 * over a poll, so the feed still works wherever WS is not proxied, and treated
 * as a signal to refetch, so a duplicated or out-of-order frame cannot corrupt
 * what is on screen.
 *
 * The server joins the company room from the verified handshake identity and
 * a fresh check of what that user administers. `activity:subscribe` only
 * asks. It carries no company id, because a client that names one could
 * subscribe to another client's audit trail. It is re-sent on every
 * (re)connect, because a new socket session starts outside the room.
 */
export const useActivityStream = (onActivity, { enabled = true } = {}) => {
  useRealtimeEvent("activity:new", onActivity, { enabled });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const subscribe = () => emitRealtime("activity:subscribe");
    const unsubscribe = subscribeRealtime("connect", subscribe);
    if (isRealtimeConnected()) subscribe();
    return unsubscribe;
  }, [enabled]);
};

export default useActivityStream;
