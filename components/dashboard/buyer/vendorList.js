import React from "react";
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
    <div className="query-vendor-list">
      {/* Search Input */}
      <input
        id="search_username-query_list-queries_page"
        type="text"
        className="query-vendor-search"
        placeholder="Search by vendor name..."
        value={vendorName}
        onChange={(e) => setVendorName(e.target.value)}
      />

      {/* Select All Controls */}
      {vendors.length > 0 && !loading && (
        <div className="query-select-all">
          <input
            type="checkbox"
            checked={allSelected}
            ref={input => {
              if (input) input.indeterminate = someSelected;
            }}
            onChange={handleSelectAll}
          />
          <span>{allSelected ? "Deselect All" : "Select All"}</span>
          <small>{selectedVendorIds.length} of {vendors.length}</small>
        </div>
      )}

      {/* Vendor List */}
      <div className="query-vendor-scroll">
        {loading ? (
          <div className="hasFullLoader h-100">
            <FullLoader />
          </div>
        ) : (
          vendors.map((vendor) => {
            const isSelected = selectedVendorIds.includes(vendor.user_id);
            return (
              <div
                key={vendor.user_id}
                className={`query-vendor-item ${isSelected ? 'query-vendor-item-active' : ''}`}
                onClick={() => handleClickVendor(vendor)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleCheckboxChange(e, vendor.user_id)}
                  className="query-vendor-checkbox"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="query-vendor-info">
                  {vendor?.vendor_code && vendor.vendor_code !== vendor.display_name && (
                    <span className="query-vendor-code">{vendor.vendor_code}</span>
                  )}
                  <span className="query-vendor-name">
                    {vendor?.display_name ?? vendor?.company_name ?? "-"}
                  </span>
                  <span className="query-vendor-preview">
                    {vendor.last_message || "Send a query..."}
                  </span>
                </div>
                <div className="query-vendor-meta">
                  {vendor.unseen_count > 0 && (
                    <span className="query-vendor-badge">{vendor.unseen_count}</span>
                  )}
                  <span className="query-vendor-time">
                    {vendor.last_message_timestamp ? formatDate(vendor.last_message_timestamp) : ""}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VendorList;