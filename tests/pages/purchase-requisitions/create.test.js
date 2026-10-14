// PR create / edit page — product-level behaviour with the service layer mocked.

jest.mock("@/services/pr", () => ({
  __esModule: true,
  getFormHotels: jest.fn(),
  getFormDepartments: jest.fn(),
  searchItems: jest.fn(),
  searchItemsByIds: jest.fn(),
  searchCategories: jest.fn(),
  getDuplicates: jest.fn(),
  previewRouting: jest.fn(),
  createPr: jest.fn(),
  updatePr: jest.fn(),
  submitPr: jest.fn(),
  getPr: jest.fn(),
}));
jest.mock("@/utils/hospitalityContext", () => ({
  getStoredHospitalityContext: () => ({ hospitality_company_id: 4, hospitality_hotel_id: 12 }),
}));
const push = jest.fn();
const replace = jest.fn();
let mockQuery = {};
let mockReady = true;
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: mockReady, query: mockQuery, push, replace }),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as PrApi from "@/services/pr";
import CreatePrPage from "@/pages/dashboard/buyer/purchase-requisitions/create";

const W = { timeout: 2500 };
const futureDate = "2099-01-15";

const towel = { variant_id: 300, variant_name: "Bath towel", product_name: "Towel", category_id: 7, category_title: "Linen", on_contract: false, arc_contract_id: null, arc_number: null };
const rice = { variant_id: 301, variant_name: "Basmati rice", product_name: "Rice", category_id: 8, category_title: "Grocery", on_contract: true, arc_contract_id: 5, arc_number: "ARC-5" };
// A short name that a label search ranks ~91st of a real catalog (review I1).
const pin = { variant_id: 302, variant_name: "PIN", product_name: "Safety pin", category_id: 7, category_title: "Linen", on_contract: false, arc_contract_id: null, arc_number: null };
const CATALOG = [towel, rice, pin];
// GET /pr/search-items?variant_ids= (ruling R44): exactly the requested ids that are usable.
const byIds = (items = CATALOG) => ({ variant_ids }) =>
  Promise.resolve({ data: { items: items.filter((i) => variant_ids.includes(i.variant_id)) } });

const okPreview = {
  amount: "100.00",
  reviews: [{ department_id: 3, department_title: "Engineering", line_nos: [1], line_ids: [], reviewers: [{ id: 1, name: "Rita Reviewer" }], problem: null }],
  approval: {
    policy_id: 1,
    steps: [
      { step_order: 1, label: "Dept head", approvers: [{ id: 2, name: "Hari Head" }], applies: true, skipped_reason: null, min_amount: null },
      { step_order: 2, label: "Finance", approvers: [], applies: false, skipped_reason: "below_threshold", min_amount: "500000.00" },
      { step_order: 3, label: "GM", approvers: [], applies: false, skipped_reason: "sod_self", min_amount: null },
    ],
    problems: [],
  },
  problems: [],
};

async function pickCell() {
  const hotel = await screen.findByLabelText("Hotel");
  await waitFor(() => expect(within(hotel).getByRole("option", { name: "Mumbai Suites" })).toBeInTheDocument());
  fireEvent.change(hotel, { target: { value: "12" } });
  const dept = screen.getByLabelText("Department");
  await waitFor(() => expect(within(dept).getByRole("option", { name: "Housekeeping" })).toBeInTheDocument());
  fireEvent.change(dept, { target: { value: "9" } });
}

async function addCatalogLine(item = towel, term = "tow") {
  fireEvent.click(screen.getByRole("button", { name: /Add catalog item/ }));
  fireEvent.change(screen.getByLabelText("Search catalog items"), { target: { value: term } });
  const hit = await screen.findByText(item.variant_name, undefined, W);
  fireEvent.click(hit);
  // let the line's duplicate check resolve inside act, as a user would see it
  await act(async () => {});
}

function fillHeader() {
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Lobby towels" } });
  fireEvent.change(screen.getByLabelText("Justification"), { target: { value: "Old ones are worn" } });
  fireEvent.change(screen.getByLabelText("Need by"), { target: { value: futureDate } });
}

function fillLine(qty, price, unit = "pcs") {
  fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: qty } });
  fireEvent.change(screen.getByLabelText("Unit"), { target: { value: unit } });
  fireEvent.change(screen.getByLabelText("Estimated unit price"), { target: { value: price } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = {};
  mockReady = true;
  PrApi.getFormHotels.mockResolvedValue({ data: { hotels: [{ id: 12, name: "Mumbai Suites" }] } });
  PrApi.getFormDepartments.mockResolvedValue({ data: { departments: [{ id: 9, title: "Housekeeping" }] } });
  PrApi.searchItems.mockResolvedValue({ data: { items: [towel, rice] } });
  PrApi.searchItemsByIds.mockImplementation(byIds());
  PrApi.searchCategories.mockResolvedValue({ data: { categories: [{ id: 7, title: "Linen", parent_id: null }] } });
  PrApi.getDuplicates.mockResolvedValue({ data: { count: 0, items: [] } });
  PrApi.previewRouting.mockResolvedValue({ data: okPreview });
  PrApi.createPr.mockResolvedValue({ data: { id: 900, pr_number: "PR-900" } });
  PrApi.updatePr.mockResolvedValue({ data: { id: 55, pr_number: "PR-55" } });
  PrApi.submitPr.mockResolvedValue({ data: { id: 900 } });
  PrApi.getPr.mockResolvedValue({ data: { pr: {}, lines: [], capabilities: { can_edit: false } } });
});

test("hotel and department pickers render and line adding is blocked until both are chosen", async () => {
  render(<CreatePrPage />);
  await screen.findByLabelText("Hotel");
  expect(screen.getByRole("button", { name: /Add catalog item/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Add item not in catalog/ })).toBeDisabled();
  await pickCell();
  expect(screen.getByRole("button", { name: /Add catalog item/ })).toBeEnabled();
  expect(screen.getByRole("button", { name: /Add item not in catalog/ })).toBeEnabled();
});

test("an on-contract search result is disabled and points to a Material Requisition", async () => {
  render(<CreatePrPage />);
  await pickCell();
  fireEvent.click(screen.getByRole("button", { name: /Add catalog item/ }));
  fireEvent.change(screen.getByLabelText("Search catalog items"), { target: { value: "rice" } });
  const note = await screen.findByText(/On contract ARC-5/, undefined, W);
  expect(note.parentElement).toHaveTextContent("On contract ARC-5 — raise an MR");
  const link = screen.getByRole("link", { name: /raise an MR/ });
  expect(link).toHaveAttribute("href", "/dashboard/buyer/material-requisitions/create");
  const row = screen.getByTestId("search-result-301");
  expect(row).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(screen.getByText("Basmati rice"));
  expect(screen.queryByLabelText("Quantity")).not.toBeInTheDocument();
});

test("a free-text line needs a name, category and unit before it can be saved", async () => {
  render(<CreatePrPage />);
  await pickCell();
  fillHeader();
  fireEvent.click(screen.getByRole("button", { name: /Add item not in catalog/ }));
  fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Estimated unit price"), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByText("Enter the item name")).toBeInTheDocument();
  expect(screen.getByText("Pick a category")).toBeInTheDocument();
  expect(screen.getByText("Enter a unit")).toBeInTheDocument();
  expect(PrApi.createPr).not.toHaveBeenCalled();
});

test("the live total is exact: 1 x 1250000.75 is ₹12,50,000.75", async () => {
  render(<CreatePrPage />);
  await pickCell();
  await addCatalogLine();
  fillLine("1", "1250000.75");
  expect((await screen.findAllByText("₹12,50,000.75")).length).toBeGreaterThan(0);
  expect(screen.getByTestId("grand-total")).toHaveTextContent("₹12,50,000.75");
});

test("quantity and price reject more decimals than the server allows", async () => {
  render(<CreatePrPage />);
  await pickCell();
  fillHeader();
  await addCatalogLine();
  fillLine("1.5555", "10.999");
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByText("Use at most 3 decimals")).toBeInTheDocument();
  expect(screen.getByText("Use at most 2 decimals")).toBeInTheDocument();
  expect(PrApi.createPr).not.toHaveBeenCalled();
});

test("the specification shows a counter against the 1000 character limit", async () => {
  render(<CreatePrPage />);
  await pickCell();
  await addCatalogLine();
  fireEvent.change(screen.getByLabelText("Specification"), { target: { value: "abc" } });
  expect(screen.getByText("3 / 1000")).toBeInTheDocument();
});

test("the routing preview shows reviewers, approvers and skipped-step notes", async () => {
  render(<CreatePrPage />);
  await pickCell();
  await addCatalogLine();
  fillLine("2", "50");
  expect(await screen.findByText("Rita Reviewer", undefined, W)).toBeInTheDocument();
  expect(screen.getByText("Hari Head")).toBeInTheDocument();
  expect(screen.getByText("Not required below ₹5,00,000")).toBeInTheDocument();
  expect(screen.getByText("Skipped — you raised this PR")).toBeInTheDocument();
  const body = PrApi.previewRouting.mock.calls.at(-1)[0];
  expect(body).toEqual({
    hotel_id: 12,
    department_id: 9,
    lines: [{ product_variant_id: 300, quantity: "2", estimated_unit_price: "50" }],
  });
});

test("a preview problem disables Submit and shows the plain-language copy", async () => {
  PrApi.previewRouting.mockResolvedValue({
    data: { ...okPreview, problems: [{ code: "PR_NO_POLICY", message: "raw" }], approval: { ...okPreview.approval, problems: [{ code: "PR_NO_POLICY", message: "raw" }] } },
  });
  render(<CreatePrPage />);
  await pickCell();
  fillHeader();
  await addCatalogLine();
  fillLine("2", "50");
  expect(await screen.findByText(/No approval chain is set up for purchase requisitions at this hotel/, undefined, W)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Submit/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
});

test("Submit stays disabled until the preview has loaded cleanly", async () => {
  render(<CreatePrPage />);
  await pickCell();
  fillHeader();
  await addCatalogLine();
  fillLine("2", "50");
  expect(screen.getByRole("button", { name: /Submit/ })).toBeDisabled();
  await screen.findByText("Hari Head", undefined, W);
  expect(screen.getByRole("button", { name: /Submit/ })).toBeEnabled();
});

test("a failed preview says so, offers a retry and keeps Submit off", async () => {
  PrApi.previewRouting.mockRejectedValueOnce({ response: { data: { status: 0, code: "PR_INTERNAL", message: "boom" } } });
  render(<CreatePrPage />);
  await pickCell();
  await addCatalogLine();
  fillLine("2", "50");
  expect(await screen.findByText(/Couldn't work out who will approve this/, undefined, W)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Submit/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Hari Head", undefined, W)).toBeInTheDocument();
});

test("a submit 422 PR_LINE_ON_CONTRACT highlights line 1 and keeps the input", async () => {
  PrApi.submitPr.mockRejectedValue({
    response: { status: 422, data: { status: 0, code: "PR_LINE_ON_CONTRACT", message: "raw", details: [{ line_no: 1, product_variant_id: 300 }] } },
  });
  render(<CreatePrPage />);
  await pickCell();
  fillHeader();
  await addCatalogLine();
  fillLine("2", "50");
  await screen.findByText("Hari Head", undefined, W);
  fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
  expect(await screen.findByText(/This item is on an active rate contract/)).toBeInTheDocument();
  expect(screen.getByTestId("pr-line-1")).toHaveAttribute("data-invalid", "true");
  expect(screen.getByLabelText("Quantity")).toHaveValue("2");
  expect(push).not.toHaveBeenCalled();
});

test("a successful submit saves, submits and opens the detail page", async () => {
  render(<CreatePrPage />);
  await pickCell();
  fillHeader();
  await addCatalogLine();
  fillLine("2", "50");
  await screen.findByText("Hari Head", undefined, W);
  fireEvent.click(screen.getByRole("button", { name: /Submit/ }));
  await waitFor(() => expect(PrApi.submitPr).toHaveBeenCalledWith(900));
  expect(PrApi.createPr).toHaveBeenCalledTimes(1);
  const body = PrApi.createPr.mock.calls[0][0];
  expect(body).toMatchObject({ hotel_id: 12, department_id: 9, title: "Lobby towels", required_by_date: futureDate });
  expect(body.lines).toEqual([
    { product_variant_id: 300, quantity: "2", uom: "pcs", estimated_unit_price: "50", specification: null, suggested_vendor_note: null },
  ]);
  await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/buyer/purchase-requisitions/900"));
});

test("a 409 on save shows the conflict copy with a Refresh action", async () => {
  mockQuery = { id: "55" };
  PrApi.getPr.mockResolvedValue(draftDetail());
  PrApi.updatePr.mockRejectedValue({ response: { status: 409, data: { status: 0, code: "PR_STATE_CONFLICT", message: "raw", details: { status: "pending_approval" } } } });
  render(<CreatePrPage />);
  await screen.findByDisplayValue("Lobby towels", undefined, W);
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByText(/This PR changed since you opened it/)).toBeInTheDocument();
  PrApi.getPr.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() => expect(PrApi.getPr).toHaveBeenCalledWith("55"));
});

function draftDetail(overrides = {}) {
  return {
    data: {
      pr: {
        id: 55, pr_number: "PR-55", title: "Lobby towels", pr_type: "goods", urgency: "normal", hotel_id: 12, department_id: 9,
        required_by_date: futureDate, justification: "Old ones are worn", delivery_location: "Loading dock", status: "returned",
      },
      lines: [
        { id: 701, line_no: 1, line_kind: "catalog", product_variant_id: 300, variant_name: "Bath towel", product_name: "Towel", free_text_name: null, category_id: 7, category_title: "Linen", quantity: "2.000", uom: "pcs", estimated_unit_price: "50.00", specification: "White", suggested_vendor_note: null },
        { id: 702, line_no: 2, line_kind: "free_text", product_variant_id: null, variant_name: null, product_name: null, free_text_name: "Brass bell", category_id: 7, category_title: "Linen", quantity: "1.000", uom: "pcs", estimated_unit_price: "900.00", specification: null, suggested_vendor_note: "Try Mehta" },
      ],
      capabilities: { can_edit: true },
      ...overrides,
    },
  };
}

test("edit mode loads the draft and saves with updatePr, sending the original line ids back", async () => {
  mockQuery = { id: "55" };
  PrApi.getPr.mockResolvedValue(draftDetail());
  render(<CreatePrPage />);
  expect(await screen.findByDisplayValue("Lobby towels", undefined, W)).toBeInTheDocument();
  expect(screen.getByDisplayValue("Brass bell")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(PrApi.updatePr).toHaveBeenCalledTimes(1));
  expect(PrApi.createPr).not.toHaveBeenCalled();
  const [id, body] = PrApi.updatePr.mock.calls[0];
  expect(id).toBe("55");
  expect(body.lines.map((l) => l.id)).toEqual([701, 702]);
  // The form shows (and sends back) "2" / "50" for the server's "2.000" / "50.00" — the same NUMERIC values.
  expect(body.lines[0]).toMatchObject({ product_variant_id: 300, quantity: "2", estimated_unit_price: "50", specification: "White" });
  expect(body.lines[1]).toMatchObject({ free_text_name: "Brass bell", category_id: 7, suggested_vendor_note: "Try Mehta" });
  expect(body.lines[1].product_variant_id).toBeUndefined();
});

test("a line added during edit has no id while kept lines keep theirs", async () => {
  mockQuery = { id: "55" };
  PrApi.getPr.mockResolvedValue(draftDetail());
  render(<CreatePrPage />);
  await screen.findByDisplayValue("Lobby towels", undefined, W);
  fireEvent.click(screen.getByRole("button", { name: /Add item not in catalog/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  // the new empty free-text row is invalid, so nothing is sent
  expect(await screen.findByText("Enter the item name")).toBeInTheDocument();
  expect(PrApi.updatePr).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: /Remove line/ })[2]);
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(PrApi.updatePr).toHaveBeenCalled());
  expect(PrApi.updatePr.mock.calls[0][1].lines.map((l) => l.id)).toEqual([701, 702]);
});

test("a PR the user may not edit redirects to the detail page", async () => {
  mockQuery = { id: "55" };
  PrApi.getPr.mockResolvedValue(draftDetail({ capabilities: { can_edit: false } }));
  render(<CreatePrPage />);
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/buyer/purchase-requisitions/55"));
  expect(screen.queryByDisplayValue("Lobby towels")).not.toBeInTheDocument();
});

test("a catalog line shows the duplicate hint with readable items as links", async () => {
  PrApi.getDuplicates.mockResolvedValue({
    data: {
      count: 3,
      items: [
        { kind: "pr", id: 11, number: "PR-11", hotel_name: "Mumbai Suites", department_name: "Engineering", readable: true, title: "Towels" },
        { kind: "pr", id: 12, number: "PR-12", hotel_name: "Pune Inn", department_name: "Kitchen", readable: false },
        { kind: "rfq", id: 13, number: "RFQ-13", hotel_name: "Mumbai Suites", department_name: "Stores", readable: false },
      ],
    },
  });
  render(<CreatePrPage />);
  await pickCell();
  await addCatalogLine();
  expect(await screen.findByText(/3 open requests for this item in your company in the last 30 days/, undefined, W)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /PR-11/ })).toHaveAttribute("href", "/dashboard/buyer/purchase-requisitions/11");
  expect(screen.queryByRole("link", { name: /PR-12/ })).not.toBeInTheDocument();
  expect(screen.getByText(/Pune Inn · Kitchen/)).toBeInTheDocument();
  expect(PrApi.getDuplicates).toHaveBeenCalledWith({ hotel_id: 12, variant_id: 300 });
});

test("a catalog line that is on contract in the newly chosen department is blocked until removed", async () => {
  PrApi.getFormDepartments.mockResolvedValue({ data: { departments: [{ id: 9, title: "Housekeeping" }, { id: 10, title: "Kitchen" }] } });
  PrApi.searchItemsByIds.mockImplementation(({ department_id, variant_ids }) =>
    byIds([department_id === 10 ? { ...towel, on_contract: true, arc_contract_id: 5, arc_number: "ARC-9" } : towel])({ variant_ids }));
  render(<CreatePrPage />);
  await pickCell();
  fillHeader();
  await addCatalogLine();
  fillLine("2", "50");
  await screen.findByText("Hari Head", undefined, W);
  expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();

  const dept = screen.getByLabelText("Department");
  await waitFor(() => expect(within(dept).getByRole("option", { name: "Kitchen" })).toBeInTheDocument());
  fireEvent.change(dept, { target: { value: "10" } });

  expect(await screen.findByText(/On contract ARC-9/, undefined, W)).toBeInTheDocument();
  expect(screen.getByTestId("pr-line-1")).toHaveAttribute("data-invalid", "true");
  expect(screen.getAllByRole("link", { name: /raise an MR/ }).length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Submit/ })).toBeDisabled();
  expect(screen.getByText(/Saving and submitting are paused/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Remove line 1" }));
  expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
});

test("Save draft is held while the cell re-check is still running", async () => {
  PrApi.getFormDepartments.mockResolvedValue({ data: { departments: [{ id: 9, title: "Housekeeping" }, { id: 10, title: "Kitchen" }] } });
  render(<CreatePrPage />);
  await pickCell();
  await addCatalogLine();
  let release;
  PrApi.searchItemsByIds.mockImplementation(() => new Promise((r) => { release = () => r({ data: { items: [towel] } }); }));
  const dept = screen.getByLabelText("Department");
  await waitFor(() => expect(within(dept).getByRole("option", { name: "Kitchen" })).toBeInTheDocument());
  fireEvent.change(dept, { target: { value: "10" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled());
  expect(screen.getByText(/Checking your items/)).toBeInTheDocument();
  await act(async () => { release(); });
  await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled());
});

async function saveTwice(firstGetPr) {
  PrApi.getPr.mockReset();
  PrApi.getPr.mockImplementationOnce(firstGetPr);
  render(<CreatePrPage />);
  await pickCell();
  fillHeader();
  await addCatalogLine();
  fillLine("2", "50");
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(PrApi.createPr).toHaveBeenCalledTimes(1));
  await screen.findByText("Draft saved");
}

const serverLine = { id: 801, line_no: 1, line_kind: "catalog", product_variant_id: 300, variant_name: "Bath towel", category_id: 7, quantity: "2", uom: "pcs", estimated_unit_price: "50" };

test("after the first save the second save sends the ids the server assigned", async () => {
  await saveTwice(() => Promise.resolve({ data: { pr: {}, lines: [serverLine], capabilities: { can_edit: true } } }));
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(PrApi.updatePr).toHaveBeenCalledTimes(1));
  expect(PrApi.updatePr.mock.calls[0][0]).toBe(900);
  expect(PrApi.updatePr.mock.calls[0][1].lines.map((l) => l.id)).toEqual([801]);
});

test("if the id refresh fails the user is warned and the next save reloads ids first", async () => {
  await saveTwice(() => Promise.reject(new Error("offline")));
  expect(screen.getByText(/couldn't refresh it from the server/)).toBeInTheDocument();
  PrApi.getPr.mockResolvedValue({ data: { pr: {}, lines: [serverLine], capabilities: { can_edit: true } } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(PrApi.updatePr).toHaveBeenCalledTimes(1));
  expect(PrApi.updatePr.mock.calls[0][1].lines.map((l) => l.id)).toEqual([801]);
  await screen.findByText("Draft saved");
  expect(screen.queryByText(/couldn't refresh it from the server/)).not.toBeInTheDocument();
});

test("if the id refresh keeps failing the next save is not sent at all", async () => {
  await saveTwice(() => Promise.reject(new Error("offline")));
  PrApi.getPr.mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByText(/nothing was sent/)).toBeInTheDocument();
  expect(PrApi.updatePr).not.toHaveBeenCalled();
});

test("preview line numbers are shown as the form's row numbers", async () => {
  PrApi.previewRouting.mockResolvedValue({ data: { ...okPreview, reviews: [{ ...okPreview.reviews[0], line_nos: [1] }] } });
  render(<CreatePrPage />);
  await pickCell();
  fireEvent.click(screen.getByRole("button", { name: /Add item not in catalog/ })); // row 1, incomplete
  await addCatalogLine(); // row 2
  const qty = screen.getAllByLabelText("Quantity")[1];
  fireEvent.change(qty, { target: { value: "2" } });
  fireEvent.change(screen.getAllByLabelText("Estimated unit price")[1], { target: { value: "50" } });
  expect(await screen.findByText(/^Item 2 ·/, undefined, W)).toBeInTheDocument();
});

test("an incomplete row shows no value and does not count toward the total", async () => {
  render(<CreatePrPage />);
  await pickCell();
  await addCatalogLine();
  fillLine("2", "50");
  expect(screen.getByTestId("grand-total")).toHaveTextContent("₹100");
  fireEvent.click(screen.getByRole("button", { name: /Add item not in catalog/ }));
  fireEvent.change(screen.getAllByLabelText("Quantity")[1], { target: { value: "9" } });
  expect(screen.getByTestId("grand-total")).toHaveTextContent("₹100");
  fireEvent.change(screen.getAllByLabelText("Estimated unit price")[0], { target: { value: "5.555" } });
  expect(screen.getByTestId("grand-total")).toHaveTextContent("—");
});

test("a failed duplicate check hides the hint and nothing breaks", async () => {
  PrApi.getDuplicates.mockRejectedValue(new Error("nope"));
  render(<CreatePrPage />);
  await pickCell();
  await addCatalogLine();
  await waitFor(() => expect(PrApi.getDuplicates).toHaveBeenCalled());
  expect(screen.queryByText(/open request/)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Quantity")).toBeInTheDocument();
});

test("at 200 lines the Add buttons are disabled with a message", async () => {
  mockQuery = { id: "55" };
  const many = Array.from({ length: 200 }, (_, i) => ({
    id: 1000 + i, line_no: i + 1, line_kind: "free_text", product_variant_id: null, free_text_name: `Item ${i}`,
    category_id: 7, category_title: "Linen", quantity: "1", uom: "pcs", estimated_unit_price: "1",
  }));
  PrApi.getPr.mockResolvedValue(draftDetail({ lines: many }));
  render(<CreatePrPage />);
  await screen.findByDisplayValue("Lobby towels", undefined, W);
  expect(screen.getByText("Add catalog item")).toBeDisabled();
  expect(screen.getByText("Add item not in catalog")).toBeDisabled();
  expect(screen.getByText(/up to 200 items/)).toBeInTheDocument();
}, 60000); // getByRole is very slow on 200 rows, so this uses text queries

// Browser pass 19b: a level skipped by design (below the value threshold, or
// skipped because the requester would approve their own PR) rendered with the
// green "done" tick, so the GM looked as if they had already approved.
test("preview steps skipped by design are greyed out, never shown as done", async () => {
  render(<CreatePrPage />);
  await pickCell();
  await addCatalogLine();
  fillLine("2", "50");
  const threshold = await screen.findByText("Not required below ₹5,00,000", undefined, W);
  const self = screen.getByText("Skipped — you raised this PR");
  [threshold, self].forEach((note) => {
    const step = note.closest(".wf-step");
    expect(step).toHaveClass("skipped");
    expect(step).not.toHaveClass("done");
  });
  const applying = screen.getByText("Hari Head").closest(".wf-step");
  expect(applying).not.toHaveClass("skipped");
});

// Browser pass 19b: editing a returned PR warned "1 open request for this item"
// and listed the very PR being edited.
test("the duplicate hint never lists the PR being edited", async () => {
  mockQuery = { id: "55" };
  PrApi.getPr.mockResolvedValue(draftDetail());
  PrApi.getDuplicates.mockResolvedValue({
    data: { count: 1, items: [{ kind: "pr", id: 55, number: "PR-55", hotel_name: "Mumbai Suites", department_name: "Housekeeping", readable: true, title: "Lobby towels" }] },
  });
  render(<CreatePrPage />);
  await screen.findByDisplayValue("Lobby towels", undefined, W);
  await waitFor(() => expect(PrApi.getDuplicates).toHaveBeenCalled());
  await act(async () => {});
  expect(screen.queryByText(/open request/)).not.toBeInTheDocument();
});

test("while editing, other open requests are still listed and counted without this PR", async () => {
  mockQuery = { id: "55" };
  PrApi.getPr.mockResolvedValue(draftDetail());
  PrApi.getDuplicates.mockResolvedValue({
    data: {
      count: 2,
      items: [
        { kind: "pr", id: 55, number: "PR-55", hotel_name: "Mumbai Suites", department_name: "Housekeeping", readable: true, title: "Lobby towels" },
        { kind: "pr", id: 61, number: "PR-61", hotel_name: "Mumbai Suites", department_name: "Engineering", readable: true, title: "Towels again" },
      ],
    },
  });
  render(<CreatePrPage />);
  expect(await screen.findByText(/1 open request for this item/, undefined, W)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /PR-61/ })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /PR-55/ })).not.toBeInTheDocument();
});

// Browser pass 19b: opening /purchase-requisitions/create?id=N directly (a page
// load or refresh, not a client-side push) renders once before the router is
// ready. The PR id was only read on that first render, so Save/Submit POSTed a
// NEW PR with the old line ids (422 "This line does not belong to this
// requisition") and the requester could not resubmit after a refresh.
test("edit opened by a full page load (router ready after the first render) saves the same PR", async () => {
  mockReady = false;
  mockQuery = {};
  PrApi.getPr.mockResolvedValue(draftDetail());
  PrApi.getDuplicates.mockResolvedValue({
    data: { count: 1, items: [{ kind: "pr", id: 55, number: "PR-55", hotel_name: "Mumbai Suites", department_name: "Housekeeping", readable: true, title: "Lobby towels" }] },
  });
  const { rerender } = render(<CreatePrPage />);
  mockReady = true;
  mockQuery = { id: "55" };
  rerender(<CreatePrPage />);
  await screen.findByDisplayValue("Lobby towels", undefined, W);
  await waitFor(() => expect(PrApi.getDuplicates).toHaveBeenCalled());
  await act(async () => {});
  expect(screen.queryByText(/open request/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(PrApi.updatePr).toHaveBeenCalledTimes(1));
  expect(PrApi.updatePr.mock.calls[0][0]).toBe("55");
  expect(PrApi.createPr).not.toHaveBeenCalled();
});

// Final review C-M3: a user with no pr.create grant anywhere got an empty hotel
// picker and no explanation.
test("a new PR by someone who can raise one nowhere explains why instead of an empty picker", async () => {
  PrApi.getFormHotels.mockResolvedValue({ data: { hotels: [] } });
  render(<CreatePrPage />);
  expect(await screen.findByText("You can't raise requisitions yet")).toBeInTheDocument();
  expect(screen.getByText(/Ask your admin for the PR Requester role/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Hotel")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Back to requisitions" })).toHaveAttribute("href", "/dashboard/buyer/purchase-requisitions");
});

test("a failed hotel lookup is an error with a retry, not the no-access state", async () => {
  PrApi.getFormHotels.mockRejectedValueOnce(new Error("offline"));
  render(<CreatePrPage />);
  expect(await screen.findByText(/Couldn't load the hotels you can raise requisitions for/)).toBeInTheDocument();
  expect(screen.queryByText("You can't raise requisitions yet")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  const hotel = await screen.findByLabelText("Hotel");
  await waitFor(() => expect(within(hotel).getByRole("option", { name: "Mumbai Suites" })).toBeInTheDocument());
  expect(screen.queryByText(/Couldn't load the hotels/)).not.toBeInTheDocument();
});

// Task 13 deferred minor + review I1 / ruling R44. After a hotel/department
// change (and on edit load) every catalog line's contract status is re-checked
// for the new cell BY VARIANT ID — never by re-searching its label, which a
// LIMIT 50 name search never returns for short names ("PIN" ranks ~91st).
// Only a failed lookup is "couldn't verify" (retryable); an id the lookup
// leaves out is no longer usable, the same refusal the server would give.
async function changeToKitchenWith(byIdImpl, picks = [[towel, "tow"]], { labelSearch = { data: { items: CATALOG } } } = {}) {
  PrApi.getFormDepartments.mockResolvedValue({ data: { departments: [{ id: 9, title: "Housekeeping" }, { id: 10, title: "Kitchen" }] } });
  PrApi.searchItems.mockResolvedValue({ data: { items: CATALOG } });
  render(<CreatePrPage />);
  await pickCell();
  fillHeader();
  for (const [item, term] of picks) await addCatalogLine(item, term);
  screen.getAllByLabelText("Quantity").forEach((q) => fireEvent.change(q, { target: { value: "2" } }));
  screen.getAllByLabelText("Unit").forEach((u) => fireEvent.change(u, { target: { value: "pcs" } }));
  screen.getAllByLabelText("Estimated unit price").forEach((p) => fireEvent.change(p, { target: { value: "50" } }));
  await screen.findByText("Hari Head", undefined, W);
  expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
  PrApi.searchItems.mockClear();
  PrApi.searchItems.mockResolvedValue(labelSearch);
  PrApi.searchItemsByIds.mockClear();
  PrApi.searchItemsByIds.mockImplementation(byIdImpl);
  const dept = screen.getByLabelText("Department");
  await waitFor(() => expect(within(dept).getByRole("option", { name: "Kitchen" })).toBeInTheDocument());
  fireEvent.change(dept, { target: { value: "10" } });
}

test("the cell re-check looks every catalog line up by variant id in one call, never by label", async () => {
  await changeToKitchenWith(byIds(), [[towel, "tow"], [pin, "pin"]]);
  await waitFor(() => expect(PrApi.searchItemsByIds).toHaveBeenCalledTimes(1));
  expect(PrApi.searchItemsByIds).toHaveBeenCalledWith({ hotel_id: 12, department_id: 10, variant_ids: [300, 302] });
  expect(PrApi.searchItems).not.toHaveBeenCalled();
});

test("PIN case: an item a name search would never return is verified by id and the form stays savable", async () => {
  // A name search for "PIN" would list 50 other items first; the re-check must not depend on it.
  const fifty = Array.from({ length: 50 }, (_, i) => ({ ...towel, variant_id: 900 + i, variant_name: `Pin cushion ${i}` }));
  await changeToKitchenWith(byIds([pin]), [[pin, "pin"]], { labelSearch: { data: { items: fifty } } });
  await waitFor(() => expect(PrApi.searchItemsByIds).toHaveBeenCalledWith({ hotel_id: 12, department_id: 10, variant_ids: [302] }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled());
  expect(screen.getByTestId("pr-line-1")).toHaveAttribute("data-invalid", "false");
  expect(screen.queryByText(/Couldn't verify contract status/)).not.toBeInTheDocument();
  expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();
  expect(PrApi.searchItems).not.toHaveBeenCalled();
});

test("a failed lookup marks the line unverified and blocks Save and Submit; Retry re-queries by id and clears it", async () => {
  await changeToKitchenWith(() => Promise.reject({ message: new Error("Network Error") }));
  expect(await screen.findByText(/Couldn't verify contract status/, undefined, W)).toBeInTheDocument();
  expect(screen.getByTestId("pr-line-1")).toHaveAttribute("data-invalid", "true");
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Submit/ })).toBeDisabled();
  expect(screen.getByText(/couldn't check some items against rate contracts/i)).toBeInTheDocument();

  PrApi.searchItemsByIds.mockImplementation(byIds());
  fireEvent.click(screen.getByRole("button", { name: "Retry the contract check for item 1" }));
  await waitFor(() => expect(screen.queryByText(/Couldn't verify contract status/)).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
  expect(PrApi.searchItemsByIds).toHaveBeenLastCalledWith({ hotel_id: 12, department_id: 10, variant_ids: [300] });
  expect(PrApi.searchItems).not.toHaveBeenCalled();
});

test("an id missing from a successful lookup is 'no longer available' — blocked, and not a retryable 'couldn't verify'", async () => {
  await changeToKitchenWith(byIds([pin]));
  expect(await screen.findByText("This item is no longer available in the catalog — replace or remove it.", undefined, W)).toBeInTheDocument();
  expect(screen.getByTestId("pr-line-1")).toHaveAttribute("data-invalid", "true");
  expect(screen.queryByText(/Couldn't verify contract status/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Retry the contract check/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Submit/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Remove line 1" }));
  expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
});

test("a failed lookup after a cell where the line was on contract offers Retry, not the old cell's verdict", async () => {
  await changeToKitchenWith(byIds([{ ...towel, on_contract: true, arc_contract_id: 5, arc_number: "ARC-9" }]));
  expect(await screen.findByText(/On contract ARC-9/, undefined, W)).toBeInTheDocument();
  PrApi.getFormDepartments.mockResolvedValue({ data: { departments: [{ id: 9, title: "Housekeeping" }, { id: 10, title: "Kitchen" }, { id: 11, title: "Bar" }] } });
  // the department list is per hotel; reselect the hotel to load the third department
  fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "12" } });
  const dept = screen.getByLabelText("Department");
  await waitFor(() => expect(within(dept).getByRole("option", { name: "Bar" })).toBeInTheDocument());
  PrApi.searchItemsByIds.mockImplementation(() => Promise.reject({ message: new Error("Network Error") }));
  fireEvent.change(dept, { target: { value: "11" } });
  expect(await screen.findByRole("button", { name: "Retry the contract check for item 1" }, W)).toBeInTheDocument();
  expect(screen.queryByText(/On contract ARC-9/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
});

// Fix round 2: an absent id must also drop an earlier cell's on-contract
// verdict, or the line says both "On contract … raise an MR" and "no longer
// available" and the banner takes the on-contract branch.
test("a line on contract in one cell and absent in the next shows only 'no longer available'", async () => {
  await changeToKitchenWith(byIds([{ ...towel, on_contract: true, arc_contract_id: 5, arc_number: "ARC-9" }]));
  expect(await screen.findByText(/On contract ARC-9/, undefined, W)).toBeInTheDocument();
  PrApi.getFormDepartments.mockResolvedValue({ data: { departments: [{ id: 9, title: "Housekeeping" }, { id: 10, title: "Kitchen" }, { id: 11, title: "Bar" }] } });
  fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "12" } });
  const dept = screen.getByLabelText("Department");
  await waitFor(() => expect(within(dept).getByRole("option", { name: "Bar" })).toBeInTheDocument());
  PrApi.searchItemsByIds.mockImplementation(byIds([pin]));
  fireEvent.change(dept, { target: { value: "11" } });
  expect(await screen.findByText("This item is no longer available in the catalog — replace or remove it.", undefined, W)).toBeInTheDocument();
  expect(screen.queryByText(/On contract ARC-9/)).not.toBeInTheDocument();
  expect(screen.getByText(/Some items are no longer available in the catalog/)).toBeInTheDocument();
  expect(screen.queryByText(/Some items are on a rate contract here/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
});

// Fix round 2: the conflict Refresh reloads the same cell, so the cell-change
// effect never fired and the reloaded lines looked clean until the server
// refused the save. A reload always re-checks by id.
test("Refresh after a 409 re-checks the reloaded lines by id", async () => {
  mockQuery = { id: "55" };
  PrApi.getPr.mockResolvedValue(draftDetail());
  PrApi.updatePr.mockRejectedValue({ response: { status: 409, data: { status: 0, code: "PR_STATE_CONFLICT", message: "raw" } } });
  render(<CreatePrPage />);
  await screen.findByDisplayValue("Lobby towels", undefined, W);
  await waitFor(() => expect(PrApi.searchItemsByIds).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(await screen.findByText(/This PR changed since you opened it/)).toBeInTheDocument();
  // Meanwhile the towel variant was deactivated.
  PrApi.searchItemsByIds.mockImplementation(byIds([pin]));
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() => expect(PrApi.searchItemsByIds).toHaveBeenCalledTimes(2));
  expect(PrApi.searchItemsByIds).toHaveBeenLastCalledWith({ hotel_id: 12, department_id: 9, variant_ids: [300] });
  expect(await screen.findByText("This item is no longer available in the catalog — replace or remove it.", undefined, W)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
});

test("editing a draft checks its catalog lines by id for the PR's own cell", async () => {
  mockQuery = { id: "55" };
  PrApi.getPr.mockResolvedValue(draftDetail());
  render(<CreatePrPage />);
  await screen.findByDisplayValue("Lobby towels", undefined, W);
  await waitFor(() => expect(PrApi.searchItemsByIds).toHaveBeenCalledWith({ hotel_id: 12, department_id: 9, variant_ids: [300] }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled());
  expect(PrApi.searchItems).not.toHaveBeenCalled();
});

test("more than 50 catalog lines are checked in chunks of 50 ids", async () => {
  mockQuery = { id: "55" };
  const many = Array.from({ length: 51 }, (_, i) => ({
    id: 2000 + i, line_no: i + 1, line_kind: "catalog", product_variant_id: 5000 + i, variant_name: `Item ${i}`, category_id: 7,
    category_title: "Linen", quantity: "1", uom: "pcs", estimated_unit_price: "1",
  }));
  PrApi.getPr.mockResolvedValue(draftDetail({ lines: many }));
  PrApi.searchItemsByIds.mockImplementation(({ variant_ids }) =>
    Promise.resolve({ data: { items: variant_ids.map((id) => ({ ...towel, variant_id: id })) } }));
  render(<CreatePrPage />);
  await screen.findByDisplayValue("Lobby towels", undefined, W);
  await waitFor(() => expect(PrApi.searchItemsByIds).toHaveBeenCalledTimes(2));
  const sizes = PrApi.searchItemsByIds.mock.calls.map(([p]) => p.variant_ids.length);
  expect(sizes).toEqual([50, 1]);
  await waitFor(() => expect(screen.getByText("Save draft")).toBeEnabled());
}, 60000);

// 19b review minor: on a full page load the first render happens before the
// router is ready, so the edit page flashed an empty "Raise purchase
// requisition" form before the draft arrived.
test("a full page load of the edit page shows Loading, never a blank form, until the draft arrives", async () => {
  mockReady = false;
  mockQuery = {};
  PrApi.getPr.mockResolvedValue(draftDetail());
  const { rerender } = render(<CreatePrPage />);
  expect(screen.getByText("Loading requisition…")).toBeInTheDocument();
  expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  mockReady = true;
  mockQuery = { id: "55" };
  rerender(<CreatePrPage />);
  expect(screen.queryByText("Raise purchase requisition")).not.toBeInTheDocument();
  expect(await screen.findByDisplayValue("Lobby towels", undefined, W)).toBeInTheDocument();
});

test("a full page load of a new requisition shows the form once the router is ready", async () => {
  mockReady = false;
  mockQuery = {};
  const { rerender } = render(<CreatePrPage />);
  expect(screen.getByText("Loading requisition…")).toBeInTheDocument();
  mockReady = true;
  rerender(<CreatePrPage />);
  expect(await screen.findByText("Raise purchase requisition")).toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toBeInTheDocument();
});

// 19b cosmetic: the edit form showed the server's "2.000" / "15000.00".
test("the edit form shows quantities without trailing zeros and whole prices without .00", async () => {
  mockQuery = { id: "55" };
  PrApi.getPr.mockResolvedValue(draftDetail({
    lines: [
      { id: 701, line_no: 1, line_kind: "catalog", product_variant_id: 300, variant_name: "Bath towel", category_id: 7, category_title: "Linen", quantity: "2.000", uom: "pcs", estimated_unit_price: "15000.00", specification: null, suggested_vendor_note: null },
      { id: 702, line_no: 2, line_kind: "free_text", product_variant_id: null, free_text_name: "Saffron", category_id: 7, category_title: "Linen", quantity: "0.500", uom: "kg", estimated_unit_price: "1250.50", specification: null, suggested_vendor_note: null },
    ],
  }));
  render(<CreatePrPage />);
  await screen.findByDisplayValue("Lobby towels", undefined, W);
  const qty = screen.getAllByLabelText("Quantity");
  const price = screen.getAllByLabelText("Estimated unit price");
  expect(qty.map((i) => i.value)).toEqual(["2", "0.5"]);
  expect(price.map((i) => i.value)).toEqual(["15000", "1250.50"]);
  expect(screen.getByTestId("grand-total")).toHaveTextContent("₹30,625.25");
});

// 19b cosmetic: a hotel with a single department still made the requester pick it.
test("a hotel with exactly one department selects it; with several the requester picks", async () => {
  render(<CreatePrPage />);
  const hotel = await screen.findByLabelText("Hotel");
  await waitFor(() => expect(within(hotel).getByRole("option", { name: "Mumbai Suites" })).toBeInTheDocument());
  fireEvent.change(hotel, { target: { value: "12" } });
  await waitFor(() => expect(screen.getByLabelText("Department")).toHaveValue("9"));
  expect(screen.getByRole("button", { name: /Add catalog item/ })).toBeEnabled();
});

test("with several departments nothing is pre-selected", async () => {
  PrApi.getFormDepartments.mockResolvedValue({ data: { departments: [{ id: 9, title: "Housekeeping" }, { id: 10, title: "Kitchen" }] } });
  render(<CreatePrPage />);
  const hotel = await screen.findByLabelText("Hotel");
  await waitFor(() => expect(within(hotel).getByRole("option", { name: "Mumbai Suites" })).toBeInTheDocument());
  fireEvent.change(hotel, { target: { value: "12" } });
  const dept = screen.getByLabelText("Department");
  await waitFor(() => expect(within(dept).getByRole("option", { name: "Kitchen" })).toBeInTheDocument());
  expect(dept).toHaveValue("");
});
