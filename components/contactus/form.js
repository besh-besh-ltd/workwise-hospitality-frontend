import { useState } from "react";

import { contactUsFormService } from "@/services/contact";
import { Field, Form, Formik } from "formik";
import { ToastContainer, toast } from "react-toastify";
import * as yup from "yup";
import Loader from "../shared/Loader";
import { useRouter } from "next/router";

const ContactUsForm = ({ isModalForm = false, closeModal, fromType }) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Login Initial Value
  const initialValues = {
    name: "",
    email: "",
    phone: "",
    subject: "Page modal lead",
    comment: isModalForm ? `` : "",
  };
  // Login Initial Validations
  var validateSchema = null;
  if (isModalForm) {
    validateSchema = yup.object().shape({
      name: yup
        .string()
        .min(2, "Name not less than 2 characters short")
        .max(50, "Name not more than 50 characters long")
        .required("Name is required"),
      email: yup
        .string()
        .email()
        .matches(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
          "Please enter valid email address"
        )
        .required("Email is required"),
      phone: yup
        .string()
        .matches(
          /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
          "please enter valid contact number"
        )
        .min(10, "Min 10 digit is required")
        .max(11, "Mobile number not more than 11 digit long")
        .required("Mobile number is required"),
      subject: yup.string().optional(),
      comment: yup.string().optional(),
    });
  } else {
    validateSchema = yup.object().shape({
      name: yup
        .string()
        .min(2, "Name not less than 2 characters short")
        .max(50, "Name not more than 50 characters long")
        .required("Name is required"),
      email: yup
        .string()
        .email()
        .matches(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
          "Please enter valid email address"
        )
        .required("Email is required"),
      phone: yup
        .string()
        .matches(
          /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
          "please enter valid mobile number"
        )
        .min(10, "Min 10 digit is required")
        .max(11, "Mobile number not more than 11 digit long")
        .required("Mobile number is required"),
      subject: yup.string().required("Subject is required"),
      comment: yup.string().required("Comment is required"),
    });
  }

  const contactUsSubmitHandler = (values, resetForm) => {
    setLoading(true);
    const payload = {
      ...values,
      submitted_from: fromType,
    };
    contactUsFormService(payload)
      .then((response) => {
        setLoading(false);
        toast.success(response.message, {
          position: "top-center",
        });

        removeQueryString();
        resetForm();
      })
      .catch((error) => {
        setLoading(false);
        if (error.response?.status === 400) {
        } else {
          toast.error(error.message, {
            position: "top-center",
          });
        }
      });
  };
  const removeQueryString = () => {
    const { pathname } = router;
    router.replace({ pathname });
    if (isModalForm) {
      setTimeout(() => {
        closeModal();
      }, 500);
    }
  };
  return (
    <>
      {loading && <Loader />}
      <Formik
        initialValues={initialValues}
        validationSchema={validateSchema}
        onSubmit={(values, { resetForm }) =>
          contactUsSubmitHandler(values, resetForm)
        }
      >
        {({ errors, touched }) => (
          <Form>
            <div className="row">
              <div className="col-md-6">
                <span className="contacts-title">Name</span>
                <div className="form-group">
                  <Field
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Enter name here"
                  />
                  {touched.name && errors.name && (
                    <div className="form-error">{errors.name}</div>
                  )}
                </div>
              </div>
              {isModalForm && (
                <div className="col-md-6">
                  <span className="contacts-title">Contact Number</span>
                  <div className="form-group">
                    <Field
                      type="text"
                      id="phone"
                      name="phone"
                      placeholder={
                        isModalForm ? "Ex. 9123456789" : "Enter phone here"
                      }
                    />
                    {touched.phone && errors.phone && (
                      <div className="form-error">{errors.phone}</div>
                    )}
                  </div>
                </div>
              )}
              <div className={isModalForm ? "col-md-12" : "col-md-6"}>
                <span className="contacts-title">Email</span>
                <div className="form-group">
                  <Field
                    type="email"
                    id="email"
                    name="email"
                    placeholder="@example.com"
                  />
                  {touched.email && errors.email && (
                    <div className="form-error">{errors.email}</div>
                  )}
                </div>
              </div>

              {!isModalForm && (
                <div className={isModalForm ? "col-md-12" : "col-md-6"}>
                  <div className="form-group">
                    <Field
                      type="text"
                      id="phone"
                      name="phone"
                      placeholder={
                        isModalForm ? "Contact Number" : "Enter phone here"
                      }
                    />
                    {touched.phone && errors.phone && (
                      <div className="form-error">{errors.phone}</div>
                    )}
                  </div>
                </div>
              )}

              {!isModalForm && (
                <div className="col-md-6">
                  <div className="form-group">
                    <Field
                      type="text"
                      id="subject"
                      name="subject"
                      placeholder="Enter subject here"
                    />
                    {touched.subject && errors.subject && (
                      <div className="form-error">{errors.subject}</div>
                    )}
                  </div>
                </div>
              )}

              <div className="col-md-12">
                <div className="form-group">
                  {isModalForm && (
                    <Field
                      as="textarea"
                      id="comment"
                      name="comment"
                      placeholder="Ex. I am going to fill tender for fire safety in one of the Reliance plants, and I am searching for products required for my project fulfillment."
                      style={{ height: "200px" }}
                    />
                  )}
                  {!isModalForm && (
                    <Field
                      as="textarea"
                      id="comment"
                      name="comment"
                      placeholder="Enter comment here"
                    />
                  )}

                  {touched.comment && errors.comment && (
                    <div className="form-error">{errors.comment}</div>
                  )}
                </div>

                <button type="submit" className="btn btn-secondary">
                  Submit
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
      <ToastContainer />
    </>
  );
};

export default ContactUsForm;
