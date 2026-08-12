/**
 * "+ Add Products" must actually add products.
 *
 * The modal was written for the WH-69 edit flow, where `PUT /rfq/update`
 * reads the whole product list off the snapshot and inserts anything
 * carrying `id: null`. Staging into Redux and letting the save pick it up
 * is correct there.
 *
 * The same trigger is rendered in the DRAFT wizard, whose save goes to
 * `POST /rfq/save-draft` — an endpoint that has never read a product list
 * and never inserts `tbl_rfq_products` rows. So in draft mode the staged
 * product had no persistence path at all: the save returned 200, the
 * post-save rehydrate replaced Redux with the server's list, and the
 * product the user had just added disappeared. Reproduced on production
 * against draft 821.
 *
 * A draft has real product rows from the moment it exists, so there is
 * nothing to stage — the product must be created server-side the same way
 * "Add variant" (Item.js) and the Start-RFQ wizard already do it.
 */

jest.mock("@/services/products", () => ({
  __esModule: true,
  searchProductsV2: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRecommendedProducts: jest.fn(),
  addProductToDraft: jest.fn(),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { info: jest.fn(), error: jest.fn(), success: jest.fn() },
}));

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import AddProductsModal from "./AddProductsModal";
import { getRecommendedProducts, addProductToDraft } from "@/services/rfq";
import { searchProductsV2 } from "@/services/products";
import { toast } from "react-toastify";

// --- redux -----------------------------------------------------------------
// The root reducer IS the rfqProducts slice (redux/store.js wires
// `slice.js`'s default export straight in), so `state.rfqProducts` is the
// product ARRAY, not a nested slice object.
let storeState;
const dispatch = jest.fn();
jest.mock("react-redux", () => ({
  __esModule: true,
  useDispatch: () => dispatch,
  useSelector: (fn) => fn(storeState),
}));

const RICE = {
  product_variant_id: 10201,
  variant_name: "RICE KAMANDAL 4 X 1",
  category_name: "KST",
  vendor_count: 3,
};
const PANEER = {
  product_variant_id: 1037,
  variant_name: "PANEER",
  category_name: "DAIRY",
  vendor_count: 2,
};

function draftProps(overrides = {}) {
  return {
    isOpen: true,
    onClose: jest.fn(),
    hotelIds: [30, 31],
    rfqLabel: "RFQ",
    mode: "draft",
    rfqId: 821,
    sheetId: undefined,
    onBeforeAdd: jest.fn().mockResolvedValue(undefined),
    onAdded: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function openWith(props) {
  const view = render(<AddProductsModal {...props} />);
  // Recommendations resolve on open.
  await screen.findByText(RICE.variant_name);
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  storeState = { rfqProducts: [] };
  getRecommendedProducts.mockResolvedValue({ data: [RICE] });
  searchProductsV2.mockResolvedValue({ data: [RICE] });
  addProductToDraft.mockResolvedValue({ status: 1, data: { rfq_id: 821 } });
});

describe("AddProductsModal — draft mode persists the product", () => {
  it("creates the product on the server instead of only staging it in Redux", async () => {
    const props = draftProps();
    await openWith(props);

    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => expect(addProductToDraft).toHaveBeenCalledTimes(1));
    expect(addProductToDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        rfq_id: 821,
        variant_id: 10201,
        hotel_ids: [30, 31],
      })
    );
  });

  it("flushes the wizard's unsaved edits before creating the row", async () => {
    const props = draftProps();
    await openWith(props);

    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => expect(addProductToDraft).toHaveBeenCalled());
    // Adding rehydrates the draft from the server, which would otherwise
    // discard quantity/unit the user typed but has not saved yet.
    expect(props.onBeforeAdd).toHaveBeenCalled();
    expect(props.onBeforeAdd.mock.invocationCallOrder[0]).toBeLessThan(
      addProductToDraft.mock.invocationCallOrder[0]
    );
  });

  it("carries sheet_id so products stay visible on Excel/magic drafts", async () => {
    // getRfqDraftById filters products by sheet_id when the draft has a
    // sheet, so a row written with sheet_id NULL is invisible in the editor.
    const props = draftProps({ sheetId: 77 });
    await openWith(props);

    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => expect(addProductToDraft).toHaveBeenCalled());
    expect(addProductToDraft).toHaveBeenCalledWith(
      expect.objectContaining({ sheet_id: 77 })
    );
  });

  it("reloads the draft once the user is done, so the new row renders", async () => {
    const props = draftProps();
    await openWith(props);

    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => expect(addProductToDraft).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^done$/i }));
    });

    expect(props.onAdded).toHaveBeenCalled();
  });

  it("does not claim the product was added when the server rejects it", async () => {
    addProductToDraft.mockRejectedValue(new Error("boom"));
    const props = draftProps();
    await openWith(props);

    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // The row must stay actionable — an "Added" pill on a product the
    // server refused is exactly the lie this bug was made of.
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    expect(screen.queryByText(/^Added$/)).not.toBeInTheDocument();
  });

  it("does not reload the draft when nothing was added", async () => {
    const props = draftProps();
    await openWith(props);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^done$/i }));
    });

    expect(props.onAdded).not.toHaveBeenCalled();
  });
});

describe("AddProductsModal — edit mode still stages into the snapshot", () => {
  it("dispatches to Redux and never calls the draft endpoint", async () => {
    // PUT /rfq/update inserts anything carrying id: null, so staging is
    // the correct behaviour here and must not regress.
    const props = draftProps({ mode: "edit", rfqId: undefined });
    await openWith(props);

    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(addProductToDraft).not.toHaveBeenCalled();
  });
});

describe("AddProductsModal — products already on the RFQ", () => {
  it("marks a product that is already on the RFQ as added", async () => {
    // The guard read `s.rfqProducts?.rfqProducts`, but the root reducer is
    // the slice itself, so that was always undefined and the guard never
    // fired. Re-adding then minted a phantom second line at variant + 1.
    storeState = { rfqProducts: [{ product_variant_id: 10201 }] };
    await openWith(draftProps());

    expect(screen.getByText(/^Added$/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^add$/i })).not.toBeInTheDocument();
  });

  it("falls back to product_id for rows hydrated by the edit flow", async () => {
    // getRfqById aliases product_variant_id AS product_id.
    storeState = { rfqProducts: [{ product_id: 10201 }] };
    await openWith(draftProps());

    expect(screen.getByText(/^Added$/)).toBeInTheDocument();
  });

  it("still offers products that are not on the RFQ", async () => {
    storeState = { rfqProducts: [{ product_variant_id: PANEER.product_variant_id }] };
    await openWith(draftProps());

    expect(screen.getByRole("button", { name: /^add$/i })).toBeInTheDocument();
  });
});
