// Approving a negotiation round FROM A PHONE.
//
// 1,881 round decisions in 90 days, 20% of them off-hours. On a 390px screen
// the Reject / Approve pair sat at the top of a long read-only review (and was
// pushed ~150px past the right edge by a no-wrap head row). The page now also
// renders the shared phone action bar, and its buttons must drive the SAME
// flow as the in-page ones: same modal, same withheld-lines payload, same
// "everything withheld" guard. jsdom cannot evaluate media queries, so the
// phone-only CSS is pinned textually at the bottom.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { rfqId: "601" },
    asPath: "/dashboard/buyer/negotiation/601/approve",
    pathname: "/dashboard/buyer/negotiation/[rfqId]/approve",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
  }),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationApprovalBundle: jest.fn(),
  approveNegotiationRound: jest.fn(),
  rejectNegotiationRound: jest.fn(),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  getQuoteComparison: jest.fn(),
  getQuoteComparisonView: jest.fn(),
  previewTotals: jest.fn(() => Promise.resolve({ data: { vendors: [] } })),
}));
jest.mock("@/services/rfq", () => ({ __esModule: true, getChargeNames: jest.fn() }));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import fs from "fs";
import path from "path";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import {
  getNegotiationApprovalBundle,
  approveNegotiationRound,
  rejectNegotiationRound,
} from "@/services/negotiation";
import { getQuoteComparison, getQuoteComparisonView } from "@/services/pricing";
import { getChargeNames } from "@/services/rfq";
import ApproveRoundPage from "./ApproveRoundPage";

const ROUND_ID = 914;
const LINE_A = 4501;
const LINE_B = 4502;
const VENDOR = 91;

const bundle = ({ pending = true } = {}) => ({
  rounds_history: [
    {
      id: ROUND_ID,
      round_number: 2,
      status: "PENDING_APPROVAL",
      end_date: "2026-08-13 07:00:00",
      created_at: "2026-08-12 07:05:35",
      created_by_name: "Asha Menon",
      rfq_product_id: null,
      product_names: [
        { rfq_product_id: LINE_A, product_name: "Bath towel 500gsm" },
        { rfq_product_id: LINE_B, product_name: "Hand towel 400gsm" },
      ],
      vendor_approvals: [{ vendor_id: VENDOR, status: "PENDING" }],
      products: [
        { rfq_product_id: LINE_A, vendor_targets: [{ vendor_id: VENDOR, fields: [{ name: "base_price", target: "90" }] }] },
        { rfq_product_id: LINE_B, vendor_targets: [{ vendor_id: VENDOR, fields: [{ name: "base_price", target: "45" }] }] },
      ],
    },
  ],
  negotiation_instances: {
    [String(ROUND_ID)]: [
      {
        id: 88,
        status: pending ? "PENDING" : "APPROVED",
        current_step: 1,
        can_user_approve: pending,
        steps: [
          {
            id: 900,
            step_order: 1,
            status: "PENDING",
            approvers: [{ id: 2, approver_user_id: 138, user_name: "Prashant Joshi", status: "PENDING" }],
          },
        ],
      },
    ],
  },
  negotiation_quote_instances: {},
});

const renderPage = async (opts) => {
  getNegotiationApprovalBundle.mockResolvedValue({ status: 1, data: bundle(opts) });
  getQuoteComparison.mockResolvedValue({ data: { products: [] } });
  getQuoteComparisonView.mockResolvedValue({ rfq: { number: 536147, title: "Housekeeping", company: "Phileein" } });
  getChargeNames.mockResolvedValue({ data: [] });
  approveNegotiationRound.mockResolvedValue({ status: 1, data: { published: true } });
  rejectNegotiationRound.mockResolvedValue({ status: 1 });
  const utils = render(<ApproveRoundPage />);
  await screen.findByText(opts?.pending === false ? /No rounds awaiting your approval/ : /Asha Menon/);
  return utils;
};

const phoneBar = () => screen.getByRole("region", { name: "Negotiation round decision" });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  jest.setSystemTime(new Date("2026-08-12T09:00:00.000Z"));
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  document.body.classList.remove("has-mobile-action-bar");
});

describe("the phone action bar on the negotiation approval page", () => {
  it("renders outside the page, naming the round and its line count", async () => {
    const { container } = await renderPage();
    const bar = phoneBar();
    expect(container).not.toContainElement(bar);
    expect(bar).toHaveTextContent("Round 2");
    expect(bar).toHaveTextContent("2 lines");
    expect(within(bar).getByRole("button", { name: /^approve$/i })).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
  });

  it("Approve opens the same confirmation modal and approves the same round", async () => {
    await renderPage();
    fireEvent.click(within(phoneBar()).getByRole("button", { name: /^approve$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /confirm approval/i }));
    await waitFor(() => expect(approveNegotiationRound).toHaveBeenCalledTimes(1));
    const [roundId, , , lines] = approveNegotiationRound.mock.calls[0];
    expect(roundId).toBe(ROUND_ID);
    expect(lines == null || lines.length === 0).toBe(true);
  });

  it("carries the lines withheld on the page into the approval", async () => {
    await renderPage();
    fireEvent.click(screen.getByLabelText(new RegExp(`withhold line ${LINE_B} for vendor ${VENDOR}`, "i")));
    expect(phoneBar()).toHaveTextContent("1 withheld");
    fireEvent.click(within(phoneBar()).getByRole("button", { name: /^approve$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /confirm approval/i }));
    await waitFor(() => expect(approveNegotiationRound).toHaveBeenCalledTimes(1));
    const [, , , lines] = approveNegotiationRound.mock.calls[0];
    expect(lines).toEqual([{ rfq_product_id: LINE_B, vendor_id: VENDOR, decision: "REJECTED" }]);
  });

  it("keeps the every-line-withheld guard", async () => {
    const { toast } = require("react-toastify");
    await renderPage();
    fireEvent.click(screen.getByLabelText(new RegExp(`withhold line ${LINE_A} for vendor ${VENDOR}`, "i")));
    fireEvent.click(screen.getByLabelText(new RegExp(`withhold line ${LINE_B} for vendor ${VENDOR}`, "i")));
    fireEvent.click(within(phoneBar()).getByRole("button", { name: /^approve$/i }));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/reject the round/i));
    expect(screen.queryByRole("button", { name: /confirm approval/i })).not.toBeInTheDocument();
    expect(approveNegotiationRound).not.toHaveBeenCalled();
  });

  it("Reject opens the rejection modal (reason required) and rejects the same round", async () => {
    await renderPage();
    fireEvent.click(within(phoneBar()).getByRole("button", { name: /^reject$/i }));
    const confirm = await screen.findByRole("button", { name: /confirm rejection/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Targets too aggressive" } });
    fireEvent.click(confirm);
    await waitFor(() => expect(rejectNegotiationRound).toHaveBeenCalledWith(ROUND_ID, "Targets too aggressive"));
  });

  it("marks the sticky dock for hiding on phones only while the bar replaces it", async () => {
    await renderPage();
    expect(document.querySelector("footer").className).toMatch(/footerPhoneHidden/);
  });

  it("renders no bar when nothing awaits this user", async () => {
    await renderPage({ pending: false });
    expect(screen.queryByRole("region", { name: "Negotiation round decision" })).not.toBeInTheDocument();
    expect(document.querySelector("footer").className).not.toMatch(/footerPhoneHidden/);
  });
});

describe("phone CSS contract (CreateRound.module.scss)", () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/buyer/negotiation/create-round/CreateRound.module.scss"),
    "utf8"
  );
  const phone = css.slice(css.lastIndexOf("@media (max-width: 768px)"));
  const desktop = css.slice(0, css.lastIndexOf("@media (max-width: 768px)"));

  it("stacks the round head and wraps the withhold rows at <=768px", () => {
    expect(phone).toMatch(/\.approveRoundHead\s*{\s*flex-direction:\s*column;/);
    expect(phone).toMatch(/\.approveRoundHeadMain\s*{\s*min-width:\s*0;/);
    expect(phone).toMatch(/\.approveRoundLine\s*{\s*flex-wrap:\s*wrap;\s*min-height:\s*44px;/);
  });

  it("hides the duplicate dock and lets the wizard stepper shrink on phones", () => {
    expect(phone).toMatch(/\.footerPhoneHidden\s*{\s*display:\s*none;/);
    expect(phone).toMatch(/\.stepperItem\s*{\s*flex:\s*0 1 auto;\s*min-width:\s*0;/);
  });

  it("adds no desktop rules for the phone-only hooks", () => {
    expect(desktop).not.toMatch(/\.(footerPhoneHidden|approveRoundHeadMain)\s*{/);
  });
});

describe("withhold-row target label", () => {
  it("shows the MRP tax-inclusive ask instead of 'undefined'", () => {
    const { fieldTargetLabel } = require("./ApproveRoundPage");
    expect(fieldTargetLabel({ name: "base_price", tax_demand: "590.4" })).toBe("base_price 590.4 (incl. tax)");
    expect(fieldTargetLabel({ name: "base_price", target: 500 })).toBe("base_price 500");
    expect(fieldTargetLabel({ name: "delivery_period" })).toBe("delivery_period");
  });
});
