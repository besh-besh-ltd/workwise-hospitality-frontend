/**
 * @jest-environment node
 *
 * Reads source files off disk. No DOM, no React.
 */

// CreateRFQ.editSnapshotWiring.test.js — THE WIRING GUARD.
//
// utils/rfqEditSnapshot.test.js proves the payload builder omits removed
// products. utils/saveGate.test.js proves the gate serialises saves. Neither
// proves the component actually USES them, and that gap is exactly how this
// class of bug keeps reaching production here:
//
//   • The WH-69 removal defect survived four months because the backend suite
//     hand-built the payload it BELIEVED the frontend sent. The producer was a
//     module-private const inside a 4,700-line component and had no test at
//     all, so "the backend deletes omitted products" and "the frontend omits
//     removed products" were both true-looking and never checked together.
//
//   • A creator-only withdraw guard once landed in an ORPHAN component. Every
//     unit test passed. It was caught only by a human clicking the button.
//
// So this file asserts the seam: that the component imports the real helpers,
// does not carry a private copy that could drift, and routes every save
// through the gate. It is the inverse grep — it fails on what is ABSENT.

import fs from "fs";
import path from "path";

const componentPath = path.join(process.cwd(), "components/dashboard/buyer/createRFQ/CreateRFQ.js");
const source = fs.readFileSync(componentPath, "utf8");

describe("CreateRFQ wires the extracted snapshot builder", () => {
  it("imports buildEditSnapshotPayload from utils", () => {
    expect(source).toMatch(
      /import\s*\{[^}]*buildEditSnapshotPayload[^}]*\}\s*from\s*["']@\/utils\/rfqEditSnapshot["']/
    );
  });

  it("does not define its own copy of the builder", () => {
    // A local redefinition would shadow the tested one and silently reintroduce
    // the missing removal filter.
    expect(source).not.toMatch(/(const|function)\s+buildEditSnapshotPayload\s*[=(]/);
  });

  it("still calls the builder — both edit-mode save paths depend on it", () => {
    // Submit (Review step) and Save Changes are separate call sites; losing
    // either one silently reverts half the fix.
    const calls = source.match(/buildEditSnapshotPayload\(\{/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it("passes the live updatable data into the builder", () => {
    // deleted_product_ids is derived from liveUpdatableData.products.deletable.
    // Drop that argument and removals stop being transmitted again, with every
    // unit test still green.
    const callSites = source.match(/buildEditSnapshotPayload\(\{[\s\S]{0,400}?\}\)/g) || [];
    expect(callSites.length).toBeGreaterThanOrEqual(2);
    for (const call of callSites) {
      expect(call).toMatch(/liveUpdatableData/);
    }
  });
});

describe("CreateRFQ wires the save gate", () => {
  it("imports createSaveGate from utils", () => {
    expect(source).toMatch(
      /import\s*\{[^}]*createSaveGate[^}]*\}\s*from\s*["']@\/utils\/saveGate["']/
    );
  });

  it("claims the gate before saving and releases it in a finally", () => {
    expect(source).toMatch(/saveGateRef\.current\.begin\(\)/);
    expect(source).toMatch(/finally\s*\{[\s\S]{0,400}?saveGateRef\.current\.end\(\)/);
  });

  it("keeps the network call inside the gated wrapper, not the raw body", () => {
    // performSaveDraft holds the request; handleSaveDraft is the gated entry
    // point everything else calls. If a call site reached performSaveDraft
    // directly it would bypass the gate entirely.
    const directCalls = source.match(/performSaveDraft\(\)/g) || [];
    expect(directCalls).toHaveLength(1);
  });

  it("makes a blocked caller wait for the in-flight flush", () => {
    // onBeforeAdd awaits this to persist unsaved edits before the modal
    // rehydrates from the server. A bare `return` on the blocked path would let
    // it rehydrate over a half-written draft.
    expect(source).toMatch(/saveGateRef\.current\.whenIdle\(\)/);
  });

  it("hands the in-flight save to the gate so blocked callers can await it", () => {
    expect(source).toMatch(/saveGateRef\.current\.track\(/);
  });

  it("re-runs the save that was requested while one was in flight", () => {
    // Blocking a duplicate must not silently drop the buyer's last edit —
    // that is the failure mode the previous draft-loss P0 was made of.
    expect(source).toMatch(/handleSaveDraftRef\.current/);
  });

  it("disables the Save button while a save is running", () => {
    expect(source).toMatch(/disabled=\{savingChanges\s*\|\|/);
  });
});

describe("CreateRFQ still honours the removal list everywhere it renders", () => {
  it("hides rows the buyer removed", () => {
    // The UI filter and the payload filter must agree. If the row is hidden but
    // still sent, the buyer sees a success toast and the product comes back —
    // the original report.
    expect(source).toMatch(/updatableData\.products\.deletable\.includes\(product\.id\)/);
  });

  it("does not validate specs on a product that was removed", () => {
    expect(source).toMatch(/!updatableData\.products\.deletable\.includes\(p\.id\)/);
  });
});
