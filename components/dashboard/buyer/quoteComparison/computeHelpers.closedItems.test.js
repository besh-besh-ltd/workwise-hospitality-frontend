// Quote comparison: an item the buyer closed without award arrives with
// state "closed". It is counted on its own — not as open, not as approved —
// so "X of Y finalized" and the approval bar leave it out of what is still to do.

import { stateCounts, approvalPct } from "./computeHelpers";

describe("stateCounts with items closed without award", () => {
  const products = [
    { id: 1, state: "approved" },
    { id: 2, state: "closed" },
    { id: 3, state: "closed" },
    { id: 4, state: "open" },
  ];

  it("counts closed items separately", () => {
    expect(stateCounts(products)).toEqual({ total: 4, approved: 1, pending: 0, rejected: 0, open: 1, closed: 2 });
  });

  it("leaves the approval percentage on the whole sheet", () => {
    expect(approvalPct(products)).toBe(25);
  });
});
