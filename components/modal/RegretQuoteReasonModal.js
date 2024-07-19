import { useEffect, useState } from "react";
import Modal from "react-modal";

import { Field, Form, Formik } from "formik";
import * as yup from "yup";
const RegretQuoteReasonModal = (props) => {
  // Use useEffect to handle the body overflow property
  useEffect(() => {
    const handleBodyOverflow = () => {
      document.body.style.overflow = props.openModal ? "hidden" : "auto";
    };
    handleBodyOverflow(); // Set initial state
    // Cleanup function to restore body overflow when the component unmounts
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [props.openModal]);

  const initialValues = {
    reqret_reason: ""   
  };
  const validateSchema = yup.object().shape({
        reqret_reason: yup
        .string()
        .required("Reason is required")   
    })

  return (
    <Modal
      isOpen={props.showModal}
      onRequestClose={props.closeModal}
      ariaHideApp={false}
      contentLabel="Regret Quote Reason"
      className="contact-modal contact-modal-new"
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
        },
        content: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "90vw", // Adjust this value as needed
          width: "800px", // Set to 'auto' or a specific value based on your design
          border: "none",
          background: "transparent",
          overflow: "hidden",
          padding: "50px",
          maxHeight: "100vh", // Adjust this value as needed\
          height: "90vh", // Adjust this value as needed
        },
      }}
    >
      <div className="modal-header">
        <button
          onClick={props.closeModal}
          className="btn-close"
          aria-label="Close"
        ></button>
      </div>
      <div className="modal-body contact-sec-modal" style={{}}>
        <div className="contact-sec-3">
          <div className="contact-sec-3-form">
            <div className="contact-form">
              <h2 className="tab-titlex">Regret Quote Reason</h2>
              <p>Please specify the reason for regreting the quote.</p>
              <Formik
                    initialValues={initialValues}
                    validationSchema={validateSchema}
                    onSubmit={(values, { resetForm }) =>{                       
                        props.handleRegretReason(values, resetForm);
                    }}
                >
                {({ errors, isValid, touched }) => (
                    <Form>
                        <div className="col-md-12">
                        <div className="form-group">
                            <Field
                            as="textarea"
                            rows="5"
                            id="reqret_reason"
                            name="reqret_reason"
                            placeholder=""
                            />
                            {touched.reqret_reason && errors.reqret_reason && (
                            <div className="form-error">{errors.reqret_reason}</div>
                            )}
                        </div>
                        </div>
                        <div className="d-flex flex-row justify-content-between align-items-center g-6">                    
                            <button disabled={!isValid} class="btn btn-success btn-sm">Regret Quote</button>
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

export default RegretQuoteReasonModal;
