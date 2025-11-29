// pages/dashboard/buyer/purchase-order/grn/index.js
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Spinner, Alert, Container } from "react-bootstrap";
import { toast } from "react-toastify";

import { getPoDetails } from "@/services/po";
import PurchaseOrderGRNPage from "@/components/dashboard/buyer/purchase-order/grn/PurchaseOrderGRNPage";

const PurchaseOrderGRNIndex = () => {
  const router = useRouter();
  const { rfq, po, token } = router.query; // rfq, po from URL; token for backend auth

  const [poDetails, setPoDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState(null);

  const fetchPODetails = useCallback(async () => {
    if (!po || !token) return;

    setLoading(true);
    setError(null);
    setForbidden(false);

    try {
      // You can adjust this to match your actual service signature
      // e.g. getPoDetails({ poId: po, token })
      const res = await getPoDetails(po, token);
      if (res) {
        setPoDetails(res);
      } else {
        setError("Unable to load Purchase Order details.");
      }
    } catch (err) {
      console.error("Error fetching PO details for GRN:", err);

      const status =
        err?.status || err?.response?.status || err?.code || null;

      if (status === 403) {
        setForbidden(true);
      } else {
        setError(
          err?.message || "Something went wrong while loading PO details."
        );
        toast.error("Failed to load Purchase Order details.");
      }
    } finally {
      setLoading(false);
    }
  }, [po, token]);

  useEffect(() => {
    if (!router.isReady) return;
    fetchPODetails();
  }, [router.isReady, fetchPODetails]);

  const handleBack = () => {
    // if (rfq) {
    //   router.push(`/dashboard/buyer/purchase-order?rfq_id=${rfq}&po_id=${po}`);
    // } else {
    //   router.push("/dashboard/buyer/purchase-order");
    // }

    router.push("/");
  };

  return (
    <Container fluid className="py-3 py-md-4">
      {loading && (
        <div className="py-5 text-center">
          <Spinner animation="border" className="mb-2" />
          <div className="small text-muted mt-2">
            Loading Purchase Order details…
          </div>
        </div>
      )}

      {!loading && forbidden && (
        <div className="py-5">
          <Alert variant="danger" className="mx-auto" style={{ maxWidth: 640 }}>
            <Alert.Heading>Access denied</Alert.Heading>
            <p className="mb-1">
              You do not have permission to access the GRN page for this
              Purchase Order.
            </p>
            <p className="mb-0 small text-muted">
              The link might be invalid, expired, or you may not be the assigned
              site representative for this PO.
            </p>
          </Alert>
        </div>
      )}

      {!loading && !forbidden && error && (
        <div className="py-5">
          <Alert variant="warning" className="mx-auto" style={{ maxWidth: 640 }}>
            <Alert.Heading>Unable to load PO details</Alert.Heading>
            <p className="mb-1">{error}</p>
            <p className="mb-0 small text-muted">
              Please refresh the page or contact your administrator if the issue
              persists.
            </p>
          </Alert>
        </div>
      )}

      {!loading && !forbidden && !error && poDetails && (
        <PurchaseOrderGRNPage
          poDetails={poDetails}
          token={token}
          onBack={handleBack}
        />
      )}
    </Container>
  );
};

export default PurchaseOrderGRNIndex;