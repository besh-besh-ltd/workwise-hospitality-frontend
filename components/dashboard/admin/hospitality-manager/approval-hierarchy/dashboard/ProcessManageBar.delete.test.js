jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/services/process", () => ({
  getApprovalProcesses: jest.fn(),
  createApprovalProcess: jest.fn(),
  updateApprovalProcess: jest.fn(),
  deleteApprovalProcess: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { getApprovalProcesses, deleteApprovalProcess } from "@/services/process";
import useProcessData from "../hooks/useProcessData";
import ProcessManageBar from "./ProcessManageBar";
import { formatProcessBlockers } from "../processBlockers";

const PROC = { id: 7, name: "Renovation", process_type: "RFQ" };

const inUse = (blockers) => ({
  message: {
    response: {
      status: 409,
      data: { status: 0, code: "PROCESS_IN_USE", message: "This process is still in use", data: { blockers } },
    },
  },
});

const Harness = () => {
  const d = useProcessData(1);
  return (
    <ProcessManageBar
      processes={d.processes}
      onCreateProcess={d.handleCreateProcess}
      onUpdateProcess={d.handleUpdateProcess}
      onDeleteProcess={d.handleDeleteProcess}
    />
  );
};

describe("formatProcessBlockers", () => {
  it("omits zero parts, dedupes hotels, caps at 3", () => {
    const text = formatProcessBlockers("Renovation", {
      policies: [
        { id: 1, entity_type: "RFQ", hotel_name: "A" },
        { id: 2, entity_type: "TECHNICAL", hotel_name: "A" },
        { id: 3, entity_type: "RFQ", hotel_name: "B" },
        { id: 4, entity_type: "RFQ", hotel_name: "C" },
        { id: 5, entity_type: "RFQ", hotel_name: "D" },
      ],
      pending_instances: 0,
      open_rfqs: [{ id: 1, rfq_no: 101 }, { id: 2, rfq_no: 102 }],
      open_rfq_count: 2,
      open_arcs: 0,
      role_grants: 1,
    });
    expect(text).toBe(
      `Can't deactivate "Renovation": still used by 5 workflows (A, B, C, +1 more); 2 open RFQs (101, 102); 1 role grant.`
    );
  });
});

describe("deleting an in-use process", () => {
  let unhandled;
  const onUnhandled = (e) => unhandled.push(e);
  beforeEach(() => {
    unhandled = [];
    process.on("unhandledRejection", onUnhandled);
    jest.clearAllMocks();
    getApprovalProcesses.mockResolvedValue({ data: { data: [PROC] } });
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    process.off("unhandledRejection", onUnhandled);
    console.error.mockRestore();
  });

  it("shows the blockers as text and closes the modal cleanly", async () => {
    deleteApprovalProcess.mockRejectedValue(
      inUse({
        policies: [{ id: 1, entity_type: "RFQ", hotel_name: "Orchid Pune" }],
        pending_instances: 0,
        open_rfqs: [{ id: 9, rfq_no: 555 }],
        open_rfq_count: 1,
        open_arcs: 0,
        role_grants: 2,
      })
    );
    render(<Harness />);
    fireEvent.click(await screen.findByTitle("Delete"));
    fireEvent.click(screen.getByText("Deactivate", { selector: "button" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const msg = toast.error.mock.calls[0][0];
    expect(msg).toContain("Renovation");
    expect(msg).toContain("1 workflow (Orchid Pune)");
    expect(msg).toContain("1 open RFQ (555)");
    expect(msg).toContain("2 role grants");

    await waitFor(() => expect(screen.queryByText("Deactivate process")).not.toBeInTheDocument());
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(unhandled).toEqual([]);
  });

  it("keeps the server message for other errors", async () => {
    deleteApprovalProcess.mockRejectedValue({
      message: { response: { status: 400, data: { message: "Nope" } } },
    });
    render(<Harness />);
    fireEvent.click(await screen.findByTitle("Delete"));
    fireEvent.click(screen.getByText("Deactivate", { selector: "button" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Nope"));
  });
});
