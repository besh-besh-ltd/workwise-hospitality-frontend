import React, { useState } from 'react';
import Modal from "react-modal";
import { Field, Form, Formik } from "formik";
import * as yup from "yup";

const DynamicFormSpoc = ({
    type,
    spocData,
    openModal,
    closeModal,
    handleSpoc,
    handleEditSpoc,
    countryCode,
    pageRoute = "vendor_profile_page" // Default fallback
}) => {

    const codeList = Array.isArray(countryCode) ? countryCode : [];

    const initialSpocValue = {
        spoc_name: type === "create-spoc" ? "" : spocData?.spoc_name,
        spoc_email: type === "create-spoc" ? "" : spocData?.spoc_email,
        spoc_mobile: type === "create-spoc" ? "" : spocData?.spoc_mobile.trim().replace(/^[^-]*-/, ""),
        spoc_role: type === "create-spoc" ? "" : spocData?.spoc_role
    };

    const validateSpocSchema = yup.object().shape({
        spoc_name: yup.string().required("Spoc name is required")
            .min(2, "Name not less than 2 characters")
            .max(50, "Name not more than 50 characters"),
        spoc_email: yup.string().required("Email is required").email("Please enter a valid email address"),
        spoc_mobile: yup.string().test('is-valid-mobile', 'Invalid mobile number', function(value) {
            const code = this.parent.selectedPhoneCode || '+91';
            if (code === '+91') {
                return /^[0-9]{10}$/.test(value || '');
            }
            return /^[0-9]{7,15}$/.test(value || '');
        })
    });
  
    const defaultCountryCode = spocData?.spoc_mobile?.trim().match(/^\+\d+(?=-)/)?.[0] || "";

    // Find the matched country object
    const matchedCountry = codeList.find(country => country.phone_code === defaultCountryCode) || null;

    const [selectedPhoneCode, setSelectedPhoneCode] = useState(matchedCountry?.phone_code || "+91");


    

    return (
      <Modal
        isOpen={openModal}
        onRequestClose={closeModal}
        ariaHideApp={false}
        contentLabel={
          type === "create-spoc" ? "Add Spoc Modal" : "Update Spoc Modal"
        }
        className="login-register"
        style={{
          overlay: { backgroundColor: "rgba(0, 0, 0, 0.75)" },
          content: {
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "70vw",
            width: "70vw",
            border: "none",
            background: "transparent",
            overflow: "hidden",
            padding: "40px",
            maxHeight: "90vh",
            height: "80vh",
          },
        }}
      >
        <div className="modal-body contact-sec-modal w-75 mx-auto">
          <div className="contact-sec-3 flex">
            <div className="contact-sec-3-form">
              <div className="contact-form w-100">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h2 className="tab-titlex m-0">
                    {type === "create-spoc" ? "New SPOC" : "Edit SPOC"}
                  </h2>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-close"
                    aria-label="Close"
                  ></button>
                </div>

                <Formik
                  initialValues={{ ...initialSpocValue, selectedPhoneCode }}
                  validationSchema={validateSpocSchema}
                  onSubmit={(values, { resetForm }) => {
                    const formattedValues = {
                      ...values,
                      spoc_mobile:
                        values.selectedPhoneCode +
                        "-" +
                        values.spoc_mobile.replace(/^0+/, ""),
                    };
                    delete formattedValues.selectedPhoneCode;
                    type === "create-spoc"
                      ? handleSpoc(formattedValues, resetForm)
                      : handleEditSpoc(formattedValues, resetForm);
                  }}
                >
                  {({ errors, isValid, touched }) => (
                    <Form className="row add-vendor-modal-form w-100">
                      <div className="col-md-12">
                        <div className="row">
                          <div className="col-md-6">
                            <div className="form-group">
                              <label htmlFor="spoc_name">
                                Name <sup>*</sup>
                              </label>
                              <Field
                                type="text"
                                id="spoc_name"
                                name="spoc_name"
                                placeholder="Spoc Name"
                              />
                              {touched.spoc_name && errors.spoc_name && (
                                <div className="form-error">
                                  {errors.spoc_name}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-group">
                              <label htmlFor="spoc_email">
                                Email <sup>*</sup>
                              </label>
                              <Field
                                type="text"
                                id="spoc_email"
                                name="spoc_email"
                                placeholder="Spoc Email"
                              />
                              {touched.spoc_email && errors.spoc_email && (
                                <div className="form-error">
                                  {errors.spoc_email}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Number with Country Code */}
                        <div className="row">
                          <div className="col-md-6">
                            <div className="form-group">
                              <label htmlFor="spoc_mobile">
                                Mobile <sup>*</sup>
                              </label>
                              <div className="d-flex">
                                <select
                                  className="form-control"
                                  style={{
                                    width: "70%",
                                    height: "54px",
                                    marginRight: "6px",
                                  }}
                                  value={selectedPhoneCode || ""}
                                  onChange={(e) => {
                                    setSelectedPhoneCode(e.target.value);
                                  }}
                                >
                                  {matchedCountry && (
                                    <option value={matchedCountry.phone_code}>
                                      {matchedCountry.country_code} (
                                      {matchedCountry.phone_code})
                                    </option>
                                  )}
                                  {codeList.map((country) => (
                                    <option
                                      key={country.id}
                                      value={country.phone_code}
                                    >
                                      {country.country_code} (
                                      {country.phone_code})
                                    </option>
                                  ))}
                                </select>
                                <Field
                                  type="text"
                                  id="spoc_mobile"
                                  name="spoc_mobile"
                                  placeholder="Spoc Mobile"
                                  className="form-control ml-2"
                                />
                              </div>
                              {touched.spoc_mobile && errors.spoc_mobile && (
                                <div className="form-error">
                                  {errors.spoc_mobile}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="col-md-6">
                            <div className="form-group">
                              <label htmlFor="spoc_role">Role</label>
                              <Field
                                type="text"
                                id="spoc_role"
                                name="spoc_role"
                                placeholder="Spoc Role"
                              />
                              {touched.spoc_role && errors.spoc_role && (
                                <div className="form-error">
                                  {errors.spoc_role}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="d-flex justify-content-end">
                          <button
                            type="submit"
                            disabled={!isValid}
                            className="btn btn-success btn-sm"
                            id={`submit_spoc_form-spoc_modal-${pageRoute}`}
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
};

export default DynamicFormSpoc;
