// Technical-evaluation approval from a phone (32% of 123 decisions in 90 days
// were off-hours). jsdom cannot evaluate media queries, so the phone-only CSS
// is pinned textually, as in components/shared/mobile/MobileActionBar.test.js.
import fs from "fs";
import path from "path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), "components/dashboard/buyer/technical-evaluation", p), "utf8");

describe("scoring table at <=768px", () => {
  const css = read("TechnicalEvaluation.module.scss");
  const phone = css.slice(css.lastIndexOf("@media (max-width: 768px)"));
  const desktop = css.slice(0, css.lastIndexOf("@media (max-width: 768px)"));

  it("keeps the 280px sticky clause column and 200px vendor columns on desktop", () => {
    expect(desktop).toMatch(/\.scoringTable td:first-child\s*{[^}]*width:\s*280px;/);
    expect(desktop).toMatch(/\.vendorHeader\s*{\s*min-width:\s*200px;/);
  });

  it("shrinks the sticky clause column so a vendor score is on screen beside it", () => {
    expect(phone).toMatch(/\.scoringTable td:first-child\s*{\s*width:\s*132px;\s*min-width:\s*132px;/);
    expect(phone).toMatch(/\.vendorHeader\s*{\s*width:\s*168px;/);
  });

  it("reserves the action bar's height at the end of the page while a bar is mounted", () => {
    expect(phone).toMatch(/:global\(body\.has-mobile-action-bar\) \.evalBody\s*{\s*padding-bottom:\s*calc\(var\(--mobile-action-bar-h/);
    expect(desktop).not.toMatch(/\.evalBody\s*{/);
  });
});

describe("one phone decision bar at a time", () => {
  it("turns the approval's phone bar on only while exactly one product is expanded", () => {
    // Several expanded products each mount an ApprovalWorkflowSection; fixed
    // bars from more than one would stack on top of each other.
    expect(read("index.js")).toMatch(/showMobileStickyActions=\{expandedProducts\.size === 1\}/);
    expect(read("ClauseProductItem.js")).toMatch(/entityType="TECHNICAL"[\s\S]*showMobileStickyActions=\{showMobileStickyActions\}/);
  });
});
