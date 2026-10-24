import fs from "fs";
import path from "path";

// jsdom has no layout or media queries, so the count styles are pinned by
// text (as Scan.styles.test.js does): counters work one-handed with a phone,
// so every control keeps a 44px touch target and tables restack on phones.
const css = fs.readFileSync(path.join(__dirname, "..", "counts.module.scss"), "utf8");

const block = (selector, source = css) => {
  const start = source.indexOf(`${selector} {`);
  if (start === -1) return "";
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return "";
};

describe("counts.module.scss", () => {
  it("buttons, tabs, inputs and picker rows are at least 44px tall", () => {
    expect(block(".btn")).toMatch(/min-height:\s*44px/);
    expect(block(".btnSm")).toMatch(/min-height:\s*44px/);
    expect(block(".tab")).toMatch(/min-height:\s*44px/);
    expect(block(".segment")).toMatch(/min-height:\s*44px/);
    expect(block(".qtyInput")).toMatch(/min-height:\s*44px/);
    expect(block(".pickRow")).toMatch(/min-height:\s*44px/);
    expect(block(".choice")).toMatch(/min-height:\s*44px/);
    expect(css).toMatch(/\.select,\s*\.textInput,\s*\.searchInput\s*{[^}]*min-height:\s*44px/);
  });

  it("on phones tables restack as labelled cards, the qty box spans the row and the start sheet docks to the bottom", () => {
    const layer = css.slice(css.indexOf("Phone layer"));
    const phone = block("@media (max-width: 768px)", layer);
    expect(phone).toMatch(/\.table\s*{\s*display:\s*block;\s*thead\s*{\s*display:\s*none;/);
    expect(phone).toMatch(/content:\s*attr\(data-label\)/);
    expect(phone).toMatch(/\.qtyInput\s*{[^}]*width:\s*100%/);
    expect(phone).toMatch(/\.sheetDialog\s*{[^}]*bottom:\s*0/);
  });
});
