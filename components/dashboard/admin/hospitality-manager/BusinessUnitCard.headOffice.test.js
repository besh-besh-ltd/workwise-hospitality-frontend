// Which unit is the Head Office.
//
// The migration that records it landed, the API refuses to create a second
// one, and the database enforces one per company with a partial unique index —
// but no screen ever showed it. An administrator could not tell which of their
// units was the Head Office without reading the name and guessing, which is
// exactly the question the flag was added to answer.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BusinessUnitCard from "./BusinessUnitCard";

const unit = (over = {}) => ({
  id: 31, name: "Phileein HO", city: "Mumbai", state: "MH", status: "Active", ...over,
});

const renderCard = (hotel) =>
  render(
    <BusinessUnitCard
      hotel={hotel}
      userCount={4}
      onEdit={() => {}}
      onSetHierarchy={() => {}}
      onRemove={() => {}}
      onSendCredentials={() => {}}
    />
  );

describe("the Head Office marker", () => {
  it("marks the unit that is the Head Office", () => {
    renderCard(unit({ is_head_office: true }));
    expect(screen.getByText(/head office/i)).toBeInTheDocument();
  });

  it("says nothing on an ordinary unit", () => {
    renderCard(unit({ is_head_office: false }));
    expect(screen.queryByText(/head office/i)).not.toBeInTheDocument();
  });

  it("says nothing when the payload predates the flag", () => {
    // Older responses omit it entirely; absent must not read as true.
    renderCard(unit());
    expect(screen.queryByText(/head office/i)).not.toBeInTheDocument();
  });
});
