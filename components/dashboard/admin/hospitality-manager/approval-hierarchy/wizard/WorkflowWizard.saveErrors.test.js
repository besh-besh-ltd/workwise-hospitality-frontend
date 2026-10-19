// A rejected save must tell the admin why. The server's 400 body sits under
// `message.response.data` (services/approval.js rejects `{ message: error }`);
// the wizard used to hand that object to toast.error, which drops it silently.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/approval", () => ({
  createApprovalPolicy: jest.fn(),
  updateApprovalPolicy: jest.fn(),
  deleteApprovalPolicy: jest.fn(),
}));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { updateApprovalPolicy, deleteApprovalPolicy, createApprovalPolicy } from "@/services/approval";

import WorkflowWizard from "./WorkflowWizard";

const step = { approver_source_type: "ROLE", approver_source_id: 7, decision_rule: "ANY", step_order: 1 };
const serverMessage = "Role RFQ Creator lacks rfq.approve and cannot be an approver for RFQ";

const rejection = (data) => Promise.reject({ message: { response: { data } } });

const setup = () => {
  const props = {
    processes: [{ id: 2, name: "Day to Day Procurement", process_type: "RFQ" }],
    hotel: { id: 12, name: "Goa Beach Resort" },
    companyId: "4", hotelId: "12",
    getApproverOptions: jest.fn(() => [{ value: 7, label: "RFQ Creator" }]),
    getApproverDisplayInfo: jest.fn(() => ({ name: "RFQ Creator", email: "", type: "Role", typeLabel: "User Role", users: [] })),
    onCreateProcess: jest.fn(), onSave: jest.fn(), onCancel: jest.fn(),
  };
  render(
    <WorkflowWizard
      {...props}
      editingProcess={{ id: 2, name: "Day to Day Procurement", process_type: "RFQ" }}
      editingPolicies={[
        { id: 11, entity_type: "RFQ", hotel_id: 12, process_id: 2, steps: [step] },
        { id: 12, entity_type: "TECHNICAL", hotel_id: 12, process_id: 2, steps: [step] },
      ]}
    />
  );
  return props;
};

beforeEach(() => {
  jest.clearAllMocks();
  createApprovalPolicy.mockResolvedValue({ status: 1 });
  deleteApprovalPolicy.mockResolvedValue({ status: 1 });
});

test("a rejected stage is explained inline and in a string toast; other stages still save", async () => {
  updateApprovalPolicy.mockImplementation((payload) =>
    payload.entity_type === "RFQ"
      ? rejection({
          status: 3, code: "APPROVER_ROLE_CANNOT_APPROVE", message: serverMessage,
          data: { entity_type: "RFQ", steps: [{ step_order: 1, role_id: 7, role_title: "RFQ Creator", missing_permissions: ["rfq.approve"] }] },
        })
      : Promise.resolve({ status: 1 })
  );
  const props = setup();

  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
  fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));

  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  const [arg] = toast.error.mock.calls[0];
  expect(typeof arg).toBe("string");
  expect(arg).toBe("Couldn't save RFQ Approval — saved: Technical Approval");
  expect(updateApprovalPolicy).toHaveBeenCalledWith(expect.objectContaining({ entity_type: "TECHNICAL" }));
  expect(props.onSave).not.toHaveBeenCalled();
  expect(
    await screen.findByText("Level 1: RFQ Creator can't approve RFQ Approval — this role does the work but holds no approve permission. Pick an approver role or a named person.")
  ).toBeInTheDocument();
});

test("any other failure code shows the server message inline and as a string toast", async () => {
  updateApprovalPolicy.mockImplementation((payload) =>
    payload.entity_type === "RFQ" ? rejection({ status: 3, code: "SOMETHING_ELSE", message: serverMessage }) : Promise.resolve({ status: 1 })
  );
  setup();
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
  fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.any(String)));
  expect(await screen.findByText(serverMessage)).toBeInTheDocument();
});
