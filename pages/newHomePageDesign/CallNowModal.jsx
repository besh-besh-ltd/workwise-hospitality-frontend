import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhoneVolume } from "@fortawesome/free-solid-svg-icons";
import { Modal, Button, Form } from "react-bootstrap";

export default function CallNowModal() {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setExpanded((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCallNow = () => {
    window.location.href = "tel:+99789898978";
  };

  const handleRequestCallBack = () => {
    setShowInput(true);
  };

  const handleSubmit = () => {
    alert(`We will call you back at: ${phoneNumber}`);
    setShowModal(false);
    setPhoneNumber("");
    setShowInput(false);
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: "100px",
          right: "20px",
          zIndex: 1000,
        }}
      >
        <button
          style={{
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            width: expanded ? "180px" : "50px",
            height: "50px",
            fontSize: "1.2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: expanded ? "0 15px" : "0",
            overflow: "hidden",
            whiteSpace: "nowrap",
            transition: "all 0.5s ease-in-out",
            cursor: "pointer",
          }}
          onClick={() => setShowModal(true)}
        >
          <span style={{ fontSize: "1.5rem" }}>
            <FontAwesomeIcon icon={faPhoneVolume} />
          </span>
          {expanded &&
            <div className="ms-md-2 ms-lg-3">
              <span className="d-block" style={{ marginLeft: "10px" }}>Call Now</span>
              <span className="text-sm d-none d-lg-block">+91 99307 87798</span>
            </div>}
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
        <Modal.Body className="p-4" >
          <div className="d-flex justify-content-center">
            <Button variant="primary" size="sm" className="w-50 mb-2" onClick={handleCallNow}>
              Call Now
            </Button>
          </div>

          <p className="text-center my-4">------------------ OR ----------------</p>
          <Form>
            <Form.Group>
              <Form.Label>Enter your phone number</Form.Label>
              <Form.Control
                type="tel"
                placeholder="Enter Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </Form.Group>
            <Button className="mt-3 w-100" variant="success" onClick={handleSubmit}>
              Request Call Back
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}
