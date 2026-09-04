"use client";
import { useEffect, useState } from "react";
import { Field, ErrorMessage, useField } from "formik";
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { getCountryCodes } from "@/services/cms";


// NOTE - need to remove this as we already have FormikField.js

/** 
 A reusable and flexible form input component built for Formik.
 Supports:
 - Works best wuith formik 
 - Standard inputs: text, email, number, password (with toggle)
 - React-select-based inputs: single/multi-select
 - Mobile input with country code selector, 
 
 Automatically handles touched/errors state and inline validation display.

 */

{
  /*
 best way to use select using this component

  <CommonFormInput
  name="role"
  label="Role"
  type="select"
  required={true}
  options={roleOptions}
/>; */
}

//  do not make any change in this component as it is used in many places and it is a reusable component
const CommonFormInput = ({
  name,
  label,
  labelBold, // no need to pass this prop, it is used to make the label bold if required use lable csss so that if needed we can apply other css as well
  type = "text", // text, email, password, select, multiselect, mobile, textarea, simple-text
  options = [],
  isMulti = false,
  isClearable = true,
  isSearchable = true,
  touched,
  errors,
  values,
  defaultValue, // This is used when we dont want to enforce any value, basically making the input free to any value
  // setFieldValue,
  onChange,
  className = "",
  // style,
  placeholder = "",
  required = false,
  disabled = false,
  validation = "", // for custom validation like float_number
  maxLength, // optional soft cap; renders inline counter and marks input invalid when exceeded
  showCharCount = false, // when true (and maxLength is set), show "N / max" counter below the field
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [countryCodes, setCountryCodes] = useState([]);

  const isInvalid = errors?.[name];

  if (type === "select" || type === "multiselect") {
    const safeUseField = (name) => {
      try {
        return useField(name);
      } catch {
        return [undefined, {}, { setValue: () => {} }];
      }
    };

    const [field, meta, helpers] = safeUseField(name);

    return (
      <div className="form-group mb-3">
        <label
          htmlFor={name}
          className="form-label"
          style={{
            fontWeight: labelBold ? "500" : "300",
          }}
        >
          {label} {required && <span className="text-danger">*</span>}
        </label>
        <Select
          id={name}
          name={name}
          options={options}
          value={values}
          defaultValue={defaultValue}
          onChange={(val, actionMeta) => {
            helpers.setValue(val); // update Formik
            onChange && onChange(val, actionMeta); // fire external callback
          }}
          isMulti={isMulti}
          placeholder={placeholder || `Select ${label}`}
          className={isInvalid ? "is-invalid" : ""}
          isDisabled={disabled}
          isClearable={isClearable}
          isSearchable={isSearchable}
        />
        {isInvalid && (
          <div className="invalid-feedback d-block">{errors[name]}</div>
        )}
      </div>
    );
  }

  if (type === "textarea") {
    //  this block state is used to handle the value of the textarea, this will fix the issue "user not able to edit the ionput from middle"
    const [value, setValue] = useState('');

    const handelOnChahnge = (e) => {
      setValue(e.target.value);
      onChange && onChange(e);
    }
    const currentValue = (value || values || "");
    const currentLength = String(currentValue).length;
    const overLimit = !!maxLength && currentLength > maxLength;
    // Warning shows only once the user is exactly at the cap; deleting
    // any character drops the input back to its default style. Avoids the
    // previous "stuck orange after delete" feel of an 80% pre-warning.
    const nearLimit = !!maxLength && !overLimit && currentLength === maxLength;
    return (
      <div className="form-group mb-1">
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        <textarea
          id={name}
          disabled={disabled}
          name={name}
          className={`placeholder-muted form-control ${
            isInvalid || overLimit ? "is-invalid" : nearLimit ? "is-warning" : ""
          } ${className}`}
          placeholder={placeholder || `Enter ${label}`}
          // defaultValue={defaultValue}
          value={value || values}
          onChange={handelOnChahnge}
          rows={4}
          maxLength={maxLength}
          // style={style ?? {}}
        />
        {showCharCount && maxLength && (
          <div
            className={`rfq-char-count ${overLimit ? "rfq-char-count--over" : nearLimit ? "rfq-char-count--warn" : ""}`}
            aria-live="polite"
          >
            {currentLength} / {maxLength}
          </div>
        )}
        {isInvalid && <div className="invalid-feedback">{errors?.[name]}</div>}
      </div>
    );
  }

  if (type === "simple-text") {
    //  this block state is used to handle the value of the textarea, this will fix the issue "user not able to edit the ionput from middle"
    const [value, setValue] = useState('');
    const handelOnChange = (e) => {
      const value = e.target.value;

    if(name === "quantity"){
    if(value.length > 12){
      return;
    }

    let cleaned;
    if(validation === "float_number"){
      cleaned = value.replace(/[^0-9.]/g, '');
      // Allow only one decimal point
      const firstDot = cleaned.indexOf('.');
      if (firstDot !== -1) {
        cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
      }
      // Limit to 3 decimal places
      const dotIndex = cleaned.indexOf('.');
      if (dotIndex !== -1 && cleaned.length - dotIndex - 1 > 3) {
        cleaned = cleaned.slice(0, dotIndex + 4);
      }
      // Don't allow just a dot
      if (cleaned === '.') {
        cleaned = '';
      }
      // Remove leading zeros but allow "0." and "0"
      cleaned = cleaned.replace(/^0+(?=\d)/, (match, offset) => {
        return cleaned[match.length] === '.' ? '0' : '';
      });
    } else {
      cleaned = value.replace(/\D/g, '');
      if(cleaned === "0"){
        cleaned = "";
      }
      cleaned = cleaned.replace(/^0+(?=[0-9.])/, '');
    }
      setValue(cleaned);
    }
    else{
      setValue(value);
    }
      onChange && onChange(e);
    };

    const currentValue = (value || values || "");
    const currentLength = String(currentValue).length;
    const overLimit = !!maxLength && currentLength > maxLength;
    const nearLimit = !!maxLength && !overLimit && currentLength === maxLength;
    return (
      <div className="form-group mb-3">
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        <input
          id={name}
          disabled={disabled}
          name={name}
          className={`placeholder-muted form-control ${
            isInvalid || overLimit ? "is-invalid" : nearLimit ? "is-warning" : ""
          } ${className}`}
          placeholder={placeholder || `Enter ${label}`}
          // defaultValue={defaultValue}
          value={value || values}
          onChange={handelOnChange}
          maxLength={maxLength}
          // style={style ?? {}}
        />
        {showCharCount && maxLength && (
          <div
            className={`rfq-char-count ${overLimit ? "rfq-char-count--over" : nearLimit ? "rfq-char-count--warn" : ""}`}
            aria-live="polite"
          >
            {currentLength} / {maxLength}
          </div>
        )}
        {isInvalid && <div className="invalid-feedback">{errors?.[name]}</div>}
      </div>
    );
  }

  if (type === "mobile") {
    const fetchData = async () => {
      try {
        const response = await getCountryCodes();
        if (response?.data) {
          setCountryCodes(response.data);
          // const countryCode = values?.split("-"); // expected value is
        }
      } catch (error) {
        console.error("Error fetching country codes:", error);
        // Optionally: toast.error("Failed to load country codes");
      }
    };

    useEffect(() => {
      fetchData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="form-group mb-3">
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        <div className="d-flex">
          <Field name="countryCode" className="placeholder-muted">
            {({ field, form }) => (
              <select
                {...field}
                className={`form-select me-2 `}
                style={{ maxWidth: "140px" }}
                onChange={(e) => {
                  form.setFieldValue("countryCode", e.target.value);
                }}
                disabled={disabled}
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
            type="number"
            id={name}
            name={name}
            className={`placeholder-muted form-control ${
              isInvalid ? "is-invalid" : ""
            } ${className}`}
            placeholder={placeholder || `Enter ${label}`}
            disabled={disabled}
          />
        </div>
        <ErrorMessage
          name="mobile"
          component="div"
          className="invalid-feedback"
        />
        <ErrorMessage
          name="countryCode"
          component="div"
          className="invalid-feedback"
        />
      </div>
    );
  }

  return (
    <div className="form-group mb-3">
      <label htmlFor={name} className="form-label">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div className="position-relative">
        <Field
          type={
            type === "password" ? (showPassword ? "text" : "password") : type
          }
          id={name}
          name={name}
          className={`placeholder-muted form-control ${
            isInvalid ? "is-invalid" : ""
          } ${className}`}
          placeholder={placeholder || `Enter ${label}`}
          disabled={disabled}
        />
        {type === "password" && (
          <p
            className="placeholder-muted position-absolute top-50 end-0 translate-middle-y me-2 bg-transparent border-0"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{ zIndex: 0, paddingRight: "25px" }}
            aria-label="Toggle password visibility"
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
          </p>
        )}
      </div>
      {/* Error message always visible if error exists */}
      {isInvalid && <div className="invalid-feedback d-block">{errors[name]}</div>}
    </div>
  );
};

export default CommonFormInput;
