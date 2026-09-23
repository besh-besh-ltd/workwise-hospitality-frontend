// Inverse-grep guard for the "Something went wrong" class of bug.
//
// 18 of 22 services reject as `reject({ message: error })`, so a caught `err`
// is `{ message: AxiosError }` — `err.response` is gone and `err.message` is an
// OBJECT. Assigning that straight into error state is only a crash away from
// the user: the moment the value is rendered as a JSX child, React throws
// "Objects are not valid as a React child" and the app-level ErrorBoundary
// swallows the whole page.
//
// That is exactly how the vendor Subscription drawer and EditRFQ broke. Rather
// than re-audit 42 files by hand every time, forbid the shape: error state is
// set through getApiErrorMessage(), which always returns a string.

import fs from "fs";
import path from "path";

const ROOTS = ["components", "pages", "hooks"];
const RAW_ERROR_INTO_STATE = /set[A-Za-z]*Error\(\s*(err|error)\??\.(message|response)/;

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (entry.name.endsWith(".js") && !entry.name.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
};

it("never assigns a raw caught error into error state", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const offenders = [];

  for (const root of ROOTS) {
    const dir = path.join(repoRoot, root);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (RAW_ERROR_INTO_STATE.test(line)) {
          offenders.push(`${path.relative(repoRoot, file)}:${i + 1}\n    ${line.trim()}`);
        }
      });
    }
  }

  expect(
    offenders.join("\n") ||
      "" /* keep the diff readable when it passes */
  ).toBe("");
});
