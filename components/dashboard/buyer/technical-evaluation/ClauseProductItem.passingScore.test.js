// Source-level guard (ClauseProductItem is too dependency-heavy to mount):
// the grid must label the threshold as a percentage and must never paint a
// fabricated 100% when the threshold is 0.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "ClauseProductItem.js"), "utf8");

describe("ClauseProductItem passing score", () => {
  it("labels the threshold 'Minimum passing score: {pct}%'", () => {
    expect(src).toMatch(/Minimum passing score:<\/strong> \{minimumPassingScore\}%/);
    expect(src).not.toMatch(/out of 100/);
  });
  it("renders the vendor's real score regardless of threshold", () => {
    expect(src).not.toMatch(/!minimumPassingScore\)\s*\?\s*100/);
    expect(src).toMatch(/\{vendor\.calculated_score\}%/);
  });
});
