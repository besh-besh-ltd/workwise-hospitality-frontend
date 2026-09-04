import React, { useState, useEffect } from "react";
import Select from "react-select";

export default function MapSpocModal({
  show,
  onClose,
  vendorSpoc,
  locationId,
  onSave,
  existingMappedSpocs = []
}) {
  const [selectedSpocs, setSelectedSpocs] = useState([]);

  useEffect(() => {
    if (existingMappedSpocs.length > 0 && vendorSpoc) {
      const preSelected = vendorSpoc
        .filter(spoc => existingMappedSpocs.includes(spoc.id))
        .map(spoc => ({
          value: spoc.id,
          label: spoc.name,
          spocData: spoc
        }));
      setSelectedSpocs(preSelected);
    }
  }, [existingMappedSpocs, vendorSpoc]);

  if (!show) return null;

  const spocOptions =
    vendorSpoc?.map(spoc => ({
      value: spoc.id,
      label: spoc.name,
      spocData: spoc
    })) || [];

  const handleSelectChange = (selected) => {
    setSelectedSpocs(selected || []);
  };

  const handleSelectAll = () => {
    if (selectedSpocs.length === spocOptions.length) {
      setSelectedSpocs([]);
    } else {
      setSelectedSpocs(spocOptions);
    }
  };

  const handleSave = () => {
    if (selectedSpocs.length === 0) {
      alert("Please select at least one SPOC");
      return;
    }
    const selectedIds = selectedSpocs.map(s => s.value);
    onSave(selectedIds, locationId);
    onClose();
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">

            {/* Header */}
            <div className="modal-header">
              <h5 className="modal-title">Map SPOCs</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            {/* Body */}
            <div className="modal-body">

              {/* Info Row */}
              <div className="d-flex justify-content-between align-items-center mb-2">
                <small>{selectedSpocs.length} selected</small>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleSelectAll}
                >
                  {selectedSpocs.length === spocOptions.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              {/* Multi Select */}
              <Select
                isMulti
                options={spocOptions}
                value={selectedSpocs}
                onChange={handleSelectChange}
                placeholder="Select SPOCs"
                closeMenuOnSelect={false}
              />

              {/* Selected Preview */}
              {selectedSpocs.length > 0 && (
                <div className="mt-3">
                  <strong>Selected:</strong>
                  <div className="mt-2 d-flex flex-wrap gap-2">
                    {selectedSpocs.map((spoc) => (
                      <span
                        key={spoc.value}
                        className="badge bg-primary text-white d-flex align-items-center"
                      >
                        {spoc.label}
                        <button
                          type="button"
                          className="btn-close btn-close-white ms-2"
                          onClick={() =>
                            handleSelectChange(
                              selectedSpocs.filter(s => s.value !== spoc.value)
                            )
                          }
                          style={{ fontSize: "8px" }}
                        ></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={selectedSpocs.length === 0}
              >
                Save
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div className="modal-backdrop fade show"></div>
    </>
  );
}
