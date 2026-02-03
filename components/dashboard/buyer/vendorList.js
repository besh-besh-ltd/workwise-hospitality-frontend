import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { formatDate } from "@/utils/sharedFunctions";
import FullLoader from "@/components/shared/FullLoader";

const VendorList = ({
  vendors,
  onSelectVendor,
  onToggleVendor,
  selectedVendorIds,
  vendorName,
  setVendorName,
  loading,
}) => {
  const handleClickVendor = (vendor) => {
    onSelectVendor(vendor);
  };

  const handleCheckboxChange = (e, vendorId) => {
    e.stopPropagation(); // prevent selecting single vendor when toggling checkbox
    onToggleVendor(vendorId);
  };

  // Check if all vendors are selected
  const allSelected = vendors.length > 0 && selectedVendorIds.length === vendors.length;
  
  // Check if some but not all vendors are selected
  const someSelected = selectedVendorIds.length > 0 && selectedVendorIds.length < vendors.length;

  const handleSelectAll = () => {
    if (allSelected) {
      // If all are selected, deselect all
      vendors.forEach(vendor => {
        if (selectedVendorIds.includes(vendor.user_id)) {
          onToggleVendor(vendor.user_id);
        }
      });
    } else {
      // If not all are selected, select all
      vendors.forEach(vendor => {
        if (!selectedVendorIds.includes(vendor.user_id)) {
          onToggleVendor(vendor.user_id);
        }
      });
    }
  };

  return (
    <div className="px-2" style={{ height: "65vh" }}>
      {/* Search Input */}
      <input
        id="search_username-query_list-queries_page"
        type="text"
        className="form-control mb-3 p-2"
        placeholder="Search by username..."
        value={vendorName}
        onChange={(e) => setVendorName(e.target.value)}
      />
      
      {/* Select All Controls */}
      {vendors.length > 0 && !loading && (
        <div className="d-flex align-items-center mb-3 p-2 bg-light border rounded">
          <input
            type="checkbox"
            checked={allSelected}
            ref={input => {
              if (input) input.indeterminate = someSelected;
            }}
            onChange={handleSelectAll}
            className="me-2"
          />
          <span className="me-3">
            {allSelected ? "Deselect All" : someSelected ? "Select All" : "Select All"}
          </span>
          <small className="text-muted">
            {selectedVendorIds.length} of {vendors.length} selected
          </small>
        </div>
      )}

      {/* Vendor List */}
      <div className="list-group" style={{ height: "calc(100% - 120px)", overflowY: "auto" }}>
        {loading ? (
          <div className="hasFullLoader h-100">
            <FullLoader />
          </div>
        ) : (
          vendors.map((vendor) => (
            <div
              key={vendor.user_id}
              className="p-3 pb-1 bg-light border rounded shadow-sm mb-2 d-flex justify-content-between align-items-center"
              style={{ cursor: "pointer" }}
              onClick={() => handleClickVendor(vendor)}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedVendorIds.includes(vendor.user_id)}
                onChange={(e) => handleCheckboxChange(e, vendor.user_id)}
                className="me-2"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Vendor info */}
              <div style={{ flex: 1 }}>
                <h6 className="mb-2" style={{ fontSize: "1.1rem" }}>
                  {/* Prefer anonymised / precomputed display name when available */}
                  {vendor?.display_name ?? vendor?.company_name ?? "-"}
                </h6>
                <p
                  className="text-muted"
                  style={{
                    fontSize: "0.95rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "250px",
                  }}
                >
                  {vendor.last_message || "Send a query..."}
                </p>
              </div>

              <div className="text-end">
                {vendor.unseen_count > 0 && (
                  <span className="badge bg-primary rounded-pill mb-1">
                    {vendor.unseen_count}
                  </span>
                )}
                <small className="text-muted d-block">
                  {vendor.last_message_timestamp ? formatDate(vendor.last_message_timestamp) : ""}
                </small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VendorList;