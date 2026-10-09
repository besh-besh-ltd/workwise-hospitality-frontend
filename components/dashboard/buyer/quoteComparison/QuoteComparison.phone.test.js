// QuoteComparison on a phone (≤768px).
//
// The product × vendor matrix is unusable at 390px: the sticky 312px item
// column fills the screen and each vendor's price and per-cell Approve/Reject
// sit off to the right. On a phone the sheet renders one card per product
// instead, and the approver's decision dock becomes the shared
// MobileActionBar. These tests pin that the cards are the SAME decision
// surface — the buttons drive the same selection state and the same
// approve/reject API calls as the matrix cells — and that desktop still gets
// the matrix.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: {},
    asPath: "/dashboard/buyer/rfq-management-details?id=720",
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({
  __esModule: true,
  default: () => <div>access denied</div>,
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  default: () => ({
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canApprove: true,
    loading: false,
  }),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  getQuoteComparisonView: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  finalizeQuotation: jest.fn(() => Promise.resolve({})),
  getRFQById: jest.fn(() => Promise.resolve({ data: { hotel_ids: [1], department_id: 2 } })),
  getRfqs: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  approveNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  rejectNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  getNegotiationApprovalBundle: jest.fn(() => Promise.resolve({ data: {} })),
}));

import fs from "fs";
import path from "path";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import { approveNegotiationQuotes, rejectNegotiationQuotes } from "@/services/negotiation";
import QuoteComparison, { awardCellAnchorId, PHONE_QUERY } from "./QuoteComparison";

const RFQ_ID = "720";
const SHARMA = 5512;
const METRO = 5513;

const quote = (base, vendorId) => ({
  base,
  subtotal: base * 10,
  tax_amt: Math.round(base * 10 * 0.18),
  total: Math.round(base * 10 * 1.18),
  other_charges: [],
  history: [],
  finalize: {
    vendor_id: vendorId,
    quote_id: 1,
    quote_item_id: 1,
    unit_price: base,
    total_value: Math.round(base * 10 * 1.18),
    charges_meta: {},
  },
});

const product = (id, name, state, awaitingMe, finalizedVendor) => ({
  id,
  name,
  qty: 10,
  unit: "nos",
  category: 1,
  state,
  awaiting_me: awaitingMe,
  finalized_vendor: finalizedVendor,
  quoted_count: 2,
  quotes: { [SHARMA]: quote(1500, SHARMA), [METRO]: quote(1620, METRO) },
  approval: { current_approvers: [{ name: "Prashant Joshi" }] },
});

// 8801 is already approved; 8802 (awarded to Metro, the dearer quote) and
// 8803 (awarded to Sharma) are waiting on THIS approver.
const viewPayload = () => ({
  rfq: { id: 720, rfq_no: "536264", title: "Window fittings", status: "OPEN", project_id: null },
  quotes_locked: false,
  bid_end_date: "2026-07-25T10:00:00.000Z",
  vendors: [
    { id: SHARMA, name: "Sharma Glassworks", short: "SG" },
    { id: METRO, name: "Metro Fittings", short: "MF" },
  ],
  categories: [{ id: 1, name: "Fittings" }],
  products: [
    product(8801, "WINDOW A", "approved", false, SHARMA),
    product(8802, "WINDOW B", "pending", true, METRO),
    product(8803, "WINDOW C", "pending", true, SHARMA),
  ],
  approval_chain: [],
  has_delivery_charges: false,
});

// jsdom has no matchMedia; the sheet treats that as "not a phone".
const setViewport = (phone) => {
  window.matchMedia = jest.fn((q) => ({
    matches: phone && q === PHONE_QUERY,
    media: q,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
};

let scrollSpy;

beforeEach(() => {
  jest.clearAllMocks();
  scrollSpy = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = scrollSpy;
  getQuoteComparisonView.mockResolvedValue(viewPayload());
});

afterEach(() => {
  delete window.matchMedia;
  document.body.classList.remove("has-mobile-action-bar");
});

const renderSheet = async (props = {}) => {
  const utils = render(<QuoteComparison rfqId={RFQ_ID} embedded {...props} />);
  await screen.findByText("WINDOW B");
  return utils;
};

const cardFor = (name) =>
  screen.getAllByTestId("qc-phone-card").find((c) => within(c).queryByText(name));

describe("phone: one card per product instead of the matrix", () => {
  beforeEach(() => setViewport(true));

  test("renders a card for every product and no comparison table", async () => {
    const { container } = await renderSheet();
    expect(screen.getAllByTestId("qc-phone-card")).toHaveLength(3);
    expect(container.querySelector("table")).toBeNull();
    // Each name appears once — the matrix is not rendered behind the cards.
    expect(screen.getAllByText("WINDOW B")).toHaveLength(1);
  });

  test("each card leads with the AWARDED vendor and its price, not merely the cheapest", async () => {
    await renderSheet();
    const b = cardFor("WINDOW B");
    // 8802 was awarded to Metro (L2); Sharma is L1 but not the award.
    const lead = b.querySelector(`#${awardCellAnchorId(8802, METRO)}`);
    expect(lead).toBeInTheDocument();
    expect(lead).toHaveTextContent("Metro Fittings");
    expect(lead).toHaveTextContent("₹19,116"); // 1620 × 10 × 1.18
    expect(lead).toHaveTextContent("L2");
    // The other vendor is collapsed behind one tap.
    expect(within(b).queryByText("Sharma Glassworks")).toBeNull();
    fireEvent.click(within(b).getByRole("button", { name: /1 other quote/i }));
    expect(within(b).getByText("Sharma Glassworks")).toBeInTheDocument();
    expect(within(b).getByText("Lowest")).toBeInTheDocument();
  });

  test("approve / reject buttons appear only where the decision is this user's", async () => {
    await renderSheet();
    expect(within(cardFor("WINDOW A")).queryByRole("button", { name: /^approve$/i })).toBeNull();
    expect(within(cardFor("WINDOW B")).getByRole("button", { name: /^approve$/i })).toBeInTheDocument();
    expect(within(cardFor("WINDOW C")).getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
  });

  test("the card buttons drive the same decision flow as the matrix cells", async () => {
    await renderSheet();
    const bar = await screen.findByRole("region", { name: "Commercial evaluation decision" });
    expect(bar).toHaveTextContent("2 awaiting you");
    expect(within(bar).getByRole("button", { name: /review & confirm/i })).toBeDisabled();

    fireEvent.click(within(cardFor("WINDOW B")).getByRole("button", { name: /^approve$/i }));
    fireEvent.click(within(cardFor("WINDOW C")).getByRole("button", { name: /^reject$/i }));

    // Toggled state reads back on the buttons and in the bar.
    expect(within(cardFor("WINDOW B")).getByRole("button", { name: /approving/i })).toHaveAttribute("aria-pressed", "true");
    expect(within(cardFor("WINDOW C")).getByRole("button", { name: /rejecting/i })).toHaveAttribute("aria-pressed", "true");
    expect(bar).toHaveTextContent("1 approve · 1 reject");

    fireEvent.click(within(bar).getByRole("button", { name: /review & confirm · 2/i }));
    fireEvent.click(await screen.findByRole("button", { name: /confirm 2 decisions/i }));

    await waitFor(() => expect(approveNegotiationQuotes).toHaveBeenCalledTimes(1));
    expect(approveNegotiationQuotes.mock.calls[0][0]).toBe("8802");
    expect(rejectNegotiationQuotes).toHaveBeenCalledTimes(1);
    expect(rejectNegotiationQuotes.mock.calls[0][0]).toBe("8803");
  });

  test("tapping a decided card again un-selects it, like the matrix cell", async () => {
    await renderSheet();
    const b = cardFor("WINDOW B");
    fireEvent.click(within(b).getByRole("button", { name: /^approve$/i }));
    fireEvent.click(within(b).getByRole("button", { name: /approving/i }));
    expect(within(b).getByRole("button", { name: /^approve$/i })).toHaveAttribute("aria-pressed", "false");
  });

  test("'Approve all' in the bar marks every pending line", async () => {
    await renderSheet();
    const bar = await screen.findByRole("region", { name: "Commercial evaluation decision" });
    fireEvent.click(within(bar).getByRole("button", { name: /approve all/i }));
    expect(bar).toHaveTextContent("2 approve · 0 reject");
    expect(within(bar).getByRole("button", { name: /review & confirm · 2/i })).toBeEnabled();
  });

  test("the award banner's focus lands on the card", async () => {
    await renderSheet({ focusAwardToken: 1 });
    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(1));
    const target = document.getElementById(awardCellAnchorId(8802, METRO));
    expect(scrollSpy.mock.instances[0]).toBe(target);
    expect(cardFor("WINDOW B")).toContainElement(target);
    await waitFor(() => expect(target).toHaveTextContent(/your approval/i));
  });
});

describe("desktop keeps the matrix and the dock", () => {
  beforeEach(() => setViewport(false));

  test("no cards, no phone bar", async () => {
    const { container } = await renderSheet();
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.queryByTestId("qc-phone-card")).toBeNull();
    expect(screen.queryByRole("region", { name: "Commercial evaluation decision" })).toBeNull();
    expect(screen.getByRole("button", { name: /approve all pending/i })).toBeInTheDocument();
  });
});

// jsdom can't evaluate media queries, so pin the CSS contract textually.
describe("phone CSS contract", () => {
  const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
  const qc = read("components/dashboard/buyer/quoteComparison/QuoteComparison.module.scss");
  const phoneBlock = (css) => css.slice(css.lastIndexOf("@media (max-width: 768px)"));

  test("cards are hidden by default and only shown on phones", () => {
    expect(qc).toMatch(/\.phoneCards\s*{\s*display:\s*none;\s*}/);
    expect(phoneBlock(qc)).toMatch(/\.phoneCards\s*{\s*display:\s*flex;/);
  });

  test("decision, toggle and select buttons are 44px touch targets", () => {
    const phone = phoneBlock(qc);
    ["pcDecBtn", "pcToggle", "pcSelectBtn"].forEach((cls) => {
      const rule = phone.slice(phone.indexOf(`.${cls} {`));
      expect(rule.slice(0, rule.indexOf("}"))).toMatch(/min-height:\s*44px/);
    });
  });

  test("full-bleed pages cancel the shell's 16px phone padding", () => {
    const view = read("components/dashboard/buyer/manageRFQ/ViewRFQ.module.scss");
    [qc, view].forEach((css) => {
      const tablet = css.slice(css.indexOf("@media (max-width: 991px)"));
      expect(tablet).toMatch(/\.page\s*{\s*margin:\s*-16px;\s*}/);
    });
  });

  test("hover-only controls are visible on touch screens", () => {
    const touch = qc.slice(qc.indexOf("@media (hover: none)"));
    expect(touch.slice(0, touch.indexOf("}") + 1)).toMatch(/\.cellKebab,\s*\.cellSelectBtn\s*{\s*opacity:\s*1;/);
  });

  test("the approval trail is a bottom sheet on phones", () => {
    const rule = phoneBlock(qc).slice(phoneBlock(qc).indexOf(".apDrawer {"));
    const body = rule.slice(0, rule.indexOf("}"));
    expect(body).toMatch(/bottom:\s*0/);
    expect(body).toMatch(/width:\s*100%/);
  });

  test("the overall-cost table has its own horizontal scroller", () => {
    expect(qc).toMatch(/\.overallScroll\s*{\s*overflow-x:\s*auto;\s*}/);
  });

  test("RFQ approval card buttons out-rank the dashboard's 26px phone .btn rule", () => {
    const css = read("components/dashboard/buyer/rfq/RfqApprovalDecisionCard.module.css");
    const phone = css.slice(css.indexOf("@media (max-width: 768px)"));
    expect(phone).toMatch(/\.decisionBtns\.decisionBtns :global\(\.btn\)/);
    expect(phone).toMatch(/min-height:\s*44px/);
  });
});

// Scope audit #8: the phone cards dropped the desktop matrix's "via {org}" label for a
// vendor that quotes as part of a vendor network.
describe("phone: vendor network label", () => {
  beforeEach(() => setViewport(true));

  test("a networked vendor's card says 'via {org}', on the lead row and in the others list", async () => {
    const payload = viewPayload();
    payload.vendors = [
      { id: SHARMA, name: "Sharma Glassworks", short: "SG", org_name: "Sharma Group" },
      { id: METRO, name: "Metro Fittings", short: "MF", org_name: "Metro Network" },
    ];
    getQuoteComparisonView.mockResolvedValue(payload);
    await renderSheet();
    const b = cardFor("WINDOW B");
    const lead = b.querySelector(`#${awardCellAnchorId(8802, METRO)}`);
    expect(lead).toHaveTextContent("via Metro Network");
    fireEvent.click(within(b).getByRole("button", { name: /1 other quote/i }));
    expect(within(b).getByText("via Sharma Group")).toBeInTheDocument();
  });

  test("an absent quote's row carries the label too", async () => {
    const payload = viewPayload();
    payload.vendors = [
      { id: SHARMA, name: "Sharma Glassworks", short: "SG", org_name: "Sharma Group" },
      { id: METRO, name: "Metro Fittings", short: "MF" },
    ];
    payload.products[1].quotes = { [METRO]: quote(1620, METRO) };
    getQuoteComparisonView.mockResolvedValue(payload);
    await renderSheet();
    const b = cardFor("WINDOW B");
    fireEvent.click(within(b).getByRole("button", { name: /other/i }));
    expect(within(b).getByText("via Sharma Group")).toBeInTheDocument();
  });

  test("a vendor in no network gets no label", async () => {
    await renderSheet();
    expect(screen.queryByText(/^via /)).toBeNull();
  });
});
