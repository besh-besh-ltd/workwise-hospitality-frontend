// An item closed without award can't join a negotiation round. Its chip in the
// item picker must read as closed (red, like every other closed-item tag), not
// share the grey "No Quotes" style.

import { getProductRoundStatus } from "./negotiationHelpers";

describe("getProductRoundStatus: item closed without award", () => {
  it("is disabled and uses the red Closed chip", () => {
    const status = getProductRoundStatus({
      id: 1,
      closed_at: "2026-11-05T05:00:00Z",
      finalization_status: "Closed without award",
    });

    expect(status).toEqual({
      isDisabled: true,
      statusLabel: "Closed",
      statusClass: "createStatusClosed",
    });
  });
});
