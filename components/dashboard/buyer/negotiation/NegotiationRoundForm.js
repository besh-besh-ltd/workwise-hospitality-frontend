import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import { createNegotiationRound } from "@/services/negotiation";

const NegotiationRoundForm = ({ rfq_id, onRoundCreated, onCancel }) => {
  const [targetPrice, setTargetPrice] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!targetPrice || !endDate) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate target price is numeric
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Target price must be a positive number");
      return;
    }

    // Validate end date is in the future
    const selectedDate = new Date(endDate);
    const now = new Date();
    if (selectedDate <= now) {
      toast.error("End date must be in the future");
      return;
    }

    setLoading(true);
    try {
      const response = await createNegotiationRound({
        rfq_id: parseInt(rfq_id),
        target_price: price,
        end_date: endDate
      });

      if (response.status === 1) {
        toast.success(response.message || "Negotiation round created successfully");
        setTargetPrice("");
        setEndDate("");
        if (onRoundCreated) {
          onRoundCreated(response.data);
        }
      } else {
        toast.error(response.message || "Failed to create negotiation round");
      }
    } catch (error) {
      toast.error(error.message || "Failed to create negotiation round");
    } finally {
      setLoading(false);
    }
  };

  // Set minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // Set maximum date to 90 days from now
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <Form onSubmit={handleSubmit} className="negotiation-round-form">
      <div className="mb-3">
        <Form.Label className="fw-semibold">Target Price (₹) *</Form.Label>
        <Form.Control
          type="number"
          step="0.01"
          min="0"
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          placeholder="Enter target price"
          required
          disabled={loading}
        />
      </div>

      <div className="mb-3">
        <Form.Label className="fw-semibold">End Date *</Form.Label>
        <Form.Control
          type="datetime-local"
          min={minDate}
          max={maxDateStr}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
          disabled={loading}
        />
        <Form.Text className="text-muted">
          Round will close automatically after this date
        </Form.Text>
      </div>

      <div className="d-flex gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          style={{ backgroundColor: "#158993", borderColor: "#158993" }}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Creating...
            </>
          ) : (
            "Create Round"
          )}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
      </div>
    </Form>
  );
};

export default NegotiationRoundForm;

