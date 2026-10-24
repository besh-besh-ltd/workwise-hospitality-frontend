import fs from "fs";
import path from "path";

// jsdom has no layout or media queries, so the scan styles are pinned by text
// (as PODetail.mobile.test.js does): receivers use these controls with
// gloves on, so every one keeps a 44px touch target.
const css = fs.readFileSync(path.join(__dirname, "..", "Scan.module.scss"), "utf8");

const block = (selector) => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return "";
};

describe("Scan.module.scss", () => {
  it("buttons, the scan box, choices and inputs are at least 44px tall", () => {
    expect(block(".btn")).toMatch(/min-height:\s*44px/);
    expect(block(".iconBtn")).toMatch(/width:\s*44px/);
    expect(block(".input")).toMatch(/min-height:\s*44px/);
    expect(block(".choice")).toMatch(/min-height:\s*44px/);
    expect(block(".textInput")).toMatch(/min-height:\s*44px/);
    expect(block(".torch")).toMatch(/height:\s*44px/);
  });

  it("on phones the link sheet docks to the bottom of the screen", () => {
    const layer = css.slice(css.indexOf("Phone layer"));
    expect(layer).toMatch(/@media \(max-width: 768px\)/);
    expect(layer).toMatch(/\.sheetDialog\s*{[^}]*bottom:\s*0/);
  });
});
