// ARC v2 — contract copies are reviewed before they are sent to vendors.
//
// The panel lists each awarded vendor's DRAFT contract with its lines, opens
// the exact document in a sandboxed preview, and sends the drafts only after
// an explicit confirmation. Who may send is the server's call (can_send).

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getContractReview: jest.fn(),
  getContractPreview: jest.fn(),
  sendContracts: jest.fn(),
}));

import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ContractReviewPanel from "./ContractReviewPanel";

const DRAFTS = [
  {
    id: 11, vendor_id: 1, vendor_name: "Alpha Linen", status: "generated", committed_value: 54000,
    lines: [{ id: 101, arc_item_id: 900, variant_name: "Bath towel", uom: "pcs", unit_rate: "90.00", gst_pct: "5.00", committed_qty: "600", payment_terms: "Net 30" }],
  },
  {
    id: 12, vendor_id: 2, vendor_name: "Beta Textiles", status: "generated", committed_value: 38000,
    lines: [{ id: 102, arc_item_id: 900, variant_name: "Bath towel", uom: "pcs", unit_rate: "95.00", gst_pct: "5.00", committed_qty: "400", payment_terms: "Net 45" }],
  },
];

function review(overrides = {}) {
  return { data: { arc: { id: 555, status: "contract_generated" }, contracts: DRAFTS, drafts: 2, can_send: true, ...overrides } };
}

beforeEach(() => jest.clearAllMocks());

test("lists each vendor's draft with its items, rates and payment terms", async () => {
  ArcApi.getContractReview.mockResolvedValue(review());
  render(<ContractReviewPanel arcId={555} onSent={jest.fn()} />);

  const alpha = await screen.findByTestId("contract-copy-11");
  expect(within(alpha).getByText("Alpha Linen")).toBeInTheDocument();
  expect(within(alpha).getByText("Draft · not sent")).toBeInTheDocument();
  const table = within(alpha).getByRole("table", { name: "Items for Alpha Linen" });
  expect(table).toHaveTextContent("Bath towel");
  expect(table).toHaveTextContent("600");
  expect(table).toHaveTextContent("₹90");
  expect(table).toHaveTextContent("Net 30");
  expect(within(screen.getByTestId("contract-copy-12")).getByText("Net 45")).toBeInTheDocument();
  expect(screen.getByText(/Nothing has been sent to the vendors yet/)).toBeInTheDocument();
  expect(ArcApi.getContractReview).toHaveBeenCalledWith(555);
});

test("preview shows the exact document in a sandboxed iframe", async () => {
  ArcApi.getContractReview.mockResolvedValue(review());
  ArcApi.getContractPreview.mockResolvedValue({
    data: { contract: { id: 12, status: "generated", document_s3_url: "https://example.test/c12.pdf" }, html: "<h1>Annual Rate Contract Agreement</h1>" },
  });
  render(<ContractReviewPanel arcId={555} onSent={jest.fn()} />);

  const beta = await screen.findByTestId("contract-copy-12");
  fireEvent.click(within(beta).getByRole("button", { name: /Preview contract/ }));

  const dialog = await screen.findByRole("dialog", { name: "Contract copy for Beta Textiles" });
  const frame = await within(dialog).findByTitle("Contract preview");
  expect(frame).toHaveAttribute("sandbox", "");
  expect(frame.getAttribute("srcdoc")).toContain("Annual Rate Contract Agreement");
  expect(within(dialog).getByRole("link", { name: "Open PDF" })).toHaveAttribute("href", "https://example.test/c12.pdf");
  expect(ArcApi.getContractPreview).toHaveBeenCalledWith(555, 12);
});

test("sending needs an explicit confirmation and sends every draft", async () => {
  ArcApi.getContractReview.mockResolvedValue(review());
  ArcApi.sendContracts.mockResolvedValue({ data: { sent: [{ id: 11 }, { id: 12 }], arc_status: "awaiting_vendor_acceptance" } });
  const onSent = jest.fn();
  render(<ContractReviewPanel arcId={555} onSent={onSent} />);

  fireEvent.click(await screen.findByRole("button", { name: "Send to 2 vendors" }));
  expect(ArcApi.sendContracts).not.toHaveBeenCalled();

  const confirm = await screen.findByRole("dialog", { name: "Send contracts to vendors" });
  expect(confirm).toHaveTextContent("Alpha Linen");
  expect(confirm).toHaveTextContent("Beta Textiles");
  fireEvent.click(within(confirm).getByRole("button", { name: /Send now/ }));

  await waitFor(() => expect(onSent).toHaveBeenCalledWith([{ id: 11 }, { id: 12 }]));
  expect(ArcApi.sendContracts).toHaveBeenCalledWith(555, { contract_ids: [11, 12] });
});

test("cancel closes the confirmation without sending", async () => {
  ArcApi.getContractReview.mockResolvedValue(review());
  render(<ContractReviewPanel arcId={555} onSent={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Send to 2 vendors" }));
  const confirm = await screen.findByRole("dialog", { name: "Send contracts to vendors" });
  fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Send contracts to vendors" })).not.toBeInTheDocument());
  expect(ArcApi.sendContracts).not.toHaveBeenCalled();
});

test("a user the server says cannot send gets a view-only note and no send button", async () => {
  ArcApi.getContractReview.mockResolvedValue(review({ can_send: false }));
  render(<ContractReviewPanel arcId={555} onSent={jest.fn()} />);
  expect(await screen.findByText(/A commercial evaluator or ARC admin sends these contracts/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Send to/ })).not.toBeInTheDocument();
  // Preview is still available.
  expect(screen.getAllByRole("button", { name: /Preview contract/ })).toHaveLength(2);
});

test("a failed send shows the server's reason and reloads the real state", async () => {
  ArcApi.getContractReview
    .mockResolvedValueOnce(review())
    .mockResolvedValueOnce(review({ contracts: DRAFTS.map((c) => ({ ...c, status: "awaiting_acceptance" })), drafts: 0, can_send: false }));
  ArcApi.sendContracts.mockRejectedValue({ response: { data: { message: "These contracts were already sent" } } });
  const onSent = jest.fn();
  render(<ContractReviewPanel arcId={555} onSent={onSent} />);

  fireEvent.click(await screen.findByRole("button", { name: "Send to 2 vendors" }));
  const confirm = await screen.findByRole("dialog", { name: "Send contracts to vendors" });
  fireEvent.click(within(confirm).getByRole("button", { name: /Send now/ }));

  expect(await within(confirm).findByRole("alert")).toHaveTextContent("These contracts were already sent");
  expect(onSent).not.toHaveBeenCalled();
  await waitFor(() => expect(ArcApi.getContractReview).toHaveBeenCalledTimes(2));
  expect(screen.getAllByText("Sent · awaiting signature")).toHaveLength(2);
});
