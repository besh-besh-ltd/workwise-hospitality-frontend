import { RegisterService, LoginService, sendRegistrationOTP, verifyRegistrationOTP } from "@/services/Auth";
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
import { getAllHotels } from "@/services/hospitality";
import Select from "react-select";

{
  /* registerAs = vendor or buyer valid values */
}
const Register = ({
  registerAs,
  onRegistrationSuccess,
  isPaidSubscription = false,
  isHospitality = false,
  source,
  subscription_plan,
  onStepChange
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
  const [hotelOptions, setHotelOptions] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpToken, setOtpToken] = useState(null);
  const [otpValue, setOtpValue] = useState("");
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);

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
              value: item.id,
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

  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  useEffect(() => {
    const fetchHotels = async () => {
      if (isHospitality && currentStep === 3 && hotelOptions.length === 0) {
        try {
          setLoadingHotels(true);
          const response = await getAllHotels();
          const hotelsData = response?.data || [];
          const mappedHotels = Array.isArray(hotelsData)
            ? hotelsData.map((hotel) => ({
                id: hotel.id,
                value: hotel.id,
                label: hotel.name,
                company_name: hotel.company_name || "",
                city: hotel.city || "",
              }))
            : [];
          setHotelOptions(mappedHotels);
        } catch (error) {
          console.error("Error fetching hotels:", error);
          toast.error("Failed to load hotels. Please try again.");
        } finally {
          setLoadingHotels(false);
        }
      }
    };

    fetchHotels();
  }, [isHospitality, currentStep]);

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


  const stepOneFields = [
    "name",
    "email",
    "organization_name",
    "mobile",
    "password",
    "confirm_password",
  ];

  const stepTwoFields = [
    "country",
    "state",
    "city",
    "categories",
  ];

  const handleSendOTP = async (email) => {
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSendingOTP(true);
    try {
      const response = await sendRegistrationOTP(email);
      if (response?.status === 1) {
        setOtpToken(response.token);
        setEmailVerified(false);
        setOtpValue("");
        toast.success("OTP sent to your email");
      } else {
        toast.error(response?.message || "Failed to send OTP");
      }
    } catch (error) {
      const errorMsg = error?.message?.response?.data?.message || "Failed to send OTP";
      toast.error(errorMsg);
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpValue || otpValue.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    if (!otpToken) {
      toast.error("Please request OTP first");
      return;
    }

    setVerifyingOTP(true);
    try {
      const response = await verifyRegistrationOTP(otpValue, otpToken);
      if (response?.status === 1) {
        setEmailVerified(true);
        toast.success("Email verified successfully");
      } else {
        toast.error(response?.message || "Invalid OTP");
      }
    } catch (error) {
      const errorMsg = error?.message?.response?.data?.message || "Invalid OTP";
      toast.error(errorMsg);
    } finally {
      setVerifyingOTP(false);
    }
  };

  const handleNextStep = async (validateForm, setTouched, touched, step) => {
    const errors = await validateForm();
    let stepErrors = [];
    let fieldsToTouch = [];

    if (step === 1) {
      stepErrors = stepOneFields.filter((field) => errors[field]);
      fieldsToTouch = stepOneFields;
      
      // For hospitality vendors, check email verification
      if (isHospitality && !emailVerified) {
        toast.error("Please verify your email before proceeding");
        return;
      }
    } else if (step === 2) {
      stepErrors = stepTwoFields.filter((field) => errors[field]);
      fieldsToTouch = stepTwoFields;
    }

    const updatedTouched = { ...touched };
    fieldsToTouch.forEach((field) => {
      updatedTouched[field] = true;
    });
    setTouched(updatedTouched);

    if (stepErrors.length === 0) {
      const newStep = step + 1;
      setCurrentStep(newStep);
      if (onStepChange) {
        onStepChange(newStep);
      }
    }
  };

  const persistLocationDraft = (values) => {
    if (typeof window === "undefined") return;
    const snapshot = {
      country: values.country,
      state: values.state,
      city: values.city,
      categories: values.categories,
      hotels: values.hotels,
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
    hotels: [],
  };
  // Register Validation Schema builder
  const buildValidationSchema = (includeLocationFields = false, includeHotels = false) => {
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

    if (includeHotels && isHospitality) {
      baseShape.hotels = yup
        .array()
        .of(yup.number().nullable())
        .min(1, "Select at least one hotel");
    }

    return yup.object().shape(baseShape);
  };

  const registerSubmitHandler = (values, resetForm) => {
    setloading(true);
    persistLocationDraft(values);

    const selectedCategories = values.categories || [];
    const selectedHotels = values.hotels || [];

    const selectedCategoryNames = categoryOptions
      .filter((opt) => selectedCategories.includes(opt.value))
      .map((opt) => opt.label);

    const selectedHotelNames = hotelOptions
      .filter((opt) => selectedHotels.includes(opt.value))
      .map((opt) => opt.label);

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
              // Handle both normal login and hospitality-pending login
              let userKey = loginResponse.user_key || null;
              if (
                !userKey &&
                loginResponse.status === 5 &&
                loginResponse.hospitality_user
              ) {
                userKey = loginResponse.hospitality_user.user_key;
              }

              onRegistrationSuccess({
                ...updatedValues,
                categories: selectedCategories,
                hotels: selectedHotels,
                categoryNames: selectedCategoryNames,
                hotelNames: selectedHotelNames,
                token: loginResponse.token,
                user_key: userKey,
              });
            })
            .catch(() => {
              // Even if auto-login fails, still call the callback
              onRegistrationSuccess({
                ...updatedValues,
                categories: selectedCategories,
                hotels: selectedHotels,
                categoryNames: selectedCategoryNames,
                hotelNames: selectedHotelNames,
              });
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
          validationSchema={buildValidationSchema(
            currentStep === 2 || currentStep === 3,
            currentStep === 3 && isHospitality
          )}
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
                    <div className="d-flex gap-2">
                      <Field
                        type="email"
                        id="email"
                        name="email"
                        placeholder="@example.com"
                        className="flex-grow-1"
                        disabled={emailVerified && isHospitality}
                        onChange={(e) => {
                          setFieldValue("email", e.target.value);
                          // Reset verification if email changes
                          if (isHospitality && emailVerified) {
                            setEmailVerified(false);
                            setOtpToken(null);
                            setOtpValue("");
                          }
                        }}
                      />
                      {isHospitality && !emailVerified && (
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => handleSendOTP(values.email)}
                          disabled={sendingOTP || !values.email || !!errors.email}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {sendingOTP ? "Sending..." : "Send OTP"}
                        </button>
                      )}
                      {isHospitality && emailVerified && (
                        <span className="badge bg-success align-self-center" style={{ whiteSpace: "nowrap" }}>
                          Verified
                        </span>
                      )}
                    </div>
                    {touched.email && errors.email && (
                      <div className="form-error">{errors.email}</div>
                    )}
                    {isHospitality && otpToken && !emailVerified && (
                      <div className="mt-2">
                        <div className="d-flex gap-2">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter 6-digit OTP"
                            value={otpValue}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                              setOtpValue(val);
                            }}
                            maxLength={6}
                            style={{ maxWidth: "200px" }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleVerifyOTP}
                            disabled={verifyingOTP || otpValue.length !== 6}
                          >
                            {verifyingOTP ? "Verifying..." : "Verify"}
                          </button>
                        </div>
                        <small className="text-muted d-block mt-1">
                          Check your email for the OTP code
                        </small>
                      </div>
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
                        handleNextStep(validateForm, setTouched, touched, 1)
                      }
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : currentStep === 2 ? (
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
                    <Select
                      isMulti
                      name="categories"
                      options={categoryOptions}
                      value={categoryOptions.filter((option) =>
                        values.categories?.includes(option.value)
                      )}
                      onChange={(selectedOptions) => {
                        const ids = selectedOptions
                          ? selectedOptions.map((opt) => opt.value)
                          : [];
                        setFieldValue("categories", ids);
                      }}
                      placeholder="Please select categories"
                      isClearable
                      isSearchable
                      className={touched.categories && errors.categories ? "is-invalid" : ""}
                    />
                    {touched.categories && errors.categories && (
                      <div className="form-error">{errors.categories}</div>
                    )}
                  </div>

                  {!isHospitality && registerAs === "vendor" && (
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
                      onClick={() => {
                        setCurrentStep(1);
                        if (onStepChange) {
                          onStepChange(1);
                        }
                      }}
                    >
                      Back
                    </button>
                    {isHospitality ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                          handleNextStep(validateForm, setTouched, touched, 2)
                        }
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="btn btn-secondary"
                        disabled={registerAs === "vendor" ? !tncCheckned : false}
                      >
                        Register
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>
                      Select Hotels <sup>*</sup>
                    </label>
                    <Select
                      isMulti
                      name="hotels"
                      options={hotelOptions}
                      value={hotelOptions.filter((option) =>
                        values.hotels?.includes(option.value)
                      )}
                      onChange={(selectedOptions) => {
                        const ids = selectedOptions
                          ? selectedOptions.map((opt) => opt.value)
                          : [];
                        setFieldValue("hotels", ids);
                      }}
                      placeholder="Please select hotels"
                      isClearable
                      isSearchable
                      isLoading={loadingHotels}
                      className={touched.hotels && errors.hotels ? "is-invalid" : ""}
                      formatOptionLabel={(option) => (
                        <div>
                          <div className="fw-semibold">{option.label}</div>
                          {(option.company_name || option.city) && (
                            <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                              {option.company_name}
                              {option.company_name && option.city ? " • " : ""}
                              {option.city}
                            </div>
                          )}
                        </div>
                      )}
                    />
                    {touched.hotels && errors.hotels && (
                      <div className="form-error">{errors.hotels}</div>
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
                      onClick={() => {
                        setCurrentStep(2);
                        if (onStepChange) {
                          onStepChange(2);
                        }
                      }}
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
