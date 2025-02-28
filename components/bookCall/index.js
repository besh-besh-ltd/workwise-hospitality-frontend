"use client";

import { BookaCall } from "@/services/Auth";
import React, { useEffect, useState } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getCountryCodes } from "@/services/cms";

export default function BookCall() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState([]); // Holds country code list
  const [selectedCode, setSelectedCode] = useState("+91"); // Default country code
  const [loading, setLoading] = useState(false);

  const mobileNumber = "9930787798";
  
  const handleCallNow = () => {
    window.location.href = `tel:+91${mobileNumber}`;
  };

  useEffect(() => {
    fetchCountryCodes();
  }, []);

  const fetchCountryCodes = async () => {
    try {
      const response = await getCountryCodes();
      if (response?.data) {
        console.log("Checking country codes:", response.data);
        setCountryCode(response.data); // Set country list
      } else {
        setCountryCode([]);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
      setCountryCode([]);
    }
  };

  // Validate phone number (10-12 digits, without country code)
  const isValidPhoneNumber = (number) => {
    const trimmedNumber = number.trim();
    const phoneRegex = /^[0-9]{8,15}$/; // Ensures 8-15 digits (without country code)
    return phoneRegex.test(trimmedNumber);
  };

  const handelBookCallRequest = async () => {
    if (!isValidPhoneNumber(phoneNumber)) {
      return toast.error("Invalid phone number format (must be 10-12 digits)");
    }

    setLoading(true);
    const fullPhoneNumber = `${selectedCode}${phoneNumber}`; // Concatenating country code
    const payload = { mobile: fullPhoneNumber };

    console.log("Checking the payload:", payload);

    BookaCall(payload)
      .then(() => {
        toast.success("Call request successfully booked!");
        setLoading(false)
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
          +91 {mobileNumber} - Siddharth Kothari
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
          <InputGroup>
            <Form.Select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
            >
              {countryCode.map((option) => (
                <option key={option.phone_code} value={option.phone_code}>
                  {option.country_code} ({option.phone_code})
                </option>
              ))}
            </Form.Select>
            <Form.Control
              type="tel"
              placeholder="1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </InputGroup>
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
