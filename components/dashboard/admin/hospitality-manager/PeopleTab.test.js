// HN-3 — departments, visible on the People list.
//
// Ashlesha's report: verifying somebody's department meant opening every mapped
// user in turn. The column is that trip, saved.
//
// The reason it needs tests is the third state. A role scope with no department
// restriction means *all* departments — a real and quite powerful grant — and
// an empty cell would read as "none", which is its opposite.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import PeopleTab from "./PeopleTab";

const base = {
  user_id: 1,
  name: "Priya Sharma",
  email: "priya@example.com",
  mapping_type: 0,
  auto_map_projects: false,
  has_roles_here: true,
  all_departments: false,
  departments: [],
};

const renderWith = (user) =>
  render(
    <PeopleTab
      users={[{ ...base, ...user }]}
      filter="all"
      onFilterChange={() => {}}
      onRemoveUser={() => {}}
      isLoading={false}
    />
  );

describe("departments on the People list", () => {
  it("names them, so the admin does not have to open the user", async () => {
    renderWith({ departments: ["Procurement", "Engineering"] });
    expect(screen.getByText("Procurement")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });

  it("says 'All departments' rather than showing nothing", () => {
    // The state most likely to be got wrong: an unrestricted role scope is the
    // broadest grant there is, and an empty cell would read as the narrowest.
    renderWith({ all_departments: true, departments: [] });
    expect(screen.getByText("All departments")).toBeInTheDocument();
    expect(screen.queryByText("Not set")).not.toBeInTheDocument();
  });

  it("tells 'all departments' apart from 'none set'", () => {
    renderWith({ all_departments: false, departments: [] });
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.queryByText("All departments")).not.toBeInTheDocument();
  });

  it("says when somebody is mapped but holds no role at all here", () => {
    // Different from "no department": this person cannot act in the company
    // at all, which is worth seeing on the list rather than discovering later.
    renderWith({ has_roles_here: false, departments: [] });
    expect(screen.getByText("No roles here")).toBeInTheDocument();
  });

  it("has a Departments column header", () => {
    renderWith({ departments: ["Procurement"] });
    const header = screen.getByRole("columnheader", { name: "Departments" });
    expect(header).toBeInTheDocument();
  });

  it("keeps the department beside the person it belongs to", () => {
    render(
      <PeopleTab
        users={[
          { ...base, user_id: 1, name: "Priya Sharma", departments: ["Procurement"] },
          { ...base, user_id: 2, name: "Ravi Nair", departments: ["F&B"] },
        ]}
        filter="all"
        onFilterChange={() => {}}
        onRemoveUser={() => {}}
        isLoading={false}
      />
    );
    const priya = screen.getByText("Priya Sharma").closest("tr");
    expect(within(priya).getByText("Procurement")).toBeInTheDocument();
    expect(within(priya).queryByText("F&B")).not.toBeInTheDocument();
  });
});
