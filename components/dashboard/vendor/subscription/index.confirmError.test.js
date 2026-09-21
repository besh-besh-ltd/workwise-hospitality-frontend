// When applying a subscription change fails, the vendor has to be told why.
//
// handleConfirm read `err?.response?.data?.message || err?.message`. Through
// the services/*.js `reject({ message: error })` wrap the first term is always
// undefined and the second is the AxiosError OBJECT, so toast.error() was
// handed an object. react-toastify does not throw on one — it just renders
// nothing useful — so the vendor pressed "Apply Changes", the modal closed and
// no reason ever appeared. Silent failure, which is worse than the crash it
// sits next to: at least the crash was visible.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/services/Auth", () => ({ getProfile: jest.fn().mockResolvedValue({ data: {} }) }));
jest.mock("@/services/subscription", () => ({
  modifySubscription: jest.fn(),
  renewHospitalitySubscription: jest.fn(),
  extendSubscription: jest.fn(),
  getMatchingOpenRfqs: jest.fn().mockResolvedValue({ data: { rfqs: [] } }),
  joinOpenRfqs: jest.fn(),
  getVendorSubscriptionSummary: jest.fn(),
}));
jest.mock("./hooks/useRazorpayPayment", () => ({
  __esModule: true,
  default: () => ({ openPayment: jest.fn(), inProgress: false }),
}));
jest.mock("react-redux", () => ({ useDispatch: () => jest.fn() }));

// Stub the two heavy children down to a button each, so the test drives
// handleConfirm — the code under test — instead of react-select.
jest.mock("./EditSubscriptionDrawer", () => ({
  __esModule: true,
  default: ({ onSubmit }) => (
    <button
      onClick={() =>
        onSubmit({
          target_categories: [237],
          target_subcategories: [],
          target_hotels: [6],
          preview: { diff: {}, pricing: { net_cost: 0 } },
        })
      }
    >
      stub-submit
    </button>
  ),
}));
jest.mock("./ModificationConfirmModal", () => ({
  __esModule: true,
  default: ({ onConfirm }) => <button onClick={onConfirm}>stub-confirm</button>,
}));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AxiosError } from "axios";
import { toast } from "react-toastify";
import { modifySubscription, getVendorSubscriptionSummary } from "@/services/subscription";
import SubscriptionPage from "./index";

const toastError = toast.error;

const SERVER_MSG = "Removals require confirmation. Re-send with confirm_removals: true.";

const SUMMARY = {
  status: 1,
  data: {
    status: "active",
    subscription: {
      categories: [{ id: 237, name: "ENGINEERING", sub_categories: [] }],
      hotels: [{ id: 6, name: "The Orchid Mumbai" }],
      days_remaining: 100,
    },
    available_actions: { can_modify: true },
    payment_history: [],
  },
};

const applyChanges = async () => {
  await waitFor(() => expect(screen.getByText("stub-submit")).toBeInTheDocument());
  fireEvent.click(screen.getByText("stub-submit"));
  await waitFor(() => expect(screen.getByText("stub-confirm")).toBeInTheDocument());
  fireEvent.click(screen.getByText("stub-confirm"));
};

beforeEach(() => {
  jest.clearAllMocks();
  getVendorSubscriptionSummary.mockResolvedValue(SUMMARY);
});

it("tells the vendor the server's reason when applying changes fails", async () => {
  const axiosError = new AxiosError("Request failed with status code 400", "ERR_BAD_REQUEST", {}, {});
  axiosError.response = { status: 400, data: { status: 0, message: SERVER_MSG } };
  modifySubscription.mockRejectedValue({ message: axiosError });

  render(<SubscriptionPage />);
  await applyChanges();

  await waitFor(() => expect(toastError).toHaveBeenCalled());
  expect(toastError).toHaveBeenCalledWith(SERVER_MSG);
});

it("never hands a non-string to the toast", async () => {
  modifySubscription.mockRejectedValue({
    message: new AxiosError("Network Error", "ERR_NETWORK", {}, {}),
  });

  render(<SubscriptionPage />);
  await applyChanges();

  await waitFor(() => expect(toastError).toHaveBeenCalled());
  expect(typeof toastError.mock.calls[0][0]).toBe("string");
});

// The recovery modal exists for the case where the modification may have been
// half-applied — it tells the vendor to check before retrying, which a toast
// cannot. The backend flags it with `show_error_modal: true`, but always on a
// 500, so the response arrives as a rejection: `err.response` is eaten by the
// services wrap and this branch never fired. The vendor got a generic toast
// instead of the one message that told them what to do.
it("opens the recovery modal when the server flags one, instead of a toast", async () => {
  const axiosError = new AxiosError("Request failed with status code 500", "ERR_BAD_RESPONSE", {}, {});
  axiosError.response = {
    status: 500,
    data: { status: 3, message: "Something went wrong", show_error_modal: true },
  };
  modifySubscription.mockRejectedValue({ message: axiosError });

  render(<SubscriptionPage />);
  await applyChanges();

  await waitFor(() => expect(screen.getByText("Something Went Wrong")).toBeInTheDocument());
  expect(toastError).not.toHaveBeenCalled();
});
