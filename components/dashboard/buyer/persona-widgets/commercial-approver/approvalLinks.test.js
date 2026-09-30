// The approver widgets used to link to /dashboard/buyer/approval, a route that
// does not exist (404). Each row now opens the page where the decision is made.

import fs from "fs";
import path from "path";
import { pendingApprovalHref, PO_AWAITING_HREF } from "./MyCommercialApprovalsPending";
import { awardApprovalHref } from "../awarding/MyAwardApprovalsPending";

jest.mock("@/services/dashboard", () => ({ __esModule: true }));

describe("approver widget links", () => {
  test("a pending PO approval opens that PO", () => {
    expect(pendingApprovalHref({ id: 91, po_id: 4410, rfq_id: 974 })).toBe(
      "/dashboard/buyer/purchase-orders/4410"
    );
  });

  test("without a PO id it falls back to the RFQ workspace's PO stage, then the PO dashboard", () => {
    expect(pendingApprovalHref({ rfq_id: 974 })).toBe(
      "/dashboard/buyer/rfq-management-details?type=buyer-view&id=974&stage=purchase-order&focus=approval"
    );
    expect(pendingApprovalHref({})).toBe(PO_AWAITING_HREF);
  });

  test("a pending vendor award opens the RFQ's Negotiation & Award stage on the decision", () => {
    expect(awardApprovalHref({ id: 7, rfq_id: 895 })).toBe(
      "/dashboard/buyer/rfq-management-details?type=buyer-view&id=895&stage=negotiation-award&focus=approval"
    );
    expect(awardApprovalHref({})).toBe("/dashboard/buyer/rfq-management");
  });

  test("no widget links to the non-existent /dashboard/buyer/approval route", () => {
    const dir = path.join(process.cwd(), "components/dashboard/buyer/persona-widgets");
    const files = [
      "commercial-approver/MyCommercialApprovalsPending.js",
      "commercial-approver/DealsWithPriceAnomalies.js",
      "awarding/MyAwardApprovalsPending.js",
    ];
    files.forEach((f) => {
      expect(fs.readFileSync(path.join(dir, f), "utf8")).not.toMatch(/\/dashboard\/buyer\/approval[?"'`]/);
    });
  });
});
