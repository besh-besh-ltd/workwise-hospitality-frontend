import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal } from "react-bootstrap";
import BookCall from "@/components/bookCall";

export default function CallNowModal() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div>
        <button
          className="btn btn-primary mt-3"
          style={{
            borderRadius: "5px",
            border:"none",
            backgroundColor: "white",
            color: "black",
            padding: "10px 20px",
            fontWeight: "500",
            fontSize: "16px",
          }}
          onClick={() => setShowModal(true)}
        >
          Book a Call
        </button>
      </div>

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        backdrop="static"
        style={{ backdropFilter: "blur(5px)" }}
      >
        <Modal.Header closeButton>
          <Modal.Title className="p-4">Contact Us</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <BookCall />
        </Modal.Body>
      </Modal>
    </>
  );
}
