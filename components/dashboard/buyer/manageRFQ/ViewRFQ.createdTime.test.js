// ViewRFQ — the "Created" tile must show when the RFQ was created.
//
// Reported on RFQ 968 (prod). The buyer created it at 13:29 IST; the page said
// "03 Sep 26 · 03:00 PM". Their own screenshot contradicted it — the approval
// row directly above read "APPROVED · 03 Sep 2026, 01:29 pm", which cannot
// precede creation.
//
// Two separate defects, both confirmed against the row as stored:
//
//   timestamp            2026-09-03 07:59:37  (UTC)  -> 01:29 PM IST, the truth
//   tender_publish_date  2026-09-03 15:00:00  (IST)  -> 03:00 PM, what showed
//
// 1. WRONG FIELD. The label switched on `isTender`; the value switched on
//    whether a publish date existed. 651 of 757 non-tender RFQs in production
//    carry a scheduled tender_publish_date, so 86% of them showed that publish
//    time under a "Created" heading — average 80 minutes out, worst case four
//    days.
//
// 2. WRONG ZONE. The remaining 106 fell through to `data.timestamp`, which is a
//    naive UTC wall clock (dbConn.js returns OID 1114 as a raw string, so
//    nothing marks it). Parsed as local it renders 5h30m early: 07:59 AM.
//
// So no non-tender RFQ showed a correct creation time by either path.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "968" },
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(), push: jest.fn(), back: jest.fn(),
  }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 7, name: "Asha Menon" } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqLineage: jest.fn(() => Promise.resolve({ data: { copied_from: null, copies: [] } })),
  getTechEvalStatus: jest.fn(() => Promise.resolve({ data: null })),
  getRfqLifecycle: jest.fn(() => Promise.resolve({ data: { stages: [], action: null, approval_instances: [] } })),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
}));
jest.mock("@/services/approval", () => ({
  __esModule: true,
  submitApprovalAction: jest.fn(),
}));
jest.mock("@/hooks/useHasTechClauses", () => ({ __esModule: true, default: () => ({ hasClauses: false, loading: false }) }));
jest.mock("./RFQLifecycleJourneyV2", () => ({ __esModule: true, default: () => null }));
jest.mock("./RFQEditHistory/RFQEditHistory", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/TechnicalStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/NegotiationAwardStage", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/rfq/stages/PurchaseOrderStage", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ViewRFQ from "./ViewRFQ";

/** RFQ 968, exactly as tbl_rfq holds it and as the API hands it over. */
const RFQ_968 = {
  id: 968,
  rfq_no: "536506",
  title: "Laptop Requirement for KHIL Account Team",
  status: 1,
  is_published: 1,
  is_tender: 0,
  products: [],
  terms: [],
  company_name: "Kamat Hotels India Limited",
  timestamp: "2026-09-03 07:59:37.550847",   // UTC  -> 01:29 PM IST
  tender_publish_date: "2026-09-03 15:00:00", // IST  -> 03:00 PM
  vendor_clarification_date: "2026-09-03 16:30:00",
  bid_end_date: "2026-09-05 14:30",
};

const TRUE_CREATION = "03 Sep 26 · 01:29 PM";
const PUBLISH_TIME = "03 Sep 26 · 03:00 PM";
const NAIVE_LOCAL_READ = "03 Sep 26 · 07:59 AM";

/** The value cell sitting under a given detail label in the details grid. */
const valueUnder = (label) => {
  const key = screen
    .getAllByText(label)
    .find((n) => (n.className || "").includes("detailKey"));
  if (!key) throw new Error(`no detail labelled "${label}"`);
  return key.nextElementSibling.textContent.trim();
};

const renderRfq = async (over = {}) => {
  const view = render(<ViewRFQ data={{ ...RFQ_968, ...over }} isCreator={false} />);
  await screen.findByText("Buyer & inquiry details");
  return view;
};

beforeEach(() => jest.clearAllMocks());

describe("the Created tile on a normal RFQ", () => {
  test("shows when the RFQ was created, not when it was scheduled to publish", async () => {
    await renderRfq();
    const created = valueUnder("Created");

    expect(created).toBe(TRUE_CREATION);
    expect(created).not.toBe(PUBLISH_TIME);
  });

  test("reads the server timestamp as UTC, not as local wall clock", async () => {
    // The other half: with no publish date the old code fell through to
    // `moment(data.timestamp)`, 5h30m early.
    await renderRfq({ tender_publish_date: null });

    const created = valueUnder("Created");
    expect(created).toBe(TRUE_CREATION);
    expect(created).not.toBe(NAIVE_LOCAL_READ);
  });

  test("the buyer-entered deadlines are untouched — they really are IST", async () => {
    await renderRfq();
    // If these ever move, the fix has been applied to the wrong convention.
    expect(valueUnder("Quote deadline")).toBe("05 Sep 26 · 02:30 PM");
    expect(valueUnder("Clarification window")).toBe("03 Sep 26 · 04:30 PM");
  });
});

describe("the same tile on a tender", () => {
  test("is labelled Publish date and shows the publish date", async () => {
    await renderRfq({ is_tender: 1 });
    expect(valueUnder("Publish date")).toBe(PUBLISH_TIME);
    // The tile is re-labelled. (The page eyebrow still says "Created <date>"
    // for a tender — that one is the creation date and is correct.)
    expect(
      screen.queryAllByText("Created").filter((n) => (n.className || "").includes("detailKey"))
    ).toHaveLength(0);
  });

  test("shows no time at all when a tender has not been scheduled", async () => {
    // Falling back to the creation time here would be the same mislabelling
    // in reverse.
    await renderRfq({ is_tender: 1, tender_publish_date: null });
    expect(valueUnder("Publish date")).toBe("—");
  });
});
