// Making a row change readable.
//
// The testers asked for the expanded detail to be "shown in a proper
// formatting, currently it is being shown in key value pairs". The diffing
// itself was already right — unchanged fields are dropped, so a tbl_users
// UPDATE collapses from 28 columns to the 1 that moved. What reached the
// screen was the raw material: `bid_end_date` in monospace, `2026-09-05
// 14:30:00` verbatim, `true`, `tbl_rfq_purchase_order #528`, and a bare
// `hotel_id 12 → 14`.
//
// Measured against staging, the fields that actually change are a small set —
// status, comment, the RFQ dates, is_head_office, a handful of ids — so the
// labels here are aimed at those rather than guessed across 28 audited tables.

import {
  labelForField,
  labelForTable,
  formatAuditValue,
  isNoiseField,
} from "./auditPresentation";

describe("field names", () => {
  it("uses the business name where there is one", () => {
    expect(labelForField("bid_end_date")).toBe("Quote submission end date");
    expect(labelForField("vendor_clarification_date")).toBe("Vendor clarification end date");
    expect(labelForField("is_head_office")).toBe("Head office");
  });

  it("humanises anything it has no name for, rather than hiding it", () => {
    // A field nobody labelled is still a real change and must still be shown.
    expect(labelForField("some_new_column")).toBe("Some new column");
  });

  it("survives a missing field name", () => {
    expect(labelForField("")).toBe("—");
    expect(labelForField(null)).toBe("—");
  });
});

describe("table names", () => {
  it("names the thing, not the table", () => {
    expect(labelForTable("tbl_rfq_purchase_order")).toBe("Purchase order");
    expect(labelForTable("tbl_users")).toBe("User");
    expect(labelForTable("tbl_hospitality_company_hotels")).toBe("Business unit");
  });

  it("falls back to a humanised name with the prefix dropped", () => {
    expect(labelForTable("tbl_something_new")).toBe("Something new");
  });
});

describe("values", () => {
  it("renders a timestamp as a person would read it", () => {
    expect(formatAuditValue("bid_end_date", "2026-09-05 14:30:00")).toBe("05 Sep 2026, 02:30 pm");
  });

  it("handles the ISO form the same way", () => {
    expect(formatAuditValue("ra_start_date", "2026-09-05T14:30:00")).toBe("05 Sep 2026, 02:30 pm");
  });

  it("leaves a date-only value as a date", () => {
    expect(formatAuditValue("some_date", "2026-09-05")).toBe("2026-09-05");
  });

  it("says yes and no rather than true and false", () => {
    expect(formatAuditValue("is_head_office", true)).toBe("Yes");
    expect(formatAuditValue("is_head_office", false)).toBe("No");
    // Postgres smallint flags arrive as numbers through JSONB.
    expect(formatAuditValue("is_published", 1)).toBe("Yes");
    expect(formatAuditValue("is_published", 0)).toBe("No");
  });

  it("does not turn ordinary numbers into yes and no", () => {
    expect(formatAuditValue("tender_fees", 1)).toBe("1");
    expect(formatAuditValue("publish_attempts", 0)).toBe("0");
  });

  it("marks an id as an id so it is not mistaken for a quantity", () => {
    expect(formatAuditValue("hotel_id", 14)).toBe("#14");
    expect(formatAuditValue("department_id", 3)).toBe("#3");
  });

  it("prefers a resolved name when one was supplied", () => {
    expect(formatAuditValue("hotel_id", 14, { labels: { hotel_id: { 14: "The Orchid Pune" } } }))
      .toBe("The Orchid Pune");
  });

  it("says empty rather than showing nothing", () => {
    expect(formatAuditValue("comment", null)).toBe("Empty");
    expect(formatAuditValue("comment", "")).toBe("Empty");
  });

  it("renders an object without dumping JSON at the reader", () => {
    const out = formatAuditValue("payload", { a: 1, b: 2 });
    expect(out).toMatch(/2 fields/);
  });

  it("renders a list by its length", () => {
    expect(formatAuditValue("clauses", [1, 2, 3])).toMatch(/3 items/);
  });

  it("passes plain text through untouched", () => {
    expect(formatAuditValue("title", "Laptop procurement")).toBe("Laptop procurement");
  });
});

describe("noise", () => {
  it("hides bookkeeping columns nobody asked about", () => {
    // `id` included: the record id is already in the block header, and a delete
    // renders it as "Id 1041 → Empty".
    ["updated_at", "created_at", "updated_by", "created_by", "timestamp", "version", "id"]
      .forEach((f) => expect(isNoiseField(f)).toBe(true));
  });

  it("keeps anything that describes the change itself", () => {
    // Note `user_id` and `hotel_id` stay — a foreign key says which thing was
    // involved, unlike the row's own primary key.
    ["status", "comment", "bid_end_date", "is_head_office", "hotel_id", "user_id"]
      .forEach((f) => expect(isNoiseField(f)).toBe(false));
  });
});
