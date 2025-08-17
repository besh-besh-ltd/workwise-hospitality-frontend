import React, { useMemo, useState, useEffect } from "react";
import { IoMdInformationCircleOutline } from "react-icons/io";

// Format money or percent; return "N/A" for non-numeric values
const formatMoneyOrPercent = (mp) => {
  if (!mp) return "N/A";
  if (typeof mp.value === "number") {
    return mp.mode === "%" ? `${mp.value}%` : `₹${mp.value.toLocaleString()}`;
  }
  // Non-numeric: hide long strings
  return "N/A";
};

export const QuotesOverrideModal = ({
  show,
  quotes,
  onClose,
  overrideQuote,
}) => {
  const [selectedIds, setSelectedIds] = useState([]);

  // Reset selection when modal opens/closes
  useEffect(() => {
    if (!show) setSelectedIds([]);
  }, [show]);

  const allSelected = useMemo(
    () => quotes.length > 0 && selectedIds.length === quotes.length,
    [quotes, selectedIds]
  );

  const someSelected = useMemo(
    () => selectedIds.length > 0 && selectedIds.length < quotes.length,
    [quotes, selectedIds]
  );

  const toggleOne = (quote) => {
    setSelectedIds((prev) =>
      prev.some(q => q.id === quote.id) ? prev.filter((x) => x.id !== quote.id) : [...prev, quote]
    );
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(quotes.map((q) => q));
  };

  const handleConfirm = () => {
    overrideQuote(selectedIds);
  };

  // Prevent body scroll when modal is shown (pure Bootstrap classes)
  useEffect(() => {
    if (show) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block" }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="modal-dialog modal-xl modal-dialog-scrollable"
          style={{ maxWidth: "70vw", width: "70vw" }} // 85% screen width
        >
          <div className="modal-content shadow">
            <div className="modal-header px-4 pt-3 pb-3">
              <div>
                <h4 className="modal-title">
                  Quotes fetched from your document
                </h4>
                <span className="text-muted">
                  Review, select, and click Confirm to override current entries.
                </span>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              />
            </div>

            <div className="modal-body pt-0">
              <div
                className="alert alert-warning d-flex align-items-start"
                role="alert"
              >
                <IoMdInformationCircleOutline/>
                <div>
                  Warning: Once confirmed, all the selected quotes will override
                  existing entries and cannot be retrieved.
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="selectAll"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                  />
                  <label htmlFor="selectAll" className="form-check-label">
                    Select all
                  </label>
                </div>
                <div className="text-muted small">
                  Selected {selectedIds.length} of {quotes.length}
                </div>
              </div>

              <div className="table-responsive">
                <table className="table align-middle table-hover text-center">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 48 }}></th>
                      <th style={{maxWidth: 220}}>Product</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Base Price</th>
                      <th>Freight</th>
                      <th>Packaging</th>
                      <th>Tax</th>
                      <th>Delivery Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => (
                      <tr key={q.id}>
                        <td>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={selectedIds.some(quote => quote.id === q.id)}
                            onChange={() => toggleOne(q)}
                            aria-label={`Select quote ${q.id}`}
                          />
                        </td>
                        <td style={{maxWidth: 220}}>
                          <div className="d-flex flex-column gap-1 text-start">
                            <h4 className="fs-6 mb-0 fw-medium">{q.rfq_product_name}</h4>
                            <small title={q.raw_product_name}>{q.raw_product_name.slice(0, 75).concat(q.raw_product_name.length > 75 ? '...' : '')}</small>
                          </div>
                        </td>
                        <td>{q.quantity ?? "-"}</td>
                        <td className="text-uppercase">{q.unit || "-"}</td>
                        <td>
                          {q.base_price != null
                            ? `₹${q.base_price.toLocaleString()}`
                            : "-"}
                        </td>
                        <td>{formatMoneyOrPercent(q.freight)}</td>
                        <td>{formatMoneyOrPercent(q.packaging)}</td>
                        <td>{formatMoneyOrPercent(q.tax)}</td>
                        <td>
                          {q.delivery_period != null
                            ? `${q.delivery_period} days`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                    {quotes.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center text-muted py-5">
                          No quotes to display.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={selectedIds.length === 0}
                title={
                  selectedIds.length === 0
                    ? "Select at least one quote"
                    : "Confirm override"
                }
              >
                Confirm Override ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal backdrop */}
      <div className="modal-backdrop fade show"></div>
    </>
  );
};