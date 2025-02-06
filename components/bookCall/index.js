"use client";

import { BookaCall } from "@/services/Auth";
import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Register from "../register";

export default function BookCall() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const mobileNumber = "9930787798";

  const handleCallNow = () => {
    window.location.href = `tel:+91${mobileNumber}`;
  };

  const handelBookCallRequest = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    const payload = { mobile: phoneNumber };

    BookaCall(payload)
      .then(() => {
        toast.success("Call request successfully booked!");
        setPhoneNumber(""); // Clear input field
      })
      .catch(() => {
        toast.error("Failed to book call request. Try again later.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <div className="d-flex justify-content-center">
        <p className="d-none d-md-block mb-0 fw-2 fw-bold">
          +91 {mobileNumber} - (Siddharth Kothari)
        </p>

        <Button
          variant="primary"
          size="sm"
          className="w-50 mb-2 d-block d-md-none d-lg-none"
          onClick={handleCallNow}
        >
          Call Now
        </Button>
      </div>

      <p className="text-center my-4">--------------- OR ---------------</p>
      
      <Form>
        <Form.Group>
          <Form.Label>Enter your phone number</Form.Label>
          <Form.Control
            type="tel"
            placeholder="+91"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </Form.Group>

        <Button
          className="mt-3 w-100"
          variant="success"
          onClick={handelBookCallRequest}
          disabled={loading}
        >
          {loading ? "Booking..." : "Request Call Back"}
        </Button>
      </Form>
    </>
  );
}
