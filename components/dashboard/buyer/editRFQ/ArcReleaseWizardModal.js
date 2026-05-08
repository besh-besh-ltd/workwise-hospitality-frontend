import React from "react";
import { useRouter } from "next/router";
import ArcReleaseWizard from "./ArcReleaseWizard";

// Modal wrapper around the ARC Release wizard so the buyer can stay
// inside the RFQ flow (Add Product → Contracted Item → Release) without
// a context-switching page navigation. Same wizard body as the
// /dashboard/buyer/arc-release/new page; only the chrome differs.
//
// Props:
//   isOpen, onClose      — modal open / close control
//   arcId, arcItemId,    — required identifiers (sourced from the
//   hotelId                 ContractedItemModal selection).
//   onSuccess(po_id)     — caller decides what happens after the
//                          release is created (default: navigate to
//                          the contracted POs listing).

const ArcReleaseWizardModal = ({ isOpen, onClose, arcId, arcItemId, hotelId, onSuccess }) => {
  const router = useRouter();
  if (!isOpen) return null;

  const handleSuccess = (po_id) => {
    if (typeof onSuccess === "function") {
      onSuccess(po_id);
      return;
    }
    // Default: close the modal and route to the contracted POs
    // listing where the new draft sits at the top.
    onClose?.();
    router.push("/dashboard/buyer/purchase-order/contracted");
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.55)",
          zIndex: 2010,
        }}
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Draft a Contracted PO"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(880px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(15, 23, 42, 0.25)",
          zIndex: 2011,
          padding: "28px 30px",
          fontFamily: "inherit",
        }}
      >
        <ArcReleaseWizard
          arc_id={arcId}
          arc_item_id={arcItemId}
          hotel_id={hotelId}
          onClose={onClose}
          onSuccess={handleSuccess}
          variant="modal"
        />
      </div>
    </>
  );
};

export default ArcReleaseWizardModal;
