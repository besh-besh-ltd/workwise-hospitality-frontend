// Choosing who receives login credentials (UM-12).
//
// This was a window.confirm that mailed everyone mapped to the unit. The mail
// carries a plaintext password for anyone still on the shared default, so the
// blast radius of a mistaken click was every account at the unit — and an
// admin helping one person who had lost their details had no way to reach only
// them.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SendCredentialsModal from "./SendCredentialsModal";

const HOTEL = { id: 10101, name: "The Orchid Pune" };
const USERS = [
  { user_id: 80011, name: "Priya", email: "priya@example.com" },
  { user_id: 80012, name: "Ravi", email: "ravi@example.com" },
  { user_id: 80013, name: "Anita", email: "anita@example.com" },
];

const setup = (props = {}) =>
  render(
    <SendCredentialsModal
      isOpen
      onClose={jest.fn()}
      hotel={HOTEL}
      users={USERS}
      isSending={false}
      onSend={jest.fn()}
      {...props}
    />
  );

describe("recipient picker", () => {
  it("lists everyone who could receive credentials, and names the unit", () => {
    setup();
    expect(screen.getByText("The Orchid Pune")).toBeInTheDocument();
    expect(screen.getByText("Priya")).toBeInTheDocument();
    expect(screen.getByText("Anita")).toBeInTheDocument();
  });

  it("selects nobody by default", () => {
    setup();
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
    // Sending is impossible until somebody is chosen.
    expect(screen.getByRole("button", { name: /Send to 0 selected/ })).toBeDisabled();
  });

  it("sends to exactly the people ticked", () => {
    const onSend = jest.fn();
    setup({ onSend });

    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getAllByRole("checkbox")[2]);
    fireEvent.click(screen.getByRole("button", { name: /Send to 2 selected/ }));

    expect(onSend).toHaveBeenCalledWith([80011, 80013]);
  });

  it("still allows sending to everyone, as a deliberate choice", () => {
    const onSend = jest.fn();
    setup({ onSend });

    fireEvent.click(screen.getByRole("button", { name: /Send to everyone \(3\)/ }));
    // null, not an empty array: the server reads no selection as "all", and
    // an empty array from a picker with nothing ticked must not mean nobody.
    expect(onSend).toHaveBeenCalledWith(null);
  });

  it("warns that the mail may contain a password in plain text", () => {
    setup();
    expect(screen.getByText(/plain\s*text/i)).toBeInTheDocument();
  });

  it("says so when the unit has nobody mapped", () => {
    setup({ users: [] });
    expect(screen.getByText(/no users are mapped/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send to everyone/ })).toBeDisabled();
  });

  it("forgets the selection when dismissed", () => {
    const onClose = jest.fn();
    const { rerender } = setup({ onClose });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <SendCredentialsModal
        isOpen
        onClose={onClose}
        hotel={HOTEL}
        users={USERS}
        isSending={false}
        onSend={jest.fn()}
      />
    );
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
  });

  it("cannot be double-submitted while sending", () => {
    setup({ isSending: true });
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByRole("button", { name: /Sending/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Send to everyone/ })).toBeDisabled();
  });
});
