import { useEffect, useState } from "react";
import { Field, ErrorMessage } from "formik";
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


const CommonFormInput = ({
  name,
  label,
  type = "text", // text, email, password, select, multiselect, mobile, textarea
  options = [],
  isMulti = false,
  touched,
  errors,
  values,
  setFieldValue,
  className = "",
  placeholder = "",
   required = false, 
   disabled = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isInvalid = touched?.[name] && errors?.[name];
  const [countryCodes, setCountryCodes] = useState([]);

  if (type === "select" || type === "multiselect") {
    return (
      <div className="form-group mb-3">
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
        <Select
          id={name}
          name={name}
          options={options}
          value={values}
          onChange={(option) => {
            console.log(name, option)
            setFieldValue(name, option) }}
          isMulti={isMulti}
          placeholder={placeholder || `Select ${label}`}
          className={isInvalid ? "is-invalid" : ""}
          isDisabled={disabled}
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
        className={`form-control ${isInvalid ? "is-invalid" : ""} ${className}`}
        placeholder={placeholder || `Enter ${label}`}
        value={values}
        onChange={(e) => setFieldValue(name, e.target.value)}
        rows={4}
      />
      {isInvalid && (
        <div className="invalid-feedback">{errors?.[name]}</div>
      )}
    </div>
  );
}


  if (type === "mobile") {
    const fetchData = async () => {
      try {
        const response = await getCountryCodes();
        if (response?.data) {
          setCountryCodes(response.data);
          console.log("label ....65 ...", label, name, values);

          const countryCode = values?.split("-"); // expected value is
          console.log("label =>", label,name,  countryCode); // ex value is +91
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
          {label} <span className="text-danger">*</span>
        </label>
        <div className="d-flex">
          <Field name="countryCode" className="placeholder-muted" >
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
            style={{ zIndex: 10, paddingRight: "25px" }}
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
