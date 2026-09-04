import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";

import { handleAddSiteRep } from "@/services/po"; // <-- make sure this path is correct

export default function AddSiteRepModal({
  show,
  onClose,
  onAction,  // optional callback after success
  poId,
  siteRep,   // { name, email, phone } or null/undefined
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const isReadOnly = !!siteRep;

  useEffect(() => {
    if (show) {
      if (siteRep) {
        // prefill and lock
        setForm({
          name: siteRep.name || "",
          email: siteRep.email || "",
          phone: siteRep.phone || "",
        });
      } else {
        // fresh form
        setForm({ name: "", email: "", phone: "" });
      }
      setTouched({ name: false, email: false, phone: false });
      setSubmitting(false);
    }
  }, [show, siteRep]);

  const handleChange = (field, value) => {
    if (isReadOnly) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateEmail = (email) => {
    if (!email) return false;
    // very simple check; you can replace with stricter validation
    return /\S+@\S+\.\S+/.test(email);
  };

  const errors = {
    name:
      touched.name && !form.name.trim()
        ? "Please enter the site representative's full name."
        : "",
    email:
      touched.email && !validateEmail(form.email)
        ? "Please enter a valid email address."
        : "",
    phone:
      touched.phone && !form.phone.trim()
        ? "Please enter a contact number."
        : "",
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const handleSubmit = async () => {
    if (isReadOnly) {
      onClose?.();
      return;
    }

    // Mark all as touched for validation
    setTouched({ name: true, email: true, phone: true });

    if (!poId) {
      toast.error("Missing Purchase Order ID.");
      return;
    }

    if (hasErrors) {
      toast.error("Please fill all required details correctly.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        po_id: poId,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };

      await handleAddSiteRep(payload);

      toast.success("Site Representative has been added successfully.");

      // Optional callback for parent to refresh / update state
      onAction?.(payload);

      onClose?.();
    } catch (err) {
      console.error("Error adding Site Representative:", err);
      toast.error(
        err?.message || "Something went wrong while adding Site Representative."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="raise-invoice-modal"
    >
      <Modal.Header closeButton className="px-3 pt-3">
        <Modal.Title className="fw-semibold fs-5">
          {isReadOnly ? "Site Representative Details" : "Assign Site Representative"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-2">
        <p className="text-muted mb-3 small" style={{ lineHeight: 1.6 }}>
          The Site Representative is responsible for confirming that the material
          has reached the site and for updating the GRN (Goods Receipt Note) once
          the delivery is received.
        </p>

        {isReadOnly && (
          <div className="alert alert-primary small">
            A Site Representative has already been assigned for this Purchase
            Order. Their details <strong>cannot be changed</strong>.
          </div>
        )}

        <Form>
          <Form.Group className="mb-3" controlId="siteRepName">
            <Form.Label className="fw-semibold">Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter full name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              disabled={isReadOnly || submitting}
              isInvalid={!!errors.name}
            />
            <Form.Control.Feedback type="invalid">
              {errors.name}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="siteRepEmail">
            <Form.Label className="fw-semibold">Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email address"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              disabled={isReadOnly || submitting}
              isInvalid={!!errors.email}
            />
            <Form.Control.Feedback type="invalid">
              {errors.email}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-1" controlId="siteRepPhone">
            <Form.Label className="fw-semibold">Phone</Form.Label>
            <Form.Control
              type="tel"
              placeholder="Enter contact number"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              disabled={isReadOnly || submitting}
              isInvalid={!!errors.phone}
            />
            <Form.Control.Feedback type="invalid">
              {errors.phone}
            </Form.Control.Feedback>
          </Form.Group>

          {!isReadOnly && (
            <div className="form-text text-dark mt-2">
              <span className="fw-semibold">Note:</span> Once a Site
              Representative is added for this PO, their details cannot be edited
              from here. They will receive GRN-related communications for this PO.
            </div>
          )}

          {isReadOnly && (
            <div className="form-text text-dark mt-2">
              <span className="fw-semibold">Note:</span> This Site Representative
              will receive all GRN-related emails and is responsible for marking
              GRN once the goods reaches site.
            </div>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer className="border-0">
        <Button
          variant="outline-secondary"
          onClick={onClose}
          className="p-2 px-3"
          disabled={submitting}
        >
          {isReadOnly ? "Close" : "Cancel"}
        </Button>
        {!isReadOnly && (
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={submitting}
            className="p-2 px-3"
          >
            {submitting ? "Saving..." : "Add Site Rep"}
          </Button>
        )}
      </Modal.Footer>

      <style jsx>{`
        :global(.raise-invoice-modal .modal-dialog) {
          max-width: 640px;
          width: 100%;
        }
      `}</style>
    </Modal>
  );
}