// Approver rejections now carry reason_category: the pill names the reason.
jest.mock("@/services/rfq", () => ({ __esModule: true, getRfqListView: jest.fn(), deleteDraft: jest.fn() }));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, pathname: "/dashboard/buyer/rfq-management", push: jest.fn(), replace: jest.fn(), isReady: true }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 80011, name: "Test Buyer" } }),
}));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getRfqListView } from "@/services/rfq";
import RfqListPage from "./RfqListPage";

const REJ = {
  po_id: 9, po_number: "138733", rejection_type: "approver", reason_category: "RENEGOTIATE",
  rejected_by_name: "Vishal Kamat", rejected_at: "2026-09-11T07:43:06Z", rejection_reason: "go back to the vendors", rejected_po_count: 1,
};
const mkRow = (over = {}) => ({
  id: 719, rfq_no: 536263, title: "Cafeteria", status: 1, is_published: 1, is_tender: 0, bucket: "ongoing",
  status_key: "COMMERCIAL_EVALUATION", lifecycle_stage: "COMMERCIAL_EVALUATION", hotel_id: 6, hotel_name: "H", department_id: 9,
  department_title: "Eng", categories: [], products: [], vendors: [], timestamp: "2026-07-23T00:00:00Z", bid_end_date: "2026-07-24 17:30:00",
  invited_count: 2, submitted_count: 1, unseen_query_count: 0, is_finalized: 0, po_completed: 0, can_edit: false, is_quotes_present: 1,
  has_dead_end_product: 0, has_tech_stuck_product: 0, action_holders: { type: "evaluation", label: "Commercial Evaluators", users: [] },
  is_pending_for_me: false, pending_kind: null, pending_reasons: [], can_approve: false, approval_instance_id: null,
  approval_step_id: null, approval_entity_type: null, po_rejection: null, ...over,
});
const renderList = async (row) => {
  getRfqListView.mockResolvedValue({ status: 1, data: { rows: [row], facets: {}, tab_counts: { all: 1, pending: 0, drafts: 0, approval: 0, ongoing: 1, approved: 0, closed: 0, pending_breakdown: {} }, total: 1, page: 1, limit: 20 } });
  render(<RfqListPage />);
  await waitFor(() => expect(screen.getByText(`#${row.rfq_no}`)).toBeInTheDocument());
};
beforeEach(() => getRfqListView.mockReset());

describe("RfqListPage: approver rejection reason on the pill", () => {
  it("reads 'PO rejected: {reason}' when the reason is known", async () => {
    await renderList(mkRow({ po_rejection: REJ }));
    expect(screen.getByText("PO rejected: Re-negotiate or change the vendor")).toBeInTheDocument();
  });

  it("keeps the comment in the popover", async () => {
    await renderList(mkRow({ po_rejection: REJ }));
    fireEvent.mouseEnter(screen.getByText("Commercial Evaluation"));
    await waitFor(() => expect(screen.getByText(/go back to the vendors/)).toBeInTheDocument());
  });

  it("an old payload (no reason_category) still reads 'PO rejected'", async () => {
    const { reason_category, po_id, ...old } = REJ;
    await renderList(mkRow({ po_rejection: old }));
    expect(screen.getByText("PO rejected")).toBeInTheDocument();
  });

  it("a vendor rejection stays 'PO rejected' even if a reason slipped in", async () => {
    await renderList(mkRow({ po_rejection: { ...REJ, rejection_type: "vendor", reason_category: null } }));
    expect(screen.getByText("PO rejected")).toBeInTheDocument();
  });
});

describe("RfqListPage: the rejection pill beside the status", () => {
  it("names only the reason when the status already says the PO was rejected", async () => {
    await renderList(mkRow({ status_key: "PO_REJECTED", lifecycle_stage: "PO_REJECTED", po_rejection: REJ }));
    expect(screen.getByText("PO rejected by approver")).toBeInTheDocument();
    expect(screen.getByText("Re-negotiate or change the vendor")).toBeInTheDocument();
    expect(screen.queryByText("PO rejected: Re-negotiate or change the vendor")).toBeNull();
  });

  it("a PO cancelled as not needed reads as cancelled, never rejected", async () => {
    await renderList(mkRow({ po_rejection: { ...REJ, route: "CANCEL", reason_category: "NOT_REQUIRED" } }));
    const pill = screen.getByText("PO 138733 cancelled: not needed any more");
    expect(pill.getAttribute("title")).not.toMatch(/reject/i);
    fireEvent.mouseEnter(screen.getByText("Commercial Evaluation"));
    await waitFor(() => expect(screen.getByText(/go back to the vendors/)).toBeInTheDocument());
    expect(document.body.textContent).not.toMatch(/rejected by/i);
  });
});
