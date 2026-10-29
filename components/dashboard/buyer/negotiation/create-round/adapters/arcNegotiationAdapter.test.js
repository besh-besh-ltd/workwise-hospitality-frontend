import { buildArcCreatePayload } from "./arcNegotiationAdapter";

const rounds = [{ rfq_product_id: 5, vendor_targets: [] }];

describe("buildArcCreatePayload creator_remarks (REQ-0026)", () => {
  it("carries creator_remarks trimmed", () => {
    const p = buildArcCreatePayload(rounds, "2026-11-01T10:00:00Z", "  match L1  ");
    expect(p.creator_remarks).toBe("match L1");
  });
  it("sends null when blank or missing", () => {
    expect(buildArcCreatePayload(rounds, "x", "   ").creator_remarks).toBeNull();
    expect(buildArcCreatePayload(rounds, "x", "").creator_remarks).toBeNull();
    expect(buildArcCreatePayload(rounds, "x").creator_remarks).toBeNull();
  });
});
