jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/approval", () => ({ getPolicyCoverage: jest.fn() }));

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getPolicyCoverage } from "@/services/approval";
import usePolicyCoverage from "./usePolicyCoverage";
import { usableRfqProcesses } from "@/utils/policyCoverage";

const P1 = { value: 1, label: "One", process_type: "RFQ" };
const P2 = { value: 2, label: "Two", process_type: "RFQ" };
const cov = (by) => ({ data: { process_free: [], by_process: by } });
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

const Probe = ({ ids }) => {
  const { coverage, loading } = usePolicyCoverage({ hotelIds: ids });
  const usable = usableRfqProcesses([P1, P2], coverage).map((p) => p.label).join(",");
  return <div data-testid="out">{loading ? "loading" : "ready"}|{coverage ? "known" : "unknown"}|{usable}</div>;
};

beforeEach(() => getPolicyCoverage.mockReset());

describe("usePolicyCoverage", () => {
  it("one GET per selected unit; intersection decides", async () => {
    getPolicyCoverage.mockImplementation(({ hotel_id }) =>
      Promise.resolve(hotel_id === 1 ? cov({ 1: ["RFQ"], 2: ["RFQ"] }) : cov({ 1: ["RFQ"] }))
    );
    render(<Probe ids={[1, 2]} />);
    await waitFor(() => expect(screen.getByTestId("out")).toHaveTextContent("ready|known|One"));
    expect(getPolicyCoverage).toHaveBeenCalledTimes(2);
    expect(getPolicyCoverage).toHaveBeenCalledWith({ hotel_id: 1 });
    expect(getPolicyCoverage).toHaveBeenCalledWith({ hotel_id: 2 });
  });

  it("falls back to unknown when any request fails", async () => {
    getPolicyCoverage.mockImplementation(({ hotel_id }) =>
      hotel_id === 1 ? Promise.resolve(cov({ 1: ["RFQ"] })) : Promise.reject({ message: new Error("500") })
    );
    render(<Probe ids={[1, 2]} />);
    await waitFor(() => expect(screen.getByTestId("out")).toHaveTextContent("ready|unknown|One,Two"));
  });

  it("drops the previous unit's coverage while the new answer is pending", async () => {
    const second = deferred();
    getPolicyCoverage
      .mockResolvedValueOnce(cov({ 1: ["RFQ"] }))
      .mockReturnValueOnce(second.promise);
    const { rerender } = render(<Probe ids={[1]} />);
    await waitFor(() => expect(screen.getByTestId("out")).toHaveTextContent("ready|known|One"));

    rerender(<Probe ids={[2]} />);
    expect(screen.getByTestId("out")).toHaveTextContent("loading|unknown|One,Two");

    await act(async () => { second.resolve(cov({ 2: ["RFQ"] })); });
    await waitFor(() => expect(screen.getByTestId("out")).toHaveTextContent("ready|known|Two"));
  });
});
