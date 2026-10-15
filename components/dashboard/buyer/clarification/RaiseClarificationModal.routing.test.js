// RaiseClarificationModal: a raise the server refuses shows the server's own sentence.
// Task 25 fix round 1: a vendor-network member that has not accepted the RFQ gets
// 403 ROUTING_REQUIRED (the inquiry page also disables the button, but a stale page can
// still submit). The service rejects as { message: AxiosError }.

jest.mock("@/services/clarification", () => ({ __esModule: true, raiseClarification: jest.fn() }));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { raiseClarification } from "@/services/clarification";
import RaiseClarificationModal from "./RaiseClarificationModal";

const SERVER_REASON = "Your network admin has not routed this RFQ to you, or you have not accepted it yet";

test("a ROUTING_REQUIRED refusal shows the server's reason and keeps the modal open", async () => {
  raiseClarification.mockRejectedValue({
    message: { response: { status: 403, data: { status: 0, message: SERVER_REASON, reason: "ROUTING_REQUIRED" } } },
  });
  const onSuccess = jest.fn();
  const quiet = jest.spyOn(console, "error").mockImplementation(() => {}); // the modal logs the error it toasts
  render(<RaiseClarificationModal show onHide={jest.fn()} rfqId={918} onSuccess={onSuccess} />);

  fireEvent.change(screen.getByPlaceholderText("Brief subject of your clarification"), { target: { value: "Delivery" } });
  fireEvent.change(screen.getByPlaceholderText("Describe your clarification request in detail..."), { target: { value: "Can delivery be split?" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Clarification" }));

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(SERVER_REASON));
  expect(onSuccess).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Submit Clarification" })).toBeInTheDocument();
  quiet.mockRestore();
});
