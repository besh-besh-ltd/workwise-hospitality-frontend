import { dashboardErrorMessage, ERROR_COPY } from "./errorCopy";

describe("dashboardErrorMessage", () => {
  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it("a request that never reached the server reads as a connection problem", () => {
    const err = { message: null, status: null, network: true, code: "ERR_NETWORK", detail: "Network Error" };
    expect(dashboardErrorMessage(err, "Could not load")).toBe(ERROR_COPY.network);
    expect(warn).toHaveBeenCalled(); // the raw detail still reaches the console
  });

  it("the legacy flattened shape { message: 'Network Error' } is also mapped", () => {
    expect(dashboardErrorMessage({ message: "Network Error" }, "x")).toBe(ERROR_COPY.network);
  });

  it("timeouts get their own copy", () => {
    const err = { network: true, code: "ECONNABORTED", detail: "timeout of 30000ms exceeded" };
    expect(dashboardErrorMessage(err, "x")).toBe(ERROR_COPY.timeout);
  });

  it("5xx never shows the server's internal message", () => {
    expect(dashboardErrorMessage({ message: "relation does not exist", status: 500 }, "x")).toBe(ERROR_COPY.server);
  });

  it("403 explains access, not a failure", () => {
    expect(dashboardErrorMessage({ message: "Insufficient permissions", status: 403 }, "x")).toBe(ERROR_COPY.forbidden);
  });

  it("a 4xx with a server-written message keeps that message", () => {
    expect(dashboardErrorMessage({ message: "Pick a valid date range", status: 400 }, "x")).toBe("Pick a valid date range");
  });

  it("anything unrecognised falls back to the caller's copy", () => {
    expect(dashboardErrorMessage({}, "Could not load savings")).toBe("Could not load savings");
    expect(dashboardErrorMessage(undefined, "Could not load savings")).toBe("Could not load savings");
  });
});
