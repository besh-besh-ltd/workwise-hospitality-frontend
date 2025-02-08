import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal } from "react-bootstrap";
import Register from "../register";

export default function RegisterUserModal() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div  >
        <button
        id="register-as-vendor-modal"
          className="btn btn-primary mt-3"
          style={{
            borderRadius: "5px",
            width:"250px",
            border:"none",
            backgroundColor: "white",
            color: "black",
            padding: "10px 20px",
            fontWeight: "500",
            fontSize: "16px",
          }}
          onClick={() => setShowModal(true)}
        >
          Register As Vendor
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
          <Modal.Title className="p-4">Register As Vendor</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Register registerAs={"vendor"} />
        </Modal.Body>
      </Modal>
    </>
  );
}
