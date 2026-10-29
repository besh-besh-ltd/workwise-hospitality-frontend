// SendBackDialog — the file picker's limits, and the dialogs' accessibility.
//
// The picker offers exactly what the server takes (poValidation
// SEND_BACK_TYPES: JPG, PNG, WEBP, HEIC/HEIF and PDF, 10 MB each, 10 files) and
// says why it refused anything else. Every refusal clears the input, so the
// same file can be picked again once it has been fixed.

import fs from "fs";
import path from "path";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SendBackDialog, { FilePicker } from "./SendBackDialog";
import RejectPoDialog from "./RejectPoDialog";

const file = (name, type, size = 1024) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

// Records what the handler writes to the input's value (jsdom cannot hold a
// real selection, so the reset is observed at the setter).
const pickInto = (input, files) => {
  const writes = [];
  Object.defineProperty(input, "value", { configurable: true, get: () => "", set: (v) => { writes.push(v); } });
  fireEvent.change(input, { target: { files } });
  return writes;
};

const mountPicker = (files = []) => {
  const onChange = jest.fn();
  const { container } = render(<FilePicker files={files} onChange={onChange} />);
  return { onChange, input: container.querySelector('input[type="file"]') };
};

describe("FilePicker", () => {
  it("offers exactly the server's types", () => {
    const { input } = mountPicker();
    expect(input).toHaveAttribute(
      "accept",
      ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
    );
  });

  it("refuses a type the server would refuse, says why, and clears the input", () => {
    const { onChange, input } = mountPicker();
    const writes = pickInto(input, [file("scan.gif", "image/gif")]);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Attach photos (JPG, PNG, WEBP or HEIC) or PDFs only.");
    expect(writes).toContain("");
  });

  it("refuses a file over 10 MB and clears the input", () => {
    const { onChange, input } = mountPicker();
    const writes = pickInto(input, [file("photo.jpg", "image/jpeg", 11 * 1024 * 1024)]);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Each file must be 10 MB or smaller.");
    expect(writes).toContain("");
  });

  it("refuses an eleventh file and clears the input", () => {
    const ten = Array.from({ length: 10 }, (_, i) => file(`p${i}.png`, "image/png"));
    const { onChange, input } = mountPicker(ten);
    const writes = pickInto(input, [file("p10.png", "image/png")]);
    expect(onChange).not.toHaveBeenCalled();
    expect(writes).toContain("");
  });

  it("takes the server's types, including a HEIC the browser could not name", () => {
    const { onChange, input } = mountPicker();
    const picked = [file("a.pdf", "application/pdf"), file("b.JPG", "image/jpeg"), file("c.heic", "")];
    const writes = pickInto(input, picked);
    expect(onChange).toHaveBeenCalledWith(picked);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(writes).toContain("");
  });

  it("links its error to the input", () => {
    const { input } = mountPicker();
    pickInto(input, [file("scan.gif", "image/gif")]);
    const alert = screen.getByRole("alert");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });
});

describe("dialog accessibility", () => {
  const askProps = { isOpen: true, onClose: jest.fn(), onSubmit: jest.fn(), stepLabel: "L2" };

  it("announces the people loading politely", () => {
    render(<SendBackDialog {...askProps} targets={null} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading people…");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("links each Ask error to its field", () => {
    render(<SendBackDialog {...askProps} targets={{ targets: [] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Ask for info" }));
    const describedBy = (el) => document.getElementById(el.getAttribute("aria-describedby"));
    expect(describedBy(screen.getByLabelText(/Your question/))).toHaveTextContent("Write your question for them.");
    expect(describedBy(screen.getByRole("group", { name: /What is this about/ }))).toHaveTextContent("Choose what this is about.");
    expect(describedBy(screen.getByRole("group", { name: /Who should answer/ }))).toHaveTextContent("Choose who to ask.");
  });

  it("links the Reject comment error to the comment", () => {
    render(<RejectPoDialog isOpen onClose={jest.fn()} poNumber="1" targets={null} onSubmit={jest.fn()} onAskInstead={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Reject PO" }));
    const comment = screen.getByLabelText(/Reason for rejection/);
    expect(document.getElementById(comment.getAttribute("aria-describedby"))).toHaveTextContent(
      "Write why you are rejecting this PO."
    );
  });
});

// Touch targets and the phone action bar's one-line hold text.
describe("phone CSS contract (SendBack.module.scss)", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "components/dashboard/buyer/purchase-orders/SendBack.module.scss"), "utf8");
  const phone = css.slice(css.indexOf("@media (max-width: 768px)"));

  it("gives radio rows, buttons and Remove 44px on phones", () => {
    expect(css).toMatch(/@media \(max-width: 768px\)/);
    expect(phone).toMatch(/\.radio\s*{[^}]*min-height:\s*44px/);
    expect(phone).toMatch(/\.btn\s*{[^}]*min-height:\s*44px/);
    expect(phone).toMatch(/\.btnLink\s*{[^}]*min-height:\s*44px/);
  });

  it("keeps the bar's hold line to one line with an ellipsis", () => {
    expect(css).toMatch(/\.waitingBar\s*{[^}]*min-width:\s*0[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/);
  });
});
