import dynamic from "next/dynamic";
import { Field, useField } from "formik";
import React from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { formatDisplayDate } from "@/utils/sharedFunctions";

const WysiwygEditor = dynamic(
  () => import("../wysiwyg-editor/wysiwygeditor"),
  { ssr: false }
);

const FormikField = ({
  label,
  placeholder = "",
  isRequired,
  name,
  touched,
  type = "text",
  errors,
  selectOptions = [],
  nolabel = false,
  isDisabled = false,
  rows = 2,
  cols = 2,
  className = "",
  value = "",
  enableHandleChange = false,
  handleChange = (e) => {
    console.log(e.target.value);
  },
  showOptionalLabel = true,
  // WH-69: Show a "Previously: X" indicator below the field if the value
  // was changed in the most recent edit session.
  //   previousValue     - the value as it stood before the most recent save
  //   previousValueMeta - { changed_by_name, changed_at } from the history map
  //   currentValue      - optional override; if omitted we use Formik's value
  previousValue = undefined,
  previousValueMeta = null,
  currentValue = undefined,
}) => {
  // Decide whether the indicator should render. We only show it when the
  // previous value differs from what's currently in the form (otherwise the
  // user has already reverted it and the indicator is noise).
  const showPrev =
    previousValue !== undefined &&
    previousValue !== null &&
    previousValue !== '' &&
    String(previousValue) !== String(currentValue ?? value ?? '');
    
  const [field, meta, helpers] = useField(name);
  const hasError = Boolean((touched?.[name] || meta.touched) && (errors?.[name] || meta.error));
  const errorMessage = errors?.[name] || meta.error;

  return (
    <>
      <div className="form-group">
        {!nolabel && (
          <label htmlFor={name}>
            {label} {isRequired ? <sup>*</sup> : showOptionalLabel ? <>(Optional)</> : null}
          </label>
        )}

        {/* Handle select input */}
        {type === "editor" ? (
          <WysiwygEditor
            value={field.value || ""}
            onChange={(html) => {
              helpers.setValue(html);
              if (enableHandleChange) {
                handleChange(html);
              }
            }}
            onBlur={() => helpers.setTouched(true)}
            placeholder={placeholder || `Enter ${label}`}
            readOnly={isDisabled}
            className={className}
          />
        ) : type === "select" ? (
          enableHandleChange ? (
            <Field
              value={value}
              onChange={handleChange}
              as="select"
              id={name}
              name={name}
              placeholder={placeholder || `Enter ${label}`}
              disabled={isDisabled}
            >
              {selectOptions?.map((item, index) => (
                <option
                  key={index}
                  value={item.value}
                  disabled={item.disabled || false}
                >
                  {item.label}
                </option>
              ))}
            </Field>
          ) : (
            <Field
              value={value}
              as="select"
              id={name}
              name={name}
              placeholder={placeholder || `Enter ${label}`}
              disabled={isDisabled}
            >
              {selectOptions?.map((item, index) => (
                <option
                  key={index}
                  value={item.value}
                  disabled={item.disabled || false}
                >
                  {item.label}
                </option>
              ))}
            </Field>
          )
        ) : type === "textarea" ? (
          enableHandleChange ? (
            <Field
              as="textarea"
              id={name}
              name={name}
              placeholder={placeholder || `Enter ${label}`}
              cols={cols}
              rows={rows}
              className={className}
              onKeyUp={handleChange}
              disabled={isDisabled}
            />
          ) : (
            <Field
              as="textarea"
              id={name}
              name={name}
              placeholder={placeholder || `Enter ${label}`}
              cols={cols}
              rows={rows}
              className={className}
              disabled={isDisabled}
            />
          )
        ) : enableHandleChange ? (
          // Handle number, date input types
          <Field
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={handleChange} 
            placeholder={placeholder || `Enter ${label}`}
            disabled={isDisabled}
            // If it's a number field, set min to 0 to prevent negative values
            {...(type === "number" && { min: 0 })}
          />
        ) : (
          // Handle text and other input types
          <Field
            type={type}
            id={name}
            name={name}
            placeholder={placeholder || `Enter ${label}`}
            disabled={isDisabled}
          />
        )}

        {/* Display validation errors */}
        {hasError && <div className="form-error">{errorMessage}</div>}

        {/* WH-69: previous value indicator */}
        {showPrev && (
          previousValueMeta?.changed_by_name ? (
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip id={`prev-${name}`}>
                  Changed by {previousValueMeta.changed_by_name}
                  {previousValueMeta.changed_at
                    ? ` on ${formatDisplayDate(previousValueMeta.changed_at, { includeTime: true })}`
                    : ''}
                </Tooltip>
              }
            >
              <small className="prev-value-indicator">
                Previously: <span className="prev-value-strike">{String(previousValue)}</span>
              </small>
            </OverlayTrigger>
          ) : (
            <small className="prev-value-indicator">
              Previously: <span className="prev-value-strike">{String(previousValue)}</span>
            </small>
          )
        )}

      </div>
    </>
  );
};

export default FormikField;
