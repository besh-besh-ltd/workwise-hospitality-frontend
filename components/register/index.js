import { RegisterService, LoginService } from "@/services/Auth";
import { faEye, faEyeSlash } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Field, Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as yup from "yup";
import FullLoader from "../shared/FullLoader";
import { useRouter } from "next/router";
import { getCountryCodes } from "@/services/cms";
import { set } from "lodash";

{
  /* registerAs = vendor or buyer valid values */
}
const Register = ({
  registerAs,
  onRegistrationSuccess,
  isPaidSubscription = false,
  isHospitality = false,
}) => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);
  const [loading, setloading] = useState(false);
  const [countryCode, setCountryCode] = useState([]);
  const [tncCheckned, setTncCheckned] = useState(false);

  useEffect(() => {
    const fetchCountryCodes = async () => {
      try {
        const res = await getCountryCodes();
        setCountryCode(res.data);
      } catch (error) {
        console.error("Error fetching country codes:", error);
      }
    };

    fetchCountryCodes();
  }, []);

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
    register_as:
      registerAs == "vendor" ? "3" : registerAs == "buyer" ? "2" : "",
    password: "",
    confirm_password: "",
    countryCode: "+91",
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
        /^[+]?[0-9\s-]{7,15}$/,
        "Please enter a valid mobile number (7-15 digits, optional +)"
      )
      .min(7, "Mobile number must be at least 7 digits long")
      .max(15, "Mobile number must not be more than 15 digits long")
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

    const cleanMobile = values.mobile
      .trim()
      .replace(/^0+/, "")
      .replace(/^\+\d+\-/, "");
    const fullMobile = `${values.countryCode}-${cleanMobile}`.substring(0, 15);

    const { countryCode, confirm_password, ...updatedValues } = {
      ...values,
      mobile: fullMobile,
      // For hospitality vendors, keep status 0 (unapproved) until payment
      // For other paid subscriptions, set status to 1 (approved)
      ...(isPaidSubscription && !isHospitality && { status: 1 }),
      // Add is_hospitality flag for hospitality vendors
      ...(isHospitality && { is_hospitality: 1 }),
    };
    RegisterService(updatedValues)
      .then((response) => {
        setloading(false);
        resetForm();
        toast.success(response.message, {
          position: "top-center",
        });

        // If callback is provided, authenticate user and call it with user data
        if (
          onRegistrationSuccess &&
          typeof onRegistrationSuccess === "function"
        ) {
          // Automatically authenticate the user with the same credentials
          const loginData = {
            email: updatedValues.email,
            password: updatedValues.password,
          };

          LoginService(loginData, false)
            .then((loginResponse) => {
              // Call the success callback with user data and token
              onRegistrationSuccess({
                ...updatedValues,
                token: loginResponse.token,
              });
            })
            .catch((loginError) => {
              // Even if auto-login fails, still call the callback
              onRegistrationSuccess(updatedValues);
            });
        } else {
          // Default behavior - redirect to home page
          setTimeout(() => {
            router.push({
              pathname: "/",
              query: { user_registered: 1 },
            });
          }, 1000);
        }
      })
      .catch((error) => {
        setloading(false);
        // Handle different error structures
        if (error?.response?.data?.message) {
          // Standard API error response
          toast.error(error.response.data.message, {
            position: "top-center",
          });
        } else if (error?.response?.data?.errors) {
          // Validation errors
          let errorMessage = "";
          for (let x in error.response.data.errors) {
            errorMessage = error.response.data.errors[x];
            break; // Show first error
          }
          toast.error(errorMessage, {
            position: "top-center",
          });
        } else if (error?.message) {
          // Generic error message
          toast.error(error.message, {
            position: "top-center",
          });
        } else {
          // Fallback error message
          toast.error("Registration failed. Please try again.", {
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
        {/* <h3 className="tab-title">Register</h3> */}
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
                  placeholder="Ex. Rahul Patil"
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
                  placeholder="Ex. Workwise Private Limited"
                />
                {touched.organization_name && errors.organization_name && (
                  <div className="form-error">{errors.organization_name}</div>
                )}
              </div>
              <div className="form-group">
                <div className="d-flex">
                  {/* Country Code Dropdown */}
                  <Field
                    type="text"
                    as="select"
                    name="countryCode"
                    className="form-select me-2 w-auto"
                    style={{ color: "#444" }} // Dark color for the selected option
                  >
                    <option value="+91" style={{ color: "#444" }}>
                      IN (+91)
                    </option>
                    {countryCode.map((item) => (
                      <option
                        key={item.id}
                        value={item.phone_code}
                        style={{ color: "#444" }}
                      >
                        {item.country_code} ({item.phone_code})
                      </option>
                    ))}
                  </Field>

                  {/* Phone Number Input */}
                  <Field
                    type="text"
                    id="mobile"
                    name="mobile"
                    placeholder="Ex. XXXXX XXXXX"
                    className="form-control"
                    style={{
                      "::placeholder": { color: "#6c757d", opacity: 1 },
                    }}
                  />
                </div>

                {/* Display validation errors */}
                {touched.mobile && errors.mobile && (
                  <div className="form-error">{errors.mobile}</div>
                )}
              </div>
              {/* 
              <div className="form-group">
                <label htmlFor="register_as">
                  Register As <sup>*</sup>
                </label>
                <Field as="select" id="register_as" name="register_as">
                  <option value="2">Buyer</option>
                  <option value="3">Vendor</option>
                </Field>
                {touched.register_as && errors.register_as && (
                  <div className="form-error">{errors.register_as}</div>
                )}
              </div>
               */}
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

              {registerAs === "vendor" && (
                <div className="">
                  <label className="d-flex align-items-center mb-0">
                    <input
                      type="checkbox"
                      name="vendor_tnc"
                      checked={tncCheckned}
                      onChange={(e) => {
                        setTncCheckned(e.target.checked);
                      }}
                    />
                    <span style={{ marginLeft: 8 }}>
                      I agree to respond within 24 hours with best quality and
                      competitive pricing
                    </span>
                  </label>
                  <a
                    href="/for-vendors/tnc"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginLeft: 20, fontWeight: 500 }}
                  >
                    Term and Conditions
                  </a>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-secondary"
                disabled={registerAs === "vendor" ? !tncCheckned : false}
              >
                Register
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </>
  );
};

export default Register;
