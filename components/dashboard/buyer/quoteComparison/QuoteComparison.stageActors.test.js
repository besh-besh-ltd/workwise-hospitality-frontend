// QuoteComparison — the "who must act now" band above the comparison grid.
//
// The band exists because upper management could not tell, from this page, whose
// desk the award was sitting on. The roster strip further up the page shows
// three names and a "+4"; the per-product tag shows "Awaiting approval from 3
// persons". Neither names everyone, and naming everyone is the entire ask.
//
// So the cases below are the ones that would let it lie:
//
//   • seven evaluators — the "+4" must not come back
//   • is_me true / all false — the viewer must be told, in words, that it is
//     theirs, and must NOT be told that when it is not
//   • stage_actors null, and actors [] — two real server states (pre-deadline
//     redaction, and a stage with no live actor). Both render nothing; an empty
//     shell would be a claim the payload does not make
//   • is_me absent + two different users sharing one display name — the case a
//     name comparison gets wrong, and the reason this file compares user_id
//   • next present / next null
//
// Assertions go through roles and visible text. Nothing here reads a class
// name: the whole point of the band is what it SAYS.

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
import { render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import QuoteComparison from "./QuoteComparison";

const RFQ_ID = "720";
const SHARMA = 5512;

/* ── payload builders ──────────────────────────────────────────────────── */

const product = (over = {}) => ({
  id: 8801,
  name: "WINDOW A",
  qty: 10,
  unit: "nos",
  category: 1,
  state: "open",
  awaiting_me: false,
  finalized_vendor: null,
  finalized_by: null,
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
  approval: { current_approvers: [], trail: [] },
  ...over,
});

const payload = (stageActors) => ({
  rfq: { id: 720, rfq_no: "536264", title: "Window fittings", status: "OPEN", project_id: null },
  quotes_locked: false,
  bid_end_date: "2026-07-25T10:00:00.000Z",
  vendors: [{ id: SHARMA, name: "Sharma Glassworks", short: "SG" }],
  categories: [{ id: 1, name: "Fittings" }],
  products: [product()],
  approval_chain: [],
  has_delivery_charges: false,
  // Deliberately spread last so a fixture can pass `undefined` to model a build
  // of the server that predates the field entirely.
  stage_actors: stageActors,
});

const actor = (user_id, name, role, over = {}) => ({ user_id, name, role, ...over });

// The seven commercial evaluators of a real hotel's award committee — the
// roster size that produced the "+4" this band was asked to remove.
const SEVEN = [
  actor(401, "Kushal Shah", "Purchase Head", { is_me: false }),
  actor(402, "Asha Menon", "Finance Controller", { is_me: false }),
  actor(403, "Vineet Rathore", "F&B Manager", { is_me: false }),
  actor(404, "Prashant Joshi", "Projects", { is_me: false }),
  actor(405, "Nitin Rajenimbalkar", "Stores", { is_me: false }),
  actor(406, "Deepa Nair", "Engineering", { is_me: false }),
  actor(407, "Sanjay Roy", "General Manager", { is_me: false }),
];

const stageActors = (over = {}) => ({
  stage_label: "Negotiation & Award",
  role_label: "Commercial Evaluators",
  decision_rule: "ALL",
  actors: SEVEN,
  next: null,
  ...over,
});

const renderSheet = async (view) => {
  getQuoteComparisonView.mockResolvedValue(view);
  const utils = render(<QuoteComparison rfqId={RFQ_ID} embedded />);
  await waitFor(() => expect(getQuoteComparisonView).toHaveBeenCalled());
  await screen.findByText("WINDOW A");
  return utils;
};

// The band, reached the way assistive tech reaches it — through the region its
// own heading labels. Never through a class name.
const band = () =>
  screen.queryByRole("region", { name: /you are to take action|current action taker/i });

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

/* ── tests ─────────────────────────────────────────────────────────────── */

describe("QuoteComparison — who must act now", () => {
  it("names every one of seven action takers, with no +N overflow", async () => {
    await renderSheet(payload(stageActors()));

    const region = band();
    expect(region).toBeInTheDocument();

    // All seven, in full. This is the assertion the "+4" strip fails.
    for (const a of SEVEN) {
      expect(within(region).getByText(a.name)).toBeInTheDocument();
    }
    expect(within(region).getAllByRole("listitem")).toHaveLength(7);
    // No preview, no overflow counter, no ellipsis of any kind.
    expect(region).not.toHaveTextContent(/\+\s*\d/);
    expect(region).not.toHaveTextContent(/…|\.\.\./);

    // The stage and the role the reader needs to place those names.
    expect(within(region).getByText("Negotiation & Award")).toBeInTheDocument();
    expect(region).toHaveTextContent("Commercial Evaluators");
    // ALL vs ANY changes what a name in this list obliges you to do.
    expect(region).toHaveTextContent("All of them must act before it moves forward.");
  });

  it("says 'You are to take action' when is_me is true, and does not when every actor is false", async () => {
    const mine = SEVEN.map((a) => (a.user_id === 403 ? { ...a, is_me: true } : a));
    const { unmount } = await renderSheet(payload(stageActors({ actors: mine })));

    // In WORDS, not only in colour.
    expect(
      screen.getByRole("heading", { name: /you are to take action/i })
    ).toBeInTheDocument();
    const region = band();
    expect(region).toHaveTextContent("This is waiting on you and 6 others.");
    // …and the viewer is tagged inside the roster too, so it is obvious WHICH
    // of the seven names is theirs. Exactly one tag: the other six are not me.
    expect(within(region).getAllByText("You")).toHaveLength(1);
    const myChip = within(region).getByText("Vineet Rathore").closest("li");
    expect(within(myChip).getByText("You")).toBeInTheDocument();

    unmount();
    jest.clearAllMocks();

    // Nobody is me: the neutral heading, and the emphasis nowhere on the page.
    await renderSheet(payload(stageActors()));
    expect(screen.queryByText(/you are to take action/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /current action takers/i })
    ).toBeInTheDocument();
    expect(within(band()).queryByText("You")).not.toBeInTheDocument();
  });

  it("renders nothing when stage_actors is null, and nothing when the roster is empty", async () => {
    // Pre-deadline redaction, and a build with no such field at all.
    const { unmount } = await renderSheet(payload(null));
    expect(band()).not.toBeInTheDocument();
    expect(screen.queryByText(/current action taker/i)).not.toBeInTheDocument();

    unmount();
    jest.clearAllMocks();

    // A stage with no live actor. The labels are still there — and must not be
    // enough to draw an empty shell.
    await renderSheet(payload(stageActors({ actors: [] })));
    expect(band()).not.toBeInTheDocument();
    expect(screen.queryByText("Negotiation & Award")).not.toBeInTheDocument();
    expect(screen.queryByText("Commercial Evaluators")).not.toBeInTheDocument();
  });

  it("falls back to user_id when is_me is absent, and never matches on the display name", async () => {
    // Two different people, one display name. This tenant really does have
    // them, and it is precisely the case a name comparison gets wrong.
    const twins = [
      actor(402, "Asha Menon", "Finance Controller"),
      actor(913, "Asha Menon", "Purchase — North"),
      actor(401, "Kushal Shah", "Purchase Head"),
    ];
    // The signed-in user, from the app's own persisted profile: redux-persist
    // writes each whitelisted slice as its own JSON string under "persist:root".
    window.localStorage.setItem(
      "persist:root",
      JSON.stringify({ userProfile: JSON.stringify({ id: 913, name: "Asha Menon" }) })
    );

    const { unmount } = await renderSheet(
      payload(stageActors({ actors: twins, decision_rule: "ANY" }))
    );

    expect(screen.getByRole("heading", { name: /you are to take action/i })).toBeInTheDocument();
    const region = band();
    // Only ONE of the two Asha Menons is the viewer. A name match would tag both.
    expect(within(region).getAllByText("Asha Menon")).toHaveLength(2);
    expect(within(region).getAllByText("You")).toHaveLength(1);
    const tagged = within(region).getByText("Purchase — North").closest("li");
    expect(within(tagged).getByText("You")).toBeInTheDocument();
    const other = within(region).getByText("Finance Controller").closest("li");
    expect(within(other).queryByText("You")).not.toBeInTheDocument();
    expect(region).toHaveTextContent("Any one of them can act — the first decision moves it forward.");

    unmount();
    jest.clearAllMocks();

    // Same names, same payload, a DIFFERENT signed-in user who is not on the
    // roster at all. Nothing may claim to be them.
    window.localStorage.setItem(
      "persist:root",
      JSON.stringify({ userProfile: JSON.stringify({ id: 777, name: "Asha Menon" }) })
    );
    await renderSheet(payload(stageActors({ actors: twins, decision_rule: "ANY" })));
    expect(screen.queryByText(/you are to take action/i)).not.toBeInTheDocument();
    expect(within(band()).queryByText("You")).not.toBeInTheDocument();
  });

  it("shows who it goes to next when `next` is present, and omits that line when it is null", async () => {
    const { unmount } = await renderSheet(
      payload(
        stageActors({
          next: {
            stage_label: "Purchase Order",
            role_label: "Pending Approvers",
            actors: [actor(801, "Meera Iyer", "CFO"), actor(802, "Rohit Sen", "MD")],
          },
        })
      )
    );

    const region = band();
    expect(region).toHaveTextContent("Purchase Order");
    expect(region).toHaveTextContent("Pending Approvers");
    // The next stage's roster is named in full too — same rule, same reason.
    expect(within(region).getByText(/Meera Iyer, Rohit Sen/)).toBeInTheDocument();

    unmount();
    jest.clearAllMocks();

    await renderSheet(payload(stageActors()));
    const plain = band();
    expect(plain).toBeInTheDocument();
    expect(plain).not.toHaveTextContent(/Next:/);
    expect(plain).not.toHaveTextContent("Purchase Order");
  });
});
