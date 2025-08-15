import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { formatDate } from "@/utils/sharedFunctions";
import FullLoader from "@/components/shared/FullLoader";

// VendorList.js
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

  const handleCheckboxChange = (vendorId) => {
    onToggleVendor(vendorId);
  };

  return (
    <div className="list-group px-2" style={{ height: "65vh", overflowY: "auto" }}>
      <input
        type="text"
        className="form-control mb-3 p-2"
        placeholder="Search by username..."
        value={vendorName}
        onChange={(e) => setVendorName(e.target.value)}
      />
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
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={selectedVendorIds.includes(vendor.user_id)}
              onChange={() => handleCheckboxChange(vendor.user_id)}
              className="me-2"
            />

            {/* Vendor info clickable */}
            <div
              style={{ flex: 1 }}
              onClick={() => handleClickVendor(vendor)}
            >
              <h6 className="mb-2" style={{ fontSize: "1.1rem" }}>
                {vendor?.company_name ?? "-"}
              </h6>
              <p className="text-muted" style={{
                fontSize: "0.95rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "250px",
              }}>
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
                {vendor.last_message_timestamp
                  ? formatDate(vendor.last_message_timestamp)
                  : ""}
              </small>
            </div>
          </div>
        ))
      )}
    </div>
  );
};


export default VendorList;
