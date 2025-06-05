import { useState } from "react";
import { Field, ErrorMessage } from "formik";
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

/** 
 A reusable and flexible form input component built for Formik.
 Supports:
 - Standard inputs: text, email, number, password (with toggle)
 - React-select-based inputs: single/multi-select
 - Mobile input with country code selector
 
 Automatically handles touched/errors state and inline validation display.
 */


const CommonFormInput = ({
  name,
  label,
  type = "text", // text, email, password, select, multiselect, mobile
  options = [],
  isMulti = false,
  touched,
  errors,
  values,
  setFieldValue,
  className = "",
  placeholder = "",
  prefixComponent = null,
  countryCodes = [] // only needed for type="mobile"
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isInvalid = touched?.[name] && errors?.[name];

  if (type === "select" || type === "multiselect") {
    return (
      <div className="form-group mb-3">
        <label htmlFor={name} className="form-label">
          {label} <span className="text-danger">*</span>
        </label>
        <Select
          id={name}
          name={name}
          options={options}
          value={values[name] || (isMulti ? [] : null)}
          onChange={(option) => setFieldValue(name, option)}
          isMulti={isMulti}
          placeholder={placeholder || `Select ${label}`}
          className={isInvalid ? "is-invalid" : ""}
        />
        {isInvalid && <div className="invalid-feedback d-block">{errors[name]}</div>}
      </div>
    );
  }

  if (type === "mobile") {
    return (
      <div className="form-group mb-3">
        <label htmlFor={name} className="form-label">
          {label} <span className="text-danger">*</span>
        </label>
        <div className="d-flex">
          <Field name="countryCode">
            {({ field, form }) => (
              <select
                {...field}
                className={`form-select me-2 ${touched.countryCode && errors.countryCode ? "is-invalid" : ""}`}
                style={{ maxWidth: "140px" }}
                onChange={(e) => {
                  form.setFieldValue("countryCode", e.target.value);
                }}
              >
                {countryCodes.map((country) => (
                  <option key={country.id} value={country.phone_code}>
                    {country.country_code} ({country.phone_code})
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            type="text"
            id={name}
            name={name}
            className={`form-control ${isInvalid ? "is-invalid" : ""} ${className}`}
            placeholder={placeholder || `Enter ${label}`}
          />
        </div>
        <ErrorMessage name="mobile" component="div" className="invalid-feedback" />
        <ErrorMessage name="countryCode" component="div" className="invalid-feedback" />
      </div>
    );
  }

  return (
    <div className="form-group mb-3">
      <label htmlFor={name} className="form-label">
        {label} <span className="text-danger">*</span>
      </label>
      <div className="position-relative">
        <Field
          type={type === "password" ? (showPassword ? "text" : "password") : type}
          id={name}
          name={name}
          className={`form-control ${isInvalid ? "is-invalid" : ""} ${className}`}
          placeholder={placeholder || `Enter ${label}`}
        />
        {type === "password" && (
          <p
            className="position-absolute top-50 end-0 translate-middle-y me-2 bg-transparent border-0"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{ zIndex: 10, paddingRight:"25px" }}
            aria-label="Toggle password visibility"
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
          </p>
        )}
      </div>
      <ErrorMessage name={name} component="div" className="invalid-feedback" />
    </div>
  );
};

export default CommonFormInput;
