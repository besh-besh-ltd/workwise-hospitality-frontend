export const vendorConditions = [
  {
    label: "Previously Finalized Vendors",
    value: "prev_finalized",
  },
  {
    label: "Sent RFQ atleast once",
    value: "rfq_sent",
  },
];

export const subscriptionTypes = [
  {
    label: "Premium",
    subLabel: "(guaranteed response in 24hrs)",
    value: "premium",
  },
];

export const optionVendors = [
  { value: "is_private", label: "My Private Vendor" },
  { value: "is_public", label: "My Public Vendor" },
  { value: "both", label: "Both" },
];
