import React from "react";

// react-select formatOptionLabel: a disabled role shows why it can't be picked.
// In the selected-value slot (context "value") only the plain label is shown.
export const formatApproverOption = (opt, { context } = {}) => {
  if (context === "value" || !opt?.reason) return opt?.label;
  return (
    <div>
      <div>{opt.label}</div>
      <div style={{ fontSize: 11, opacity: 0.8 }}>{opt.reason}</div>
    </div>
  );
};
