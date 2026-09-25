// Group rate contract screens — the classes they render are backed by CSS.
//
// jsdom does not load styles/arc_v2.css, so a component test that finds a
// class name proves nothing about how it looks. `.qty-chip` shipped with no
// CSS at all (the prototype had it, the port did not), which a group ARC makes
// visible: several hotel chips run together as one string. Assert against the
// stylesheet itself.

const css = require("fs").readFileSync(require("path").join(process.cwd(), "styles/arc_v2.css"), "utf8");

describe("group rate contract styles", () => {
  it.each([
    [".qty-chip", "Overview — quantity per hotel"],
    [".qty-chip .qc-code", "Overview — hotel code"],
    [".bu-summary-table", "Awarding by hotel, Active hotel lens"],
    [".bu-summary-table .award-pill", "Awarding — supplier per hotel"],
    [".bu-summary-table .pending-pill", "hotel without a supplier / not ordering"],
    [".bu-tag", "vendor invitation hotels, live contract hotel split"],
    [".bd-row td.bd-label", "Commercial — hotel rows under an item"],
    [".cell-select-btn", "Commercial — award a hotel"],
    [".cell-pill-awarded", "Commercial — awarded hotel"],
  ])("%s is styled (%s)", (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    expect(css).toMatch(new RegExp(`(^|[\\s}])${escaped}\\s*[{,]`, "m"));
  });
});
