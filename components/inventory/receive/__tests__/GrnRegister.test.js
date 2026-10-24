// GRN register: every receipt and reversal at the hotels the user can read,
// filtered on the server (hotel, status, dates, PO from ?poId=).

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: mockQuery, pathname: "/dashboard/buyer/inventory/grn", push: mockPush, replace: jest.fn(), isReady: true }),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { hospitality_mappings: [{ hospitality_hotel_id: 46, hotel_name: "Orchid Mumbai" }] } }),
}));
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));
jest.mock("@/services/inventory", () => ({ __esModule: true, listGrns: jest.fn() }));

let mockQuery = {};
const mockPush = jest.fn();

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { listGrns } from "@/services/inventory";
import GrnRegister from "../GrnRegister";

const summary = (over = {}) => ({
  id: 900, grnNumber: "GRN/46/2026-27/00012", hotelId: 46, hotelName: "Orchid Mumbai", status: "posted",
  docType: "RECEIPT", receivedAt: "2026-10-24", postedAt: "2026-10-24T06:30:00.000Z", postedByName: "Asha Menon",
  lineCount: 2, acceptedValue: 19600, ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {};
  listGrns.mockResolvedValue({
    rows: [summary(), summary({ id: 901, grnNumber: "GRN/46/2026-27/00013", docType: "REVERSAL", acceptedValue: -1800 })],
    total: 2,
  });
});

describe("GrnRegister", () => {
  it("lists GRNs with type, value and status, newest first from the server", async () => {
    render(<GrnRegister />);
    const first = (await screen.findByText("GRN/46/2026-27/00012")).closest("tr");
    expect(within(first).getByText("Receipt")).toBeInTheDocument();
    expect(first.querySelector("[data-label='Value']")).toHaveTextContent("₹19,600.00");
    expect(within(first).getByText("Posted")).toBeInTheDocument();
    const second = screen.getByText("GRN/46/2026-27/00013").closest("tr");
    expect(within(second).getByText("Reversal")).toBeInTheDocument();
    expect(listGrns).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
  });

  it("status tabs and dates filter on the server", async () => {
    render(<GrnRegister />);
    await screen.findByText("GRN/46/2026-27/00012");
    fireEvent.click(screen.getByRole("tab", { name: "Drafts" }));
    await waitFor(() => expect(listGrns).toHaveBeenLastCalledWith(expect.objectContaining({ status: "draft" })));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-01" } });
    await waitFor(() => expect(listGrns).toHaveBeenLastCalledWith(expect.objectContaining({ from: "2026-10-01" })));
  });

  it("?poId= narrows the register to one PO", async () => {
    mockQuery = { poId: "52" };
    render(<GrnRegister />);
    await screen.findByText("GRN/46/2026-27/00012");
    expect(listGrns).toHaveBeenCalledWith(expect.objectContaining({ poId: 52 }));
    expect(screen.getByText(/Showing GRNs for one PO/)).toBeInTheDocument();
  });

  it("opening a row goes to the GRN", async () => {
    render(<GrnRegister />);
    fireEvent.click(await screen.findByText("GRN/46/2026-27/00012"));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/grn/900");
  });
});
