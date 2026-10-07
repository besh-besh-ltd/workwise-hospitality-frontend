import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  acquireRealtimeSocket,
  subscribeRealtime,
  isRealtimeConnected,
  subscribeRealtimeStatus,
} from "@/lib/realtimeSocket";

/**
 * React bindings for the shared socket in lib/realtimeSocket.js.
 */

/**
 * Subscribe to a server event on the shared connection. Holds the connection
 * open while mounted and enabled. The handler is read through a ref, so a new
 * identity on each render does not resubscribe.
 */
export const useRealtimeEvent = (event, handler, { enabled = true } = {}) => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const unsubscribe = subscribeRealtime(event, (...args) => {
      if (typeof handlerRef.current === "function") handlerRef.current(...args);
    });
    const release = acquireRealtimeSocket();
    return () => {
      unsubscribe();
      release();
    };
  }, [event, enabled]);
};

/** Whether the shared socket is connected right now. Does not open it. */
export const useRealtimeConnected = () =>
  useSyncExternalStore(subscribeRealtimeStatus, isRealtimeConnected, () => false);

export default useRealtimeEvent;
