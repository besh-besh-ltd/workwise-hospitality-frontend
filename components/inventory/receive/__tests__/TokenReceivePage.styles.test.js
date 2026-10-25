// The site-rep page's phone layer, read from the compiled stylesheets (sass)
// through the browser's CSS object model, not by pattern-matching the SCSS.

import path from "path";
import * as sass from "sass";

const sheetOf = (file) => {
  const css = sass.compile(path.join(__dirname, "..", file)).css;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  return style.sheet;
};

/** The declarations for `selector`, inside `@media (max-width: 768px)` when `phone`. */
const declarationsFor = (sheet, selector, { phone = false } = {}) => {
  const out = {};
  const visit = (rules, inPhone) => {
    for (const rule of Array.from(rules)) {
      if (rule.media) {
        visit(rule.cssRules, inPhone || /max-width:\s*768px/.test(rule.media.mediaText));
      } else if (rule.selectorText && inPhone === phone) {
        const selectors = rule.selectorText.split(",").map((s) => s.trim());
        if (selectors.includes(selector)) {
          for (let i = 0; i < rule.style.length; i += 1) {
            const prop = rule.style[i];
            out[prop] = rule.style.getPropertyValue(prop);
          }
        }
      }
    }
  };
  visit(sheet.cssRules, false);
  return out;
};

test("on a phone the scan dock sticks to the top, and its card clips without becoming a scroll box", () => {
  const own = sheetOf("TokenReceivePage.module.scss");
  expect(declarationsFor(own, ".scanDock", { phone: true })).toEqual(expect.objectContaining({ position: "sticky", top: "0" }));
  // The shared .card is overflow:hidden (a scroll box, so the dock would stick
  // inside the card); the items card is overflow:clip on phones.
  expect(declarationsFor(own, ".page .itemsCard", { phone: true })).toEqual(expect.objectContaining({ overflow: "clip" }));
  expect(declarationsFor(own, ".page", { phone: true })).toEqual(expect.objectContaining({
    "overflow-x": "clip",
    "--mobile-action-bar-h": "112px",
  }));
  // No negative margins: this page has no dashboard shell padding to cancel.
  expect(declarationsFor(own, ".page").margin).toBeUndefined();

  const shared = sheetOf("receive.module.scss");
  expect(declarationsFor(shared, ".card").overflow).toBe("hidden");
});

test("the scan toast's Undo is a 44px touch target", () => {
  const shared = sheetOf("receive.module.scss");
  expect(declarationsFor(shared, ".toastUndo")).toEqual(expect.objectContaining({ "min-height": "44px", "min-width": "44px" }));
});
