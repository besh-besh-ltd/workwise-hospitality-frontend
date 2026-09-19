// Picking a business unit when you are mapped to nineteen of them.
//
// The BU step rendered every mapping the user holds as an unfiltered card
// list, unsorted, with no way to search. On staging 17 users are mapped to
// 17-19 business units each and scroll that list on every single RFQ; the
// largest company alone owns 14 properties. But 172 of 198 mapped users hold
// exactly one unit, so the box has to earn its place before it appears.
// Client feedback item 1.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

jest.mock("@/services/products", () => ({ searchProductsV2: jest.fn() }));
jest.mock("@/services/hospitality", () => ({ getRFQHotels: jest.fn() }));
jest.mock("@/services/rfq", () => ({
  addProductsToDraft: jest.fn(),
  getRecommendedProducts: jest.fn(),
  getDraftById: jest.fn(),
  getDraftRFQs: jest.fn(),
  deleteDraftRFQ: jest.fn(),
  getDraftProducts: jest.fn(),
  removeProductFromDraft: jest.fn(),
}));
jest.mock("@/components/AuthContainer/LoginContainer", () => () => null);
jest.mock("@/components/shared/ReadOnlyBanner", () => () => null);
jest.mock("@/components/shared/AccessDeniedPage", () => () => null);
jest.mock("@/components/modal/ConfirmationModal", () => () => null);
jest.mock("./CopyFromExistingModal", () => () => null);
jest.mock("@/hooks/useModulePermissions", () => ({
  useModulePermissions: () => ({ canRead: true, canCreate: true, loading: false }),
}));

var mockRouter = { query: { orderType: "rfq" }, push: jest.fn(), replace: jest.fn() };
jest.mock("next/router", () => ({ useRouter: () => mockRouter }));

// The profile object must keep a STABLE identity across renders. StartRFQ has
// an effect keyed on [router, loggedin, userProfile] that calls
// setUserHotelMappings; hand it a fresh object each render and it re-runs
// forever. `var` so the hoisted jest.mock factory can close over it.
var mockProfile = { id: 444, is_hospitality: 1, hospitality_mappings: [] };
jest.mock("react-redux", () => ({
  useSelector: (fn) => fn({ userProfile: mockProfile }),
}));

const withMappings = (mappings) => {
  mockProfile = { id: 444, is_hospitality: 1, hospitality_mappings: mappings };
};

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import StartRFQ from "./StartRFQ";

// Nine business units across two companies. Deliberately NOT alphabetical.
const MANY = [
  { hospitality_hotel_id: 91, hotel_name: "The Orchid Pune", company_name: "Kamat Hotels" },
  { hospitality_hotel_id: 92, hotel_name: "Lotus Eco Beach Murud", company_name: "Kamat Hotels" },
  { hospitality_hotel_id: 93, hotel_name: "The Orchid Mumbai", company_name: "Kamat Hotels" },
  { hospitality_hotel_id: 94, hotel_name: "Fort Jadhavgadh", company_name: "Kamat Hotels" },
  { hospitality_hotel_id: 95, hotel_name: "Mahodadhi Palace", company_name: "Kamat Hotels" },
  { hospitality_hotel_id: 96, hotel_name: "The Orchid Goa", company_name: "Kamat Hotels" },
  { hospitality_hotel_id: 97, hotel_name: "VITS Mumbai", company_name: "Envotel" },
  { hospitality_hotel_id: 98, hotel_name: "VITS Aurangabad", company_name: "Envotel" },
  // no hotel_name at all — the code falls back to `name`
  { hospitality_hotel_id: 99, name: "Legacy Unit", company_name: "Envotel" },
];

const ONE = [MANY[0]];

const searchBox = () => screen.getByPlaceholderText(/search business units/i);

beforeEach(() => {
  window.localStorage.setItem("token", "t");
  mockRouter.query = { orderType: "rfq" };
  withMappings(MANY);
});
afterEach(() => window.localStorage.clear());

describe("StartRFQ — business unit step", () => {
  it("offers a search box once there are enough units to get lost in", () => {
    render(<StartRFQ />);
    expect(screen.getByText("Pick the business units")).toBeInTheDocument();
    expect(searchBox()).toBeInTheDocument();
  });

  it("does NOT offer one to the 172 users mapped to a single unit", () => {
    withMappings(ONE);
    render(<StartRFQ />);
    expect(screen.getByText("The Orchid Pune")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/search business units/i)).not.toBeInTheDocument();
  });

  it("narrows the list to the units whose name matches what was typed", () => {
    render(<StartRFQ />);
    expect(screen.getByText("The Orchid Pune")).toBeInTheDocument();
    expect(screen.getByText("VITS Mumbai")).toBeInTheDocument();

    fireEvent.change(searchBox(), { target: { value: "orchid" } });

    expect(screen.getByText("The Orchid Pune")).toBeInTheDocument();
    expect(screen.getByText("The Orchid Mumbai")).toBeInTheDocument();
    expect(screen.getByText("The Orchid Goa")).toBeInTheDocument();
    expect(screen.queryByText("VITS Mumbai")).not.toBeInTheDocument();
    expect(screen.queryByText("Fort Jadhavgadh")).not.toBeInTheDocument();
  });

  it("matches the company name too, so a whole company comes up at once", () => {
    render(<StartRFQ />);
    fireEvent.change(searchBox(), { target: { value: "envotel" } });

    expect(screen.getByText("VITS Mumbai")).toBeInTheDocument();
    expect(screen.getByText("VITS Aurangabad")).toBeInTheDocument();
    expect(screen.getByText("Legacy Unit")).toBeInTheDocument();
    expect(screen.queryByText("The Orchid Pune")).not.toBeInTheDocument();
  });

  it("ignores case and surrounding whitespace", () => {
    render(<StartRFQ />);
    fireEvent.change(searchBox(), { target: { value: "  JADHAVGADH  " } });
    expect(screen.getByText("Fort Jadhavgadh")).toBeInTheDocument();
    expect(screen.queryByText("The Orchid Pune")).not.toBeInTheDocument();
  });

  it("says so when nothing matches, and does not impersonate the no-access state", () => {
    render(<StartRFQ />);
    fireEvent.change(searchBox(), { target: { value: "zzzz" } });

    expect(screen.getByText(/no business unit matches/i)).toBeInTheDocument();
    // "you have no access at all" is a different problem with a different fix
    expect(screen.queryByText("No business unit access")).not.toBeInTheDocument();
  });

  it("clears the filter with the clear button, restoring every unit", () => {
    render(<StartRFQ />);
    fireEvent.change(searchBox(), { target: { value: "orchid" } });
    expect(screen.queryByText("VITS Mumbai")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/clear business unit search/i));

    expect(searchBox()).toHaveValue("");
    expect(screen.getByText("VITS Mumbai")).toBeInTheDocument();
    expect(screen.getByText("The Orchid Pune")).toBeInTheDocument();
  });

  it("sorts the units by name so the list is scannable", () => {
    render(<StartRFQ />);
    const names = screen
      .getAllByText(/Orchid|VITS|Lotus|Fort|Mahodadhi|Legacy/)
      .map((n) => n.textContent);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("still selects a unit that was found by searching", () => {
    render(<StartRFQ />);
    fireEvent.change(searchBox(), { target: { value: "jadhav" } });
    fireEvent.click(screen.getByText("Fort Jadhavgadh"));

    // selection is what opens the step gate
    expect(screen.getByRole("button", { name: /continue/i })).not.toBeDisabled();
  });

  it("keeps a selection that the filter then hides", () => {
    // Tenders are multi-select: pick one unit, search for another, and the
    // first must stay selected even though it is no longer on screen.
    mockRouter.query = { orderType: "tender" };
    render(<StartRFQ />);

    fireEvent.click(screen.getByText("The Orchid Pune"));
    fireEvent.change(searchBox(), { target: { value: "vits" } });
    expect(screen.queryByText("The Orchid Pune")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("VITS Mumbai"));
    fireEvent.click(screen.getByLabelText(/clear business unit search/i));

    // both cards are now marked selected
    const selected = document.querySelectorAll('[data-bu-selected="true"]');
    expect(selected).toHaveLength(2);
  });
});
