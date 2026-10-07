import storageInstance from "@/utils/storageInstance";

/**
 * One socket.io connection per tab, shared by every realtime listener.
 *
 * Before this, each hook (notifications, activity feed) opened its own
 * socket, and adding `approval:changed` would have opened a third. All of
 * them talk to the same server and the same `user:<id>` room, so they now
 * ride one connection: the first consumer opens it, the last one to release
 * closes it.
 *
 * The connection options are the ones useNotificationStream established, and
 * its reasoning still holds:
 * - websocket transport only. Long-polling behind a load balancer without
 *   sticky sessions produces session-not-found errors. If WS is not proxied,
 *   the socket never connects and the pollers cover it.
 * - the socket is a signal, not a source of truth. Consumers refetch from the
 *   API when an event arrives.
 *
 * Connection status is exposed so pollers can slow down while live events are
 * flowing and speed up when they are not (see hooks/usePolling.js).
 */

const SOCKET_OPTIONS = {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 30000,
  timeout: 8000,
  autoConnect: true,
};

const state = {
  socket: null,
  token: null,
  refs: 0,
  connected: false,
  generation: 0,
};

const handlers = new Map(); // event -> Set<fn>
const statusListeners = new Set();

let loadIo = () => import("socket.io-client");

const resolveOrigin = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  // NEXT_PUBLIC_API_URL points at `<origin>/api/v1`; the socket lives at the
  // server root.
  try {
    return new URL(apiUrl, window.location.origin).origin;
  } catch (_) {
    return null;
  }
};

const setConnected = (value) => {
  if (state.connected === value) return;
  state.connected = value;
  statusListeners.forEach((cb) => {
    try { cb(value); } catch (_) {}
  });
};

const dispatch = (event, args) => {
  const set = handlers.get(event);
  if (!set) return;
  [...set].forEach((fn) => {
    try { fn(...args); } catch (_) {}
  });
};

const teardown = () => {
  state.generation += 1;
  const { socket } = state;
  state.socket = null;
  state.token = null;
  if (socket) {
    try {
      socket.offAny();
      socket.removeAllListeners();
      socket.disconnect();
    } catch (_) {}
  }
  setConnected(false);
};

const connect = (token) => {
  const generation = ++state.generation;
  state.token = token;
  const origin = resolveOrigin();
  if (!origin) return;

  loadIo()
    .then(({ io }) => {
      if (generation !== state.generation || state.refs === 0) return;
      const socket = io(origin, { ...SOCKET_OPTIONS, auth: { token } });
      state.socket = socket;

      socket.on("connect", () => {
        // The room is joined from the verified handshake token on the
        // server. This only registers presence.
        socket.emit("addNewUser");
        setConnected(true);
        dispatch("connect", []);
      });
      socket.on("disconnect", () => setConnected(false));
      // Expected wherever WS is not proxied. The pollers already cover it,
      // and an error every few seconds trains people to ignore the console.
      socket.on("connect_error", () => {});
      socket.onAny((event, ...args) => dispatch(event, args));
    })
    .catch(() => {});
};

/**
 * Hold the shared connection open. Returns a release function (idempotent).
 * Without a token (logged out) or on the server this is a no-op.
 */
export const acquireRealtimeSocket = () => {
  if (typeof window === "undefined") return () => {};
  const token = storageInstance.getStorage("token");
  if (!token) return () => {};

  state.refs += 1;
  if (state.token !== token) {
    // First consumer, or the user changed: (re)connect with the current token.
    teardown();
    connect(token);
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.refs = Math.max(0, state.refs - 1);
    if (state.refs === 0) teardown();
  };
};

/**
 * Reopen the shared connection with the token now in storage, keeping every
 * listener. Used when the session token changes while consumers stay mounted
 * (vendor-network entity switch): the server joins the `user:<id>` room from
 * the handshake token, so the old socket would keep the old entity's inbox.
 * No-op when nothing holds the socket or the token has not changed.
 */
export const reconnectRealtimeSocket = () => {
  if (typeof window === "undefined" || state.refs === 0) return;
  const token = storageInstance.getStorage("token");
  if (!token || state.token === token) return;
  teardown();
  connect(token);
};

/** Listen for a server event (or the pseudo-event "connect"). Returns an unsubscribe. */
export const subscribeRealtime = (event, fn) => {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(fn);
  return () => {
    const set = handlers.get(event);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) handlers.delete(event);
  };
};

export const emitRealtime = (event, ...args) => {
  if (state.socket && state.connected) state.socket.emit(event, ...args);
};

export const isRealtimeConnected = () => state.connected;

export const subscribeRealtimeStatus = (cb) => {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
};

// ── test seams ────────────────────────────────────────────────────────────
export const __setRealtimeLoaderForTests = (loader) => {
  loadIo = loader;
};

export const __resetRealtimeForTests = () => {
  teardown();
  state.refs = 0;
  handlers.clear();
  statusListeners.clear();
  loadIo = () => import("socket.io-client");
};

/** Simulate a server frame or a status change without a network. */
export const __emitRealtimeForTests = (event, ...args) => dispatch(event, args);
export const __setRealtimeConnectedForTests = (value) => setConnected(value);
