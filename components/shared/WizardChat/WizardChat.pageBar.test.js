import fs from "fs";
import path from "path";

// jsdom can't evaluate selectors against CSS modules, so pin the CSS contract
// textually (same approach as MobileActionBar.test.js): a page with a fixed
// bottom action dock sets body.has-page-action-bar and the assistant button
// must lift clear of it, overriding any saved drag position.
const css = fs.readFileSync(path.join(process.cwd(), "components/shared/WizardChat/WizardChat.module.css"), "utf8");

it("lifts the .fab above the page action bar, beating a saved drag position", () => {
  const m = css.match(/:global\(body\.has-page-action-bar\) \.fab\s*{([^}]*)}/);
  expect(m).not.toBeNull();
  expect(m[1]).toMatch(/top:\s*auto\s*!important/);
  expect(m[1]).toMatch(/left:\s*auto\s*!important/);
  expect(m[1]).toMatch(/bottom:\s*calc\(var\(--page-action-bar-h,\s*72px\)\s*\+\s*16px\)\s*!important/);
});

it("the rule is not inside a media query, so it applies on desktop", () => {
  const idx = css.indexOf(":global(body.has-page-action-bar) .fab");
  const before = css.slice(0, idx);
  expect((before.match(/{/g) || []).length).toBe((before.match(/}/g) || []).length);
});
