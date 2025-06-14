"use client";
import { useEffect, useState } from "react";
import { Field, ErrorMessage, useField } from "formik";
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { getCountryCodes } from "@/services/cms";

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
  type = "text", // text, email, password, select, multiselect, mobile, textarea
  options = [],
  isMulti = false,
  isClearable = true,
  isSearchable = true,
  touched,
  errors,
  values,
  // defaultValue, // no need to pass this value as values is the default value only
  // setFieldValue,
  onChange,
  className = "",
  // style,
  placeholder = "",
  required = false,
  disabled = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [countryCodes, setCountryCodes] = useState([]);

  const isInvalid = touched?.[name] && errors?.[name];

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
    return (
      <div className="form-group mb-3">
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        <textarea
          id={name}
          disabled={disabled}
          name={name}
          className={`placeholder-muted form-control ${
            isInvalid ? "is-invalid" : ""
          } ${className}`}
          placeholder={placeholder || `Enter ${label}`}
          // defaultValue={defaultValue}
          value={values}
          onChange={(e) => setFieldValue(name, e.target.value)}
          rows={4}
          // style={style ?? {}}
        />
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
      <ErrorMessage name={name} component="div" className="invalid-feedback" />
    </div>
  );
};

export default CommonFormInput;
