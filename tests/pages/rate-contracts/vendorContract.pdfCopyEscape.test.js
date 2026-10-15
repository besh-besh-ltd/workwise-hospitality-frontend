// Security audit M5: the vendor contract page's "PDF copy" fallback (no stored
// PDF yet) builds a printable page with document.write. Every server value in it
// comes from the buyer (ARC title, number, hotel, item names, uom) or the
// vendor, so each one must be HTML-escaped, exactly like the accept preview.

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  vendorGetContract: jest.fn(),
  vendorDeclineAddendum: jest.fn(),
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ isReady: true, query: { contractId: "77" }, push: jest.fn(), replace: jest.fn() }),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import reducer from "@/redux/slice";

import * as ArcApi from "@/services/arc_v2";
import VendorContractPage from "@/pages/dashboard/vendor/rate-contracts/[contractId]/index";
import { escapeHtml } from "@/utils/escapeHtml";

const HOSTILE = {
  contract: {
    id: 77,
    status: "active",
    vendor_id: 10,
    vendor_name: "<b>Alpha</b>",
    arc_number: "ARC-<1>",
    signed_by_vendor_at: "2026-09-01",
    document_s3_url: null,
    document_hash: "<svg onload=1>",
  },
  arc: {
    arc_number: "ARC-<1>",
    title: "<script>steal()</script>",
    is_group: false,
    hotel_name: "<img src=x onerror=alert(1)>",
    hotel_city: "\"><iframe>",
  },
  hotels: [],
  lines: [
    {
      id: 1,
      variant_name: "<u>Towel</u>",
      variant_slug: "<a href=javascript:1>slug</a>",
      uom: "<em>pcs</em>",
      unit_rate: 1,
      gst_pct: 5,
      committed_qty: 1,
      consumed_qty: 0,
    },
  ],
  callOffs: [],
  amendments: [],
  clarifications: [],
};

test("escapeHtml escapes the five HTML metacharacters and tolerates null", () => {
  expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe("&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  expect(escapeHtml(null)).toBe("");
  expect(escapeHtml(undefined)).toBe("");
  expect(escapeHtml(12)).toBe("12");
});

test("the PDF copy escapes every buyer- and vendor-supplied value", async () => {
  const written = [];
  const fakeWin = { document: { write: (h) => written.push(h), close: jest.fn() }, focus: jest.fn() };
  const openSpy = jest.spyOn(window, "open").mockReturnValue(fakeWin);
  ArcApi.vendorGetContract.mockResolvedValue({ data: HOSTILE });

  render(<Provider store={configureStore({ reducer })}><VendorContractPage /></Provider>);
  fireEvent.click(await screen.findByRole("button", { name: /download pdf/i }));

  expect(openSpy).toHaveBeenCalledWith("", "_blank");
  const html = written.join("");
  for (const raw of ["<script>steal", "<img src=x", "<iframe>", "<b>Alpha", "<u>Towel", "<em>pcs", "<a href=javascript", "<svg onload", "ARC-<1>"]) {
    expect(html).not.toContain(raw);
  }
  expect(html).toContain("&lt;script&gt;steal()&lt;/script&gt;");
  expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(html).toContain("&lt;u&gt;Towel&lt;/u&gt;");
  expect(html).toContain("ARC-&lt;1&gt;");
  openSpy.mockRestore();
});
