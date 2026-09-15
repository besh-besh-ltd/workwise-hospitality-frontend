// HN-2 — removing a business unit created by mistake.
//
// Ashlesha reported that there was no way to remove a mis-created Head Office.
// There was no delete at any layer, so a typo stayed in the estate forever.
//
// This is a screen rather than a confirm dialog because the honest answer is
// usually "you cannot delete this, but you can archive it" — and that is only
// useful alongside what is in the way. The three reference groups are shown
// apart because they are different facts: work that lives here, rows a delete
// would take with it, and rows a delete would leave pointing at nothing.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

const mockPreview = jest.fn();
jest.mock("@/services/hospitality", () => ({
  previewHotelDeletion: (...a) => mockPreview(...a),
}));

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import RemoveUnitModal from "./RemoveUnitModal";

const HOTEL = { id: 10101, name: "The Orchid Pune" };

const renderModal = (props = {}) =>
  render(
    <RemoveUnitModal
      isOpen
      companyId={10001}
      hotel={HOTEL}
      onClose={() => {}}
      onRemove={() => {}}
      onArchive={() => {}}
      busy={false}
      {...props}
    />
  );

beforeEach(() => mockPreview.mockReset());

describe("a unit nothing refers to", () => {
  it("offers to delete it, and says it cannot be undone", async () => {
    mockPreview.mockResolvedValue({ data: { can_hard_delete: true, references: [], total: 0 } });
    renderModal();
    expect(
      await screen.findByRole("button", { name: /Delete permanently/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it("also offers archiving, now that an archived unit can be found again", async () => {
    // This screen used to withhold archiving whenever a clean delete was
    // possible. That was defensible while archiving was a one-way door — an
    // archived unit vanished from every list and no UI could restore it — but
    // it left an admin who only wanted to hide a unit with permanent deletion
    // as their single option. Archived units are now listed and restorable, so
    // the reversible action is the safer one and must be on offer.
    mockPreview.mockResolvedValue({ data: { can_hard_delete: true, references: [], total: 0 } });
    renderModal();
    await screen.findByRole("button", { name: /Delete permanently/i });
    expect(screen.getByRole("button", { name: /Archive/i })).toBeInTheDocument();
  });

  it("archives rather than deletes when archiving is chosen", async () => {
    const onArchive = jest.fn();
    mockPreview.mockResolvedValue({ data: { can_hard_delete: true, references: [], total: 0 } });
    renderModal({ onArchive });
    fireEvent.click(await screen.findByRole("button", { name: /Archive/i }));
    expect(onArchive).toHaveBeenCalledWith(HOTEL);
  });
});

describe("a unit that is in use", () => {
  const IN_USE = {
    data: {
      can_hard_delete: false,
      total: 941,
      references: [
        { key: "rfqs", label: "RFQs", kind: "blocks", count: 3 },
        { key: "user_mappings", label: "People mapped to this unit", kind: "destroys", count: 38 },
        { key: "role_scopes", label: "Role assignments scoped to this unit", kind: "orphans", count: 12 },
        { key: "vendor_subscriptions", label: "Vendor subscriptions covering this unit", kind: "orphans", count: 888 },
      ],
    },
  };

  it("refuses to delete, and offers archiving instead", async () => {
    mockPreview.mockResolvedValue(IN_USE);
    renderModal();
    expect(await screen.findByRole("button", { name: /Archive instead/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete permanently/i })).not.toBeInTheDocument();
  });

  it("itemises what is in the way rather than just saying no", async () => {
    // "No" without "because of these 941 things" leaves the admin nowhere.
    mockPreview.mockResolvedValue(IN_USE);
    renderModal();
    await screen.findByText("RFQs");
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("888")).toBeInTheDocument();
    expect(screen.getByText(/941/)).toBeInTheDocument();
  });

  it("separates rows that would be orphaned from rows that would be deleted", async () => {
    // The distinction the database itself does not make: two of these tables
    // have no foreign key, so a delete would succeed and leave them dangling.
    mockPreview.mockResolvedValue(IN_USE);
    renderModal();
    expect(await screen.findByText(/Would be left pointing at nothing/i)).toBeInTheDocument();
    expect(screen.getByText(/Would be deleted along with it/i)).toBeInTheDocument();
    expect(screen.getByText(/Work lives here/i)).toBeInTheDocument();
  });

  it("says archiving leaves the references alone", async () => {
    // The reason archiving is an answer rather than a consolation prize.
    mockPreview.mockResolvedValue(IN_USE);
    renderModal();
    expect(
      await screen.findByText(/hides it everywhere without touching any of them/i)
    ).toBeInTheDocument();
  });

  it("archives when asked", async () => {
    mockPreview.mockResolvedValue(IN_USE);
    const onArchive = jest.fn();
    renderModal({ onArchive });
    fireEvent.click(await screen.findByRole("button", { name: /Archive instead/i }));
    expect(onArchive).toHaveBeenCalledWith(HOTEL);
  });
});

describe("when the check itself fails", () => {
  it("does not offer either action on a guess", async () => {
    // Neither button may be offered without knowing what the unit is used for
    // — a delete on an unknown is exactly the mistake this screen prevents.
    mockPreview.mockRejectedValue(new Error("boom"));
    renderModal();
    await waitFor(() =>
      expect(screen.getByText(/Could not check what this unit is used for/i)).toBeInTheDocument()
    );
    expect(screen.queryByRole("button", { name: /Delete permanently/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Archive instead/i })).not.toBeInTheDocument();
  });
});
