import { STAGE_LABELS, STAGE_SHORT, STAGE_DESCRIPTIONS, stageLabel, stageShortLabel, stageDescription } from "./stageLabels";

describe("stageLabels", () => {
  const table = {
    RFQ: ["RFQ Approval", "RFQ"],
    TENDER: ["Tender Approval", "Tender"],
    TECHNICAL: ["Technical Approval", "Tech"],
    NEGOTIATION: ["Negotiation Round Approval", "Round"],
    NEGOTIATION_QUOTE: ["Final Vendor Approval", "Final"],
    PO: ["Purchase Order Approval", "PO"],
    ARC: ["Unit ARC · Publish Approval", "Publish"],
    ARC_PUBLISH: ["Unit ARC · Publish Approval", "Publish"],
    ARC_TECH: ["Unit ARC · Technical Approval", "Tech"],
    ARC_NEGOTIATION: ["Unit ARC · Negotiation Round Approval", "Round"],
    ARC_COMMITTEE: ["Unit ARC · Committee Approval", "Committee"],
    ARC_AMENDMENT: ["Unit ARC · Amendment Approval", "Amend"],
    ARC_GROUP: ["Group ARC · Publish Approval", "Publish"],
    ARC_GROUP_TECH: ["Group ARC · Technical Approval", "Tech"],
    ARC_GROUP_NEGOTIATION: ["Group ARC · Negotiation Round Approval", "Round"],
    ARC_GROUP_COMMITTEE: ["Group ARC · Committee Approval", "Committee"],
    ARC_GROUP_AMENDMENT: ["Group ARC · Amendment Approval", "Amend"],
  };

  test.each(Object.entries(table))("%s maps exactly", (type, [label, short]) => {
    expect(stageLabel(type)).toBe(label);
    expect(stageShortLabel(type)).toBe(short);
  });

  test("no label, short or description contains an underscore", () => {
    [STAGE_LABELS, STAGE_SHORT, STAGE_DESCRIPTIONS].forEach((m) =>
      Object.values(m).forEach((v) => expect(v).not.toMatch(/_/)));
  });

  test("isGroup promotes unit ARC types; ARC_GROUP_* always group", () => {
    expect(stageLabel("ARC_TECH", { isGroup: true })).toBe("Group ARC · Technical Approval");
    expect(stageLabel("ARC", { isGroup: true })).toBe("Group ARC · Publish Approval");
    expect(stageLabel("ARC_GROUP_TECH", { isGroup: false })).toBe("Group ARC · Technical Approval");
    expect(stageLabel("RFQ", { isGroup: true })).toBe("RFQ Approval");
  });

  test("unknown types are Title Cased without underscores", () => {
    expect(stageLabel("SOME_NEW_TYPE")).toBe("Some New Type");
  });

  test("descriptions", () => {
    expect(stageDescription("NEGOTIATION_QUOTE")).toBe("Approves the final vendor and price before the PO");
    expect(stageDescription("ARC_COMMITTEE")).toBe("Committee approves the ARC award");
  });
});
