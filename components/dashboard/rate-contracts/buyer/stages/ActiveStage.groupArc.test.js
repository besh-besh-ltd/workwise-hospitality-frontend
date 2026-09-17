// ActiveStage — how each hotel uses a live GROUP rate contract.
//
// Head office sees committed vs used per hotel, the share of each hotel's
// spend on these items that went through the contract, and which hotels have
// not ordered at all yet (the main sign of off-contract buying).

jest.mock("@/services/arc_v2", () => ({ __esModule: true, getActiveSummary: jest.fn() }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: {}, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("react-redux", () => ({ useSelector: (fn) => fn({ userProfile: { id: 7 } }) }));
jest.mock("./StageShared", () => ({
  __esModule: true,
  StageReadOnlyBanner: (props) => props.children,
  StageSkeleton: () => null,
  StageNoPermission: () => null,
  removalReasonLabel: () => "",
}));

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ActiveStage from "./ActiveStage";

const usage = (over) => ({
  committed_qty: 0, consumed_qty: 0, committed_value: 0, consumed_value: 0, utilisation_pct: 0,
  call_off_count: 0, last_call_off_at: null, is_suspended: false,
  on_contract_value: 0, off_contract_value: 0, on_contract_pct: null, ...over,
});

beforeEach(() => {
  ArcApi.getActiveSummary.mockResolvedValue({
    data: {
      arc: { id: 42, status: "contract_active", is_group: true, contract_start_at: "2026-01-01", contract_end_at: "2026-12-31" },
      contracts: [], events: [], amendments: [], addendums: [],
      callOffs: [{
        call_off_id: 1, po_id: 11, po_number: "PO-11", mr_id: 5, mr_number: "MR-5", vendor_id: 1, vendor_name: "Alpha Linen",
        variant_name: "Bath towel", arc_contract_line_id: 81, quantity: 250, uom: "pcs", total_value: 25000, po_status: "sent",
        hotel_id: 3, hotel_name: "Goa Resort",
      }],
      hotels: [{ hotel_id: 3, name: "Goa Resort", is_lead: true }, { hotel_id: 4, name: "Mumbai Suites", is_lead: false }],
      hotel_usage: [
        usage({ hotel_id: 3, name: "Goa Resort", is_lead: true, committed_qty: 400, consumed_qty: 250, utilisation_pct: 62.5, call_off_count: 1, on_contract_value: 25000, off_contract_value: 6250, on_contract_pct: 80 }),
        usage({ hotel_id: 4, name: "Mumbai Suites", committed_qty: 250 }),
      ],
      not_ordering_hotel_ids: [4],
    },
  });
});

test("names the hotels that have not ordered yet and shows usage hotel by hotel", async () => {
  render(<ActiveStage arc={{ id: 42 }} stage={{ key: "active", state: "current" }} />);

  expect(await screen.findByText(/not ordered against this contract yet: Mumbai Suites/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /hotel wise/i }));
  const table = screen.getByRole("table", { name: "Usage by hotel" });
  const goa = within(table).getByRole("row", { name: /Goa Resort/ });
  expect(goa).toHaveTextContent("250 / 400");
  expect(goa).toHaveTextContent("62.5%");
  expect(goa).toHaveTextContent("80%");
  const mumbai = within(table).getByRole("row", { name: /Mumbai Suites/ });
  expect(mumbai).toHaveTextContent("0 / 250");
  expect(mumbai).toHaveTextContent("Not ordering");
});

test("released POs say which hotel ordered", async () => {
  render(<ActiveStage arc={{ id: 42 }} stage={{ key: "active", state: "current" }} />);
  await screen.findByText(/not ordered against this contract yet/i);

  fireEvent.click(screen.getByRole("button", { name: /released pos/i }));
  expect(screen.getByText("Goa Resort")).toBeInTheDocument();
});
