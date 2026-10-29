// RoundActions.test.js — where the command center's actions go.
//
// The server sends permission gates; resolveActionHref turns each gate's route
// intent into a screen. An ARC round's "Start the next round" used to land on
// the rate-contract page, a click short of the wizard; it now opens the ARC
// create wizard, as the RFQ one does.

import { resolveActionHref } from "./RoundActions";

const arcRound = { isArc: true, arcId: 9, roundId: 108 };
const rfqRound = { isArc: false, rfqId: 512, roundId: 77 };

describe("an ARC round", () => {
  it("starts the next round in the ARC create wizard", () => {
    expect(resolveActionHref({ key: "create_next_round", route: "next_round" }, arcRound)).toBe(
      "/dashboard/buyer/rate-contracts/9/negotiation/create"
    );
  });

  it("approves on the round's own approval page", () => {
    expect(resolveActionHref({ key: "approve", route: "approve" }, arcRound)).toBe(
      "/dashboard/buyer/rate-contracts/9/negotiation/108/approve"
    );
  });

  it("sends everything else to the rate contract", () => {
    expect(resolveActionHref({ key: "close_round", route: "round" }, arcRound)).toBe(
      "/dashboard/buyer/rate-contracts/9?stage=commercial"
    );
  });
});

describe("an RFQ round", () => {
  it("is unchanged", () => {
    expect(resolveActionHref({ key: "create_next_round", route: "next_round" }, rfqRound)).toBe(
      "/dashboard/buyer/negotiation/512/create"
    );
    expect(resolveActionHref({ key: "approve", route: "approve" }, rfqRound)).toBe(
      "/dashboard/buyer/negotiation/512/approve"
    );
  });
});
