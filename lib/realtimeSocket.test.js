// The shared socket: one connection per tab no matter how many listeners
// mount, closed when the last one leaves, and a status signal that pollers
// key their cadence off.

jest.mock("@/utils/storageInstance", () => ({
  __esModule: true,
  default: { getStorage: jest.fn((key) => (key === "token" ? "tok-1" : null)) },
}));

import React from "react";
import { render, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import storageInstance from "@/utils/storageInstance";
import {
  acquireRealtimeSocket,
  __setRealtimeLoaderForTests,
  __resetRealtimeForTests,
} from "@/lib/realtimeSocket";
import { useRealtimeEvent, useRealtimeConnected } from "@/hooks/useRealtime";
import useNotificationStream from "@/hooks/useNotificationStream";
import useActivityStream from "@/hooks/useActivityStream";

const makeFakeIo = () => {
  const sockets = [];
  const io = jest.fn((origin, opts) => {
    const listeners = {};
    let anyFn = null;
    const socket = {
      origin,
      opts,
      emitted: [],
      connected: false,
      on: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); },
      onAny: (fn) => { anyFn = fn; },
      offAny: () => { anyFn = null; },
      removeAllListeners: () => { Object.keys(listeners).forEach((k) => delete listeners[k]); },
      disconnect: jest.fn(),
      emit: (ev, ...args) => socket.emitted.push([ev, ...args]),
      // test helpers: simulate the server
      serverConnect: () => { socket.connected = true; (listeners.connect || []).forEach((f) => f()); },
      serverDisconnect: () => { socket.connected = false; (listeners.disconnect || []).forEach((f) => f()); },
      serverEmit: (ev, ...args) => { if (anyFn) anyFn(ev, ...args); },
    };
    sockets.push(socket);
    return socket;
  });
  return { io, sockets };
};

let fake;
beforeEach(() => {
  __resetRealtimeForTests();
  fake = makeFakeIo();
  __setRealtimeLoaderForTests(() => Promise.resolve({ io: fake.io }));
  storageInstance.getStorage.mockImplementation((key) => (key === "token" ? "tok-1" : null));
});

const flush = () => act(async () => {});

const Listener = ({ event, onEvent }) => {
  useRealtimeEvent(event, onEvent);
  return null;
};

const Status = () => <span data-testid="status">{useRealtimeConnected() ? "on" : "off"}</span>;

test("many listeners share ONE connection, and the last to leave closes it", async () => {
  const a = jest.fn();
  const b = jest.fn();
  const c = jest.fn();
  const { rerender, unmount } = render(
    <>
      <Listener event="notification:new" onEvent={a} />
      <Listener event="approval:changed" onEvent={b} />
      <Listener event="approval:changed" onEvent={c} />
    </>
  );
  await flush();
  expect(fake.io).toHaveBeenCalledTimes(1);
  const [socket] = fake.sockets;
  expect(socket.opts).toMatchObject({ transports: ["websocket"], auth: { token: "tok-1" } });

  act(() => socket.serverEmit("approval:changed", { entity_type: "PO", entity_id: 7 }));
  expect(a).not.toHaveBeenCalled();
  expect(b).toHaveBeenCalledWith({ entity_type: "PO", entity_id: 7 });
  expect(c).toHaveBeenCalledTimes(1);

  rerender(<Listener event="notification:new" onEvent={a} />);
  expect(socket.disconnect).not.toHaveBeenCalled();
  unmount();
  expect(socket.disconnect).toHaveBeenCalledTimes(1);
});

test("registers presence on every connect and reports status", async () => {
  const { getByTestId } = render(
    <>
      <Listener event="notification:new" onEvent={() => {}} />
      <Status />
    </>
  );
  await flush();
  const [socket] = fake.sockets;
  expect(getByTestId("status")).toHaveTextContent("off");

  act(() => socket.serverConnect());
  expect(getByTestId("status")).toHaveTextContent("on");
  expect(socket.emitted).toEqual([["addNewUser"]]);

  act(() => socket.serverDisconnect());
  expect(getByTestId("status")).toHaveTextContent("off");
});

test("no token, no socket", async () => {
  storageInstance.getStorage.mockImplementation(() => null);
  render(<Listener event="notification:new" onEvent={() => {}} />);
  await flush();
  expect(fake.io).not.toHaveBeenCalled();
});

test("a different token reconnects instead of reusing the old user's socket", async () => {
  const releaseA = acquireRealtimeSocket();
  await flush();
  storageInstance.getStorage.mockImplementation((key) => (key === "token" ? "tok-2" : null));
  const releaseB = acquireRealtimeSocket();
  await flush();
  expect(fake.io).toHaveBeenCalledTimes(2);
  expect(fake.sockets[0].disconnect).toHaveBeenCalled();
  expect(fake.sockets[1].opts.auth.token).toBe("tok-2");
  releaseA();
  releaseB();
});

test("useNotificationStream and useActivityStream ride the same socket; activity re-subscribes on reconnect", async () => {
  const onNotif = jest.fn();
  const onActivity = jest.fn();
  const Both = () => {
    useNotificationStream(onNotif);
    useActivityStream(onActivity);
    return null;
  };
  render(<Both />);
  await flush();
  expect(fake.io).toHaveBeenCalledTimes(1);
  const [socket] = fake.sockets;

  act(() => socket.serverConnect());
  expect(socket.emitted).toEqual([["addNewUser"], ["activity:subscribe"]]);

  act(() => socket.serverEmit("notification:new", { id: 1 }));
  act(() => socket.serverEmit("activity:new", { id: 2 }));
  expect(onNotif).toHaveBeenCalledWith({ id: 1 });
  expect(onActivity).toHaveBeenCalledWith({ id: 2 });

  act(() => socket.serverDisconnect());
  act(() => socket.serverConnect());
  expect(socket.emitted.filter(([e]) => e === "activity:subscribe")).toHaveLength(2);
});
