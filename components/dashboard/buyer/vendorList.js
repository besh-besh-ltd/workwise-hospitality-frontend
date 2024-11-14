import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { formatDate } from "@/utils/sharedFunctions";

const VendorList = ({ vendors, onSelectVendor, vendorName, setVendorName }) => {
  const handleVendorSelect = (vendor) => {
    const updatedVendor = { ...vendor, unseen_count: 0 };
    onSelectVendor(updatedVendor);
  };

  return (
    <div
      className="vendor-list px-2"
      style={{
        height: "65vh",
        overflowY: "auto"
      }}
    >
      <div className="list-group">
      <input
        type="text"
        className="form-control mb-3 p-2"
        placeholder="Search by username..."
        value={vendorName}
        onChange={(e) => setVendorName(e.target.value)}
      />
        {vendors.map((vendor) => (
          <button
            key={vendor.user_id}
            className="p-3 pb-1 bg-light border rounded shadow-sm mb-2 d-flex justify-content-between align-items-center"
            onClick={() => handleVendorSelect(vendor)}
          >
            <div>
              <h6
                className="mb-2"
                style={{ fontSize: "1.1rem" }}
              >
                {vendor.user_name}
              </h6>
              <p
                className="text-muted"
                style={{
                  display: "block",
                  fontSize: "0.95rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "250px",
                  width: "fit-content",
                  textAlign: "left",
                }}
              >
                {vendor.last_message ? vendor.last_message : "Send a query..."}
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
          </button>
        ))}
      </div>
    </div>
  );
};

export default VendorList;
