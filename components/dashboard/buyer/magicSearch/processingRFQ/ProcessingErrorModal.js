import React from "react";
import { Modal, Button, Badge, Alert } from "react-bootstrap";

const ProcessingErrorsModal = ({
  show,
  onClose,
  errors,
}) => {
  if (!errors) return null;

  const renderAiErrors = () => {
    return errors.actual.map((err, idx) => {
      let message = "";
      let variant = "secondary";

      // if it's an object with "errors" field
      if (typeof err === "object" && err.errors) {
        const errorMessages = Object.values(err.errors);
        for (const msg of errorMessages) {
          if (msg.toLowerCase().includes("product not found")) {
            message = msg;
            variant = "danger";
          } else if (msg.toLowerCase().includes("no vendors found")) {
            message = msg;
            variant = "warning";
          }
        }
      } else if (typeof err === "string") {
        message = err;
        variant = "danger";
      }

      return (
        <Alert key={idx} variant={variant}>
          {message || "Unknown AI Error"}
        </Alert>
      );
    });
  };

  const renderDbError = () => (
    <Alert variant="danger">
      We encountered an issue saving or fetching data from our database. This
      might be temporary or caused by unexpected data. Please try again later,
      and if the issue persists, contact our support team for help.
    </Alert>
  );

  const renderBackendError = () => (
    <Alert variant="danger">
      Something went wrong while processing your request on our servers. It
      could be a technical glitch or a temporary issue. Please try again in a
      few minutes. If the problem continues, kindly inform our support team.
    </Alert>
  );

  const renderErrorsContent = () => {
    switch (errors.type) {
      case "ai-error":
        return renderAiErrors();
      case "db-error":
        return renderDbError();
      case "backend-error":
        return renderBackendError();
      default:
        return (
          <Alert variant="secondary">
            Unknown error occurred. Please contact support.
          </Alert>
        );
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header className="p-4 pb-1 pt-3" closeButton>
        <Modal.Title className="d-flex gap-3 align-items-center">
          Processing Errors{" "}
          <Badge
            bg={
              errors.type === "ai-error"
                ? "danger"
                : errors.type === "db-error"
                ? "danger"
                : "warning"
            }
          >
            {errors.type.toUpperCase()}
          </Badge>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="px-4">{renderErrorsContent()}</Modal.Body>
      <Modal.Footer>
        <Button className="border-black bg-transparent text-black p-3" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProcessingErrorsModal;
