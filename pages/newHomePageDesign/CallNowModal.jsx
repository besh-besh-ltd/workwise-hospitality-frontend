import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Button, Form } from "react-bootstrap";

export default function CallNowModal() {
  const [showModal, setShowModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const mobileNumber = "9930787798";

  const handleCallNow = () => {
    window.location.href = `tel:+91${mobileNumber}`;
  };

  const handleSubmit = () => {
    alert(`We will call you back at: ${phoneNumber}`);
    setShowModal(false);
    setPhoneNumber("");
    setShowInput(false);
  };

  return (
    <>
      <div>
        <button
          className="btn btn-primary mt-3"
          style={{
            borderRadius: "5px",
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
          <div className="d-flex justify-content-center">
            <p className="mb-0 fw-2 fw-bold " >+91 {mobileNumber} - (siddharth kothari)</p>

            <Button
              variant="primary"
              size="sm"
              className="w-50 mb-2 d-block d-md-none d-lg-none "
              onClick={handleCallNow}
            >
              Call Now
            </Button>
          </div>

          <p className="text-center my-4">
          --------------- OR ---------------
          </p>
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
            <Button
              className="mt-3 w-100"
              variant="success"
              onClick={handleSubmit}
            >
              Request Call Back
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
}
