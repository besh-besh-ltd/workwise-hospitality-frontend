import { Field } from "formik";
import React from "react";

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
}) => {
  return (
    <>
      <div className="form-group">
        {!nolabel && (
          <label htmlFor="username">
            {label} {isRequired ? <sup>*</sup> : <>(Optional)</>}
          </label>
        )}

        {/* Handle select input */}
        {type === "select" ? (
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
        {touched[name] && errors[name] && (
          <div className="form-error">{errors[name]}</div>
        )}
      </div>
    </>
  );
};

export default FormikField;
