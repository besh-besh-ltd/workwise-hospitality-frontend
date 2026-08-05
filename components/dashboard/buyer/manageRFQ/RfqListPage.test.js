// RfqListPage — "Pending for me" grouping and per-kind row treatment.
//
// This page had ZERO tests. The contract locked in here is the one the client
// reported broken: a row where MY APPROVAL is required and a row where MY
// EVALUATION is required were rendering identically — same amber chip, same
// amber card border, same amber left bar, two words apart.
//
// Also defended: the approve CTA. It used to render only for RFQ-publish
// approvals, so quotation, technical and PO approvals showed an "approval"
// chip with no way to act and dumped the approver on a plain detail page. In
// production every genuine approval the reporting user held was a quotation
// approval, so he got a CTA on exactly none of them.

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

const mkRow = (over = {}) => ({
  id: 1,
  rfq_no: 900001,
  title: "ORCHID PASSAROS GOA - ROOM DOOR LOCKS",
  status: 1,
  is_published: 1,
  is_tender: 0,
  bucket: "ongoing",
  status_key: "COMMERCIAL_EVALUATION",
  lifecycle_stage: "COMMERCIAL_EVALUATION",
  hotel_id: 10,
  hotel_name: "Orchid Passaros Goa",
  department_id: 3,
  department_title: "Engineering",
  categories: [],
  products: [],
  vendors: [],
  timestamp: "2026-08-01T00:00:00Z",
  bid_end_date: "2026-08-10 12:00:00",
  invited_count: 4,
  submitted_count: 1,
  unseen_query_count: 0,
  is_finalized: 0,
  po_completed: 0,
  can_edit: 1,
  is_quotes_present: 0,
  has_dead_end_product: 0,
  has_tech_stuck_product: 0,
  action_holders: null,
  is_pending_for_me: true,
  pending_kind: "evaluation",
  pending_reasons: [{ kind: "evaluation", code: "COMMERCIAL_EVALUATION", label: "Commercial Evaluators", count: 1 }],
  can_approve: false,
  approval_instance_id: null,
  approval_step_id: null,
  approval_entity_type: null,
  ...over,
});

const mkResponse = (rows, breakdown = { approval: 0, response: 0, evaluation: 0 }) => ({
  status: 1,
  data: {
    rows,
    facets: { status: [], buId: [], categoryId: [], departmentId: [], productId: [], vendorId: [] },
    tab_counts: {
      all: rows.length,
      pending: rows.length,
      drafts: 0,
      approval: 0,
      ongoing: rows.length,
      approved: 0,
      closed: 0,
      pending_breakdown: breakdown,
    },
    total: rows.length,
    page: 1,
    limit: 20,
  },
});

/** Render and wait for the first list-view response to land. */
const renderList = async (response) => {
  getRfqListView.mockResolvedValue(response);
  const utils = render(<RfqListPage />);
  await waitFor(() => expect(getRfqListView).toHaveBeenCalled());
  return utils;
};

/** Switch to the "Pending for me" tab and wait for the refetch. */
const gotoPendingTab = async () => {
  const before = getRfqListView.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: /pending for me/i }));
  await waitFor(() => expect(getRfqListView.mock.calls.length).toBeGreaterThan(before));
};

beforeEach(() => {
  getRfqListView.mockReset();
});

// ===========================================================================

describe("RfqListPage — pending kinds are visually distinct", () => {
  it("an approval row gets the approval chip and the approval card tone", async () => {
    await renderList(mkResponse([mkRow({
      status_key: "QUOTATION_APPROVAL",
      pending_kind: "approval",
      can_approve: true,
      approval_entity_type: "NEGOTIATION_QUOTE",
      approval_instance_id: 55,
      pending_reasons: [{ kind: "approval", code: "QUOTATION_APPROVAL", label: "Your approval", count: 1, entity_type: "NEGOTIATION_QUOTE", instance_id: 55 }],
    })], { approval: 1, response: 0, evaluation: 0 }));

    const chip = await screen.findByText("Your approval");
    expect(chip).toHaveClass("needs-action-pill");
    expect(chip).toHaveClass("k-approval");
    expect(document.querySelector(".contract-card.needs-action.na-approval")).toBeTruthy();
  });

  it("an evaluation row gets the evaluation chip, NOT the approval tone", async () => {
    await renderList(mkResponse([mkRow()], { approval: 0, response: 0, evaluation: 1 }));

    const chip = await screen.findByText("Your evaluation");
    expect(chip).toHaveClass("k-evaluation");
    expect(chip).not.toHaveClass("k-approval");
    expect(document.querySelector(".contract-card.needs-action.na-approval")).toBeNull();
    expect(document.querySelector(".contract-card.needs-action.na-evaluation")).toBeTruthy();
  });

  it("a response row shows the server's own reason text and the response tone", async () => {
    await renderList(mkResponse([mkRow({
      pending_kind: "response",
      pending_reasons: [{ kind: "response", code: "UNREAD_VENDOR_QUERIES", label: "2 unread vendor queries", count: 2 }],
    })], { approval: 0, response: 1, evaluation: 0 }));

    const chip = await screen.findByText("2 unread vendor queries");
    expect(chip).toHaveClass("k-response");
    expect(document.querySelector(".contract-card.needs-action.na-response")).toBeTruthy();
  });

  it("a row with a secondary reason still shows it as an extra chip", async () => {
    await renderList(mkResponse([mkRow({
      pending_kind: "response",
      pending_reasons: [
        { kind: "response", code: "UNREAD_VENDOR_QUERIES", label: "1 unread vendor query", count: 1 },
        { kind: "evaluation", code: "COMMERCIAL_EVALUATION", label: "Commercial Evaluators", count: 1 },
      ],
    })], { approval: 0, response: 1, evaluation: 0 }));

    await screen.findByText("1 unread vendor query");
    const extra = screen.getByText("Commercial Evaluators");
    expect(extra).toHaveClass("pending-extra");
  });

  it("a row that is not pending for me gets no chip and no action tone", async () => {
    await renderList(mkResponse([mkRow({
      is_pending_for_me: false,
      pending_kind: null,
      pending_reasons: [],
    })], { approval: 0, response: 0, evaluation: 0 }));

    await screen.findByText(/ROOM DOOR LOCKS/i);
    expect(document.querySelector(".needs-action-pill")).toBeNull();
    expect(document.querySelector(".contract-card.needs-action")).toBeNull();
  });
});

// jsdom does not load the global stylesheet, so asserting a class NAME is on
// the card proves nothing about whether it renders differently — the first cut
// of this suite did exactly that and shipped three card classes with no CSS
// behind them. Assert against the stylesheet itself instead.
describe("RfqListPage — the kind classes are actually backed by CSS", () => {
  const css = require("fs").readFileSync(
    require("path").join(process.cwd(), "styles/arc_v2.css"),
    "utf8"
  );

  it.each([
    ["chip", ".needs-action-pill.k-approval"],
    ["chip", ".needs-action-pill.k-response"],
    ["card", ".contract-card.needs-action.na-approval"],
    ["card", ".contract-card.needs-action.na-response"],
    ["card", ".contract-card.needs-action.na-evaluation"],
    ["extra chip", ".pending-extra"],
    ["group heading", ".pending-group-head"],
  ])("%s rule %s exists in arc_v2.css", (_kind, selector) => {
    expect(css).toContain(selector);
  });

  it("each approval/response card rule carries its own left bar", () => {
    // The bar is what the eye actually reads down a long list. `.is-*` tone
    // rules are declared later in the file at equal specificity, so these must
    // be three classes deep to win the cascade.
    expect(css).toContain(".contract-card.needs-action.na-approval::before");
    expect(css).toContain(".contract-card.needs-action.na-response::before");
  });
});

/** Text of the first group heading's count chip (the tab strip also renders
 *  bare numbers, so a plain getByText is ambiguous). */
const groupCount = () => document.querySelector(".pending-group-head .n")?.textContent;

describe("RfqListPage — pending groups", () => {
  it("renders a heading per kind, with its server count", async () => {
    await renderList(mkResponse([
      mkRow({ id: 1, pending_kind: "approval", can_approve: true, approval_entity_type: "RFQ", pending_reasons: [{ kind: "approval", code: "RFQ_APPROVAL", label: "Your approval", count: 1 }] }),
      mkRow({ id: 2, pending_kind: "response", pending_reasons: [{ kind: "response", code: "CLARIFICATION_OPEN", label: "Clarification blocking all quotes", count: 1 }] }),
      mkRow({ id: 3, pending_kind: "evaluation" }),
    ], { approval: 1, response: 1, evaluation: 1 }));

    await gotoPendingTab();

    expect(await screen.findByText("Awaiting your approval")).toBeInTheDocument();
    expect(screen.getByText("Needs your response")).toBeInTheDocument();
    expect(screen.getByText("Awaiting your evaluation")).toBeInTheDocument();
  });

  it("omits a heading for a kind with no rows", async () => {
    await renderList(mkResponse([mkRow({ pending_kind: "evaluation" })], { approval: 0, response: 0, evaluation: 1 }));

    await gotoPendingTab();

    expect(await screen.findByText("Awaiting your evaluation")).toBeInTheDocument();
    expect(screen.queryByText("Awaiting your approval")).toBeNull();
    expect(screen.queryByText("Needs your response")).toBeNull();
  });

  it("says 'N of TOTAL' when the group straddles a page boundary", async () => {
    // The server paginates at 20 but pending_breakdown counts the whole tab.
    // Captioning 2 visible cards with the number 67 is exactly the kind of
    // vagueness this ticket exists to remove.
    await renderList(mkResponse(
      [mkRow({ id: 1 }), mkRow({ id: 2 })],
      { approval: 0, response: 0, evaluation: 67 }
    ));

    await gotoPendingTab();

    await screen.findByText("Awaiting your evaluation");
    expect(groupCount()).toBe("2 of 67");
  });

  it("shows a bare count when the whole group fits on the page", async () => {
    await renderList(mkResponse([mkRow({ id: 1 }), mkRow({ id: 2 })], { approval: 0, response: 0, evaluation: 2 }));

    await gotoPendingTab();

    await screen.findByText("Awaiting your evaluation");
    expect(groupCount()).toBe("2");
  });

  it("does NOT group the other tabs", async () => {
    await renderList(mkResponse([mkRow()], { approval: 0, response: 0, evaluation: 1 }));

    await screen.findByText(/ROOM DOOR LOCKS/i);
    expect(screen.queryByText("Awaiting your evaluation")).toBeNull();
  });

  it("shows a caught-up empty state, not the create-your-first-RFQ copy", async () => {
    await renderList(mkResponse([], { approval: 0, response: 0, evaluation: 0 }));

    await gotoPendingTab();

    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.queryByText(/create your first rfq/i)).toBeNull();
  });
});

// The whole card is role="link" and its accessible name contains the CTA text,
// so query the anchor itself rather than by role.
const approveCta = () => document.querySelector('a[title="Review and approve"]');

describe("RfqListPage — approval CTA routing", () => {
  const cases = [
    ["RFQ", "overview"],
    ["TENDER", "overview"],
    ["TECHNICAL", "technical"],
    ["NEGOTIATION_QUOTE", "negotiation-award"],
    ["PO", "purchase-order"],
  ];

  it.each(cases)("routes a %s approval to stage=%s with focus=approval", async (entityType, stage) => {
    await renderList(mkResponse([mkRow({
      status_key: "QUOTATION_APPROVAL",
      pending_kind: "approval",
      can_approve: true,
      approval_entity_type: entityType,
      approval_instance_id: 77,
      pending_reasons: [{ kind: "approval", code: "QUOTATION_APPROVAL", label: "Your approval", count: 1, entity_type: entityType }],
    })], { approval: 1, response: 0, evaluation: 0 }));

    await screen.findByText("Your approval");
    const cta = approveCta();
    expect(cta).toBeTruthy();
    expect(cta.getAttribute("href")).toContain(`stage=${stage}`);
    expect(cta.getAttribute("href")).toContain("focus=approval");
  });

  it("shows no approve CTA on an evaluation row", async () => {
    await renderList(mkResponse([mkRow()], { approval: 0, response: 0, evaluation: 1 }));

    await screen.findByText("Your evaluation");
    expect(approveCta()).toBeNull();
  });

  it("shows no approve CTA when I am not the approver", async () => {
    await renderList(mkResponse([mkRow({
      status_key: "QUOTATION_APPROVAL",
      pending_kind: "evaluation",
      can_approve: false,
      approval_entity_type: "NEGOTIATION_QUOTE",
    })], { approval: 0, response: 0, evaluation: 1 }));

    await screen.findByText("Your evaluation");
    expect(approveCta()).toBeNull();
  });
});
