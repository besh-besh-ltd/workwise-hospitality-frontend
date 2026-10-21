jest.mock("@/services/rfq", () => ({
  __esModule: true,
  addClause: jest.fn(() => Promise.resolve({ status: 1 })),
  getClausesByRfqProductId: jest.fn(),
  removeClause: jest.fn(() => Promise.resolve({})),
  updateClause: jest.fn(() => Promise.resolve({})),
  updateMinimumPassingScore: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/utils/sharedFunctions", () => ({ __esModule: true, handleFileUpload: jest.fn() }));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/components/shared/FullLoader", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/FileLink", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getClausesByRfqProductId } from "@/services/rfq";
import AddClauseModal from "./AddClause";

const clauses = [1, 2, 3, 4, 5].map((i) => ({
  id: i, clause_text: `Clause ${i}`, clause_type: "regular", weightage: 25, files: [],
}));

describe("AddClause passing-score field", () => {
  it("uses the e.g. 60 placeholder and explains the percentage in marks", async () => {
    getClausesByRfqProductId.mockResolvedValue({ success: true, minimum_passing_score: 60, data: clauses });
    render(
      <AddClauseModal show onClose={jest.fn()} product={{ id: 1, name: "P" }} rfq_id={1} onClauseChange={jest.fn()} />
    );
    const input = await screen.findByPlaceholderText("e.g. 60");
    await waitFor(() => expect(input).toHaveValue(60));
    expect(screen.getByText("60% = 75 of 125 marks")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "100" } });
    expect(screen.getByText("100% = 125 of 125 marks")).toBeInTheDocument();
  });
});
