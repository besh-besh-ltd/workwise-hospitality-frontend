// One role chip per grant, not per title: the same role at two units is two chips.
jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import UserRow from "./UserRow";

const renderRow = (roleScopes, mappings = []) =>
  render(
    <table><tbody>
      <UserRow
        account={{ id: 1, name: "Asha Menon", email: "a@x.com", status: "active" }}
        isHospitality
        mappings={mappings}
        roleScopes={roleScopes}
        departments={[]}
        onEdit={() => {}}
      />
    </tbody></table>
  );

describe("UserRow role chips", () => {
  it("renders two chips for the same role at two different units", () => {
    renderRow(
      [
        { id: 1, role_id: 9, role_title: "ARC Technical Evaluator", company_id: 1, hotel_id: 10 },
        { id: 2, role_id: 9, role_title: "ARC Technical Evaluator", company_id: 1, hotel_id: 11 },
      ],
      [
        { mapping_type: 1, hospitality_company_id: 1, hospitality_hotel_id: 10, hotel_name: "Orchid Mumbai" },
        { mapping_type: 1, hospitality_company_id: 1, hospitality_hotel_id: 11, hotel_name: "Orchid Goa" },
      ]
    );
    expect(screen.getByText(/ARC Technical Evaluator · Orchid Mumbai/)).toBeInTheDocument();
    expect(screen.getByText(/ARC Technical Evaluator · Orchid Goa/)).toBeInTheDocument();
  });

  it("labels a company-wide grant All units", () => {
    renderRow([{ id: 3, role_id: 9, role_title: "RFQ Creator", company_id: 1, hotel_id: null }]);
    expect(screen.getByText("RFQ Creator · All units")).toBeInTheDocument();
  });
});
