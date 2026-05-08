import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Select from "react-select";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye } from "@fortawesome/free-regular-svg-icons";
import {
  faAdd,
  faTrash,
  faTrashRestore,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { searchProductsV2 } from "@/services/products";
import ContractedItemModal from "./ContractedItemModal";
import BypassArcReasonModal from "./BypassArcReasonModal";
import ArcReleaseWizardModal from "./ArcReleaseWizardModal";

const AddProductModal = ({
  rfqData,
  isOpen,
  onClose,
  onAdd,
  existingProducts = [],
  selectedHotelIds = [],
}) => {
  const router = useRouter();
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  // Phase 6: when the buyer tries to add a product that is already
  // covered by an active ARC, intercept and show ContractedItemModal so
  // they can route to the release-PO flow or explicitly bypass.
  const [contractedItem, setContractedItem] = useState(null);
  // Phase 8: ARC-override reason capture, presented after the buyer
  // chose "Continue with RFQ" on the ContractedItemModal.
  const [bypassReasonItem, setBypassReasonItem] = useState(null);
  // ARC release wizard — opened inline (no page navigation) when the
  // buyer picks "Create PO directly" on the ContractedItemModal so the
  // whole flow (vendor pick → quantity → review) lives inside this
  // wizard. Keeps continuity: closing returns the buyer to the same
  // RFQ context they came from.
  const [releaseWizardCtx, setReleaseWizardCtx] = useState(null);

  const fetchProducts = async () => {
    // Use selected hotel IDs from the edit page (reflects user changes),
    // falling back to rfqData.mappedHotels for the original mapping
    const hotel_ids = selectedHotelIds.length > 0
      ? selectedHotelIds
      : rfqData?.mappedHotels?.map(h => h.hotel_id) || [];
    const values = {
      search_key: productSearchTerm,
      hotel_ids,
    };
    try {
      const response = await searchProductsV2(values);
      setProducts(response.data);
    } catch (error) {
      toast.error(error.message);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Clear search state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setProductSearchTerm("");
      setProducts([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (productSearchTerm.length < 3) return;

    const handler = setTimeout(() => {
      setLoading(true);
      fetchProducts(productSearchTerm);
    }, 800);

    return () => {
      clearTimeout(handler);
    };
  }, [productSearchTerm]);

  return (
    <>
      {isOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              zIndex: 1040,
            }}
          ></div>
          <div
            className="modal show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ zIndex: 1050 }}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              role="document"
              style={{ maxWidth: "80vw", width: "80vw" }}
            >
              <div className="modal-content">
                <div
                  className="modal-header"
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <h5 className="modal-title">Add Products to RFQ #{rfqData.rfq_no}</h5>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    style={{
                      fontSize: 24,
                      padding: 0,
                      border: "none",
                      background: "transparent",
                    }}
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div
                  style={{
                    padding: "0 1.25rem",
                  }}
                  className="modal-body details-table"
                >
                  <div className="mb-3">
                    <label className="form-label fw-medium">Product Name</label>
                    <input
                      disabled={loading}
                      type="text"
                      name="product_name"
                      className={`form-control`}
                      value={loading ? `Fetching products for ${productSearchTerm}...` : productSearchTerm}
                      placeholder="Please enter atleast 3 letters"
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                      }}
                    />
                  </div>
                  {loading && (
                    <p className="mb-4">Fetching products...</p>
                  )}
                  {!loading && products && products.length > 0 && (() => {
                    // Build a set of existing variant_ids to hide already-added products
                    const existingVariantIds = new Set(
                      existingProducts.map(p => p.variant_id ?? p.variant)
                    );
                    const filteredProducts = products.filter(
                      item => !existingVariantIds.has(item.variant_id)
                    );

                    if (filteredProducts.length === 0) {
                      return (
                        <p className="text-muted mb-4">
                          All matching products are already added to this RFQ.
                        </p>
                      );
                    }

                    return (
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th style={{ maxWidth: "250px" }}>ID</th>
                            <th style={{ maxWidth: "300px" }}>Variant Name</th>
                            <th style={{ maxWidth: "300px" }}>Product Name</th>
                            <th>Category</th>
                            <th>Eligible Vendors</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.map((item) => {
                            // Backend (rfqModel.searchProduct) already returns
                            // vendor_count keyed to the RFQ's hotel scope. A
                            // zero count means no vendor in any selected
                            // hotel can quote on this variant — adding it
                            // would create a dead product, so we block it
                            // here instead of letting the user discover the
                            // problem after Update RFQ.
                            const vendorCount = Number(item.vendor_count) || 0;
                            const noVendors = vendorCount === 0;
                            return (
                              <tr key={`product-${item.variant_id}`}>
                                <td style={{ maxWidth: "250px" }}>
                                  {item.variant_id}
                                </td>
                                <td
                                  className="text-truncate"
                                  style={{ maxWidth: "300px" }}
                                >
                                  {item.variant_name}
                                </td>
                                <td
                                  className="text-truncate"
                                  style={{ maxWidth: "300px" }}
                                >
                                  {item.product_name}
                                  {item.arc_info?.is_under_arc && (
                                    <span
                                      title={`Already under an active rate contract — ${item.arc_info.arcs.length} vendor${item.arc_info.arcs.length === 1 ? '' : 's'}`}
                                      style={{
                                        marginLeft: 8,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: 0.4,
                                        textTransform: 'uppercase',
                                        background: 'linear-gradient(90deg, #2E5BA8 0%, #3b82f6 100%)',
                                        color: '#fff',
                                        verticalAlign: 'middle',
                                      }}
                                    >
                                      Contracted
                                    </span>
                                  )}
                                </td>
                                <td>{item.category_name}</td>
                                <td>
                                  {noVendors ? (
                                    <span
                                      className="badge"
                                      style={{
                                        background: '#fee2e2',
                                        color: '#991b1b',
                                        border: '1px solid #fecaca',
                                        fontWeight: 600,
                                        padding: '4px 9px',
                                      }}
                                      title="No eligible vendors in this RFQ's business units. Map vendors to a relevant hotel or try a different product."
                                    >
                                      0 vendors
                                    </span>
                                  ) : (
                                    <span
                                      className="badge"
                                      style={{
                                        background: '#dcfce7',
                                        color: '#166534',
                                        border: '1px solid #bbf7d0',
                                        fontWeight: 600,
                                        padding: '4px 9px',
                                      }}
                                    >
                                      {vendorCount} {vendorCount === 1 ? 'vendor' : 'vendors'}
                                    </span>
                                  )}
                                </td>
                                <td className="d-flex flex-column justify-content-center gap-2 h-100">
                                  <button
                                    className="page-linkd remove-icon d-flex gap-2 align-items-center"
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      color: noVendors ? '#94a3b8' : 'green',
                                      cursor: noVendors ? 'not-allowed' : 'pointer',
                                    }}
                                    disabled={noVendors}
                                    onClick={() => {
                                      if (noVendors) {
                                        toast.warn(
                                          `"${item.variant_name || item.product_name}" has no eligible vendors in this RFQ's business units and cannot be added.`
                                        );
                                        return;
                                      }
                                      // Contracted item: divert through the
                                      // dedicated modal so the buyer makes an
                                      // explicit choice — release PO or
                                      // bypass-and-RFQ.
                                      if (item.arc_info?.is_under_arc) {
                                        setContractedItem(item);
                                        return;
                                      }
                                      onAdd(item);
                                    }}
                                    title={
                                      noVendors
                                        ? 'No eligible vendors — cannot add this product'
                                        : 'Add this product to the RFQ'
                                    }
                                  >
                                    <FontAwesomeIcon icon={faAdd} />
                                    Select
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* The ContractedItemModal stays mounted (with contractedItem
              still set) while a child modal is open, but visually
              hidden via the open-flag. This way, cancelling out of a
              child returns the buyer to the original choice screen
              instead of dropping them on the empty Add-Product surface. */}
          <ContractedItemModal
            isOpen={!!contractedItem && !bypassReasonItem && !releaseWizardCtx}
            onClose={() => setContractedItem(null)}
            product={contractedItem}
            arcs={contractedItem?.arc_info?.arcs || []}
            onCreatePoDirectly={() => {
              if (!contractedItem) return;
              const arc = contractedItem.arc_info?.arcs?.[0];
              if (!arc) {
                toast.warn("No active contract found for this item.");
                setContractedItem(null);
                return;
              }
              // Open the release wizard inline as a modal so the buyer
              // never leaves the Add Product → Contracted Item flow.
              // The ContractedItemModal stays in state so cancelling
              // returns the buyer to it.
              setReleaseWizardCtx({
                arcId: arc.arc_id,
                arcItemId: arc.arc_item_id,
                hotelId: arc.hotel_id,
              });
            }}
            onContinueWithRfq={() => {
              if (!contractedItem) return;
              setBypassReasonItem(contractedItem);
            }}
          />

          <BypassArcReasonModal
            isOpen={!!bypassReasonItem}
            productName={bypassReasonItem?.variant_name || bypassReasonItem?.product_name}
            onClose={() => setBypassReasonItem(null)}
            onConfirm={(reason) => {
              if (!bypassReasonItem) return;
              const item = bypassReasonItem;
              // Successful confirmation: clear BOTH the bypass and the
              // parent contracted-item state so we don't bounce back to
              // the choice screen after the buyer already committed.
              setBypassReasonItem(null);
              setContractedItem(null);
              onAdd({ ...item, __bypass_arc_pending: true, __bypass_arc_reason: reason });
            }}
          />

          <ArcReleaseWizardModal
            isOpen={!!releaseWizardCtx}
            arcId={releaseWizardCtx?.arcId}
            arcItemId={releaseWizardCtx?.arcItemId}
            hotelId={releaseWizardCtx?.hotelId}
            onClose={() => setReleaseWizardCtx(null)}
            onSuccess={() => {
              // Release succeeded → unmount the whole modal stack
              // (parent contracted-item AND wizard) and route to the
              // contracted POs listing where the new draft sits at
              // the top. Also fold the parent Add Product modal so
              // the buyer isn't sitting on a stale UI.
              setReleaseWizardCtx(null);
              setContractedItem(null);
              if (typeof onClose === "function") onClose();
              router.push("/dashboard/buyer/purchase-order/contracted");
            }}
          />
        </>
      )}
    </>
  );
};

export default AddProductModal;
