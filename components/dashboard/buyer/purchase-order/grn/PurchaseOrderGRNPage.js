// components/PurchaseOrderGRNPage.jsx
import { handleMarkGRN } from "@/services/po";
import { handleUploadFile } from "@/services/rfq";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import {
  Card,
  Button,
  Form,
  Row,
  Col,
  Badge,
  Spinner,
} from "react-bootstrap";
import { BsBoxSeam } from "react-icons/bs";
import { toast } from "react-toastify";

const PurchaseOrderGRNPage = ({ poDetails, token, onBack }) => {
  const [fileData, setFileData] = useState({
    file: null,
    url: "",
    loading: false,
    touched: false,
  });
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!poDetails) {
    return (
      <div className="py-4 text-center">
        <Spinner animation="border" size="sm" className="me-2" />
        <span>Loading Purchase Order details…</span>
      </div>
    );
  }

  const {
    id,
    po_number,
    status,
    project_details,
    finalized_vendor_name,
    finalized_vendor_email,
    rfq_id,
    delivery_period,
    po_approved_on,
  } = poDetails;

  const isDispatched = status === "dispatched";
  const isGRN = status === "GRN";

  const parseDeliveryDate = () => {
    if (!po_approved_on || !delivery_period) return null;
    const days = parseInt(delivery_period, 10);
    if (Number.isNaN(days)) return null;
    const base = new Date(po_approved_on);
    if (Number.isNaN(base.getTime())) return null;
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + days);
    return d;
  };

  const deliveryDate = parseDeliveryDate();
  const deliveryDateLabel = deliveryDate ? deliveryDate.toDateString() : "N/A";

  const prettySize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setFileData((prev) => ({ ...prev, touched: true }));

    if (!selectedFile) {
      setFileData({ file: null, url: "", loading: false, touched: true });
      return;
    }

    try {
      setFileData((prev) => ({ ...prev, loading: true }));
      const result = await handleUploadFile(selectedFile);
      const uploadedUrl = result?.data?.[0]?.file_path;
      if (!uploadedUrl) {
        throw new Error("Failed to get uploaded file URL");
      }

      setFileData({
        file: selectedFile,
        url: uploadedUrl,
        loading: false,
        touched: true,
      });
      toast.success("GRN document uploaded successfully");
    } catch (err) {
      console.error("File upload error:", err);
      setFileData((prev) => ({ ...prev, loading: false, url: "", file: null }));
      toast.error(err.message ?? "Failed to upload GRN document");
    }
  };

  const handleSubmit = async () => {
    if (!isDispatched) {
      toast.error("GRN can only be marked when the PO status is 'dispatched'.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        po_id: id,
        rfq_id,
        grn_document_url: fileData.url || null,
        remarks: remarks?.trim() || "",
      };

      await handleMarkGRN(payload, token);

      toast.success("GRN marked successfully. Thank you!");
    } catch (err) {
      console.error("Error marking GRN:", err);
      toast.error(err.message ?? "Failed to mark GRN, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-3 sc-pt-80">
        {onBack && (
          <button
            onClick={onBack}
            className="btn btn-primary p-2 px-3"
            style={{ width: "fit-content" }}
            id="back_button-po_details-purchase_order_page"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
            Back
          </button>
        )}
        <span className="fw-semibold ms-3">Goods Received Note (GRN)</span>
      </div>

      {/* Info / status card */}
      <Card className="shadow-sm mb-3">
        <Card.Body>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
            <div className="d-flex align-items-center gap-3">
              <BsBoxSeam className="fs-3 text-primary" />
              <div className="d-flex flex-column">
                <span className="fw-semibold">
                  GRN for Purchase Order #{po_number}
                </span>
                <span className="small text-muted">
                  Please confirm receipt of goods and upload the GRN document.
                </span>
              </div>
            </div>
            <div className="text-md-end">
              <div className="mb-1">
                <span className="small text-muted me-1">Status:</span>
                <Badge
                  bg={isDispatched ? "warning" : "secondary"}
                  className="text-uppercase"
                >
                  {status || "N/A"}
                </Badge>
              </div>
              <div className="small text-muted">
                Expected Delivery: <strong>{deliveryDateLabel}</strong>
              </div>
            </div>
          </div>

          {isGRN ? (
            <div className="alert alert-success mt-3 mb-0 small">
              This GRN page is currently read-only because the PO status already marked as{" "}
              <strong>GRN</strong>. This page is only operational if the PO status is <strong>Dispatched</strong>.
            </div>
          ) : !isDispatched ? (
            <div className="alert alert-info mt-3 mb-0 small">
              This GRN page is currently read-only because the PO status is not{" "}
              <strong>dispatched</strong>. Once the PO is marked as dispatched,
              you&apos;ll be able to submit the GRN from here.
            </div>
          ) : null}
        </Card.Body>
      </Card>

      {/* PO overview */}
      <Row className="gy-3 mb-3">
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <h6 className="fw-semibold mb-2">PO Details</h6>
              <div className="small mb-1">
                <span className="text-muted">PO Number: </span>
                <strong>#{po_number}</strong>
              </div>
              <div className="small mb-1">
                <span className="text-muted">PO ID: </span>
                <strong>{id}</strong>
              </div>
              <div className="small mb-1">
                <span className="text-muted">RFQ ID: </span>
                <strong>{rfq_id ?? "N/A"}</strong>
              </div>
              <div className="small mb-1">
                <span className="text-muted">Project: </span>
                <strong>{project_details?.name || "N/A"}</strong>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Body>
              <h6 className="fw-semibold mb-2">Vendor Details</h6>
              <div className="small mb-1">
                <span className="text-muted">Vendor: </span>
                <strong>{finalized_vendor_name || "N/A"}</strong>
              </div>
              <div className="small mb-1">
                <span className="text-muted">Vendor Email: </span>
                <strong>{finalized_vendor_email || "N/A"}</strong>
              </div>
              <div className="small text-muted mt-2">
                Once the material is received at site, please verify quantity
                and basic condition, then submit GRN from this page.
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Steps & GRN form */}
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <h6 className="fw-semibold mb-3">How to complete the GRN</h6>
          <ol className="small text-muted mb-3 ps-3">
            <li>Verify that the shipment has reached your site.</li>
            <li>Check the quantity and condition of the received goods.</li>
            <li>Upload the GRN / delivery challan document (PDF / image).</li>
            <li>Add any remarks if there are discrepancies or notes.</li>
            <li>Submit the GRN to update the Purchase Order.</li>
          </ol>

          <Row className="gy-3">
            <Col md={6}>
              <Form.Group controlId="grnFile">
                <Form.Label className="fw-semibold">
                  GRN / Delivery Document <small className="text-muted">(optional)</small>
                </Form.Label>
                <Form.Control
                  type="file"
                  onChange={handleFileChange}
                  disabled={!isDispatched || fileData.loading || submitting}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                {fileData.loading && (
                  <div className="small text-muted mt-1">
                    <Spinner animation="border" size="sm" className="me-1" />
                    Uploading document…
                  </div>
                )}
                {fileData.file && !fileData.loading && (
                  <div className="small text-muted mt-1">
                    <span className="fw-semibold">Selected:</span>{" "}
                    {fileData.file.name}
                    {fileData.file.size
                      ? ` • ${prettySize(fileData.file.size)}`
                      : ""}
                  </div>
                )}
                <div className="form-text mt-1">
                  Attaching a clear GRN / delivery challan helps the purchase
                  and finance teams validate the receipt quickly.
                </div>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group controlId="grnRemarks">
                <Form.Label className="fw-semibold">
                  Remarks <small className="text-muted">(optional)</small>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={!isDispatched || submitting}
                  placeholder="Add any notes about shortages, damages, or other observations."
                />
              </Form.Group>
            </Col>
          </Row>

          {isGRN ? (
            <div className="alert alert-success mt-3 small mb-0">
              The GRN form is only enabled if the PO status is{" "}
              <strong>dispatched</strong> in Workwise.
            </div>
          ) : !isDispatched ? (
            <div className="alert alert-info mt-3 small mb-0">
              The GRN form will be enabled once the PO is marked as{" "}
              <strong>dispatched</strong> in Workwise.
            </div>
          ) : null}
        </Card.Body>
      </Card>

      {/* Actions */}
      <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mb-4">
        {onBack && (
          <Button
            variant="outline-secondary"
            className="p-2 px-3"
            onClick={onBack}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
        <Button
          variant="success"
          className="p-2 px-3"
          onClick={handleSubmit}
          disabled={!isDispatched || submitting}
        >
          {submitting ? "Submitting GRN..." : "Submit GRN"}
        </Button>
      </div>
    </>
  );
};

export default PurchaseOrderGRNPage;