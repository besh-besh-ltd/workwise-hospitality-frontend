// Purchase queue (buyer pool) — selection rules, row actions (assign, map,
// catalog request, close), conversion preview + RFQ wizard handoff, error
// copy, friendly 403. Service layer mocked; the server stays authoritative.

jest.mock("@/services/pr", () => ({
  __esModule: true,
  getPool: jest.fn(),
  getBuyers: jest.fn(),
  assignPr: jest.fn(),
  mapLine: jest.fn(),
  requestCatalogItem: jest.fn(),
  closeLine: jest.fn(),
  convertLines: jest.fn(),
  searchItems: jest.fn(),
  searchCategories: jest.fn(),
}));
jest.mock("@/services/rbac", () => ({ __esModule: true, getDepartments: jest.fn(), getBulkPermissions: jest.fn() }));
jest.mock("@/services/process", () => ({ __esModule: true, getApprovalProcesses: jest.fn() }));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 7 } }),
}));
const mockPush = jest.fn(() => Promise.resolve(true));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: {}, push: mockPush, replace: jest.fn() }),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as PrApi from "@/services/pr";
import { getDepartments, getBulkPermissions } from "@/services/rbac";
import { getApprovalProcesses } from "@/services/process";
import { ERROR_COPY } from "@/components/dashboard/purchase-requisitions/prFormat";
import PrQueuePage from "@/pages/dashboard/buyer/purchase-requisitions/queue";

const row = (over = {}) => ({
  line_id: 101, pr_id: 11, pr_number: "PR-2026-0011", pr_title: "Rice restock",
  hotel_id: 12, hotel_name: "Orchid Mumbai", department_id: 4, department_title: "Kitchen",
  line_no: 1, line_kind: "catalog", item_name: "Basmati rice", free_text_name: null, effective_variant_id: 501,
  category_id: 3, category_title: "Grains", quantity: "2.500", uom: "kg", estimated_unit_price: "120.00", line_value: "300.00",
  required_by_date: "2026-11-20", urgency: "normal", approved_at: "2026-10-10T05:00:00Z",
  age_days: 1, age_band: "ok", assigned_buyer_id: null, assigned_buyer_name: null,
  progress: "in_pool", duplicate_count: 0, clause_count: 0, attachment_count: 0, open_catalog_request_id: null,
  ...over,
});
const FREE = {
  line_id: 103, pr_id: 13, pr_number: "PR-2026-0013", line_no: 2, line_kind: "free_text", item_name: "Organic jaggery",
  free_text_name: "Organic jaggery", effective_variant_id: null, department_id: 6, department_title: "Bakery",
  progress: "needs_mapping",
};
const pool = (rows, over = {}) => ({
  status: 1,
  data: {
    rows, total: rows.length, page: 1, page_size: 50,
    hotels: [{ id: 12, name: "Orchid Mumbai" }, { id: 13, name: "Orchid Goa" }],
    ...over,
  },
});
const reject = (status, data) => Promise.reject({ response: { status, data } });
// POST /rbac/me/permissions/bulk as useModulePermissions reads it.
const rfqPerms = (processes) => ({ status: 1, data: { permissions: { rfq: { actions: ["create", "read"], scope: { processes } } } } });
const lastPoolParams = () => PrApi.getPool.mock.calls[PrApi.getPool.mock.calls.length - 1][0];
const rowEl = (lineId) => screen.getByTestId(`pool-row-${lineId}`);
const checkbox = (lineId) => within(rowEl(lineId)).getByRole("checkbox");

const RICE_A = row();
const RICE_B = row({ line_id: 102, pr_id: 12, pr_number: "PR-2026-0012", line_no: 1, quantity: "3.000", uom: " Kg" });
const JASMINE = row({ line_id: 104, pr_id: 12, pr_number: "PR-2026-0012", line_no: 2, item_name: "Jasmine rice", effective_variant_id: 502, quantity: "1", uom: "kg" });

beforeEach(() => {
  jest.clearAllMocks();
  PrApi.getPool.mockResolvedValue(pool([RICE_A, RICE_B]));
  getDepartments.mockResolvedValue({ status: true, data: [{ id: 4, title: "Kitchen" }, { id: 6, title: "Bakery" }] });
  PrApi.searchCategories.mockResolvedValue({ status: 1, data: { categories: [] } });
  getBulkPermissions.mockResolvedValue(rfqPerms({ all: true, ids: [] }));
  getApprovalProcesses.mockResolvedValue({ status: 1, data: [{ id: 3, name: "Capex" }, { id: 4, name: "Opex" }] });
});

async function openConvert(lineIds) {
  render(<PrQueuePage />);
  await screen.findByTestId(`pool-row-${lineIds[0]}`);
  lineIds.forEach((id) => fireEvent.click(checkbox(id)));
  fireEvent.click(screen.getByRole("button", { name: "Convert to RFQ" }));
  return screen.findByRole("dialog", { name: "Convert to an RFQ draft" });
}

/** Wait until the convert dialog can submit (department defaulted, permissions loaded); returns Create. */
async function ready(dialog, deptValue = "4") {
  await waitFor(() => expect(within(dialog).getByLabelText("RFQ department")).toHaveValue(deptValue));
  const create = within(dialog).getByRole("button", { name: "Create RFQ draft" });
  await waitFor(() => expect(create).toBeEnabled());
  return create;
}

test("renders a row with PR link, item, exact qty + unit, value, need-by, assignee and progress", async () => {
  PrApi.getPool.mockResolvedValue(pool([row({ assigned_buyer_name: "Ravi", duplicate_count: 2 })]));
  render(<PrQueuePage />);
  const r = await screen.findByTestId("pool-row-101");
  expect(within(r).getByRole("link", { name: "PR-2026-0011" })).toHaveAttribute("href", "/dashboard/buyer/purchase-requisitions/11");
  expect(within(r).getByText("Basmati rice")).toBeInTheDocument();
  expect(within(r).getByText("2.5 kg")).toBeInTheDocument();
  expect(within(r).getByText("₹300")).toBeInTheDocument();
  expect(within(r).getByText("20 Nov 2026")).toBeInTheDocument();
  expect(within(r).getByText("Ravi")).toBeInTheDocument();
  expect(within(r).getByText("2 similar")).toBeInTheDocument();
  expect(within(r).getByText("In purchase queue")).toBeInTheDocument();
});

test("lines from two hotels can't be selected together", async () => {
  PrApi.getPool.mockResolvedValue(pool([RICE_A, row({ line_id: 201, pr_id: 21, pr_number: "PR-2026-0021", hotel_id: 13, hotel_name: "Orchid Goa" })]));
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-101");
  expect(checkbox(201)).toBeEnabled();
  fireEvent.click(checkbox(101));
  expect(checkbox(101)).toBeChecked();
  expect(checkbox(201)).toBeDisabled();
  expect(checkbox(201)).toHaveAttribute("title", expect.stringMatching(/one hotel/i));
  expect(screen.getByTestId("queue-selection")).toHaveTextContent("1 line selected · Orchid Mumbai");
  fireEvent.click(checkbox(101));
  expect(checkbox(201)).toBeEnabled();
});

test("the selection survives a filter change; the bar counts lines not on this page and convert sends them all", async () => {
  const BAKERY = row({ ...JASMINE, department_id: 6, department_title: "Bakery" });
  PrApi.getPool.mockImplementation((p) => Promise.resolve(p.department_id === "6" ? pool([BAKERY]) : pool([RICE_A, RICE_B])));
  PrApi.convertLines.mockResolvedValue({ status: 1, data: { rfq_id: 900, redirect: "/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=900" } });
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-101");
  fireEvent.click(checkbox(101));
  const deptFilter = screen.getByLabelText("Department");
  await waitFor(() => expect(within(deptFilter).getByRole("option", { name: "Bakery" })).toBeInTheDocument());
  fireEvent.change(deptFilter, { target: { value: "6" } });
  await screen.findByTestId("pool-row-104");
  expect(screen.getByTestId("queue-selection")).toHaveTextContent("1 line selected · Orchid Mumbai · 1 not on this page");
  fireEvent.click(checkbox(104));
  expect(screen.getByTestId("queue-selection")).toHaveTextContent("2 lines selected · Orchid Mumbai · 1 not on this page");
  fireEvent.click(screen.getByRole("button", { name: "Convert to RFQ" }));
  const dialog = await screen.findByRole("dialog", { name: "Convert to an RFQ draft" });
  const groups = within(dialog).getAllByTestId("convert-group");
  expect(groups.map((g) => within(g).getByText(/Basmati|Jasmine/).textContent)).toEqual(["Basmati rice", "Jasmine rice"]);
  const dept = within(dialog).getByLabelText("RFQ department");
  await waitFor(() => expect(within(dept).getByRole("option", { name: "Bakery" })).toBeInTheDocument());
  fireEvent.change(dept, { target: { value: "6" } });
  fireEvent.click(await ready(dialog, "6"));
  await waitFor(() => expect(PrApi.convertLines).toHaveBeenCalledWith({ line_ids: [101, 104], department_id: 6 }));
});

test("a selected line that a refetch shows has left the queue is dropped from the selection with a notice", async () => {
  const MAPPED = row({ ...FREE, progress: "in_pool", effective_variant_id: 602, item_name: "Jaggery powder 500g" });
  PrApi.getPool.mockResolvedValueOnce(pool([RICE_A, RICE_B, row(FREE)])).mockResolvedValue(pool([RICE_A, MAPPED]));
  PrApi.searchItems.mockResolvedValue({ status: 1, data: { items: [{ variant_id: 602, variant_name: "Jaggery powder 500g", on_contract: false }] } });
  PrApi.mapLine.mockResolvedValue({ status: 1, message: "Line mapped", data: { line_id: 103 } });
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-103");
  fireEvent.click(checkbox(101));
  fireEvent.click(checkbox(102));
  expect(screen.getByTestId("queue-selection")).toHaveTextContent("2 lines selected");
  // meanwhile someone else converts PR-2026-0012 line 1; mapping 103 refetches the (unfiltered, single-page) queue
  fireEvent.click(within(rowEl(103)).getByRole("button", { name: "Map" }));
  const dialog = await screen.findByRole("dialog", { name: "Map to a catalog item" });
  fireEvent.click(await within(dialog).findByTestId("map-result-602"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Map to this item" }));
  await waitFor(() => expect(screen.queryByTestId("pool-row-102")).toBeNull());
  expect(screen.getByTestId("queue-selection")).toHaveTextContent("1 line selected · Orchid Mumbai");
  expect(screen.getByTestId("queue-selection")).not.toHaveTextContent("not on this page");
  expect(screen.getByTestId("selection-notice")).toHaveTextContent(/no longer in the queue: PR-2026-0012 line 1\./);
});

test("Convert is off while the queue is reloading", async () => {
  let release;
  PrApi.getPool
    .mockResolvedValueOnce(pool([RICE_A, RICE_B]))
    .mockImplementationOnce(() => new Promise((r) => { release = r; }));
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-101");
  fireEvent.click(checkbox(101));
  const convert = screen.getByRole("button", { name: "Convert to RFQ" });
  expect(convert).toBeEnabled();
  fireEvent.change(screen.getByLabelText("Assigned"), { target: { value: "me" } });
  await waitFor(() => expect(convert).toBeDisabled());
  await act(async () => { release(pool([RICE_A])); });
  await waitFor(() => expect(convert).toBeEnabled());
});

test("why a checkbox is off is visible text tied to the checkbox for keyboard and screen-reader users", async () => {
  PrApi.getPool.mockResolvedValue(pool([RICE_A, row(FREE), row({ line_id: 201, pr_id: 21, pr_number: "PR-2026-0021", hotel_id: 13, hotel_name: "Orchid Goa" })]));
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-103");
  expect(checkbox(103)).toHaveAccessibleDescription(/needs a catalog item/i);
  expect(within(rowEl(103)).getByText(/needs a catalog item/i)).toBeVisible();
  fireEvent.click(checkbox(101));
  expect(checkbox(201)).toHaveAccessibleDescription(/your selection is for Orchid Mumbai/);
});

test("a needs_mapping line is not selectable and offers Map and Request catalog item", async () => {
  PrApi.getPool.mockResolvedValue(pool([RICE_A, row(FREE)]));
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-103");
  expect(checkbox(103)).toBeDisabled();
  expect(checkbox(103)).toHaveAttribute("title", expect.stringMatching(/catalog item/i));
  expect(within(rowEl(103)).getByText("Needs catalog mapping")).toBeInTheDocument();
  expect(within(rowEl(103)).getByRole("button", { name: "Map" })).toBeInTheDocument();
  expect(within(rowEl(103)).getByRole("button", { name: "Request catalog item" })).toBeInTheDocument();
  // a catalog line has nothing to map
  expect(within(rowEl(101)).queryByRole("button", { name: "Map" })).toBeNull();
});

test("age badge colours for 0 / 3 / 7 days", async () => {
  PrApi.getPool.mockResolvedValue(pool([
    row({ line_id: 1, age_days: 0, age_band: "ok" }),
    row({ line_id: 2, age_days: 3, age_band: "amber" }),
    row({ line_id: 3, age_days: 7, age_band: "red" }),
  ]));
  render(<PrQueuePage />);
  const a0 = await screen.findByTestId("age-1");
  expect(a0).toHaveClass("pill", "success");
  expect(a0).toHaveTextContent("Today");
  expect(screen.getByTestId("age-2")).toHaveClass("pill", "warn");
  expect(screen.getByTestId("age-2")).toHaveTextContent("3 days");
  expect(screen.getByTestId("age-3")).toHaveClass("pill", "danger");
  expect(screen.getByTestId("age-3")).toHaveTextContent("7 days");
});

test("the convert modal merges two lines of one item into one row with the exact summed quantity 5.5", async () => {
  PrApi.getPool.mockResolvedValue(pool([RICE_A, RICE_B, JASMINE]));
  const dialog = await openConvert([101, 102, 104]);
  const groups = within(dialog).getAllByTestId("convert-group");
  expect(groups).toHaveLength(2);
  expect(within(groups[0]).getByText("Basmati rice")).toBeInTheDocument();
  expect(within(groups[0]).getByText("5.5 kg")).toBeInTheDocument();
  expect(within(groups[0]).getByText(/from 2 lines/)).toBeInTheDocument();
  expect(within(groups[1]).getByText("Jasmine rice")).toBeInTheDocument();
  expect(within(groups[1]).getByText("1 kg")).toBeInTheDocument();
  expect(within(dialog).queryByText(/different units/i)).toBeNull();
});

test("the convert modal warns when one item is requested in different units", async () => {
  PrApi.getPool.mockResolvedValue(pool([RICE_A, row({ ...RICE_B, uom: "bag" })]));
  const dialog = await openConvert([101, 102]);
  expect(within(dialog).getByText(/different units/i)).toHaveTextContent(/kg, bag/);
  await waitFor(() => expect(within(dialog).getByLabelText("RFQ department")).toHaveValue("4"));
  expect(within(dialog).getByRole("button", { name: "Create RFQ draft" })).toBeDisabled();
  expect(within(dialog).getByText(/one unit per item/i)).toBeInTheDocument();
});

test("success converts with the common department and opens the RFQ wizard on the draft", async () => {
  PrApi.convertLines.mockResolvedValue({
    status: 1, message: "RFQ draft created",
    data: { rfq_id: 900, rfq_no: 100900, redirect: "/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=900" },
  });
  const dialog = await openConvert([101, 102]);
  await waitFor(() => expect(getDepartments).toHaveBeenCalledWith({ hotel_id: 12, resource: "rfq" }));
  const create = await ready(dialog);
  // all-process grant: the process is optional and left blank
  const proc = within(dialog).getByLabelText("RFQ process");
  await waitFor(() => expect(within(proc).getByRole("option", { name: "Opex" })).toBeInTheDocument());
  expect(within(proc).getByRole("option", { name: /set it in the RFQ wizard/ })).toBeInTheDocument();
  expect(proc).toHaveValue("");
  fireEvent.click(create);
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=900"));
  expect(PrApi.convertLines).toHaveBeenCalledTimes(1);
  expect(PrApi.convertLines).toHaveBeenCalledWith({ line_ids: [101, 102], department_id: 4 });
  expect(PrApi.convertLines.mock.calls[0][0]).not.toHaveProperty("process_id");
});

test("a process-restricted RFQ grant makes the process required and sends it", async () => {
  getBulkPermissions.mockResolvedValue(rfqPerms({ all: false, ids: [3] }));
  PrApi.convertLines.mockResolvedValue({ status: 1, data: { rfq_id: 900, redirect: "/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=900" } });
  const dialog = await openConvert([101, 102]);
  const proc = within(dialog).getByLabelText("RFQ process");
  await waitFor(() => expect(within(proc).getByRole("option", { name: "Capex" })).toBeInTheDocument());
  expect(within(proc).queryByRole("option", { name: "Opex" })).toBeNull();
  await waitFor(() => expect(within(dialog).getByLabelText("RFQ department")).toHaveValue("4"));
  const create = within(dialog).getByRole("button", { name: "Create RFQ draft" });
  expect(create).toBeDisabled();
  expect(within(dialog).getByText(/choose the process/i)).toBeInTheDocument();
  fireEvent.change(proc, { target: { value: "3" } });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.click(create);
  await waitFor(() => expect(PrApi.convertLines).toHaveBeenCalledWith({ line_ids: [101, 102], department_id: 4, process_id: 3 }));
});

test("a 403 for RFQ creation says which combination is refused", async () => {
  PrApi.convertLines.mockImplementation(() => reject(403, {
    status: 0, code: "PR_FORBIDDEN", message: "You cannot create RFQs for this hotel and department", details: { permission: "rfq.create" },
  }));
  const dialog = await openConvert([101, 102]);
  fireEvent.click(await ready(dialog));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("You can't create RFQs for this hotel, department and process.");
});

test("Create ignores a double click: exactly one conversion request", async () => {
  PrApi.convertLines.mockImplementation(() => new Promise(() => {}));
  const dialog = await openConvert([101, 102]);
  const create = await ready(dialog);
  act(() => { fireEvent.click(create); fireEvent.click(create); });
  expect(PrApi.convertLines).toHaveBeenCalledTimes(1);
  expect(create).toBeDisabled();
});

test("no department to raise the RFQ in: says so and Create stays off", async () => {
  getDepartments.mockImplementation((p) => Promise.resolve({ status: true, data: p && p.hotel_id ? [] : [{ id: 4, title: "Kitchen" }] }));
  const dialog = await openConvert([101, 102]);
  expect(await within(dialog).findByText(/You can't create RFQs at Orchid Mumbai/)).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "Create RFQ draft" })).toBeDisabled();
});

test.each(["//evil.example/x", "/\\evil.example/x", "https://evil.example/x"])("a redirect that is not an in-app path (%s) falls back to the draft builder", async (redirect) => {
  PrApi.convertLines.mockResolvedValue({ status: 1, data: { rfq_id: 900, redirect } });
  const dialog = await openConvert([101, 102]);
  fireEvent.click(await ready(dialog));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/rfq-management-edit?draft_id=900"));
});

test("lines from different departments need a department picked before converting", async () => {
  PrApi.getPool.mockResolvedValue(pool([RICE_A, row({ ...JASMINE, department_id: 6, department_title: "Bakery" })]));
  PrApi.convertLines.mockResolvedValue({ status: 1, data: { rfq_id: 901, redirect: "/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=901" } });
  const dialog = await openConvert([101, 104]);
  const dept = within(dialog).getByLabelText("RFQ department");
  await waitFor(() => expect(within(dept).getByRole("option", { name: "Bakery" })).toBeInTheDocument());
  expect(dept).toHaveValue("");
  const create = within(dialog).getByRole("button", { name: "Create RFQ draft" });
  expect(create).toBeDisabled();
  fireEvent.change(dept, { target: { value: "6" } });
  await waitFor(() => expect(create).toBeEnabled());
  fireEvent.click(create);
  await waitFor(() => expect(PrApi.convertLines).toHaveBeenCalledWith({ line_ids: [101, 104], department_id: 6 }));
});

test("a 409 renders the per-line reasons in words and offers a queue refresh", async () => {
  PrApi.convertLines.mockImplementation(() => reject(409, {
    status: 0, code: "PR_LINE_NOT_CONVERTIBLE", message: "Some lines cannot be converted",
    details: [
      { line_id: 101, pr_number: "PR-2026-0011", line_no: 1, reason: "already_sourced" },
      { line_id: 102, pr_number: "PR-2026-0012", line_no: 1, reason: "on_contract" },
    ],
  }));
  const dialog = await openConvert([101, 102]);
  fireEvent.click(await ready(dialog));
  const alert = await within(dialog).findByRole("alert");
  expect(alert).toHaveTextContent(ERROR_COPY.PR_LINE_NOT_CONVERTIBLE);
  expect(alert).toHaveTextContent(/PR-2026-0011 · line 1 — it is already in another RFQ/);
  expect(alert).toHaveTextContent(/PR-2026-0012 · line 1 — .*rate contract/);
  expect(alert).not.toHaveTextContent("already_sourced");
  expect(mockPush).not.toHaveBeenCalled();
  const before = PrApi.getPool.mock.calls.length;
  fireEvent.click(within(dialog).getByRole("button", { name: "Refresh queue" }));
  await waitFor(() => expect(PrApi.getPool.mock.calls.length).toBe(before + 1));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  // the refused lines leave the selection, with a notice saying why
  expect(screen.getByTestId("selection-notice")).toHaveTextContent(/PR-2026-0011 line 1.*PR-2026-0012 line 1/);
  expect(checkbox(101)).not.toBeChecked();
  expect(checkbox(102)).not.toBeChecked();
});

test("a 404 from convert offers a refresh, and closing the dialog refetches the queue", async () => {
  PrApi.convertLines.mockImplementation(() => reject(404, { status: 0, code: "PR_NOT_FOUND", message: "Purchase requisition not found" }));
  const dialog = await openConvert([101, 102]);
  fireEvent.click(await ready(dialog));
  const alert = await within(dialog).findByRole("alert");
  expect(alert).toHaveTextContent("Purchase requisition not found");
  expect(within(alert).getByRole("button", { name: "Refresh queue" })).toBeInTheDocument();
  const before = PrApi.getPool.mock.calls.length;
  fireEvent.click(within(dialog).getByRole("button", { name: "Go back" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(PrApi.getPool.mock.calls.length).toBe(before + 1));
});

test("PR_SPEC_TOO_LONG shows its copy and the item that is too long", async () => {
  PrApi.convertLines.mockImplementation(() => reject(422, {
    status: 0, code: "PR_SPEC_TOO_LONG", message: "too long",
    details: [{ variant_id: 501, length: 1340, line_ids: [101, 102] }],
  }));
  const dialog = await openConvert([101, 102]);
  fireEvent.click(await ready(dialog));
  const alert = await within(dialog).findByRole("alert");
  expect(alert).toHaveTextContent(ERROR_COPY.PR_SPEC_TOO_LONG);
  expect(alert).toHaveTextContent("Basmati rice — 1,340 characters");
});

test("PR_UNIT_MISMATCH from the server names the item and its units", async () => {
  PrApi.convertLines.mockImplementation(() => reject(422, {
    status: 0, code: "PR_UNIT_MISMATCH", message: "units",
    details: [{ variant_id: 501, units: ["kg", "bag"], line_ids: [101, 102] }],
  }));
  const dialog = await openConvert([101, 102]);
  fireEvent.click(await ready(dialog));
  const alert = await within(dialog).findByRole("alert");
  expect(alert).toHaveTextContent(ERROR_COPY.PR_UNIT_MISMATCH);
  expect(alert).toHaveTextContent("Basmati rice — kg, bag");
});

test("mapping dialog: searches the line's hotel + PR department, on-contract results are disabled with the MR hint, mapping refetches", async () => {
  PrApi.getPool.mockResolvedValue(pool([row(FREE)]));
  PrApi.searchItems.mockResolvedValue({
    status: 1,
    data: { items: [
      { variant_id: 601, variant_name: "Jaggery block 1kg", product_name: "Jaggery", category_title: "Sweeteners", on_contract: true, arc_contract_id: 9, arc_number: "ARC-0009" },
      { variant_id: 602, variant_name: "Jaggery powder 500g", product_name: "Jaggery", category_title: "Sweeteners", on_contract: false, arc_contract_id: null, arc_number: null },
    ] },
  });
  PrApi.mapLine.mockResolvedValue({ status: 1, message: "Line mapped", data: { line_id: 103, mapped_variant_id: 602, progress: "in_pool" } });
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-103");
  fireEvent.click(within(rowEl(103)).getByRole("button", { name: "Map" }));
  const dialog = await screen.findByRole("dialog", { name: "Map to a catalog item" });
  expect(within(dialog).getByLabelText("Search catalog items")).toHaveValue("Organic jaggery");
  const onContract = await within(dialog).findByTestId("map-result-601");
  expect(PrApi.searchItems).toHaveBeenCalledWith({ hotel_id: 12, department_id: 6, q: "Organic jaggery", limit: 25 });
  expect(onContract).toHaveAttribute("aria-disabled", "true");
  expect(within(onContract).getByRole("link", { name: /raise an MR/ })).toHaveAttribute("href", "/dashboard/buyer/material-requisitions/create");
  const confirm = within(dialog).getByRole("button", { name: "Map to this item" });
  fireEvent.click(onContract);
  expect(confirm).toBeDisabled();
  fireEvent.click(within(dialog).getByTestId("map-result-602"));
  expect(confirm).toBeEnabled();
  const before = PrApi.getPool.mock.calls.length;
  fireEvent.click(confirm);
  await waitFor(() => expect(PrApi.mapLine).toHaveBeenCalledWith(13, 103, 602));
  await waitFor(() => expect(PrApi.getPool.mock.calls.length).toBe(before + 1));
  expect(await screen.findByText("Line mapped")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("a refused mapping keeps the dialog open with the error copy", async () => {
  PrApi.getPool.mockResolvedValue(pool([row(FREE)]));
  PrApi.searchItems.mockResolvedValue({ status: 1, data: { items: [{ variant_id: 602, variant_name: "Jaggery powder 500g", on_contract: false }] } });
  PrApi.mapLine.mockImplementation(() => reject(422, { status: 0, code: "PR_LINE_ON_CONTRACT", message: "x", details: {} }));
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-103");
  fireEvent.click(within(rowEl(103)).getByRole("button", { name: "Map" }));
  const dialog = await screen.findByRole("dialog", { name: "Map to a catalog item" });
  fireEvent.click(await within(dialog).findByTestId("map-result-602"));
  fireEvent.click(within(dialog).getByRole("button", { name: "Map to this item" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(ERROR_COPY.PR_LINE_ON_CONTRACT);
});

test("Request catalog item prefills the free-text name and sends the description", async () => {
  PrApi.getPool.mockResolvedValue(pool([row(FREE)]));
  PrApi.requestCatalogItem.mockResolvedValue({ status: 1, message: "Catalog item requested", data: { id: 5 } });
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-103");
  fireEvent.click(within(rowEl(103)).getByRole("button", { name: "Request catalog item" }));
  const dialog = await screen.findByRole("dialog", { name: "Request a catalog item" });
  expect(within(dialog).getByLabelText(/Item name/)).toHaveValue("Organic jaggery");
  fireEvent.change(within(dialog).getByLabelText(/Description/), { target: { value: "500 g packs" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Send request" }));
  await waitFor(() => expect(PrApi.requestCatalogItem).toHaveBeenCalledWith(13, 103, { requested_name: "Organic jaggery", description: "500 g packs" }));
  expect(await screen.findByText("Catalog item requested")).toBeInTheDocument();
});

test("Close line asks for a reason, closes and refetches", async () => {
  PrApi.closeLine.mockResolvedValue({ status: 1, message: "Line closed", data: { line_id: 101, status: "closed" } });
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-101");
  fireEvent.click(within(rowEl(101)).getByRole("button", { name: "Close line" }));
  const dialog = await screen.findByRole("dialog", { name: "Close this line" });
  const ok = within(dialog).getByRole("button", { name: "Close line" });
  expect(ok).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Bought locally" } });
  const before = PrApi.getPool.mock.calls.length;
  fireEvent.click(ok);
  await waitFor(() => expect(PrApi.closeLine).toHaveBeenCalledWith(11, 101, "Bought locally"));
  await waitFor(() => expect(PrApi.getPool.mock.calls.length).toBe(before + 1));
});

test("a stale refusal (409) keeps the dialog with the copy and refreshes the queue behind it", async () => {
  PrApi.closeLine.mockImplementation(() => reject(409, {
    status: 0, code: "PR_STATE_CONFLICT", message: "x", details: { line_id: 101, line_no: 1, reason: "already_sourced" },
  }));
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-101");
  fireEvent.click(within(rowEl(101)).getByRole("button", { name: "Close line" }));
  const dialog = await screen.findByRole("dialog", { name: "Close this line" });
  fireEvent.change(within(dialog).getByLabelText("Reason"), { target: { value: "Bought locally" } });
  const before = PrApi.getPool.mock.calls.length;
  fireEvent.click(within(dialog).getByRole("button", { name: "Close line" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(ERROR_COPY.PR_STATE_CONFLICT);
  await waitFor(() => expect(PrApi.getPool.mock.calls.length).toBe(before + 1));
  expect(screen.getByRole("dialog", { name: "Close this line" })).toBeInTheDocument();
});

test("Assign lists the hotel's buyers and assigns the whole requisition", async () => {
  PrApi.getBuyers.mockResolvedValue({ status: 1, data: [{ id: 7, name: "Me Buyer" }, { id: 8, name: "Ravi" }] });
  PrApi.assignPr.mockResolvedValue({ status: 1, message: "Assigned", data: { id: 11, assigned_buyer_id: 8 } });
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-101");
  fireEvent.click(within(rowEl(101)).getByRole("button", { name: "Assign" }));
  const dialog = await screen.findByRole("dialog", { name: "Assign PR-2026-0011" });
  expect(PrApi.getBuyers).toHaveBeenCalledWith(12);
  const pick = within(dialog).getByLabelText("Buyer");
  await waitFor(() => expect(within(pick).getByRole("option", { name: "Ravi" })).toBeInTheDocument());
  expect(pick).toHaveValue("7"); // defaults to me when I am a buyer here
  fireEvent.change(pick, { target: { value: "8" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Assign" }));
  await waitFor(() => expect(PrApi.assignPr).toHaveBeenCalledWith(11, 8));
});

test("filters go to the server: hotel, progress, assigned", async () => {
  render(<PrQueuePage />);
  await screen.findByTestId("pool-row-101");
  fireEvent.change(screen.getByLabelText("Hotel"), { target: { value: "13" } });
  await waitFor(() => expect(lastPoolParams()).toMatchObject({ hotel_id: "13", page: 1 }));
  fireEvent.click(screen.getByRole("button", { name: "Needs catalog mapping" }));
  await waitFor(() => expect(lastPoolParams()).toMatchObject({ progress: "needs_mapping", hotel_id: "13" }));
  fireEvent.change(screen.getByLabelText("Assigned"), { target: { value: "me" } });
  await waitFor(() => expect(lastPoolParams()).toMatchObject({ assigned: "me" }));
});

test("a caller who is not a buyer anywhere sees a friendly explanation", async () => {
  PrApi.getPool.mockImplementation(() => reject(403, { status: 0, code: "PR_FORBIDDEN", message: "You do not have access to work the purchase queue for this hotel" }));
  render(<PrQueuePage />);
  expect(await screen.findByText("You don't work the purchase queue")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /requisitions/i })).toHaveAttribute("href", "/dashboard/buyer/purchase-requisitions");
});
