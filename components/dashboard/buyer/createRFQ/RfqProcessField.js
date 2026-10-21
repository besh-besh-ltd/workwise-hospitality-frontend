import React from "react";
import Select from "react-select";

export const NO_RFQ_WORKFLOW_MESSAGE =
  "No approval workflow is set up for RFQs at this unit. Ask your company admin to set one up.";

/**
 * The "Process" field of the RFQ create form, driven by what actually has a
 * working RFQ workflow at the chosen unit:
 *   - none usable  -> an explanation instead of a required select nobody can fill
 *   - exactly one, coverage KNOWN -> shown read-only (the caller auto-selects it)
 *   - several      -> the required select
 */
const RfqProcessField = ({
  processes,
  fieldState,
  value,
  onChange,
  disabled,
  missing,
  selectId = "select_process-create_rfq_page",
}) => {
  if (fieldState === "none") {
    return (
      <div className="rfq-field">
        <label className="rfq-label">Process</label>
        <small role="status" className="rfq-field__hint">{NO_RFQ_WORKFLOW_MESSAGE}</small>
      </div>
    );
  }
  if (!processes || processes.length === 0) return null;

  if (fieldState === "readonly" && processes.length === 1) {
    return (
      <div className="rfq-field">
        <label className="rfq-label">Process</label>
        <div data-testid="process-readonly">{processes[0].label}</div>
      </div>
    );
  }

  return (
    <div className={`rfq-field${missing ? " rfq-field--has-error" : ""}`}>
      <label className="rfq-label">Process <span className="rfq-required">*</span></label>
      <Select
        id={selectId}
        options={processes}
        value={processes.find((p) => p.value === value) || null}
        onChange={(selected) => onChange(selected?.value || null)}
        placeholder="Select Process"
        classNamePrefix="react-select"
        isDisabled={disabled}
      />
      {missing && <small className="rfq-field__required-hint">Required</small>}
    </div>
  );
};

export default RfqProcessField;
