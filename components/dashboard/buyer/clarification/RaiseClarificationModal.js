import React, { useState } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import { BsUpload, BsX, BsFileEarmark } from "react-icons/bs";
import { toast } from "react-toastify";
import { raiseClarification } from "@/services/clarification";

/**
 * RaiseClarificationModal
 * Modal for vendors to raise a new clarification for a tender
 */
const RaiseClarificationModal = ({
  show,
  onHide,
  rfqId,
  onSuccess,
  token = null,
}) => {
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  const handleSubmit = async () => {
    if (!subject.trim()) {
      setError("Please enter a subject for your clarification.");
      return;
    }
    if (!question.trim()) {
      setError("Please enter your clarification question.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("rfq_id", rfqId);
      formData.append("subject", subject.trim());
      formData.append("question", question.trim());

      files.forEach((fileObj) => {
        formData.append("files", fileObj.file);
      });

      await raiseClarification(formData, token);

      toast.success("Clarification submitted successfully!");
      resetForm();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error submitting clarification:", err);
      toast.error(err?.message?.response?.data?.message || "Failed to submit clarification. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubject("");
    setQuestion("");
    setFiles([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg" backdrop="static">
      <Modal.Header closeButton className="py-2 px-3 bg-warning bg-opacity-25">
        <Modal.Title className="fs-5">Raise Clarification</Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-3">
        <Alert variant="warning" className="mb-3">
          <p className="text-sm mb-0">
            <strong>Note:</strong> Once submitted, this clarification cannot be edited or deleted.
            <br/>All vendors will be blocked from submitting quotes until this clarification is resolved.
          </p>
        </Alert>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">
              Subject <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              placeholder="Brief subject of your clarification"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSubmitting}
              maxLength={200}
            />
            <Form.Text className="text-muted">
              {subject.length}/200 characters
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">
              Clarification Question <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              placeholder="Describe your clarification request in detail..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isSubmitting}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Attachments (Optional)</Form.Label>
            <div className="border rounded p-3">
              <div className="d-flex align-items-center gap-2 mb-2">
                <label
                  htmlFor="clarification-file-upload"
                  className="btn btn-outline-secondary btn-sm p-2 px-3 d-flex align-items-center gap-2"
                  style={{ cursor: "pointer" }}
                >
                  <BsUpload size={14} />
                  Upload Files
                </label>
                <input
                  id="clarification-file-upload"
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
        </Form>
      </Modal.Body>
      <Modal.Footer className="py-2 px-3">
        <Button
          variant="outline-secondary"
          className="p-2"
          onClick={handleClose}
          disabled={isSubmitting}
          size="sm"
        >
          Cancel
        </Button>
        <Button
          variant="warning"
          onClick={handleSubmit}
          disabled={isSubmitting || !subject.trim() || !question.trim()}
          size="sm"
          className="p-2"
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="me-2" />
              Submitting...
            </>
          ) : (
            "Submit Clarification"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RaiseClarificationModal;
