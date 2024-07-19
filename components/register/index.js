import axiosInstance from "@/lib/axios";
import { RegisterService } from "@/services/Auth";
import { faEye, faEyeSlash } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Field, Form, Formik } from "formik";
import { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import * as yup from "yup";
import FullLoader from "../shared/FullLoader";
import { useRouter } from "next/router";

const Register = (props) => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);
  const [loading, setloading] = useState(false);
  // Set State Change
  const handleChange = (setState) => (event) => {
    setState(event);
  };
  // Register Initial Value
  const initialValues = {
    name: "",
    email: "",
    mobile: "",
    organization_name: "",
    register_as: "2",
    password: "",
    confirm_password: "",
  };
  // Register Initial Validations
  const validateSchema = yup.object().shape({
    name: yup
      .string()
      .required("Name is required")
      .min(2, "Name not less than 2 characters short")
      .max(50, "Name not more than 50 characters long"),
    email: yup
      .string()
      .email()
      .matches(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter valid email address"
      )
      .required("Email is required"),
    mobile: yup
      .string()
      .matches(
        /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im,
        "please enter valid mobile number"
      )
      .min(10, "Min 10 digit is required")
      .max(11, "Mobile number not more than 11 digit long")
      .required("Mobile number is required"),
    organization_name: yup.string().required("Organization name is required"),
    register_as: yup.string().required("Register as is required"),
    password: yup
      .string()
      .required("Password is required")
      .min(8, "Password must be 8 characters long")
      .matches(/[0-9]/, "Password requires a number")
      .matches(/[a-z]/, "Password requires a lowercase letter")
      .matches(/[A-Z]/, "Password requires an uppercase letter")
      .matches(/[^\w]/, "Password requires a symbol"),
    confirm_password: yup
      .string()
      .required("Please re-type your password")
      .oneOf([yup.ref("password")], "Passwords does not match"),
  });

  const registerSubmitHandler = (values, resetForm) => {
    setloading(true);
    RegisterService(values)
      .then((response) => {
        setloading(false);
        resetForm();
        toast.success(response.message, {
          position: "top-center",
        });
        setTimeout(() => {
          props.closeModal();
          router.push({
            pathname: "/",
            query: { user_registered: 1 },
          });
        }, 1000);
      })
      .catch((error) => {
        setloading(false);

        if (error?.message) {
          toast.error(error.message.response.data.message, {
            position: "top-center",
          });
        }

        if (error.response?.status === 400) {
          if (error.response.data.status === 2) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-center",
            });
          } else if (error.response.data.status === 3) {
            let txt = "";
            for (let x in error.response.data.errors) {
              txt = error.response.data.errors[x];
            }
            toast.error(txt, {
              position: "top-center",
            });
          } else {
            toast.error(error.response.data.message, {
              position: "top-center",
            });
          }
        } else {
          toast.error(error.message, {
            position: "top-center",
          });
        }
      });
  };

  return (
    <>
      <div className="login-form hasFullLoader">
        {loading && <FullLoader />}
        {/* Content for Register tab */}
        <h3 className="tab-title">Register</h3>
        {/* Add your registration form or content here */}
        <Formik
          initialValues={initialValues}
          validationSchema={validateSchema}
          onSubmit={(values, { resetForm }) =>
            registerSubmitHandler(values, resetForm)
          }
        >
          {({ errors, touched }) => (
            <Form>
              <div className="form-group">
                <label htmlFor="name">
                  Contact Person Name <sup>*</sup>
                </label>
                <Field
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Ex. Manoj Kumar"
                />
                {touched.name && errors.name && (
                  <div className="form-error">{errors.name}</div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="email">
                  Work Email <sup>*</sup>
                </label>
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
              <div className="form-group">
                <label htmlFor="organization_name">
                  Organization Name <sup>*</sup>
                </label>
                <Field
                  type="text"
                  id="organization_name"
                  name="organization_name"
                  placeholder="Ex. Worksise Private Limited"
                />
                {touched.organization_name && errors.organization_name && (
                  <div className="form-error">{errors.organization_name}</div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="mobile">
                  Phone No. <sup>*</sup>
                </label>
                <Field
                  type="text"
                  id="mobile"
                  name="mobile"
                  placeholder="Ex. 9123456789"
                />
                {touched.mobile && errors.mobile && (
                  <div className="form-error">{errors.mobile}</div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="register_as">
                  Register As <sup>*</sup>
                </label>
                <Field as="select" id="register_as" name="register_as">
                  <option value="2">Buyer</option>
                  <option value="3">Vendor</option>
                  <option value="4">Other user</option>
                </Field>
                {touched.register_as && errors.register_as && (
                  <div className="form-error">{errors.register_as}</div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="password">
                  Password <sup>*</sup>
                </label>
                <div className="password-input-container">
                  <Field
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="********"
                  />
                  <div
                    className="eye-icon"
                    onClick={() => {
                      handleChange(setShowPassword(!showPassword));
                    }}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
                  </div>
                  {touched.password && errors.password && (
                    <div className="form-error">{errors.password}</div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="confirm_password">
                  Confirm Password <sup>*</sup>
                </label>
                <div className="password-input-container">
                  <Field
                    type={showCPassword ? "text" : "password"}
                    id="confirm_password"
                    name="confirm_password"
                    placeholder="********"
                  />
                  <div
                    className="eye-icon"
                    onClick={() => {
                      handleChange(setShowCPassword(!showCPassword));
                    }}
                  >
                    <FontAwesomeIcon
                      icon={showCPassword ? faEye : faEyeSlash}
                    />
                  </div>
                  {touched.confirm_password && errors.confirm_password && (
                    <div className="form-error">{errors.confirm_password}</div>
                  )}
                </div>
              </div>
              <button type="submit" className="btn btn-secondary">
                Register
              </button>
            </Form>
          )}
        </Formik>
      </div>
      <ToastContainer />
    </>
  );
};

export default Register;
