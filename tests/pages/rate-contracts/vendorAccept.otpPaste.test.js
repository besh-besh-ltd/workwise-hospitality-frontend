// Vendor ARC accept — signing OTP on a phone.
//
// A vendor signing from a phone gets the code by SMS. iOS/Android offer it
// as a one-time-code suggestion (autocomplete="one-time-code") or the vendor
// copies it; either way six digits arrive in ONE box. The six single-digit
// boxes used to keep only the first digit, so the code had to be retyped
// digit by digit. Now a multi-digit paste fills every box from the one it
// lands in; single-digit typing is unchanged.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  vendorGetContract: jest.fn(),
  vendorRequestOtp: jest.fn(),
  vendorVerifyOtp: jest.fn(),
  vendorDeclineContract: jest.fn(),
  vendorRequestClarification: jest.fn(),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: { contractId: "77" }, push: jest.fn(), replace: jest.fn() }),
}));

import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import VendorAcceptPage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/accept";

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

const openOtpBoxes = async () => {
  ArcApi.vendorGetContract.mockResolvedValue({
    data: {
      contract: { id: 77, status: "awaiting_acceptance", vendor_name: "Alpha Linen" },
      arc: { arc_number: "ARC-1", title: "Linen", is_group: false, hotel_name: "Goa Resort" },
      hotels: [],
      lines: [{ id: 501, variant_name: "Bath towel", uom: "pcs", unit_rate: 100, gst_pct: 5, committed_qty: 650 }],
      clarifications: [],
    },
  });
  ArcApi.vendorRequestOtp.mockResolvedValue({ data: { otp_expires_at: null } });

  render(<VendorAcceptPage />);
  fireEvent.click(await screen.findByText("Confirm this line"));
  // Step 2: accept every commercial clause.
  document.querySelectorAll(".term-item").forEach((el) => fireEvent.click(el));
  fireEvent.click(await screen.findByRole("button", { name: /Send OTP & begin signing/ }));
  await screen.findByLabelText("OTP digit 1");
  return [1, 2, 3, 4, 5, 6].map((n) => screen.getByLabelText(`OTP digit ${n}`));
};

test("the first box offers the SMS one-time code to the keyboard", async () => {
  const boxes = await openOtpBoxes();
  expect(boxes[0]).toHaveAttribute("autocomplete", "one-time-code");
  boxes.forEach((b) => expect(b).toHaveAttribute("inputmode", "numeric"));
});

test("pasting a 6-digit code fills all six boxes and enables Verify", async () => {
  const boxes = await openOtpBoxes();
  fireEvent.paste(boxes[0], { clipboardData: { getData: () => "123456" } });
  await waitFor(() => expect(boxes.map((b) => b.value).join("")).toBe("123456"));
  expect(screen.getByRole("button", { name: /Verify & sign contract/ })).toBeEnabled();
});

test("a pasted code with spaces/dashes is cleaned; pasting mid-way fills the rest", async () => {
  const boxes = await openOtpBoxes();
  fireEvent.change(boxes[0], { target: { value: "9" } });
  fireEvent.paste(boxes[1], { clipboardData: { getData: () => "12-34 5" } });
  await waitFor(() => expect(boxes.map((b) => b.value).join("")).toBe("912345"));
});

test("an autofill that drops the whole code into one box is spread out", async () => {
  const boxes = await openOtpBoxes();
  fireEvent.change(boxes[0], { target: { value: "654321" } });
  await waitFor(() => expect(boxes.map((b) => b.value).join("")).toBe("654321"));
});

test("typing one digit per box still works as before", async () => {
  const boxes = await openOtpBoxes();
  "4071".split("").forEach((d, i) => fireEvent.change(boxes[i], { target: { value: d } }));
  expect(boxes.map((b) => b.value).join("")).toBe("4071");
  expect(screen.getByRole("button", { name: /Verify & sign contract/ })).toBeDisabled();
});

// jsdom has no media queries — pin the phone CSS contract textually.
describe("vendor ARC phone CSS contract", () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/rate-contracts/vendor/VendorArcPhone.module.css"),
    "utf8"
  );
  const phone = css.slice(css.indexOf("@media (max-width: 768px)"));

  test("rules are phone-only", () => {
    const beforeFirstMedia = css.slice(0, css.indexOf("@media"));
    expect(beforeFirstMedia).not.toMatch(/{/);
  });

  test("two-column body stacks, stat strip is 2-up, commercial rows restack", () => {
    expect(phone).toMatch(/\.twoCol\s*{\s*grid-template-columns:\s*minmax\(0, 1fr\) !important/);
    expect(phone).toMatch(/\.statStrip\s*{\s*grid-template-columns:\s*1fr 1fr !important/);
    expect(phone).toMatch(/\.fullRow\s*{\s*grid-column:\s*1 \/ -1 !important/);
    expect(phone).toMatch(/\.payTermRow\s*{[^}]*!important/);
    expect(phone).toMatch(/\.chargeRow\s*{[^}]*!important/);
  });

  test("accept page applies the classes to the inline-grid body", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "pages/dashboard/vendor/rate-contracts/[contractId]/accept.js"),
      "utf8"
    );
    const twoCols = src.match(/className=\{phone\.twoCol\} style=\{\{ display: "grid", gridTemplateColumns: "minmax\(0,1fr\) 360px"/g) || [];
    expect(twoCols).toHaveLength(2);
  });
});
