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
        {type == "select" ? (
          enableHandleChange ? (
            <>
              <Field
                value={value}
                onChange={handleChange}
                as="select"
                id={`${name}`}
                name={`${name}`}
                placeholder={
                  placeholder ? placeholder : label ? `Enter ${label}` : ""
                }
                disabled={isDisabled}
              >
                {selectOptions?.map((item, index) => {
                  return (
                    <option
                      key={index}
                      value={item.value}
                      disabled={item.disabled ? item.disabled : false}
                    >
                      {item.label}
                    </option>
                  );
                })}
              </Field>
            </>
          ) : (
            <>
              <Field
                value={value}
                as="select"
                id={`${name}`}
                name={`${name}`}
                placeholder={
                  placeholder ? placeholder : label ? `Enter ${label}` : ""
                }
                disabled={isDisabled}
              >
                {selectOptions?.map((item, index) => {
                  return (
                    <option
                      key={index}
                      value={item.value}
                      disabled={item.disabled ? item.disabled : false}
                    >
                      {item.label}
                    </option>
                  );
                })}
              </Field>
            </>
          )
        ) : type == "textarea" ? (
          enableHandleChange ? (
            <>
              <Field
                as="textarea"
                id={`${name}`}
                name={`${name}`}
                placeholder={
                  placeholder ? placeholder : label ? `Enter ${label}` : ""
                }
                cols={cols}
                rows={rows}
                className={className}
                onKeyUp={handleChange}
                disabled={isDisabled}
                // onChange={(e)=>console.log(e.target.value)}
              />
            </>
          ) : (
            <>
              <Field
                as="textarea"
                id={`${name}`}
                name={`${name}`}
                placeholder={
                  placeholder ? placeholder : label ? `Enter ${label}` : ""
                }
                cols={cols}
                rows={rows}
                className={className}
                disabled={isDisabled}
                // onChange={(e)=>console.log(e.target.value)}
              />
            </>
          )
        ) : enableHandleChange ? (
          <Field
            type={`${type}`}
            id={`${name}`}
            name={`${name}`}
            onKeyUp={handleChange}
            placeholder={
              placeholder ? placeholder : label ? `Enter ${label}` : ""
            }
            disabled={isDisabled}
          />
        ) : (
          <Field
            type={`${type}`}
            id={`${name}`}
            name={`${name}`}
            placeholder={
              placeholder ? placeholder : label ? `Enter ${label}` : ""
            }
            disabled={isDisabled}
          />
        )}

        {touched[name] && errors[name] && (
          <div className="form-error">{errors[name]}</div>
        )}
      </div>
    </>
  );
};

export default FormikField;
