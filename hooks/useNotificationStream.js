import { useRealtimeEvent } from "@/hooks/useRealtime";

/**
 * Live notification delivery.
 *
 * The backend emits `notification:new` to room `user:<id>`. Before this hook,
 * nothing listened, and the bell ran on a 30-second poll, so an approval
 * could take up to half a minute to reach the person who had to act on it.
 *
 * The connection itself (websocket-only transport, reconnect policy, one
 * socket shared with the approval and activity listeners) lives in
 * lib/realtimeSocket.js. Two decisions still apply here:
 *
 * - **the poll is not removed.** The socket is an enhancement layer. If it is
 *   down, TopBar's poll still delivers notifications, at 60 s instead of
 *   120 s (see hooks/usePolling.js for the cadence policy).
 *
 * - **the socket is a signal, not a source of truth.** On an event we refetch
 *   from the API instead of trusting the payload, so an out-of-order or
 *   duplicated frame cannot corrupt what is on screen.
 */
export const useNotificationStream = (onNotification, { enabled = true } = {}) => {
  useRealtimeEvent("notification:new", onNotification, { enabled });
};

export default useNotificationStream;
