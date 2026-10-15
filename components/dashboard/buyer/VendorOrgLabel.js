// "via {org}" under a vendor's name on buyer RFQ / quote lists (Vendor Networks
// spec §6.3, §9). A vendor in a vendor network quotes as itself (its own GSTIN);
// the label names the network it belongs to. The server sends `org_name` only
// for such vendors (null or absent otherwise), so nothing renders for the rest.

import React from "react";

export const viaOrgText = (orgName) => {
  const name = typeof orgName === "string" ? orgName.trim() : "";
  return name ? `via ${name}` : null;
};

export default function VendorOrgLabel({ orgName, className, style }) {
  const text = viaOrgText(orgName);
  if (!text) return null;
  return (
    <span className={className} style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--fg-3, #6b6b66)", ...style }} title={text}>
      {text}
    </span>
  );
}
