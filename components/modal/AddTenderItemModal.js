import React, { useState } from "react";
import { addProductToDraft } from "@/services/rfq";
import { toast } from "react-toastify";

const AddTenderItemModal = ({
  open,
  onClose,
  product,          // { name, variant_id }
  rfqId,
  addRfqIdParam,
  hotelIds = [],
  onSuccess,        // optional callback
  isTender = true,  // whether this is a tender or RFQ
}) => {
  const [loading, setLoading] = useState(false);

  if (!open || !product) return null;

  const entityLabel = isTender ? 'tender' : 'RFQ';

  const handleConfirm = async () => {
    try {
      setLoading(true);

      const payload = {
        is_tender: isTender ? 1 : 0,
        variant_id: product.variant_id,
        hotel_ids: hotelIds,
        vendors: [], // auto-add all vendors
      };

      if (rfqId) payload.rfq_id = parseInt(rfqId);

      const response = await addProductToDraft(payload);

      const rfqResponse = response.data;
      if(rfqResponse && rfqResponse.isNew) {
        addRfqIdParam(rfqResponse.rfq_id)
      }

      toast.success(
        <h6>
          <b>{product.name}</b> added to {entityLabel} successfully
        </h6>
      );

      onClose();
      onSuccess?.();
    } catch (error) {
      console.log(` error adding item to ${entityLabel}: `, error);
      toast.error(
        <h6>Failed to add item to {entityLabel}. Please try again.</h6>
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        zIndex: 1060,
        backgroundColor: "rgba(0,0,0,0.6)",
      }}
    >
      <div className="bg-white rounded shadow p-4" style={{ width: 420 }}>
        <h5 className="fw-bold mb-3">Add Item to {isTender ? 'Tender' : 'RFQ'}</h5>

        <p className="mb-4">
          Do you want to add{" "}
          <strong>{product.name}</strong> to this {entityLabel}?
        </p>

        <div className="d-flex justify-content-end gap-2">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTenderItemModal;
