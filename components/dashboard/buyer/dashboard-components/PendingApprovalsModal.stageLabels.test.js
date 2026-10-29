// Pending approvals use the one stage vocabulary, and a Group ARC approval is
// never mixed into (or named like) a Unit ARC one.
jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("next/link", () => {
  const Link = ({ children, href, ...rest }) => <a href={href} {...rest}>{children}</a>;
  Link.displayName = "Link";
  return Link;
});
jest.mock("@/services/dashboard", () => ({ __esModule: true, getPendingApprovalsDetail: jest.fn() }));

import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import PendingApprovalsModal from "./PendingApprovalsModal";
import { getPendingApprovalsDetail } from "@/services/dashboard";

const item = (over) => ({ entity_id: 1, entity_type: "ARC_TECH", meta: {}, ...over });

it("names Unit and Group ARC stages apart and uses vocabulary labels", async () => {
  getPendingApprovalsDetail.mockResolvedValue({
    status: 1,
    data: [
      item({ entity_id: 1, entity_type: "ARC_TECH", is_group: false }),
      item({ entity_id: 2, entity_type: "ARC_TECH", is_group: true }),
      item({ entity_id: 3, entity_type: "NEGOTIATION_QUOTE" }),
      item({ entity_id: 4, entity_type: "ARC_NEGOTIATION" }),
    ],
  });
  render(<PendingApprovalsModal onClose={() => {}} filters={{}} />);
  await act(async () => {});
  expect(screen.getByText("Unit ARC · Technical Approval")).toBeInTheDocument();
  expect(screen.getByText("Group ARC · Technical Approval")).toBeInTheDocument();
  expect(screen.getByText("Final Vendor Approval")).toBeInTheDocument();
  expect(screen.getByText("Unit ARC · Negotiation Round Approval")).toBeInTheDocument();
});

it("never shows raw underscores for an unknown type", async () => {
  getPendingApprovalsDetail.mockResolvedValue({ status: 1, data: [item({ entity_type: "NEW_THING" })] });
  render(<PendingApprovalsModal onClose={() => {}} filters={{}} />);
  await act(async () => {});
  expect(screen.getByText("New Thing")).toBeInTheDocument();
});
