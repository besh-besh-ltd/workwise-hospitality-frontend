// QuoteComparison — the approval trail drawer.
//
// Upper management and moderators open this drawer to answer three questions:
// who has already acted, who has it right now, and who is stuck behind them.
// No test opened it before this file, and the drawer it replaced answered only
// the first — a level with seven approvers showed one name and six grey chips
// with no state on any of them.
//
// The fixtures below are the shapes of four real stage approvals, because the
// cases that break this panel are all real ones:
//
//   234 — ALL, mid-flight, three approvers of whom TWO are removed tombstones.
//         The regression this file exists to prevent: saying "waiting on 3".
//   110 — ANY, already cleared, four approvers left at PENDING forever. Moot,
//         not blocked — the difference ANY vs ALL makes.
//    37 — ALL, rejected at L2 with a comment; two approvers never reached.
//    88 — ALL, four of five approvers removed and one approval: "1 of 1".
//
// Assertions go through roles and visible text. A collapsed level has to keep
// SAYING what it is waiting on, so a test that read a class name (or an
// aria-label the eye never sees) could pass while the drawer said nothing.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: {},
    asPath: "/dashboard/buyer/rfq-management-details?id=536264",
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
  default: () => ({ canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false }),
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

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import QuoteComparison from "./QuoteComparison";

const RFQ_ID = "720";
const SHARMA = 5512;

/* ── payload builders (mirroring quoteCompareViewModel.buildQuoteApprovalData) ── */

const initials = (name) =>
  String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const ap = (user_id, name, status, over = {}) => ({
  user_id,
  name,
  initials: initials(name),
  role: over.role ?? "Approver",
  status,
  acted_at: over.acted_at ?? null,
  removal_reason: over.removal_reason ?? null,
  removed_at: over.removed_at ?? null,
});

const sentNode = {
  key: "sent",
  status: "done",
  title: "Sent for approval",
  by: "Mukul Sharma",
  initials: "MS",
  role: null,
  when: "2026-06-10T09:00:00.000Z",
  reason: null,
  approvers: [],
};
const forwardNode = {
  key: "forward",
  kind: "terminal",
  status: "pending",
  title: "Forwarded to the next stage",
  note: "Once all approvals are complete",
  by: null,
  initials: "",
  role: null,
  when: null,
  reason: null,
  approvers: [],
};

// `decision_rule` rides on step nodes only — the terminal nodes are not
// approval steps and deliberately carry no rule.
const stepNode = (order, status, decision_rule, approvers, over = {}) => ({
  key: `step-${order}`,
  status,
  title: `L${order} approval`,
  by: over.by ?? null,
  initials: "",
  role: null,
  when: over.when ?? null,
  reason: over.reason ?? null,
  decision_rule,
  approvers,
});

const product = (over = {}) => ({
  id: 8801,
  name: "WINDOW A",
  qty: 10,
  unit: "nos",
  category: 1,
  state: "pending",
  awaiting_me: false,
  finalized_vendor: SHARMA,
  finalized_by: { name: "Nitin Rajenimbalkar", at: "2026-07-31T10:00:00.000Z", comment: null },
  negotiation: null,
  quoted_count: 1,
  quotes: {
    [SHARMA]: {
      base: 1000,
      subtotal: 10000,
      tax_amt: 1800,
      delivery_charges: 0,
      total: 11800,
      other_charges: [],
      history: [],
      negotiation: null,
      finalize: { vendor_id: SHARMA, quote_id: 1, quote_item_id: 1, unit_price: 1000, total_value: 0, charges_meta: {} },
    },
  },
  approval: { current_approvers: [{ name: "Vineet II" }], trail: [] },
  ...over,
});

const payload = (products) => ({
  rfq: { id: 720, rfq_no: "536264", title: "Window fittings", status: "OPEN", project_id: null },
  quotes_locked: false,
  bid_end_date: "2026-07-25T10:00:00.000Z",
  vendors: [{ id: SHARMA, name: "Sharma Glassworks", short: "SG" }],
  categories: [{ id: 1, name: "Fittings" }],
  products,
  approval_chain: [],
  has_delivery_charges: false,
});

const renderSheet = async (view) => {
  getQuoteComparisonView.mockResolvedValue(view);
  const utils = render(<QuoteComparison rfqId={RFQ_ID} embedded />);
  await waitFor(() => expect(getQuoteComparisonView).toHaveBeenCalled());
  await screen.findByText("WINDOW A");
  return utils;
};

// Opens the drawer the way a reader does: the item column's state tag.
const openDrawer = async (trail, productOver = {}) => {
  await renderSheet(payload([product({ ...productOver, approval: { current_approvers: [{ name: "Vineet II" }], trail } })]));
  const tags = screen.getAllByRole("button", { name: /Awaiting approval|Approved|Rejected/ });
  fireEvent.click(tags[tags.length - 1]);
  return screen.getByRole("dialog", { name: /approval trail/i });
};

const levelBtn = (n) => screen.getByRole("button", { name: new RegExp(`^L${n}\\b`) });
// The level's roster, reached the way assistive tech reaches it: through the
// toggle's own aria-controls. Nothing here knows a class name.
const bodyOf = (btn) => document.getElementById(btn.getAttribute("aria-controls"));

/* ── fixtures ───────────────────────────────────────────────────────────── */

// Three levels: L1 cleared under ANY, L2 live under ALL, L3 not reached yet.
const LIVE_TRAIL = [
  sentNode,
  stepNode(1, "done", "ANY", [
    ap(401, "Kushal Shah", "APPROVED", { acted_at: "2026-06-11 10:00:00" }),
    ap(402, "Asha Menon", "PENDING"),
  ], { when: "2026-06-11 10:00:00" }),
  stepNode(2, "current", "ALL", [
    ap(411, "Vineet One", "APPROVED", { acted_at: "2026-06-12 09:00:00" }),
    ap(412, "Vineet II", "PENDING"),
    ap(413, "Sarvesh Rao", "REMOVED", { removal_reason: "policy_change", removed_at: "2026-06-12 08:00:00" }),
  ]),
  stepNode(3, "pending", "ALL", [ap(421, "Ravi Kumar", "PENDING"), ap(422, "Meera Iyer", "PENDING")]),
  forwardNode,
];

// Instance 234: ALL, mid-flight, exactly one live approver behind two tombstones.
const TRAIL_234 = [
  sentNode,
  stepNode(1, "current", "ALL", [
    ap(431, "Sarvesh Rao", "REMOVED", { removal_reason: "policy_change", removed_at: "2026-06-12 08:00:00" }),
    ap(432, "Vineet One", "REMOVED", { removal_reason: "role_removed", removed_at: "2026-06-12 08:05:00" }),
    ap(433, "Vineet II", "PENDING"),
  ]),
  forwardNode,
];

// Instance 110: ANY, closed. Four approvers sit at PENDING for good.
const TRAIL_110 = [
  sentNode,
  stepNode(1, "done", "ANY", [
    ap(441, "Prashant Joshi", "APPROVED", { acted_at: "2026-06-11 11:00:00" }),
    ap(442, "Asha Menon", "PENDING"),
    ap(443, "Ravi Kumar", "PENDING"),
    ap(444, "Meera Iyer", "PENDING"),
    ap(445, "Kushal Shah", "PENDING"),
  ], { when: "2026-06-11 11:00:00" }),
  { key: "completed", kind: "terminal", status: "done", title: "Approval complete", note: "Forwarded to the next stage", by: null, initials: "", role: null, when: null, reason: null, approvers: [] },
];

// Instance 37: ALL, rejected at L2 with a comment; two approvers never reached.
const TRAIL_37 = [
  sentNode,
  stepNode(1, "done", "ALL", [ap(451, "Kushal Shah", "APPROVED", { acted_at: "2026-06-11 10:00:00" })], { when: "2026-06-11 10:00:00" }),
  stepNode(2, "rejected", "ALL", [
    ap(452, "Asha Menon", "APPROVED", { acted_at: "2026-06-12 09:00:00" }),
    ap(453, "Prashant Joshi", "REJECTED", { acted_at: "2026-06-12 10:00:00" }),
    ap(454, "Ravi Kumar", "PENDING"),
    ap(455, "Meera Iyer", "PENDING"),
  ], { when: "2026-06-12 10:00:00", reason: "Quote can be much lesser, please negotiate more." }),
];

// Instance 88: ALL, four of five approvers removed, one approval.
const TRAIL_88 = [
  sentNode,
  stepNode(1, "done", "ALL", [
    ap(461, "Kushal Shah", "APPROVED", { acted_at: "2026-06-11 10:00:00" }),
    ap(462, "Asha Menon", "REMOVED", { removal_reason: "role_removed", removed_at: "2026-06-10 10:00:00" }),
    ap(463, "Ravi Kumar", "REMOVED", { removal_reason: "role_removed", removed_at: "2026-06-10 10:00:00" }),
    ap(464, "Meera Iyer", "REMOVED", { removal_reason: "policy_change", removed_at: "2026-06-10 10:00:00" }),
    ap(465, "Sarvesh Rao", "REMOVED", { removal_reason: "policy_change", removed_at: "2026-06-10 10:00:00" }),
  ], { when: "2026-06-11 10:00:00" }),
];

beforeEach(() => {
  jest.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

/* ── tests ──────────────────────────────────────────────────────────────── */

describe("approval trail — which level is open", () => {
  it("opens the level that needs someone right now and leaves the rest shut", async () => {
    await openDrawer(LIVE_TRAIL);

    expect(levelBtn(1)).toHaveAttribute("aria-expanded", "false");
    expect(levelBtn(2)).toHaveAttribute("aria-expanded", "true");
    expect(levelBtn(3)).toHaveAttribute("aria-expanded", "false");
  });

  it("a shut level is not just hidden — its roster is out of the document", async () => {
    await openDrawer(LIVE_TRAIL);

    // L3's people are behind a closed level; L2's are not.
    expect(screen.queryByText("Ravi Kumar")).not.toBeInTheDocument();
    expect(screen.getByText("Vineet II")).toBeInTheDocument();
  });

  it("opens the level a rejection ended on — that is where the reason is", async () => {
    await openDrawer(TRAIL_37, { state: "rejected" });

    expect(levelBtn(2)).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Quote can be much lesser, please negotiate more\./)).toBeInTheDocument();
  });
});

describe("approval trail — outstanding before acted", () => {
  it("puts the people a level is waiting on above the people who have acted", async () => {
    await openDrawer(LIVE_TRAIL);
    const body = bodyOf(levelBtn(2));

    expect(within(body).getByText("Waiting on (1)")).toBeInTheDocument();
    expect(within(body).getByText("Already acted (1)")).toBeInTheDocument();
    // Reading order, which is the whole point of the grouping.
    const text = body.textContent;
    expect(text.indexOf("Waiting on (1)")).toBeLessThan(text.indexOf("Already acted (1)"));
    expect(text.indexOf("Vineet II")).toBeLessThan(text.indexOf("Vineet One"));
  });

  it("names the outstanding group after the level, not the person", async () => {
    // On a level nobody has reached yet, "waiting on" would be a lie: they have
    // not been asked. Open L3 and check it says so.
    await openDrawer(LIVE_TRAIL);
    fireEvent.click(levelBtn(3));
    const body = bodyOf(levelBtn(3));

    expect(within(body).getByText("Not yet acted (2)")).toBeInTheDocument();
    expect(within(body).queryByText(/^Waiting on/)).not.toBeInTheDocument();
  });
});

describe("approval trail — removed approvers are never live", () => {
  it("shows two tombstones with their reasons and waits on the one live approver", async () => {
    // Instance 234. The old drawer would have said this level had 3 approvers.
    await openDrawer(TRAIL_234);
    const btn = levelBtn(1);
    const body = bodyOf(btn);

    // The fraction counts the ONE approver still standing.
    expect(btn).toHaveTextContent("0 of 1 approved");
    expect(btn).toHaveTextContent("2 removed");
    expect(btn).not.toHaveTextContent("of 3 approved");

    expect(within(body).getByText("Waiting on (1)")).toBeInTheDocument();
    expect(within(body).getByText("Removed (2)")).toBeInTheDocument();
    // Both reasons, spelled out — never colour or opacity alone.
    expect(within(body).getByText("Removed · Role Change")).toBeInTheDocument();
    expect(within(body).getByText("Removed · Policy Change")).toBeInTheDocument();
  });

  it("a level of one approval and four tombstones reads 1 of 1", async () => {
    await openDrawer(TRAIL_88, { state: "approved" });
    const btn = levelBtn(1);

    expect(btn).toHaveTextContent("1 of 1 approved");
    expect(btn).toHaveTextContent("4 removed");
    expect(btn).toHaveTextContent("Cleared");
  });

  it("keeps the tombstones below everyone still in the chain", async () => {
    await openDrawer(TRAIL_88, { state: "approved" });
    fireEvent.click(levelBtn(1));
    const text = bodyOf(levelBtn(1)).textContent;

    expect(text.indexOf("Already acted (1)")).toBeLessThan(text.indexOf("Removed (4)"));
  });
});

describe("approval trail — ANY means moot, not blocked", () => {
  it("calls the untouched approvers of a cleared ANY level not required", async () => {
    // Instance 110: four people stored PENDING forever on a step that closed.
    await openDrawer(TRAIL_110, { state: "approved" });
    const btn = levelBtn(1);

    expect(btn).toHaveTextContent("any one approves");
    // One approval was all it needed, and it got one.
    expect(btn).toHaveTextContent("1 of 1 approved");
    expect(btn).toHaveTextContent("4 not required");
    expect(btn).not.toHaveTextContent("waiting on");

    fireEvent.click(btn);
    const body = bodyOf(btn);
    expect(within(body).getByText("Not required (4)")).toBeInTheDocument();
    expect(within(body).queryByText(/^Waiting on/)).not.toBeInTheDocument();
    expect(within(body).getAllByText("Not required").length).toBe(4);
  });

  it("counts every approver of an ALL level, because every one of them blocks", async () => {
    await openDrawer(LIVE_TRAIL);

    expect(levelBtn(3)).toHaveTextContent("all must approve");
    expect(levelBtn(3)).toHaveTextContent("0 of 2 approved");
  });
});

describe("approval trail — a shut level still answers for itself", () => {
  it("keeps the rule, the fraction and who it waits on in visible text", async () => {
    await openDrawer(LIVE_TRAIL);
    const btn = levelBtn(2);

    fireEvent.click(btn);                        // collapse the live level
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(btn).toHaveTextContent("all must approve");
    expect(btn).toHaveTextContent("1 of 2 approved");
    expect(btn).toHaveTextContent("1 removed");
    expect(btn).toHaveTextContent("waiting on Vineet II");
    expect(btn).toHaveTextContent("Reviewing now");
  });

  it("says what a future level is blocked behind", async () => {
    await openDrawer(LIVE_TRAIL);

    expect(levelBtn(3)).toHaveTextContent("blocked until L2 clears");
    expect(levelBtn(3)).toHaveTextContent("Waiting");
  });

  it("says when a settled level cleared", async () => {
    await openDrawer(LIVE_TRAIL);

    expect(levelBtn(1)).toHaveTextContent("cleared 11 Jun 2026");
  });
});

// The drawer's one instant format, as the milestone line has always written it:
// "11 Jun 2026 · 10:00 AM". Matched as a shape rather than a literal so these
// stay true in any timezone the suite runs under.
const DATE_AND_TIME = /\d{2} [A-Z][a-z]{2} \d{4} · \d{2}:\d{2} (AM|PM)/;

describe("approval trail — when, not just what day", () => {
  // The reader opens this drawer mid-approval to answer "when exactly did this
  // person clear it?" — against a bid deadline, or against the other approvals
  // on the same level. Approver rows and the level summary used to print the
  // date alone, so several approvals on one busy day were indistinguishable
  // while the milestone line two rows above them carried the full instant.

  it("stamps an approver who acted with the time of day, not just the date", async () => {
    await openDrawer(LIVE_TRAIL);
    const body = bodyOf(levelBtn(2));

    // Vineet One cleared L2 at 09:00 on 12 Jun.
    expect(within(body).getByText("12 Jun 2026 · 09:00 AM")).toBeInTheDocument();
    expect(within(body).queryByText("12 Jun 2026")).not.toBeInTheDocument();
  });

  it("tells two approvals on the same date apart", async () => {
    // Instance 37: Asha cleared L2 at 09:00 and Prashant rejected it at 10:00,
    // the same morning. On a date-only stamp both rows read "12 Jun 2026" and
    // the order of events is gone.
    await openDrawer(TRAIL_37, { state: "rejected" });
    const body = bodyOf(levelBtn(2));

    expect(within(body).getByText("12 Jun 2026 · 09:00 AM")).toBeInTheDocument();
    expect(within(body).getByText("12 Jun 2026 · 10:00 AM")).toBeInTheDocument();
  });

  it("says when a settled level cleared, to the minute", async () => {
    await openDrawer(LIVE_TRAIL);

    expect(levelBtn(1)).toHaveTextContent("cleared 11 Jun 2026 · 10:00 AM");
  });

  it("stamps a tombstone with the time it was removed", async () => {
    // Instance 234's two removals are five minutes apart — which of the two
    // reconciler passes voided which approver is only readable with the time.
    await openDrawer(TRAIL_234);
    const body = bodyOf(levelBtn(1));

    expect(within(body).getByText("12 Jun 2026 · 08:00 AM")).toBeInTheDocument();
    expect(within(body).getByText("12 Jun 2026 · 08:05 AM")).toBeInTheDocument();
  });

  it("writes an approver's instant in the same format as the 'Sent for approval' line", async () => {
    // One format on one panel: the milestone line at the top is the reference
    // the client already reads correctly, and the rows below it must not
    // describe the same kind of fact a second way.
    const drawer = await openDrawer(LIVE_TRAIL);
    const milestone = within(drawer).getByText("Sent for approval").parentElement;

    expect(milestone.textContent).toMatch(DATE_AND_TIME);
    expect(within(bodyOf(levelBtn(2))).getAllByText(DATE_AND_TIME).length).toBeGreaterThan(0);
  });
});

describe("approval trail — the summary", () => {
  it("counts levels, and does not count 'Sent for approval' as one of them", async () => {
    await openDrawer(LIVE_TRAIL);

    expect(screen.getByText("1 of 3 levels cleared")).toBeInTheDocument();
    expect(screen.getByText(/Now with Vineet II/)).toBeInTheDocument();
  });

  it("says who it is with, not just how far along it is", async () => {
    await openDrawer(TRAIL_234);

    // One live approver of three rows — the tombstones are not in the sentence.
    expect(screen.getByText("Now with Vineet II")).toBeInTheDocument();
    expect(screen.getByText("0 of 1 level cleared")).toBeInTheDocument();
  });

  it("names the outcome when there is nobody to be with", async () => {
    await openDrawer(TRAIL_37, { state: "rejected" });

    expect(screen.getByText("Rejected at L2")).toBeInTheDocument();
  });

  it("says the approval is complete once it is", async () => {
    await openDrawer(TRAIL_110, { state: "approved" });

    // Twice over, and deliberately: the headline says it, and the trail's own
    // terminal node is still there to be read in place.
    expect(screen.getAllByText("Approval complete").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Now with/)).not.toBeInTheDocument();
  });
});

describe("approval trail — nothing to show", () => {
  it("renders an empty state rather than a 0 of 0 fraction", async () => {
    // Before the bid deadline the shaper blanks approval wholesale:
    // p.approval = { current_approvers: [], trail: [] }.
    await openDrawer([]);

    expect(screen.getByText("No approval activity yet for this item.")).toBeInTheDocument();
    expect(screen.queryByText(/levels cleared/)).not.toBeInTheDocument();
  });
});

describe("approval trail — keyboard and screen reader", () => {
  it("the toggle is a real button: tab reaches it, Enter works it", async () => {
    const user = userEvent.setup();
    await openDrawer(LIVE_TRAIL);
    const btn = levelBtn(1);

    btn.focus();
    expect(btn).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(btn).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("the toggle points at the roster it opens", async () => {
    await openDrawer(LIVE_TRAIL);
    const btn = levelBtn(2);

    const id = btn.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id)).not.toBeNull();
  });

  it("the drawer is named by its own heading", async () => {
    const drawer = await openDrawer(LIVE_TRAIL);

    expect(drawer).toHaveAttribute("aria-labelledby");
    const heading = document.getElementById(drawer.getAttribute("aria-labelledby"));
    expect(heading).toHaveTextContent("Approval trail");
  });

  it("takes focus on open and gives it back on Escape", async () => {
    await renderSheet(payload([product({ approval: { current_approvers: [{ name: "Vineet II" }], trail: LIVE_TRAIL } })]));
    const tags = screen.getAllByRole("button", { name: /Awaiting approval/ });
    const trigger = tags[tags.length - 1];

    trigger.focus();
    fireEvent.click(trigger);
    const drawer = screen.getByRole("dialog", { name: /approval trail/i });
    expect(drawer.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
