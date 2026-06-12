jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import EmptyDashboard from "./EmptyDashboard";

describe("<EmptyDashboard>", () => {
  it("displays the selected BU name in the copy", () => {
    render(<EmptyDashboard selectedHotelLabel="Burj Al Arab" onChangeBu={() => {}} />);
    expect(screen.getByText(/No dashboards assigned/i)).toBeInTheDocument();
    expect(screen.getByText("Burj Al Arab")).toBeInTheDocument();
  });

  it("falls back to generic copy when no BU label provided", () => {
    render(<EmptyDashboard onChangeBu={() => {}} />);
    expect(screen.getByText("the selected business unit")).toBeInTheDocument();
  });

  it("calls onChangeBu when the switch button is clicked", () => {
    const onChangeBu = jest.fn();
    render(
      <EmptyDashboard selectedHotelLabel="Hotel A" onChangeBu={onChangeBu} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Switch business unit/i }));
    expect(onChangeBu).toHaveBeenCalledTimes(1);
  });

  it("renders a contact-admin link only when email is provided", () => {
    const { rerender } = render(
      <EmptyDashboard selectedHotelLabel="Hotel A" onChangeBu={() => {}} />
    );
    expect(screen.queryByRole("link", { name: /Contact admin/i })).not.toBeInTheDocument();

    rerender(
      <EmptyDashboard
        selectedHotelLabel="Hotel A"
        onChangeBu={() => {}}
        contactAdminEmail="admin@example.com"
      />
    );
    const link = screen.getByRole("link", { name: /Contact admin/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toMatch(/^mailto:admin@example\.com/);
  });

  it("does not render the switch button when onChangeBu is not provided", () => {
    render(<EmptyDashboard selectedHotelLabel="Hotel A" />);
    expect(screen.queryByRole("button", { name: /Switch business unit/i })).not.toBeInTheDocument();
  });
});
