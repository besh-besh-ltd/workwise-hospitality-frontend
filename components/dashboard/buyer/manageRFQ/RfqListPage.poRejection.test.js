// An RFQ that a PO rejection sent backwards has to say so on its card.
//
// RFQ 536263 (The Orchid Mumbai cafeteria, client ticket 2026-09-22) showed
// "PO Approval — pending Vishal Kamat" on 8 Sep and "Commercial Evaluation —
// Geetanand Shetty, Hitesh K Uchila, Prashant Joshi" on 16 Sep. In between,
// Vishal Kamat rejected both of its POs ("i want full plan of the full
// Ecoteria"), which de-finalized the products and returned the RFQ to
// commercial evaluation. The card never said so: it showed a different stage
// with different people on it, and the client concluded their approval matrix
// had changed.
//
// The list endpoint now returns `po_rejection` while the rejection still
// explains where the RFQ stands. The card shows it without a hover, and the
// stage popover — where the client was looking — says who, when and why.
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqListView: jest.fn(),
  deleteDraft: jest.fn(),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: {},
    pathname: "/dashboard/buyer/rfq-management",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
  }),
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

const REJECTION = {
  po_number: "138733",
  rejection_type: "approver",
  rejected_by_name: "Vishal Kamat",
  rejected_at: "2026-09-11T07:43:06Z",
  rejection_reason: "i want full plan of the outlet / Ecoteria with design and machinary etc total shown",
  rejected_po_count: 2,
};

const mkRow = (over = {}) => ({
  id: 719,
  rfq_no: 536263,
  title: "The Orchid Mumbai - Ecoteria ( Cafeteria ) Kitchen Equipment - Electric",
  status: 1,
  is_published: 1,
  is_tender: 0,
  bucket: "ongoing",
  status_key: "COMMERCIAL_EVALUATION",
  lifecycle_stage: "COMMERCIAL_EVALUATION",
  hotel_id: 6,
  hotel_name: "The Orchid Hotel Mumbai",
  department_id: 9,
  department_title: "Engineering",
  categories: [],
  products: [],
  vendors: [],
  timestamp: "2026-07-23T00:00:00Z",
  bid_end_date: "2026-07-24 17:30:00",
  invited_count: 21,
  submitted_count: 1,
  unseen_query_count: 0,
  is_finalized: 0,
  po_completed: 0,
  can_edit: false,
  is_quotes_present: 1,
  has_dead_end_product: 0,
  has_tech_stuck_product: 0,
  action_holders: {
    type: "evaluation",
    label: "Commercial Evaluators",
    users: [{ id: 924, name: "GEETANAND SHETTY" }, { id: 165, name: "Hitesh K Uchila" }],
  },
  is_pending_for_me: false,
  pending_kind: null,
  pending_reasons: [],
  can_approve: false,
  approval_instance_id: null,
  approval_step_id: null,
  approval_entity_type: null,
  po_rejection: null,
  ...over,
});

const mkResponse = (rows) => ({
  status: 1,
  data: {
    rows,
    facets: { status: [], buId: [], categoryId: [], departmentId: [], productId: [], vendorId: [] },
    tab_counts: { all: rows.length, pending: 0, drafts: 0, approval: 0, ongoing: rows.length, approved: 0, closed: 0,
      pending_breakdown: { approval: 0, response: 0, evaluation: 0 } },
    total: rows.length,
    page: 1,
    limit: 20,
  },
});

const renderList = async (rows) => {
  getRfqListView.mockResolvedValue(mkResponse(rows));
  const utils = render(<RfqListPage />);
  await waitFor(() => expect(screen.getByText(`#${rows[0].rfq_no}`)).toBeInTheDocument());
  return utils;
};

beforeEach(() => {
  getRfqListView.mockReset();
});

describe("RfqListPage — an RFQ sent back by a PO rejection", () => {
  it("marks the card as sent back, without needing a hover", async () => {
    await renderList([mkRow({ po_rejection: REJECTION })]);

    expect(screen.getByText(/PO rejected/i)).toBeInTheDocument();
  });

  it("says in the stage popover who rejected which PO, and why", async () => {
    await renderList([mkRow({ po_rejection: REJECTION })]);

    fireEvent.mouseEnter(screen.getByText("Commercial Evaluation"));

    await waitFor(() => expect(screen.getByText(/Vishal Kamat/)).toBeInTheDocument());
    expect(screen.getByText(/#138733/)).toBeInTheDocument();
    expect(screen.getByText(/i want full plan of the outlet/)).toBeInTheDocument();
  });

  it("says when more than one PO was rejected", async () => {
    await renderList([mkRow({ po_rejection: REJECTION })]);

    fireEvent.mouseEnter(screen.getByText("Commercial Evaluation"));

    await waitFor(() => expect(screen.getByText(/1 other PO/i)).toBeInTheDocument());
  });

  it("carries no marker when no rejection explains the RFQ's stage", async () => {
    await renderList([mkRow({ po_rejection: null })]);

    expect(screen.queryByText(/PO rejected/i)).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByText("Commercial Evaluation"));
    expect(screen.queryByText(/Vishal Kamat/)).not.toBeInTheDocument();
  });

  it("tolerates an older backend that does not send the field at all", async () => {
    // Frontend and backend ship separately; a card must not break in between.
    const row = mkRow();
    delete row.po_rejection;
    await renderList([row]);

    expect(screen.queryByText(/PO rejected/i)).not.toBeInTheDocument();
  });
});
