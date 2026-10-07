import { withFocusRing, FOCUS_RING, FOCUS_BORDER } from "./selectFocusRing";

describe("withFocusRing", () => {
  it("adds a visible ring and border when focused", () => {
    const out = withFocusRing({ minHeight: 34, boxShadow: "none" }, { isFocused: true }, { minWidth: "200px" });
    expect(out).toMatchObject({ minHeight: 34, minWidth: "200px", boxShadow: FOCUS_RING, borderColor: FOCUS_BORDER });
  });

  it("keeps the caller's resting look when not focused", () => {
    const out = withFocusRing({ boxShadow: "x", borderColor: "#ccc" }, { isFocused: false }, { borderColor: "#e8e8e3", boxShadow: "none" });
    expect(out).toMatchObject({ borderColor: "#e8e8e3", boxShadow: "none" });
  });
});
