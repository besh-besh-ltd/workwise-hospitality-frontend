// The sampling clause on an RFQ product.
//
// Sampling is ALREADY per-product here — the clause hangs off
// tbl_rfq_product_tech_evaluation (rfq_id, tbl_rfq_product_id) and the card
// itself says "Maximum 1 sampling clause per item". What it had no way to
// carry was anything product-specific: `clause_text` was hardcoded to the
// literal string "Sampling" and the form collected only Marks, so the
// sampling requirement on a 500ml shampoo and on a mattress protector read
// identically. A buyer could not say WHAT sample to send.
//
// Regular clauses on this same form have had a text field and per-clause
// attachments all along, and the backend `addClause` already accepts both
// (`clause_text`, `file_url[]`, validated in rfqValidation). Staging carries
// zero sampling rows — the feature shipped and was never usable.
// Client feedback item 3, RFQ half.

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  addClause: jest.fn(() => Promise.resolve({ status: 1 })),
  getClausesByRfqProductId: jest.fn(),
  removeClause: jest.fn(() => Promise.resolve({})),
  updateClause: jest.fn(() => Promise.resolve({})),
  updateMinimumPassingScore: jest.fn(() => Promise.resolve({})),
}));
jest.mock("@/utils/sharedFunctions", () => ({
  __esModule: true,
  handleFileUpload: jest.fn(() => Promise.resolve("https://s3/sample-spec.pdf")),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/components/shared/FullLoader", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/FileLink", () => ({
  __esModule: true,
  default: ({ Files = [] }) => <div data-testid="file-list">{Files.length}</div>,
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { addClause, getClausesByRfqProductId } from "@/services/rfq";
import { handleFileUpload } from "@/utils/sharedFunctions";
import AddClauseModal from "./AddClause";

const PRODUCT = { id: 8891, product_id: 4732, variant: 0, name: "5 WATT LED PANEL LIGHT" };
const RFQ_ID = 2386;

const mount = async (clauses = []) => {
  getClausesByRfqProductId.mockResolvedValue({
    success: true,
    minimum_passing_score: 60,
    data: clauses,
  });
  render(
    <AddClauseModal
      show
      onClose={jest.fn()}
      product={PRODUCT}
      rfq_id={RFQ_ID}
      onClauseChange={jest.fn()}
    />
  );
  // exact: the modal title is "Technical and Sampling Clauses"
  await screen.findByText("Sampling Clause", { exact: true });
  // ...and the card renders while the clause fetch is still in flight, with
  // every control on it disabled={loading}. Wait for it to settle, or
  // fireEvent.click lands on a disabled button and silently does nothing.
  await waitFor(() => {
    const b = screen.queryByRole("button", { name: /Add Sampling Clause/i });
    const added = screen.queryByText(/^Added$/);
    if (!b && added) return;              // a sampling clause already exists
    expect(b).not.toBeDisabled();
  });
};

const openSamplingForm = () => fireEvent.click(screen.getByRole("button", { name: /Add Sampling Clause/i }));
const samplingText = () => screen.getByPlaceholderText(/what sample/i);
const marksInput = () => screen.getByPlaceholderText(/^Marks$/i);

beforeEach(() => jest.clearAllMocks());

describe("the sampling clause form", () => {
  it("asks what sample is required, not just how many marks it is worth", async () => {
    await mount();
    openSamplingForm();
    expect(marksInput()).toBeInTheDocument();
    expect(samplingText()).toBeInTheDocument();
  });

  it("sends the buyer's own wording as the clause text", async () => {
    await mount();
    openSamplingForm();

    fireEvent.change(samplingText(), {
      target: { value: "Submit 2 x 500ml samples in original sealed packaging." },
    });
    fireEvent.change(marksInput(), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));

    await waitFor(() => expect(addClause).toHaveBeenCalled());
    expect(addClause).toHaveBeenCalledWith(
      expect.objectContaining({
        rfq_id: RFQ_ID,
        rfq_product_id: PRODUCT.id,
        clause_type: "sampling",
        weightage: 10,
        clause_text: "Submit 2 x 500ml samples in original sealed packaging.",
      })
    );
  });

  it("no longer sends the hardcoded word Sampling as the requirement", async () => {
    await mount();
    openSamplingForm();

    fireEvent.change(samplingText(), { target: { value: "One unit, unpacked, for drop test" } });
    fireEvent.change(marksInput(), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));

    await waitFor(() => expect(addClause).toHaveBeenCalled());
    expect(addClause.mock.calls[0][0].clause_text).not.toBe("Sampling");
  });

  it("will not add a sampling clause with no requirement written", async () => {
    await mount();
    openSamplingForm();

    fireEvent.change(marksInput(), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));

    expect(addClause).not.toHaveBeenCalled();
  });

  it("still will not add one with no marks", async () => {
    // The existing rule must survive.
    await mount();
    openSamplingForm();

    fireEvent.change(samplingText(), { target: { value: "Two samples" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));

    expect(addClause).not.toHaveBeenCalled();
  });

  it("carries an attachment against the sampling clause, like a regular clause", async () => {
    await mount();
    openSamplingForm();

    fireEvent.change(samplingText(), { target: { value: "Per the attached drawing" } });
    fireEvent.change(marksInput(), { target: { value: "8" } });

    const input = document.querySelector('input[type="file"][data-sampling-file]');
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { files: [new File(["x"], "drawing.pdf")] } });
    await waitFor(() => expect(handleFileUpload).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));
    await waitFor(() => expect(addClause).toHaveBeenCalled());
    expect(addClause.mock.calls[0][0].file_url).toEqual(["https://s3/sample-spec.pdf"]);
  });

  it("keeps the one-per-item rule", async () => {
    await mount([
      { clause_id: 1, clause_type: "sampling", clause_text: "Existing", weightage: 10, files: [] },
    ]);

    expect(screen.queryByRole("button", { name: /Add Sampling Clause/i })).not.toBeInTheDocument();
    expect(screen.getByText(/^Added$/)).toBeInTheDocument();
  });

  it("shows the existing sampling requirement's own wording, not the word Sampling", async () => {
    await mount([
      {
        clause_id: 1,
        clause_type: "sampling",
        clause_text: "Submit 2 x 500ml samples in original sealed packaging.",
        weightage: 10,
        files: [],
      },
    ]);

    expect(screen.getByText(/2 x 500ml samples/i)).toBeInTheDocument();
  });
});
