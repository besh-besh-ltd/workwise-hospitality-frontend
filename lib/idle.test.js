import { runWhenIdle } from "./idle";

afterEach(() => {
  delete window.requestIdleCallback;
  delete window.cancelIdleCallback;
  jest.useRealTimers();
});

test("uses requestIdleCallback with a timeout once the document has loaded", () => {
  const ric = jest.fn((cb) => { cb(); return 1; });
  window.requestIdleCallback = ric;
  const cb = jest.fn();
  runWhenIdle(cb, { timeout: 1234 });
  expect(ric).toHaveBeenCalledWith(expect.any(Function), { timeout: 1234 });
  expect(cb).toHaveBeenCalledTimes(1);
});

test("falls back to a timer where requestIdleCallback is missing (Safari)", () => {
  jest.useFakeTimers();
  const cb = jest.fn();
  runWhenIdle(cb, { fallbackDelay: 500 });
  expect(cb).not.toHaveBeenCalled();
  jest.advanceTimersByTime(500);
  expect(cb).toHaveBeenCalledTimes(1);
});

test("waits for window load when the document is still loading", () => {
  const spy = jest.spyOn(document, "readyState", "get").mockReturnValue("loading");
  window.requestIdleCallback = (fn) => { fn(); return 1; };
  const cb = jest.fn();
  runWhenIdle(cb);
  expect(cb).not.toHaveBeenCalled();
  window.dispatchEvent(new Event("load"));
  expect(cb).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});

test("cancel prevents the callback", () => {
  jest.useFakeTimers();
  const cb = jest.fn();
  const cancel = runWhenIdle(cb, { fallbackDelay: 100 });
  cancel();
  jest.advanceTimersByTime(1000);
  expect(cb).not.toHaveBeenCalled();
});
