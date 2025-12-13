import { handleUploadFile } from "@/services/rfq";
import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";

export default function RaiseInvoiceModal({ show, onClose, onAction }) {
  const [fileData, setFileData] = useState({
    file: null,
    url: null,
    loading: false,
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!show) {
      setFileData({
        file: null,
        url: null,
      });
      setTouched(false);
    }
  }, [show]);

  const handleFileChange = async (e) => {
    setTouched(true);
    setFileData(prev => ({...prev, loading: true}))
    const selectedFile = e.target.files?.[0] || null;
    const result = await handleUploadFile(selectedFile);
    const uploadedUrl = result.data[0].file_path;
    setFileData(prev => ({ ...prev, file: selectedFile, url: uploadedUrl, loading: false }));
  };

  const handleRaiseInvoice = async () => {
    if (!fileData.url) return;
    try {
      setFileData(prev => ({...prev, loading: true}));
      await onAction?.(fileData.url);
    } catch (error) {
      toast.warning("Something went wrong while raising invoice, please try again!")
    } finally {
      setFileData(prev => ({...prev, loading: false}))
    }
  };

  const fileError = touched && !fileData.file ? "Please select an invoice file." : "";

  const prettySize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="raise-invoice-modal"
    >
      <Modal.Header closeButton className="px-3 pt-3">
        <Modal.Title className="fw-semibold fs-5">Attach Invoice</Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2">
        <Form.Group controlId="invoiceFile">
          <Form.Label className="fw-semibold mb-1">Invoice Document</Form.Label>
          <p className="text-muted mb-3 text-sm" style={{ lineHeight: 1.5 }}>
            Upload the invoice document you want to attach to this Purchase Order.
            This document will be shared with the respective buyer.
          </p>

          <div className="d-flex flex-column gap-2">
            <Form.Control
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />

            {fileData.file && (
              <div className="small text-muted">
                <span className="fw-semibold">Selected:</span>{" "}
                {fileData.file.name}
                {fileData.file.size ? ` • ${prettySize(fileData.file.size)}` : ""}
              </div>
            )}

            {fileData.loading ? (
              <div className="small text-dark">Uploading file to the server...</div>
            ) : !fileData && touched && (
              <div className="small text-danger">{fileError}</div>
            )}

            <div className="form-text text-dark mt-1">
              <span className="fw-semibold">Important:</span> Once the invoice is
              uploaded and submitted, it can&apos;t be replaced or removed from this PO.
              Please double-check the document before proceeding.
            </div>
          </div>
        </Form.Group>
      </Modal.Body>

      <Modal.Footer className="border-0">
        <Button
          variant="outline-secondary"
          onClick={onClose}
          className="p-2 px-3"
        >
          Cancel
        </Button>
        <Button
          variant="success"
          onClick={handleRaiseInvoice}
          disabled={fileData.loading || !fileData.file}
          className="p-2 px-3"
        >
          {fileData.loading ? 'Loading...' : 'Raise Invoice'}
        </Button>
      </Modal.Footer>

      <style jsx>{`
        :global(.raise-invoice-modal .modal-dialog) {
          max-width: 640px;
          width: 100%;
        }
      `}</style>
    </Modal>
  );
}