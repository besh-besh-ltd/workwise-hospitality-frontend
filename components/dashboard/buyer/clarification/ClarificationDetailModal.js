import React, { useState } from "react";
import { Modal, Button, Form, Badge, Alert, Spinner } from "react-bootstrap";
import { BsUpload, BsX, BsFileEarmark, BsDownload, BsCheckCircleFill, BsClockFill } from "react-icons/bs";
import { toast } from "react-toastify";
import { resolveClarification } from "@/services/clarification";
import moment from "moment";

/**
 * ClarificationDetailModal
 * Displays clarification details and allows buyer to respond
 */
const ClarificationDetailModal = ({
  show,
  onHide,
  clarification,
  isBuyer = false,
  isOwner = false, // true if current vendor raised this clarification
  onSuccess,
}) => {
  const [response, setResponse] = useState("");
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = clarification?.status === "OPEN";
  const canRespond = isBuyer && isOpen;

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const allowedExtensions = ["pdf", "docx", "doc", "xlsx", "xls", "csv", "png", "jpg", "jpeg"];

    const validFiles = selectedFiles.filter((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      return allowedExtensions.includes(ext);
    });

    if (validFiles.length !== selectedFiles.length) {
      toast.warning("Some files were skipped. Only PDF, Word, Excel, and Image files are allowed.");
    }

    setFiles((prev) => [
      ...prev,
      ...validFiles.map((file) => ({ name: file.name, file })),
    ]);
    e.target.value = null;
  };

  const handleRemoveFile = (fileName) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      toast.error("Please enter a response.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("clarification_id", clarification.id);
      formData.append("response", response.trim());

      files.forEach((fileObj) => {
        formData.append("files", fileObj.file);
      });

      await resolveClarification(formData);

      toast.success("Response submitted and clarification closed!");
      setResponse("");
      setFiles([]);
      if (onSuccess) onSuccess();
      onHide();
    } catch (err) {
      console.error("Error submitting response:", err);
      toast.error(err?.response?.data?.message || err?.message?.response?.data?.message || "Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setResponse("");
    setFiles([]);
    onHide();
  };

  if (!clarification) return null;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg" backdrop="static">
      <Modal.Header closeButton className="py-2 px-3">
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          {isOwner ? "Your Clarification" : "Clarification Details"}
          <Badge bg={isOpen ? "warning" : "success"} className="ms-2">
            {isOpen ? (
              <>
                <BsClockFill className="me-1" />
                {isOwner ? "Pending Response" : "Open"}
              </>
            ) : (
              <>
                <BsCheckCircleFill className="me-1" />
                {clarification?.response ? "Resolved" : "Closed"}
              </>
            )}
          </Badge>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-3" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {/* Vendor Info - Only show to buyer or owner */}
        {(isBuyer || isOwner) && clarification.raised_by_vendor_name && (
          <div className="mb-3 p-2 bg-light rounded">
            <small className="text-muted">Raised by:</small>
            <p className="mb-0 fw-semibold">{clarification.raised_by_vendor_name}</p>
          </div>
        )}

        {/* Anonymous message for other vendors */}
        {!isBuyer && !isOwner && (
          <div className="mb-3 p-2 bg-light rounded">
            <small className="text-muted">Raised by:</small>
            <p className="mb-0 fw-semibold text-secondary">
              <em>Anonymous Vendor</em>
            </p>
          </div>
        )}

        {/* Subject */}
        <div className="mb-3">
          <label className="fw-semibold text-muted small">Subject</label>
          <p className="mb-0 fs-5">{clarification.subject}</p>
        </div>

        {/* Question */}
        <div className="mb-3">
          <label className="fw-semibold text-muted small">Question</label>
          <div className="border rounded p-3 bg-light">
            <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
              {clarification.question}
            </p>
          </div>
          <small className="text-muted">
            Asked on {moment(clarification.created_at).format("DD MMM YYYY, hh:mm A")}
          </small>
        </div>

        {/* Question Attachments */}
        {clarification.question_files && clarification.question_files.length > 0 && (
          <div className="mb-3">
            <label className="fw-semibold text-muted small">Question Attachments</label>
            <div className="d-flex flex-wrap gap-2">
              {clarification.question_files.map((file, idx) => (
                <a
                  key={idx}
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
                >
                  <BsDownload size={14} />
                  {file.file_name || `Attachment ${idx + 1}`}
                </a>
              ))}
            </div>
          </div>
        )}

        <hr />

        {/* Response Section */}
        {clarification.response ? (
          <>
            <div className="mb-3">
              <label className="fw-semibold text-muted small">Response</label>
              <div className="border rounded p-3 bg-success bg-opacity-10">
                <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                  {clarification.response}
                </p>
              </div>
              <small className="text-muted">
                Responded on {moment(clarification.responded_at).format("DD MMM YYYY, hh:mm A")}
              </small>
            </div>

            {/* Response Attachments */}
            {clarification.response_files && clarification.response_files.length > 0 && (
              <div className="mb-3">
                <label className="fw-semibold text-muted small">Response Attachments</label>
                <div className="d-flex flex-wrap gap-2">
                  {clarification.response_files.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline-success btn-sm d-flex align-items-center gap-2"
                    >
                      <BsDownload size={14} />
                      {file.file_name || `Attachment ${idx + 1}`}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : canRespond ? (
          <>
            <Alert variant="warning" className="mb-3">
              <p className="text-sm mb-0">
                <strong>Note:</strong> Submitting a response will automatically close this clarification
                and re-enable quote submission for all vendors.
              </p>
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                Your Response <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Enter your response to this clarification..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                disabled={isSubmitting}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Attachments (Optional)</Form.Label>
              <div className="border rounded p-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <label
                    htmlFor="response-file-upload"
                    className="btn btn-outline-secondary btn-sm p-2 px-3 d-flex align-items-center gap-2"
                    style={{ cursor: "pointer" }}
                  >
                    <BsUpload size={14} />
                    Upload Files
                  </label>
                  <input
                    id="response-file-upload"
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="d-none"
                    disabled={isSubmitting}
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                  />
                  <small className="text-muted">
                    PDF, Word, Excel, or Image files
                  </small>
                </div>

                {files.length > 0 && (
                  <div className="mt-2">
                    {files.map((fileObj, idx) => (
                      <div
                        key={idx}
                        className="d-inline-flex align-items-center gap-2 bg-light rounded px-2 py-1 me-2 mb-2"
                      >
                        <BsFileEarmark size={14} />
                        <span className="small text-truncate" style={{ maxWidth: 150 }}>
                          {fileObj.name}
                        </span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-danger"
                          onClick={() => handleRemoveFile(fileObj.name)}
                          disabled={isSubmitting}
                        >
                          <BsX size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Form.Group>
          </>
        ) : isOwner ? (
          // Vendor viewing their own pending clarification
          <Alert variant="info" className="mb-0">
            <BsClockFill className="me-2" />
            <strong>Your clarification is pending.</strong> The tender creator will respond soon.
            Quote submission is disabled until this clarification is resolved.
          </Alert>
        ) : (
          <Alert variant="warning" className="mb-0">
            <BsClockFill className="me-2" />
            Awaiting response from tender creator.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer className="py-2 px-3">
        <Button variant="outline-secondary" className="p-2" onClick={handleClose} size="sm">
          Close
        </Button>
        {canRespond && (
          <Button
            variant="success"
            onClick={handleSubmitResponse}
            disabled={isSubmitting || !response.trim()}
            size="sm"
            className="p-2"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Submitting...
              </>
            ) : (
              "Submit Response & Close Clarification"
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ClarificationDetailModal;
