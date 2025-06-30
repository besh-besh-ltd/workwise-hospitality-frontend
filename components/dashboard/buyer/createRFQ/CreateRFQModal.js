import React from "react";
import { Modal, Button, ListGroup, Badge } from "react-bootstrap";

const CreateRFQModal = ({
  show,
  onHide,
  sheets = [],
  onConfirm,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header
        closeButton
        style={{
          borderBottom: "none",
          padding: "1.5rem 2rem",
          paddingBottom: '0.8rem'
        }}
      >
        <Modal.Title style={{ fontWeight: 600, fontSize: "1.6rem" }}>
          Create RFQ
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: "0 2rem 1.5rem 2rem" }}>
        <h4
          style={{
            fontWeight: 500,
            marginBottom: "1.5rem",
            fontSize: "1.25rem",
            color: "#343a40",
          }}
        >
          Heads Up! This will create a RFQ for only the{" "}
          <strong>processed</strong> sheet's data
        </h4>

        <ListGroup variant="flush" className="mb-3">
          {sheets
            .sort((a, b) => (b.is_processed === true) - (a.is_processed === true))
            .map((sheet, index) => {
              const isProcessed = sheet.is_processed;
              return (
                <ListGroup.Item
                  key={index}
                  className="d-flex justify-content-between align-items-center"
                  style={{
                    border: "none",
                    backgroundColor: isProcessed
                      ? "rgba(25, 135, 84, 0.1)"
                      : "rgba(220, 53, 69, 0.1)",
                    borderRadius: "4px",
                    padding: "0.75rem 1rem",
                    marginBottom: "0.8rem",
                  }}
                >
                  <div className="d-flex align-items-center">
                    <i
                      className={`bi ${
                        isProcessed
                          ? "bi-check-circle-fill text-success"
                          : "bi-x-circle-fill text-danger"
                      }`}
                      style={{ fontSize: "1.25rem", marginRight: "0.75rem" }}
                    ></i>
                    <span
                      style={{
                        color: isProcessed ? "#198754" : "#dc3545",
                        fontWeight: 600,
                        fontSize: "1rem",
                        opacity: isProcessed ? 1 : 0.8,
                      }}
                    >
                      {sheet.label}
                    </span>
                  </div>
                  <Badge
                    bg={isProcessed ? "success" : "danger"}
                    style={{ fontSize: "0.8rem" }}
                  >
                    {isProcessed ? "Processed" : "Not Processed"}
                  </Badge>
                </ListGroup.Item>
              );
            })}
        </ListGroup>

        <p
          className="text-muted"
          style={{ fontSize: "1rem", lineHeight: "1.5" }}
        >
          Upon clicking the <strong>Create RFQ</strong> button, a RFQ will be
          created with all the details provided in the processed sheets.
        </p>
        <p
          className="text-muted"
          style={{ fontSize: "1rem", lineHeight: "1.5" }}
        >
          All the vendors will be notified for the same.
        </p>
      </Modal.Body>

      <Modal.Footer
        style={{
          borderTop: "none",
          padding: "1rem 2rem 1.5rem 2rem",
        }}
      >
        <Button variant="outline-secondary" size="sm" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={onConfirm}>
          Create RFQ
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateRFQModal;
