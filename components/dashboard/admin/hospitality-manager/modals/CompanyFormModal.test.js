// Editing a company — the flow that did not exist.
//
// `updateHospitalityCompany` had been sitting in the service layer with no
// caller, and CompanyFormModal had no edit branch. So a company created with a
// typo in its GST or bank details could not be corrected from the product at
// all; the only route was to ask Workwise.
//
// One form serves both, which is what these tests are really about: the two
// ways a shared create/edit form goes wrong are opening blank on an edit, and
// carrying the last company's details into a create.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CompanyFormModal from "./CompanyFormModal";

const COMPANY = {
  id: 10001,
  name: "Kamat Hotels India Limited",
  region: "West",
  contact_email: "ops@kamat.example",
  pan: "AABCU9603R",
  gst: "27AABCU9603R1ZX",
  bank_name: "HDFC",
};

const renderModal = (props = {}) =>
  render(
    <CompanyFormModal
      isOpen
      onClose={() => {}}
      onSubmit={() => {}}
      isSubmitting={false}
      {...props}
    />
  );

describe("creating", () => {
  it("opens blank", () => {
    renderModal();
    expect(screen.getByText("Create New Company")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Company/i })).toBeInTheDocument();
  });
});

describe("editing", () => {
  it("opens on the company's current details, not blank", () => {
    // A form that opens blank on an edit does not read as an edit — it reads
    // as a create that is about to wipe everything.
    renderModal({ company: COMPANY });
    expect(screen.getByDisplayValue("Kamat Hotels India Limited")).toBeInTheDocument();
    expect(screen.getByDisplayValue("27AABCU9603R1ZX")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ops@kamat.example")).toBeInTheDocument();
  });

  it("says it is editing, and says what the change reaches", () => {
    renderModal({ company: COMPANY });
    expect(screen.getByText(/Edit Kamat Hotels India Limited/)).toBeInTheDocument();
    expect(
      screen.getByText(/every business unit under it/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save changes/i })).toBeInTheDocument();
  });

  it("does not carry one company's details into a create", () => {
    // The failure mode of a shared form: the previous company's GST and bank
    // details silently becoming a brand new company's.
    const { rerender } = renderModal({ company: COMPANY });
    expect(screen.getByDisplayValue("Kamat Hotels India Limited")).toBeInTheDocument();

    rerender(
      <CompanyFormModal isOpen company={null} onClose={() => {}} onSubmit={() => {}} isSubmitting={false} />
    );
    expect(screen.queryByDisplayValue("Kamat Hotels India Limited")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("27AABCU9603R1ZX")).not.toBeInTheDocument();
  });

  it("submits what is on screen after an edit", () => {
    const onSubmit = jest.fn();
    renderModal({ company: COMPANY, onSubmit });

    fireEvent.change(screen.getByDisplayValue("Kamat Hotels India Limited"), {
      target: { value: "Kamat Hotels India Ltd" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));

    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls[0][0].name).toBe("Kamat Hotels India Ltd");
  });
});
