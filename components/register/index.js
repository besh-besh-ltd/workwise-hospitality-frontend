import { RegisterService, LoginService } from "@/services/Auth";
import { faEye, faEyeSlash } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Field, Form, Formik } from "formik";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import * as yup from "yup";
import FullLoader from "../shared/FullLoader";
import { useRouter } from "next/router";
import { getCountryCodes, getCountries, getStates, getCities } from "@/services/cms";
import { nestedCategoryData } from "@/services/products";

{
  /* registerAs = vendor or buyer valid values */
}
const Register = ({
  registerAs,
  onRegistrationSuccess,
  isPaidSubscription = false,
  isHospitality = false,
  source,
  subscription_plan
}) => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);
  const [loading, setloading] = useState(false);
  const [countryCode, setCountryCode] = useState([]);
  const [tncCheckned, setTncCheckned] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [locationOptions, setLocationOptions] = useState({
    countries: [],
    states: [],
    cities: [],
  });
  const [categoryOptions, setCategoryOptions] = useState([]);

  useEffect(() => {
    const fetchFormMeta = async () => {
      try {
        const [codesRes, countriesRes, categoriesRes] = await Promise.all([
          getCountryCodes(),
          getCountries(),
          nestedCategoryData(0, "", true),
        ]);

        setCountryCode(codesRes?.data || []);
        setLocationOptions((prev) => ({
          ...prev,
          countries: countriesRes?.data || [],
        }));

        const mappedCategories = Array.isArray(categoriesRes?.data)
          ? categoriesRes.data.map((item) => ({
              id: item.id,
              label: item.title || item.name || "Category",
            }))
          : [];
        setCategoryOptions(mappedCategories);
      } catch (error) {
        console.error("Error fetching registration metadata:", error);
      }
    };

    fetchFormMeta();
  }, []);

  const handleCountrySelect = async (countryId, setFieldValue) => {
    const parsedId = countryId ? Number(countryId) : "";
    setFieldValue("country", countryId);
    setFieldValue("state", "");
    setFieldValue("city", "");

    if (!parsedId) {
      setLocationOptions((prev) => ({ ...prev, states: [], cities: [] }));
      return;
    }

    try {
      const res = await getStates(parsedId);
      setLocationOptions((prev) => ({
        ...prev,
        states: res?.data || [],
        cities: [],
      }));
    } catch (error) {
      console.error("Error fetching states:", error);
      setLocationOptions((prev) => ({ ...prev, states: [], cities: [] }));
    }
  };

  const handleStateSelect = async (stateId, setFieldValue) => {
    const parsedId = stateId ? Number(stateId) : "";
    setFieldValue("state", stateId);
    setFieldValue("city", "");

    if (!parsedId) {
      setLocationOptions((prev) => ({ ...prev, cities: [] }));
      return;
    }

    try {
      const res = await getCities(parsedId);
      setLocationOptions((prev) => ({
        ...prev,
        cities: res?.data || [],
      }));
    } catch (error) {
      console.error("Error fetching cities:", error);
      setLocationOptions((prev) => ({ ...prev, cities: [] }));
    }
  };

  const handleCategoryToggle = (categoryId, values, setFieldValue) => {
    const currentSelection = values.categories || [];
    const alreadySelected = currentSelection.includes(categoryId);
    const updatedSelection = alreadySelected
      ? currentSelection.filter((id) => id !== categoryId)
      : [...currentSelection, categoryId];
    setFieldValue("categories", updatedSelection);
  };

  const stepOneFields = [
    "name",
    "email",
    "organization_name",
    "mobile",
    "password",
    "confirm_password",
  ];

  const handleNextStep = async (validateForm, setTouched, touched) => {
    const errors = await validateForm();
    const stepErrors = stepOneFields.filter((field) => errors[field]);
    const updatedTouched = { ...touched };
    stepOneFields.forEach((field) => {
      updatedTouched[field] = true;
    });
    setTouched(updatedTouched);

    if (stepErrors.length === 0) {
      setCurrentStep(2);
    }
  };

  const persistLocationDraft = (values) => {
    if (typeof window === "undefined") return;
    const snapshot = {
      country: values.country,
      state: values.state,
      city: values.city,
      categories: values.categories,
    };
    try {
      window.localStorage.setItem(
        "hotelVendorRegistrationLocation",
        JSON.stringify(snapshot)
      );
    } catch (error) {
      console.warn("Unable to persist location draft", error);
    }
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
    country: "",
    state: "",
    city: "",
    categories: [],
  };
  // Register Validation Schema builder
  const buildValidationSchema = (includeLocationFields = false) => {
    const baseShape = {
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
    };

    if (includeLocationFields) {
      baseShape.country = yup.string().required("Country is required");
      baseShape.state = yup.string().required("State is required");
      baseShape.city = yup.string().required("City is required");
      baseShape.categories = yup
        .array()
        .of(yup.number().nullable())
        .min(1, "Select at least one category");
    }

    return yup.object().shape(baseShape);
  };

  const registerSubmitHandler = (values, resetForm) => {
    setloading(true);
    persistLocationDraft(values);

    const cleanMobile = values.mobile
      .trim()
      .replace(/^0+/, "")
      .replace(/^\+\d+\-/, "");
    const fullMobile = `${values.countryCode}-${cleanMobile}`.substring(0, 15);

    const {
      countryCode,
      confirm_password,
      country: _country,
      state: _state,
      city: _city,
      categories: _categories,
      ...updatedValues
    } = {
      ...values,
      mobile: fullMobile,
      // For hospitality vendors, keep status 0 (unapproved) until payment
      // For other paid subscriptions, set status to 1 (approved)
      ...(isPaidSubscription && !isHospitality && { status: 1 }),
      // Add is_hospitality flag for hospitality vendors
      ...(isHospitality && { is_hospitality: 1 }),
      ...(source ? { source } : {source:"self"}),
      ...(subscription_plan ? { subscription_plan } : {subscription_plan: 0})
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
          validationSchema={buildValidationSchema(currentStep === 2)}
          onSubmit={(values, { resetForm }) =>
            registerSubmitHandler(values, resetForm)
          }
        >
          {({
            errors,
            touched,
            setFieldValue,
            values,
            validateForm,
            setTouched,
          }) => (
            <Form>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h3 className="tab-title mb-1">Register As Vendor</h3>
                  <p className="text-muted mb-0">
                    {currentStep === 1
                      ? "Tell us about yourself"
                      : "Share where you operate"}
                  </p>
                </div>
                <span className="badge bg-light text-dark px-3 py-2">
                  Step {currentStep} of 2
                </span>
              </div>

              {currentStep === 1 ? (
                <>
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
                    {touched.organization_name &&
                      errors.organization_name && (
                        <div className="form-error">
                          {errors.organization_name}
                        </div>
                      )}
                  </div>
                  <div className="form-group">
                    <div className="d-flex">
                      <Field
                        as="select"
                        name="countryCode"
                        className="form-select me-2 w-auto"
                        style={{ color: "#444" }}
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

                      <Field
                        type="text"
                        id="mobile"
                        name="mobile"
                        placeholder="Ex. XXXXX XXXXX"
                        className="form-control"
                      />
                    </div>
                    {touched.mobile && errors.mobile && (
                      <div className="form-error">{errors.mobile}</div>
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
                          setShowPassword((prev) => !prev);
                        }}
                      >
                        <FontAwesomeIcon
                          icon={showPassword ? faEye : faEyeSlash}
                        />
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
                          setShowCPassword((prev) => !prev);
                        }}
                      >
                        <FontAwesomeIcon
                          icon={showCPassword ? faEye : faEyeSlash}
                        />
                      </div>
                      {touched.confirm_password && errors.confirm_password && (
                        <div className="form-error">
                          {errors.confirm_password}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex justify-content-end mt-4">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        handleNextStep(validateForm, setTouched, touched)
                      }
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>
                      Country <sup>*</sup>
                    </label>
                    <select
                      className="form-select"
                      value={values.country}
                      onChange={(e) =>
                        handleCountrySelect(e.target.value, setFieldValue)
                      }
                    >
                      <option value="">Please select</option>
                      {locationOptions.countries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.country_name}
                        </option>
                      ))}
                    </select>
                    {touched.country && errors.country && (
                      <div className="form-error">{errors.country}</div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>
                      State <sup>*</sup>
                    </label>
                    <select
                      className="form-select"
                      value={values.state}
                      onChange={(e) =>
                        handleStateSelect(e.target.value, setFieldValue)
                      }
                      disabled={!values.country}
                    >
                      <option value="">Please select</option>
                      {locationOptions.states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.state_name}
                        </option>
                      ))}
                    </select>
                    {touched.state && errors.state && (
                      <div className="form-error">{errors.state}</div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>
                      City <sup>*</sup>
                    </label>
                    <select
                      className="form-select"
                      value={values.city}
                      onChange={(e) => setFieldValue("city", e.target.value)}
                      disabled={!values.state}
                    >
                      <option value="">Please select</option>
                      {locationOptions.cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.city_name}
                        </option>
                      ))}
                    </select>
                    {touched.city && errors.city && (
                      <div className="form-error">{errors.city}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      Select Categories <sup>*</sup>
                    </label>
                    <div className="d-flex flex-wrap gap-2">
                      {categoryOptions.map((category) => {
                        const isSelected = values.categories.includes(
                          category.id
                        );
                        return (
                          <button
                            type="button"
                            key={category.id}
                            className={`btn btn-sm ${
                              isSelected ? "btn-primary" : "btn-outline-secondary"
                            }`}
                            onClick={() =>
                              handleCategoryToggle(
                                category.id,
                                values,
                                setFieldValue
                              )
                            }
                          >
                            {category.label}
                          </button>
                        );
                      })}
                    </div>
                    {touched.categories && errors.categories && (
                      <div className="form-error">{errors.categories}</div>
                    )}
                  </div>

                  {registerAs === "vendor" && (
                    <div className="mt-3">
                      <label className="d-flex align-items-start mb-2">
                        <input
                          type="checkbox"
                          name="vendor_tnc"
                          checked={tncCheckned}
                          onChange={(e) => {
                            setTncCheckned(e.target.checked);
                          }}
                          className="me-2 mt-1"
                        />
                        <span>
                          I agree to respond within 24 hours with best quality
                          and competitive pricing
                        </span>
                      </label>
                      <a
                        href="/for-vendors/tnc"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontWeight: 500 }}
                      >
                        Term and Conditions
                      </a>
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center mt-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setCurrentStep(1)}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      disabled={registerAs === "vendor" ? !tncCheckned : false}
                    >
                      Register
                    </button>
                  </div>
                </>
              )}
            </Form>
          )}
        </Formik>
      </div>
    </>
  );
};

export default Register;
