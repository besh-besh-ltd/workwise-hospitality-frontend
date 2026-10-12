// Vendor Networks §6.4, Task 25 — a branch reviews a rate contract before it accepts a
// hotel. While any of the member's hotels is offered to it (a PENDING ARC_HOTEL
// assignment), the member contract page says "Contract offered to you", shows a banner
// naming the head office, the hotels and the reply deadline, with Accept and Decline
// acting on every pending hotel, and lands on the contract document where the
// commercial clauses the holder accepted at signing are listed read-only. Once every
// hotel is accepted it is the plain "Contract you fulfil" view. The holder's own view
// is unchanged.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  vendorGetContract: jest.fn(),
  vendorDeclineAddendum: jest.fn(),
  vendorRequestOtp: jest.fn(),
  vendorVerifyOtp: jest.fn(),
  vendorDeclineContract: jest.fn(),
  vendorRequestClarification: jest.fn(),
}));
jest.mock("@/services/vendorNetwork", () => ({
  __esModule: true,
  getOrg: jest.fn(),
  getRoutingQueue: jest.fn(),
  assignSubject: jest.fn(),
  revokeAssignment: jest.fn(),
  respondToAssignment: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
const mockPush = jest.fn();
let mockQuery = { contractId: "77" };
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: mockQuery, push: mockPush, replace: jest.fn() }),
}));

import fs from "fs";
import path from "path";
import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";

import reducer, { setUserProfile } from "@/redux/slice";
import * as ArcApi from "@/services/arc_v2";
import * as NetApi from "@/services/vendorNetwork";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import VendorContractPage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/index";
import VendorAcceptPage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/accept";

const MUMBAI = 4;
const PUNE = 5;
const DUE = "2026-10-14T06:30:00.000Z";
const LATER = "2026-10-15T06:30:00.000Z";

const memberNetwork = { org_id: 7, org_name: "Alpha Network", role: "ENTITY_MEMBER", acting_entity_id: 11, is_principal: false, actable_entities: [] };

const ARC = {
  arc_number: "ARC-1", title: "Linen group", is_group: true, hotel_name: null,
  payment_terms_expected: "Net 45", delivery_expected: "Within 7 days of the PO",
  penalty_clause: "1% of the PO value per week of delay", escalation_clause_json: { type: "index", cap_pct: 5 },
};

const hotel = (hotelId, status, assignmentId, dueAt = DUE) => ({
  hotel_id: hotelId,
  name: hotelId === MUMBAI ? "Mumbai Suites" : "Pune Inn",
  city: "x",
  state: "Maharashtra",
  assignment_status: status,
  assignment_id: assignmentId,
  due_at: dueAt,
});

const memberContract = (hotels) => ({
  data: {
    contract: { id: 77, status: "active", vendor_id: 10, vendor_name: "Alpha Linen", arc_number: "ARC-1", document_s3_url: null, document_hash: null, signed_by_vendor_at: "2026-09-01" },
    arc: ARC,
    hotels,
    lines: [{
      id: 501, variant_name: "Bath towel", uom: "pcs", unit_rate: 100, gst_pct: 5,
      committed_qty: 300 * hotels.length, consumed_qty: 0, effective_unit_rate: 100,
      hotels: hotels.map((h) => ({ hotel_id: h.hotel_id, committed_qty: 300, consumed_qty: 0, effective_unit_rate: 100 })),
    }],
    callOffs: [],
    amendments: [],
    clarifications: [],
    pending_assignment_ids: hotels.filter((h) => h.assignment_status === "PENDING").map((h) => h.assignment_id),
    viewer_role: "fulfilment_member",
  },
});

const holderContract = (status = "active") => ({
  data: {
    contract: { id: 77, status, vendor_id: 10, vendor_name: "Alpha Linen", arc_number: "ARC-1", signed_by_vendor_at: "2026-09-01" },
    arc: { ...ARC, hotel_name: "Goa Resort" },
    hotels: [{ hotel_id: MUMBAI, name: "Mumbai Suites" }],
    lines: [{ id: 501, arc_item_id: 61, variant_name: "Bath towel", uom: "pcs", unit_rate: 100, gst_pct: 5, committed_qty: 300, consumed_qty: 0, hotels: [] }],
    callOffs: [],
    amendments: [],
    clarifications: [],
  },
});

const renderWith = (Page, network = memberNetwork) => {
  const store = configureStore({ reducer });
  store.dispatch(setUserProfile({ id: 11, user_type: 3, name: "Alpha West", network }));
  return render(<Provider store={store}><Page /></Provider>);
};

const offer = () => screen.findByRole("region", { name: "Contract offer" });
const clauseList = () => screen.findByRole("group", { name: "Commercial terms" });
const clausesIn = (el) =>
  [...el.querySelectorAll(".dt-k")].map((k) => [k.textContent, k.nextElementSibling.textContent]);

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks keeps queued *Once values: drop them so no test inherits another's.
  ArcApi.vendorGetContract.mockReset();
  NetApi.respondToAssignment.mockReset();
  mockQuery = { contractId: "77" };
  NetApi.respondToAssignment.mockResolvedValue({ status: 1, message: "Assignment accepted", data: {} });
});

describe("a member with a pending hotel", () => {
  test("the page offers the contract: eyebrow, banner, actions, and the document with its commercial clauses", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(memberContract([hotel(MUMBAI, "PENDING", 901)]));
    renderWith(VendorContractPage);

    const banner = await offer();
    expect(screen.getByText("Contract offered to you")).toBeInTheDocument();
    expect(screen.queryByText("Contract you fulfil")).toBeNull();
    expect(banner).toHaveTextContent(
      `Alpha Linen has asked you to supply Mumbai Suites under this contract. Review the rates, quantities and terms below, then accept or decline by ${formatDisplayDate(DUE, { includeTime: true })}.`
    );
    expect(within(banner).getByRole("button", { name: "Accept" })).toBeEnabled();
    expect(within(banner).getByRole("button", { name: "Decline" })).toBeEnabled();
    // It supplies nothing yet.
    expect(screen.queryByText(/Fulfilling for:/)).toBeNull();

    // It lands on the contract document, where the clauses are read-only.
    const clauses = clausesIn(await clauseList());
    expect(clauses.map(([title]) => title)).toEqual([
      "Payment terms", "Delivery & lead time", "Penalty / SLA clauses", "Price escalation", "Termination & exit",
    ]);
    expect(clauses[0][1]).toMatch(/^Net 45 from goods receipt \(GRN\)/);
    expect(clauses[2][1]).toBe("1% of the PO value per week of delay");
    expect(clauses[3][1]).toBe("Price escalation permitted via the agreed index, capped at 5% over the term.");
    expect(within(await clauseList()).queryAllByRole("button")).toHaveLength(0);
    expect(within(await clauseList()).queryAllByRole("checkbox")).toHaveLength(0);
    // The penalty clause is listed once, among the clauses.
    expect(screen.queryByText("Penalty / LD clause")).toBeNull();
    // The rates and quantities it is asked to supply are on the same document.
    expect(screen.getByText("Schedule A — Awarded items & rates")).toBeInTheDocument();
  });

  test("the member reads the same clause text the contract holder accepted on the accept page", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(holderContract("awaiting_acceptance"));
    const holder = renderWith(VendorAcceptPage, null);
    await waitFor(() => expect(document.querySelectorAll(".term-item")).toHaveLength(5));
    const accepted = [...document.querySelectorAll(".term-item")].map((t) => [
      t.querySelector(".ti-title").textContent,
      t.querySelector(".ti-text").textContent,
    ]);
    expect(accepted).toHaveLength(5);
    holder.unmount();

    ArcApi.vendorGetContract.mockResolvedValue(memberContract([hotel(MUMBAI, "PENDING", 901)]));
    renderWith(VendorContractPage);
    expect(clausesIn(await clauseList())).toEqual(accepted);
  });

  test("a ?tab= link still picks the tab", async () => {
    mockQuery = { contractId: "77", tab: "pos" };
    ArcApi.vendorGetContract.mockResolvedValue(memberContract([hotel(MUMBAI, "PENDING", 901)]));
    renderWith(VendorContractPage);
    await offer();
    expect(screen.getByText("Released POs received")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Commercial terms" })).toBeNull();
  });

  test("Accept replies ACCEPT for every pending hotel, then re-reads the contract", async () => {
    ArcApi.vendorGetContract
      .mockResolvedValueOnce(memberContract([hotel(MUMBAI, "PENDING", 901), hotel(PUNE, "PENDING", 902, LATER)]))
      .mockResolvedValueOnce(memberContract([hotel(MUMBAI, "ACCEPTED", 901), hotel(PUNE, "ACCEPTED", 902, LATER)]));
    renderWith(VendorContractPage);

    const banner = await offer();
    // Both hotels named; the reply deadline is the earlier one.
    expect(banner).toHaveTextContent("has asked you to supply Mumbai Suites and Pune Inn under this contract");
    expect(banner).toHaveTextContent(`accept or decline by ${formatDisplayDate(DUE, { includeTime: true })}.`);
    expect(banner).toHaveTextContent("Accept and Decline apply to all 2 hotels waiting for your reply.");
    fireEvent.click(within(banner).getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(NetApi.respondToAssignment).toHaveBeenCalledTimes(2));
    expect(NetApi.respondToAssignment.mock.calls).toEqual([
      [901, { decision: "ACCEPT" }],
      [902, { decision: "ACCEPT" }],
    ]);
    expect(toast.success).toHaveBeenCalledWith("Assignment accepted");
    await waitFor(() => expect(screen.queryByRole("region", { name: "Contract offer" })).toBeNull());
    expect(ArcApi.vendorGetContract).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Contract you fulfil")).toBeInTheDocument();
    expect(screen.getByText("Fulfilling for: Mumbai Suites, Pune Inn")).toBeInTheDocument();
  });

  test("Decline asks for a reason in the shared dialog and declines every pending hotel; with nothing left it returns to Assigned to me", async () => {
    NetApi.respondToAssignment.mockResolvedValue({ status: 1, message: "Assignment declined", data: {} });
    ArcApi.vendorGetContract
      .mockResolvedValueOnce(memberContract([hotel(MUMBAI, "PENDING", 901), hotel(PUNE, "PENDING", 902)]))
      // The member no longer reads the contract once it declined every hotel.
      .mockRejectedValueOnce({ response: { status: 403, data: { status: 0, message: "Not the contracted vendor" } } });
    renderWith(VendorContractPage);

    fireEvent.click(within(await offer()).getByRole("button", { name: "Decline" }));
    const dialog = await screen.findByRole("dialog", { name: "Decline assignment" });
    expect(dialog).toHaveTextContent("Rate contract ARC-1 · Linen group · Mumbai Suites and Pune Inn");

    fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
    expect(within(dialog).getByText("Pick a reason.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText("Other"));
    fireEvent.change(within(dialog).getByLabelText(/^Note/), { target: { value: "  Truck strike  " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));

    await waitFor(() => expect(NetApi.respondToAssignment).toHaveBeenCalledTimes(2));
    expect(NetApi.respondToAssignment.mock.calls).toEqual([
      [901, { decision: "DECLINE", reason: "OTHER", note: "Truck strike" }],
      [902, { decision: "DECLINE", reason: "OTHER", note: "Truck strike" }],
    ]);
    expect(toast.success).toHaveBeenCalledWith("Assignment declined");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/vendor/network/assigned"));
  });

  test("an accepted hotel shows as accepted beside the pending one, and Accept acts only on the pending one", async () => {
    ArcApi.vendorGetContract
      .mockResolvedValueOnce(memberContract([hotel(MUMBAI, "ACCEPTED", 900), hotel(PUNE, "PENDING", 902)]))
      .mockResolvedValueOnce(memberContract([hotel(MUMBAI, "ACCEPTED", 900), hotel(PUNE, "ACCEPTED", 902)]));
    renderWith(VendorContractPage);

    const banner = await offer();
    expect(screen.getByText("Contract offered to you")).toBeInTheDocument();
    expect(banner).toHaveTextContent("has asked you to supply Pune Inn under this contract");
    const list = within(banner).getByRole("list", { name: "Your hotels on this contract" });
    const [mumbai, pune] = within(list).getAllByRole("listitem");
    expect(mumbai).toHaveTextContent("Mumbai Suites");
    expect(within(mumbai).getByText("Accepted")).toBeInTheDocument();
    expect(pune).toHaveTextContent("Pune Inn");
    expect(within(pune).getByText("Waiting for your reply")).toBeInTheDocument();
    // The note names only the hotel it already supplies.
    expect(screen.getByText("Fulfilling for: Mumbai Suites")).toBeInTheDocument();

    fireEvent.click(within(banner).getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(NetApi.respondToAssignment).toHaveBeenCalledWith(902, { decision: "ACCEPT" }));
    expect(NetApi.respondToAssignment).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("region", { name: "Contract offer" })).toBeNull());
  });

  test("a reply after the deadline (409 EXPIRED) explains it and re-reads the contract", async () => {
    NetApi.respondToAssignment.mockRejectedValue({
      response: { status: 409, data: { status: 0, message: "This assignment has expired", reason: "EXPIRED" } },
    });
    ArcApi.vendorGetContract
      .mockResolvedValueOnce(memberContract([hotel(MUMBAI, "PENDING", 901)]))
      .mockRejectedValueOnce({ response: { status: 403, data: { status: 0, message: "Not the contracted vendor" } } });
    renderWith(VendorContractPage);

    fireEvent.click(within(await offer()).getByRole("button", { name: "Accept" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("This assignment expired before you replied, so it went back to your network admin.")
    );
    await waitFor(() => expect(ArcApi.vendorGetContract).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/vendor/network/assigned"));
  });

  test("while a reply is in flight both actions are disabled and a second click sends nothing", async () => {
    let resolve;
    NetApi.respondToAssignment.mockReturnValueOnce(new Promise((res) => (resolve = res)));
    ArcApi.vendorGetContract.mockResolvedValue(memberContract([hotel(MUMBAI, "PENDING", 901)]));
    renderWith(VendorContractPage);

    const banner = await offer();
    const accept = within(banner).getByRole("button", { name: "Accept" });
    fireEvent.click(accept);
    fireEvent.click(accept);
    expect(NetApi.respondToAssignment).toHaveBeenCalledTimes(1);
    expect(within(banner).getByRole("button", { name: "Accepting…" })).toBeDisabled();
    expect(within(banner).getByRole("button", { name: "Decline" })).toBeDisabled();
    resolve({ status: 1, message: "Assignment accepted", data: {} });
    await waitFor(() => expect(ArcApi.vendorGetContract).toHaveBeenCalledTimes(2));
  });
});

describe("no offer", () => {
  test("a fully accepted member gets the plain fulfil view, with the clauses on the contract document", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(memberContract([hotel(MUMBAI, "ACCEPTED", 900)]));
    renderWith(VendorContractPage);

    expect(await screen.findByText("Fulfilling for: Mumbai Suites")).toBeInTheDocument();
    expect(screen.getByText("Contract you fulfil")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Contract offer" })).toBeNull();
    // No offer to review: it stays on the consumption tab.
    expect(screen.getByText("Your award lines · consumption")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /contract document/i }));
    expect(clausesIn(await clauseList())).toHaveLength(5);
  });

  test("the contract holder's view is unchanged: no banner, no clause list, its penalty section", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(holderContract());
    renderWith(VendorContractPage, null);

    expect(await screen.findByText("Your active contract")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Contract offer" })).toBeNull();
    expect(screen.getByText("Your award lines · consumption")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /contract document/i }));
    expect(screen.getByText("Penalty / LD clause")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Commercial terms" })).toBeNull();
    expect(NetApi.respondToAssignment).not.toHaveBeenCalled();
  });
});

// jsdom has no media queries: pin the phone contract textually (390px).
describe("phones", () => {
  test("the banner uses the vendor ARC phone layer, which drops the actions under the text with 40px targets", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(memberContract([hotel(MUMBAI, "PENDING", 901)]));
    renderWith(VendorContractPage);
    const banner = await offer();
    expect(banner).toHaveClass("action-center", "actionCenter");

    const css = fs.readFileSync(
      path.join(process.cwd(), "components/dashboard/rate-contracts/vendor/VendorArcPhone.module.css"),
      "utf8"
    );
    const phone = css.slice(css.indexOf("@media (max-width: 768px)"));
    expect(phone).toMatch(/\.actionCenter\s*{[^}]*flex-wrap:\s*wrap/);
    expect(phone).toMatch(/\.actionCenter :global\(\.ac-actions\)\s*{[^}]*flex:\s*1 1 100%/);
    expect(phone).toMatch(/\.actionCenter :global\(\.ac-actions \.btn\)\s*{[^}]*min-height:\s*40px/);
  });
});

// Fix round 1: a contract the holder has not signed yet (awaiting_acceptance /
// clarification) is not presented as signed on the Contract document tab.
describe("the Contract document tab of a contract not yet signed", () => {
  const docHeader = () => screen.getByRole("heading", { level: 2, name: /contract document/i }).closest(".section-head");

  test.each(["awaiting_acceptance", "clarification"])("member view, %s: 'not yet signed', no e-signed pill", async (status) => {
    const offered = memberContract([hotel(MUMBAI, "PENDING", 901)]);
    offered.data.contract = { ...offered.data.contract, status, signed_by_vendor_at: null };
    ArcApi.vendorGetContract.mockResolvedValue(offered);
    renderWith(VendorContractPage);
    await clauseList(); // lands on the document

    const head = docHeader();
    expect(head).toHaveTextContent("Contract document (not yet signed)");
    expect(head).toHaveTextContent("Read-only · awaiting the contract holder's signature");
    expect(within(head).getByText("awaiting signature")).toBeInTheDocument();
    expect(screen.queryByText("Signed contract document")).toBeNull();
    expect(screen.queryByText("e-signed")).toBeNull();
    expect(screen.getByText("Awaiting OTP signature")).toBeInTheDocument();
    expect(screen.queryByText(/Signed via OTP/)).toBeNull();
  });

  test.each(["awaiting_acceptance", "clarification"])("holder view, %s: 'not yet signed', awaiting your signature", async (status) => {
    const c = holderContract(status);
    c.data.contract = { ...c.data.contract, signed_by_vendor_at: null };
    ArcApi.vendorGetContract.mockResolvedValue(c);
    renderWith(VendorContractPage, null);
    fireEvent.click(await screen.findByRole("button", { name: /contract document/i }));

    const head = docHeader();
    expect(head).toHaveTextContent("Contract document (not yet signed)");
    expect(head).toHaveTextContent("Read-only · awaiting your signature");
    expect(screen.queryByText("e-signed")).toBeNull();
    expect(screen.getByText("Awaiting OTP signature")).toBeInTheDocument();
  });

  test("a signed (active) contract keeps 'Signed contract document' and the e-signed pill", async () => {
    ArcApi.vendorGetContract.mockResolvedValue(holderContract("active"));
    renderWith(VendorContractPage, null);
    fireEvent.click(await screen.findByRole("button", { name: /contract document/i }));
    const head = docHeader();
    expect(head).toHaveTextContent("Signed contract document");
    expect(head).toHaveTextContent("Read-only · countersigned");
    expect(within(head).getByText("e-signed")).toBeInTheDocument();
    expect(screen.getByText(/Signed via OTP on/)).toBeInTheDocument();
  });
});
