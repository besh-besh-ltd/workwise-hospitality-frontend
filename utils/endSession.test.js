// endSession: the one way the vendor-network pages end this browser's session (the keys of
// the DashboardShell logout). Used by the network invite page, Leave network and the
// rate-contract guest notice (Task 26). The `loginStatusChanged` event (this tab's Layout
// re-reads the login state) is opt-in: a caller that hard-navigates next must not let
// the Layout re-render the page in between.

const mockFlush = jest.fn(() => Promise.resolve());
jest.mock("@/redux/store", () => ({ __esModule: true, persistor: { flush: (...a) => mockFlush(...a) } }));
jest.mock("@/lib/analytics", () => ({ __esModule: true, default: { reset: jest.fn() } }));
jest.mock("@/utils/hospitalityContext", () => ({ __esModule: true, setStoredHospitalityContext: jest.fn() }));

import posthog from "@/lib/analytics";
import { setStoredHospitalityContext } from "@/utils/hospitalityContext";
import { clearUserProfile } from "@/redux/slice";
import { endSession, SESSION_STORAGE_KEYS } from "./endSession";

const KEYS = ["token", "current-user-type", "current-user-name", "current-user-email", "user-permissions", "guest-session"];

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  for (const k of [...KEYS, "unrelated"]) window.localStorage.setItem(k, "x");
});

test("clears the profile, the session keys and the hospitality context, then flushes the persisted store", async () => {
  const dispatch = jest.fn();
  const events = jest.fn();
  window.addEventListener("loginStatusChanged", events);
  await endSession(dispatch);
  window.removeEventListener("loginStatusChanged", events);

  expect(SESSION_STORAGE_KEYS).toEqual(KEYS);
  expect(posthog.reset).toHaveBeenCalledTimes(1);
  expect(dispatch).toHaveBeenCalledWith(clearUserProfile());
  for (const k of KEYS) expect(window.localStorage.getItem(k)).toBeNull();
  expect(window.localStorage.getItem("unrelated")).toBe("x");
  expect(setStoredHospitalityContext).toHaveBeenCalledWith(null);
  expect(mockFlush).toHaveBeenCalledTimes(1);
  // No event unless asked.
  expect(events).not.toHaveBeenCalled();
});

test("emits loginStatusChanged only when asked, after the store is flushed", async () => {
  const order = [];
  mockFlush.mockImplementationOnce(() => { order.push("flush"); return Promise.resolve(); });
  const onEvent = () => order.push("loginStatusChanged");
  window.addEventListener("loginStatusChanged", onEvent);
  await endSession(jest.fn(), { emitLoginStatusChanged: true });
  window.removeEventListener("loginStatusChanged", onEvent);
  expect(order).toEqual(["flush", "loginStatusChanged"]);
});

test("a failing analytics reset or flush never stops the session from ending", async () => {
  posthog.reset.mockImplementationOnce(() => { throw new Error("no analytics"); });
  mockFlush.mockImplementationOnce(() => Promise.reject(new Error("storage full")));
  const dispatch = jest.fn();
  await expect(endSession(dispatch)).resolves.toBeUndefined();
  expect(dispatch).toHaveBeenCalledWith(clearUserProfile());
  expect(window.localStorage.getItem("token")).toBeNull();
});
