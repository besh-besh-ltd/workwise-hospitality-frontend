// ActiveStage — who supplies each hotel of a live GROUP rate contract (Vendor
// Networks §6.4, §9). The hotel lens names the effective supplier per contract:
// the contract vendor, or the network member entity that accepted the hotel,
// named with the contract vendor it supplies for.

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
  committed_qty: 100, consumed_qty: 0, committed_value: 0, consumed_value: 0, utilisation_pct: 0,
  call_off_count: 1, last_call_off_at: null, is_suspended: false,
  on_contract_value: 0, off_contract_value: 0, on_contract_pct: null, fulfilled_by: [], ...over,
});

beforeEach(() => {
  ArcApi.getActiveSummary.mockResolvedValue({
    data: {
      arc: { id: 42, status: "contract_active", is_group: true, contract_start_at: "2026-01-01", contract_end_at: "2026-12-31" },
      contracts: [{ contract: { id: 70, vendor_id: 1, vendor_name: "Daikin HQ", status: "active" }, consumption: [] }],
      events: [], amendments: [], addendums: [], callOffs: [],
      hotels: [{ hotel_id: 3, name: "Goa Resort", is_lead: true }, { hotel_id: 4, name: "Mumbai Suites", is_lead: false }],
      hotel_usage: [
        usage({ hotel_id: 3, name: "Goa Resort", is_lead: true,
                fulfilled_by: [{ contract_id: 70, fulfilling_vendor_id: 1, fulfilling_name: "Daikin HQ" }] }),
        usage({ hotel_id: 4, name: "Mumbai Suites",
                fulfilled_by: [{ contract_id: 70, fulfilling_vendor_id: 9, fulfilling_name: "Daikin UP" }] }),
        usage({ hotel_id: 5, name: "Pune Inn", fulfilled_by: [] }),
      ],
      not_ordering_hotel_ids: [],
    },
  });
});

test("the hotel lens names each hotel's supplier, and a member with the contract vendor it supplies for", async () => {
  render(<ActiveStage arc={{ id: 42 }} stage={{ key: "active", state: "current" }} />);
  fireEvent.click(await screen.findByRole("button", { name: /hotel wise/i }));

  const table = screen.getByRole("table", { name: "Usage by hotel" });
  expect(within(table).getByRole("columnheader", { name: "Fulfilled by" })).toBeInTheDocument();

  const goa = within(table).getByRole("row", { name: /Goa Resort/ });
  expect(goa).toHaveTextContent("Daikin HQ");
  expect(goa).not.toHaveTextContent(/· for/);

  const mumbai = within(table).getByRole("row", { name: /Mumbai Suites/ });
  expect(mumbai).toHaveTextContent("Daikin UP · for Daikin HQ");

  const pune = within(table).getByRole("row", { name: /Pune Inn/ });
  expect(within(pune).getAllByRole("cell")[1]).toHaveTextContent("—");
});
