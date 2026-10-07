// The open mobile drawer (z-index 1050) covers the top bar's "Close Sidebar"
// button at 390px, and Escape did nothing — the only way out was tapping the
// dimmed strip beside the drawer. The drawer now carries its own close control
// and Escape closes it.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, pathname: "/x", push: jest.fn(), replace: jest.fn(), isReady: true }),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RFQListSidebar from "./RFQListSidebar";
import CompanyListSidebar from "@/components/dashboard/admin/hospitality-manager/CompanyListSidebar";

const rfqProps = { items: [], tabs: [], pageId: "t" };

describe("RFQListSidebar mobile drawer", () => {
  test("an open drawer has a visible close control inside it", () => {
    const onMobileClose = jest.fn();
    render(<RFQListSidebar {...rfqProps} mobileOpen onMobileClose={onMobileClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close sidebar" }));
    expect(onMobileClose).toHaveBeenCalledTimes(1);
  });

  test("Escape closes an open drawer", () => {
    const onMobileClose = jest.fn();
    render(<RFQListSidebar {...rfqProps} mobileOpen onMobileClose={onMobileClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onMobileClose).toHaveBeenCalledTimes(1);
  });

  test("a closed drawer shows no close control and ignores Escape", () => {
    const onMobileClose = jest.fn();
    render(<RFQListSidebar {...rfqProps} mobileOpen={false} onMobileClose={onMobileClose} />);
    expect(screen.queryByRole("button", { name: "Close sidebar" })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onMobileClose).not.toHaveBeenCalled();
  });

  test("desktop (not a drawer) is unchanged", () => {
    render(<RFQListSidebar {...rfqProps} />);
    expect(screen.queryByRole("button", { name: "Close sidebar" })).not.toBeInTheDocument();
  });
});

describe("CompanyListSidebar mobile drawer", () => {
  const props = { companies: [], selectedCompanyId: null, onSelect: jest.fn(), onAddCompany: jest.fn(), isLoading: false };

  test("close control and Escape both close it", () => {
    const onMobileClose = jest.fn();
    render(<CompanyListSidebar {...props} mobileOpen onMobileClose={onMobileClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close sidebar" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onMobileClose).toHaveBeenCalledTimes(2);
  });
});
