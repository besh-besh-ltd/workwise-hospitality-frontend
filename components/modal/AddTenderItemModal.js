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
}) => {
  const [loading, setLoading] = useState(false);

  if (!open || !product) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);

      const payload = {
        is_tender: 1,
        variant_id: product.variant_id,
        hotel_ids: hotelIds,
        vendors: [], // same API, no vendors at this stage
      };

      if (rfqId) payload.rfq_id = parseInt(rfqId);

      const response = await addProductToDraft(payload);

      const rfqResponse = response.data;
      if(rfqResponse && rfqResponse.isNew) {
        addRfqIdParam(rfqResponse.rfq_id)
      }

      toast.success(
        <h6>
          <b>{product.name}</b> added to tender successfully
        </h6>
      );

      onClose();
      onSuccess?.();
    } catch (error) {
      console.log(" error adding item to tender: ", error); 
        toast.error(
        <h6>Failed to add item to tender. Please try again.</h6>
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
        <h5 className="fw-bold mb-3">Add Item to Tender</h5>

        <p className="mb-4">
          Do you want to add{" "}
          <strong>{product.name}</strong> to this tender?
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
