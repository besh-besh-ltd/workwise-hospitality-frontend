// Activity — the company trail.
//
// The screen's job is to be read quickly and believed, so these tests pin the
// properties that make it believable rather than merely functional: filters
// that survive a Back, live entries that do not move the page under someone
// mid-sentence, reconstructed history that admits what it is, and actor kinds
// that are not flattened into "user".

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

const mockPush = jest.fn();
let mockQuery = {};
// `isReady` is modelled because the real router does not populate `query`
// until after hydration. Omitting it here is what let a cold load with a
// filter in the URL fetch an unfiltered feed and render it — a shared link to
// ?severity=critical showed everything, with the tile visibly pressed above a
// list that contradicted it.
let mockIsReady = true;
jest.mock("next/router", () => ({
  useRouter: () => ({ query: mockQuery, isReady: mockIsReady, push: mockPush }),
}));

jest.mock("@/services/activity", () => ({
  getActivity: jest.fn(),
  getActivityFacets: jest.fn(),
  getActivityChanges: jest.fn(),
}));

let streamHandler = null;
jest.mock("@/hooks/useActivityStream", () => ({
  __esModule: true,
  default: (handler) => {
    streamHandler = handler;
  },
}));

import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getActivity, getActivityFacets, getActivityChanges } from "@/services/activity";
import ActivityPage from "./ActivityPage";

const NOW = new Date();
const iso = (minsAgo) => new Date(NOW.getTime() - minsAgo * 60000).toISOString();

const EVENTS = [
  {
    id: 3,
    occurred_at: iso(5),
    summary: "Priya approved purchase order 138800",
    severity: "critical",
    category: "Approvals",
    actor_type: "USER",
    actor_label: "Priya",
    hotel_id: 10101,
    is_reconstructed: false,
    request_id: "req-1",
  },
  {
    id: 2,
    occurred_at: iso(40),
    summary: "Surya Enterprises submitted a quote for RFQ 536445",
    severity: "critical",
    category: "Quoting",
    actor_type: "VENDOR",
    actor_label: "Surya Enterprises",
    is_reconstructed: false,
  },
  {
    id: 4,
    occurred_at: iso(90),
    summary: "Workwise staff (Support) opened Priya Sharma's account",
    severity: "notable",
    category: "Workwise Access",
    actor_type: "WORKWISE_STAFF",
    actor_label: "Support",
    is_reconstructed: false,
  },
  {
    id: 1,
    occurred_at: iso(60 * 30),
    summary: "RFQ 536462 was published automatically at its scheduled time",
    severity: "notable",
    category: "Sourcing",
    actor_type: "SYSTEM",
    actor_label: "System",
    is_reconstructed: true,
  },
];

const FACETS = {
  categories: [{ category: "Approvals", count: 12 }],
  actors: [{ actor_user_id: 467, actor_label: "Priya", count: 9 }],
  units: [{ hotel_id: 10101, hotel_name: "The Orchid Pune", count: 5 }],
  entityTypes: [],
};

beforeEach(() => {
  mockPush.mockReset();
  mockQuery = {};
  mockIsReady = true;
  streamHandler = null;
  getActivity.mockReset().mockResolvedValue({ data: { rows: EVENTS, total: 3 } });
  getActivityFacets.mockReset().mockResolvedValue({ data: FACETS });
  getActivityChanges.mockReset().mockResolvedValue({ data: { event: EVENTS[0], changes: [] } });
});

describe("the feed", () => {
  it("shows what happened, in the sentence the trail recorded", async () => {
    render(<ActivityPage />);
    expect(
      await screen.findByText("Priya approved purchase order 138800")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Surya Enterprises submitted a quote for RFQ 536445")
    ).toBeInTheDocument();
  });

  it("groups by day rather than printing a date on every line", async () => {
    render(<ActivityPage />);
    expect(await screen.findByText("Today")).toBeInTheDocument();
  });

  it("labels importance in words, not colour alone", async () => {
    // A feed of coloured dots is unreadable to a large minority of people and
    // unprintable for everyone.
    render(<ActivityPage />);
    await screen.findByText("Priya approved purchase order 138800");
    expect(screen.getAllByText("Critical").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Notable").length).toBeGreaterThan(0);
  });

  it("distinguishes a vendor and the system from company staff", async () => {
    // A vendor is a counterparty, not staff, and the scheduler is not a person.
    render(<ActivityPage />);
    await screen.findByText("Priya approved purchase order 138800");

    // Scoped to the feed: the filter rail also lists every actor kind, and
    // matching there would prove nothing about how a row renders.
    const feed = within(screen.getAllByRole("list")[0]);
    expect(feed.getByText("Vendor")).toBeInTheDocument();

    const lists = screen.getAllByRole("list");
    const systemRow = lists
      .map((l) => within(l))
      .find((l) => l.queryByText("System"));
    expect(systemRow).toBeDefined();
  });

  it("admits when a line was reconstructed rather than recorded", async () => {
    render(<ActivityPage />);
    await screen.findByText("Priya approved purchase order 138800");
    expect(screen.getByText("Reconstructed")).toBeInTheDocument();
  });

  it("says so plainly when nothing matches", async () => {
    getActivity.mockResolvedValue({ data: { rows: [], total: 0 } });
    render(<ActivityPage />);
    expect(await screen.findByText(/nothing matches/i)).toBeInTheDocument();
  });

  it("reports a failed load instead of looking empty", async () => {
    getActivity.mockRejectedValue(new Error("network"));
    render(<ActivityPage />);
    expect(await screen.findByText(/could not load activity/i)).toBeInTheDocument();
  });
});

describe("filters", () => {
  it("puts the filter in the URL, so the view can be shared and Back works", async () => {
    render(<ActivityPage />);
    await screen.findByText("Priya approved purchase order 138800");

    fireEvent.click(screen.getByRole("button", { name: /Critical$/ }));

    expect(mockPush).toHaveBeenCalledWith(
      { pathname: "/dashboard/admin/activity", query: { severity: "critical" } },
      undefined,
      { shallow: true }
    );
  });

  it("waits for the router before asking the server for anything", async () => {
    // Next.js leaves router.query empty until hydration. Fetching on mount
    // therefore asks for an UNFILTERED feed and renders it: a shared link to
    // ?severity=critical showed everything, with the tile visibly pressed
    // above a list that contradicted it. Client-side navigation always
    // worked, which is why it survived — a shared or bookmarked link is the
    // one case that is always a cold load.
    mockIsReady = false;
    mockQuery = { severity: "critical" };
    render(<ActivityPage />);

    await new Promise((r) => setTimeout(r, 60));
    expect(getActivity).not.toHaveBeenCalled();
  });

  it("asks for the filter the URL names, once the router is ready", async () => {
    mockQuery = { severity: "critical" };
    render(<ActivityPage />);

    await waitFor(() => expect(getActivity).toHaveBeenCalled());
    expect(getActivity).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "critical" })
    );
  });

  it("reads the current filter back out of the URL", async () => {
    mockQuery = { severity: "critical", category: "Approvals" };
    render(<ActivityPage />);
    await screen.findByText("Priya approved purchase order 138800");

    expect(screen.getByRole("button", { name: /Critical$/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(getActivity).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "critical", category: "Approvals" })
    );
  });

  it("only offers units this company actually has activity in", async () => {
    render(<ActivityPage />);
    await screen.findByText("Priya approved purchase order 138800");
    fireEvent.click(screen.getByRole("button", { name: /More filters/ }));
    expect(await screen.findByText("The Orchid Pune (5)")).toBeInTheDocument();
  });

  it("never sends a company scope of its own", async () => {
    // Scope is the server's to decide. A client that could name a company
    // would turn an audit trail into a disclosure endpoint.
    mockQuery = { severity: "critical" };
    render(<ActivityPage />);
    await screen.findByText("Priya approved purchase order 138800");

    const params = getActivity.mock.calls[0][0];
    expect(params).not.toHaveProperty("company_id");
    expect(params).not.toHaveProperty("hospitality_company_id");
  });
});

describe("live updates", () => {
  it("announces new entries rather than moving the page under the reader", async () => {
    render(<ActivityPage />);
    await screen.findByText("Priya approved purchase order 138800");
    const before = getActivity.mock.calls.length;

    await act(async () => {
      streamHandler();
      streamHandler();
    });

    // Nothing refetched yet, and nothing has shifted.
    expect(getActivity.mock.calls.length).toBe(before);
    const pill = screen.getByRole("button", { name: /2 new entries/i });
    expect(pill).toBeInTheDocument();

    fireEvent.click(pill);
    await waitFor(() => expect(getActivity.mock.calls.length).toBeGreaterThan(before));
  });
});

describe("the detail behind a line", () => {
  it("shows which columns actually moved", async () => {
    getActivityChanges.mockResolvedValue({
      data: {
        event: EVENTS[0],
        changes: [
          {
            table_name: "tbl_rfq_purchase_order",
            operation: "UPDATE",
            record_id: 528,
            old_data: { status: "pending_approval", updated_at: "x" },
            new_data: { status: "approved", updated_at: "y" },
          },
        ],
      },
    });
    render(<ActivityPage />);
    fireEvent.click(await screen.findByText("Priya approved purchase order 138800"));

    await waitFor(() => expect(getActivityChanges).toHaveBeenCalledWith(3));
    expect(await screen.findByText("status")).toBeInTheDocument();
    expect(screen.getByText("pending_approval")).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
    // Bookkeeping columns move on every edit and mean nothing.
    expect(screen.queryByText("updated_at")).not.toBeInTheDocument();
  });

  it("explains an empty detail rather than showing a blank box", async () => {
    render(<ActivityPage />);
    fireEvent.click(await screen.findByText("Priya approved purchase order 138800"));
    expect(await screen.findByText(/no column-level record/i)).toBeInTheDocument();
  });
});

describe("Workwise's own staff in the feed", () => {
  // The trail's headline promise is that an admin sees everything happening in
  // their company. A client's IT review asks a narrower question first — who at
  // the supplier can see our data — and an entry that reads like their own
  // employee answers it wrongly.
  it("names the supplier rather than passing them off as company staff", async () => {
    render(<ActivityPage />);
    const row = await screen.findByText(/Workwise staff \(Support\) opened/i);
    const meta = row.closest("li");
    expect(within(meta).getByText("Workwise")).toBeInTheDocument();
    expect(within(meta).queryByText("Staff")).not.toBeInTheDocument();
  });

  it("says what that chip means without making the reader guess", async () => {
    render(<ActivityPage />);
    await screen.findByText(/Workwise staff \(Support\) opened/i);
    fireEvent.click(screen.getByLabelText('What "Workwise" means'));
    expect(
      await screen.findByText(/support staff, working inside your account/i)
    ).toBeInTheDocument();
  });

  it("can be filtered down to on its own", async () => {
    // "Show me only what Workwise did" is the whole reason an auditor opens
    // this screen, so it has to be one selection rather than a search.
    render(<ActivityPage />);
    await screen.findByText(/Workwise staff \(Support\) opened/i);
    fireEvent.click(screen.getByRole("button", { name: /More filters/ }));
    const kind = screen.getByLabelText("Kind of actor");
    expect(
      within(kind).getByRole("option", { name: "Workwise" })
    ).toBeInTheDocument();
  });
});
