import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, Badge, Alert, Spinner } from "react-bootstrap";
import { BsUpload, BsX, BsFileEarmark, BsDownload, BsCheckCircleFill, BsClockFill, BsChatDots, BsSend, BsLock } from "react-icons/bs";
import { toast } from "react-toastify";
import { sendClarificationMessage, resolveClarification } from "@/services/clarification";
import moment from "moment";
import ConfirmationModal from "@/components/modal/ConfirmationModal";

/**
 * ClarificationDetailModal
 * Displays clarification as a chat thread with multiple messages
 * Supports back-and-forth conversation between buyer and vendor
 */
const ClarificationDetailModal = ({
  show,
  onHide,
  clarification,
  isBuyer = false,
  isOwner = false, // true if current vendor raised this clarification
  onSuccess,
  token = null, // For vendor access
  onRefresh, // Callback to refresh data after sending
}) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const messagesEndRef = useRef(null);

  const isOpen = clarification?.status === "OPEN";
  const canSendMessage = (isBuyer || isOwner) && isOpen;

  // Get messages array from clarification (new structure) or fallback to old structure
  const messages = clarification?.messages || [];

  // Scroll to bottom of messages when modal opens or new message is added
  useEffect(() => {
    if (show && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [show, messages.length]);

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

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("clarification_id", clarification.id);
      formData.append("message", message.trim());

      files.forEach((fileObj) => {
        formData.append("files", fileObj.file);
      });

      await sendClarificationMessage(formData, token);

      toast.success("Message sent successfully!");
      setMessage("");
      setFiles([]);
      if (onRefresh) onRefresh();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error(err?.response?.data?.message || err?.message?.response?.data?.message || "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseClarification = async () => {
    setIsClosing(true);

    try {
      const formData = new FormData();
      formData.append("clarification_id", clarification.id);

      // If there's a message, include it as the final message
      if (message.trim()) {
        formData.append("response", message.trim());
        files.forEach((fileObj) => {
          formData.append("files", fileObj.file);
        });
      }

      await resolveClarification(formData);

      toast.success("Clarification closed successfully!");
      setMessage("");
      setFiles([]);
      setShowCloseConfirm(false);
      if (onRefresh) onRefresh();
      if (onSuccess) onSuccess();
      onHide();
    } catch (err) {
      console.error("Error closing clarification:", err);
      toast.error(err?.response?.data?.message || err?.message?.response?.data?.message || "Failed to close clarification. Please try again.");
    } finally {
      setIsClosing(false);
    }
  };

  const handleClose = () => {
    setMessage("");
    setFiles([]);
    setShowCloseConfirm(false);
    onHide();
  };

  // Render a single message bubble (Apple Messages style)
  const renderMessageBubble = (msg, idx) => {
    // Determine if this is the viewer's own message
    const isMyMessage = isBuyer
      ? msg.sender_type === "BUYER"
      : msg.sender_type === "VENDOR";

    // My messages: right-aligned, blue | Other's messages: left-aligned, gray
    const alignment = isMyMessage ? "end" : "start";
    const bgColor = isMyMessage ? "#007aff" : "#e5e5ea";
    const textColor = isMyMessage ? "#fff" : "#000";
    // Apple-style rounded corners - tail on the sender's side
    const borderRadius = isMyMessage
      ? "18px 18px 4px 18px"
      : "18px 18px 18px 4px";

    return (
      <div
        key={msg.id || idx}
        className={`d-flex justify-content-${alignment} mb-2`}
      >
        <div
          style={{
            backgroundColor: bgColor,
            color: textColor,
            maxWidth: "75%",
            padding: "8px 12px",
            borderRadius: borderRadius,
          }}
        >
          {/* Sender name - only show for received messages */}
          {!isMyMessage && (
            <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "2px" }}>
              {msg.sender_name || (msg.sender_type === "VENDOR" ? "Vendor" : "Buyer")}
            </div>
          )}

          {/* Message content */}
          <div style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.35 }}>
            {msg.message}
          </div>

          {/* Message files */}
          {msg.files && msg.files.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-1">
              {msg.files.map((file, fileIdx) => (
                <a
                  key={fileIdx}
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="d-flex align-items-center gap-1"
                  style={{
                    fontSize: "0.7rem",
                    color: isMyMessage ? "#fff" : "#007aff",
                    textDecoration: "underline",
                  }}
                >
                  <BsDownload size={10} />
                  {file.file_name || `File ${fileIdx + 1}`}
                </a>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div
            style={{
              fontSize: "0.65rem",
              opacity: 0.6,
              marginTop: "2px",
              textAlign: isMyMessage ? "right" : "left",
            }}
          >
            {moment(msg.created_at).format("hh:mm A")}
          </div>
        </div>
      </div>
    );
  };

  if (!clarification) return null;

  return (
    <>
      <Modal show={show} onHide={handleClose} centered size="lg" backdrop="static">
        <Modal.Header closeButton className="py-3 px-4">
          <Modal.Title className="fs-5 d-flex align-items-center gap-2">
            <BsChatDots className="me-1" />
            {isOwner ? "Your Clarification" : "Clarification Details"}
            <Badge bg={isOpen ? "warning" : "success"} className="ms-2">
              {isOpen ? (
                <>
                  <BsClockFill className="me-1" />
                  Open
                </>
              ) : (
                <>
                  <BsCheckCircleFill className="me-1" />
                  Closed
                </>
              )}
            </Badge>
            {messages.length > 0 && (
              <Badge bg="secondary" className="ms-1">
                {messages.length} message{messages.length > 1 ? "s" : ""}
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="py-3 px-3">
          {/* Header Info */}
          <div className="mb-3 p-3 bg-light rounded border">
            <div className="row">
              <div className="col-md-6">
                <small className="text-muted d-block">Subject</small>
                <p className="mb-0 fw-semibold">{clarification.subject}</p>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Raised by</small>
                <p className="mb-0">
                  {(isBuyer || isOwner)
                    ? clarification.raised_by_vendor_name || "Vendor"
                    : <em className="text-secondary">Anonymous Vendor</em>
                  }
                </p>
              </div>
              <div className="col-md-3">
                <small className="text-muted d-block">Created</small>
                <p className="mb-0">{moment(clarification.created_at).format("DD MMM YYYY")}</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div
            className="messages-container rounded"
            style={{
              maxHeight: "300px",
              minHeight: "150px",
              overflowY: "auto",
              backgroundColor: "#f5f5f5",
              padding: "12px",
              border: "1px solid #e0e0e0",
            }}
          >
            {messages.length > 0 ? (
              <>
                {messages.map((msg, idx) => renderMessageBubble(msg, idx))}
                <div ref={messagesEndRef} />
              </>
            ) : (
              // Fallback for old data structure (question/response)
              // Question is from vendor, Response is from buyer
              <>
                {/* Original Question - from Vendor */}
                <div className={`d-flex justify-content-${isBuyer ? "start" : "end"} mb-2`}>
                  <div
                    style={{
                      backgroundColor: isBuyer ? "#e5e5ea" : "#007aff",
                      color: isBuyer ? "#000" : "#fff",
                      maxWidth: "75%",
                      padding: "8px 12px",
                      borderRadius: isBuyer ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
                    }}
                  >
                    {isBuyer && (
                      <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "2px" }}>
                        {clarification.raised_by_vendor_name || "Vendor"}
                      </div>
                    )}
                    <div style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.35 }}>
                      {clarification.question}
                    </div>
                    {clarification.question_files && clarification.question_files.length > 0 && (
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {clarification.question_files.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="d-flex align-items-center gap-1"
                            style={{ fontSize: "0.7rem", color: isBuyer ? "#007aff" : "#fff", textDecoration: "underline" }}
                          >
                            <BsDownload size={10} />
                            {file.file_name || `File ${idx + 1}`}
                          </a>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: "0.65rem", opacity: 0.6, marginTop: "2px", textAlign: isBuyer ? "left" : "right" }}>
                      {moment(clarification.created_at).format("hh:mm A")}
                    </div>
                  </div>
                </div>

                {/* Old Response (if exists) - from Buyer */}
                {clarification.response && (
                  <div className={`d-flex justify-content-${isBuyer ? "end" : "start"} mb-2`}>
                    <div
                      style={{
                        backgroundColor: isBuyer ? "#007aff" : "#e5e5ea",
                        color: isBuyer ? "#fff" : "#000",
                        maxWidth: "75%",
                        padding: "8px 12px",
                        borderRadius: isBuyer ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      }}
                    >
                      {!isBuyer && (
                        <div style={{ fontSize: "0.7rem", opacity: 0.7, marginBottom: "2px" }}>
                          Buyer
                        </div>
                      )}
                      <div style={{ whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.35 }}>
                        {clarification.response}
                      </div>
                      {clarification.response_files && clarification.response_files.length > 0 && (
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {clarification.response_files.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="d-flex align-items-center gap-1"
                              style={{ fontSize: "0.7rem", color: isBuyer ? "#fff" : "#007aff", textDecoration: "underline" }}
                            >
                              <BsDownload size={10} />
                              {file.file_name || `File ${idx + 1}`}
                            </a>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: "0.65rem", opacity: 0.6, marginTop: "2px", textAlign: isBuyer ? "right" : "left" }}>
                        {moment(clarification.responded_at).format("hh:mm A")}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input Area */}
          {canSendMessage ? (
            <div className="mt-3 p-3 border rounded bg-white">
              <Form.Group className="mb-2">
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSubmitting || isClosing}
                />
              </Form.Group>

              {/* File Upload */}
              <div className="d-flex align-items-center gap-2 mb-2">
                <label
                  htmlFor="message-file-upload"
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center gap-2 p-2"
                  style={{ cursor: isSubmitting || isClosing ? "not-allowed" : "pointer" }}
                >
                  <BsUpload size={14} />
                  Attach Files
                </label>
                <input
                  id="message-file-upload"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="d-none"
                  disabled={isSubmitting || isClosing}
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                />
                <small className="text-muted">
                  PDF, Word, Excel, or Image files
                </small>
              </div>

              {/* Selected Files */}
              {files.length > 0 && (
                <div className="mb-2">
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
                        disabled={isSubmitting || isClosing}
                      >
                        <BsX size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !isOpen ? (
            <Alert variant="secondary" className="mt-3 mb-0">
              <BsLock className="me-2" />
              This clarification has been closed. No more messages can be sent.
            </Alert>
          ) : (
            <Alert variant="info" className="mt-3 mb-0">
              <BsClockFill className="me-2" />
              Waiting for response. You will be notified when there's an update.
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer className="py-2 px-3">
          <Button variant="outline-secondary" className="p-2" onClick={handleClose} size="sm">
            Close
          </Button>

          {canSendMessage && (
            <>
              <Button
                variant="primary"
                onClick={handleSendMessage}
                disabled={isSubmitting || isClosing || !message.trim()}
                size="sm"
                className="p-2 d-flex align-items-center justify-content-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" />
                    Sending...
                  </>
                ) : (
                  <>
                    <BsSend size={14} />
                    Send Message
                  </>
                )}
              </Button>

              {isBuyer && (
                <Button
                  variant="success"
                  onClick={() => setShowCloseConfirm(true)}
                  disabled={isSubmitting || isClosing}
                  size="sm"
                  className="p-2 d-flex align-items-center justify-content-center gap-2"
                >
                  {isClosing ? (
                    <>
                      <Spinner size="sm" />
                      Closing...
                    </>
                  ) : (
                    <>
                      <BsCheckCircleFill size={14} />
                      Close Clarification
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Close Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleCloseClarification}
        title="Close Clarification"
        description={
          message.trim()
            ? "Your message will be sent and the clarification will be closed. Vendors will be able to submit quotes again."
            : "Are you sure you want to close this clarification? Vendors will be able to submit quotes again."
        }
        confirmButtonColor="success"
        confirmButtonText="Close Clarification"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default ClarificationDetailModal;
