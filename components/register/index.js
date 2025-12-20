import { RegisterService, LoginService, sendRegistrationOTP, verifyRegistrationOTP } from "@/services/Auth";
import axiosFormData from "@/lib/axiosFormData";
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
  const [subcategoryOptions, setSubcategoryOptions] = useState({});
  const [loadingSubcategories, setLoadingSubcategories] = useState({});
  const [hotelOptions, setHotelOptions] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpToken, setOtpToken] = useState(null);
  const [otpValue, setOtpValue] = useState("");
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifyingOTP, setVerifyingOTP] = useState(false);
  const [documentFiles, setDocumentFiles] = useState({
    gst: null,
    pan: null,
    fssai: null,
    msme: null,
    cancelled_cheque: null,
    other: null
  });

  const requiresFssaiForSelection = (categoryIds = []) => {
    if (!isHospitality || !Array.isArray(categoryIds)) return false;
    const lowered = categoryOptions
      .filter((c) => categoryIds.includes(c.value))
      .map((c) => (c.label || "").toLowerCase());
    return lowered.some((lbl) =>
      lbl.includes("f&b") ||
      lbl.includes("fnb") ||
      lbl.includes("food") ||
      lbl.includes("beverage") ||
      lbl.includes("f and b")
    );
  };

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
    const checkCocAccepted = () => {
      const cocAccepted = localStorage.getItem('vendor_coc_accepted') === 'true';
      if (cocAccepted) {
        setTncCheckned(true);
      } else {
        setTncCheckned(false);
      }
    };

    checkCocAccepted();

    const handleStorageChange = () => {
      checkCocAccepted();
    };

    const handleCocAccepted = () => {
      checkCocAccepted();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', checkCocAccepted);
    window.addEventListener('vendorCocAccepted', handleCocAccepted);

    const interval = setInterval(checkCocAccepted, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkCocAccepted);
      window.removeEventListener('vendorCocAccepted', handleCocAccepted);
      clearInterval(interval);
    };
  }, []);

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

  const stepThreeFields = [
    "hotels",
  ];

  const stepFourFields = [
    "pan",
    "bank_account_number",
    "bank_name",
    "ifsc_code",
    "account_holder_name",
  ];

  const fetchSubcategories = async (categoryId) => {
    if (!categoryId || subcategoryOptions[categoryId]) {
      return;
    }
    
    setLoadingSubcategories(prev => ({ ...prev, [categoryId]: true }));
    try {
      const response = await nestedCategoryData(categoryId, '', true);
      const subcategories = Array.isArray(response?.data) ? response.data : [];
      setSubcategoryOptions(prev => ({
        ...prev,
        [categoryId]: subcategories.map(item => ({
          id: item.id,
          value: item.id,
          label: item.title || item.name || "Subcategory"
        }))
      }));
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    } finally {
      setLoadingSubcategories(prev => ({ ...prev, [categoryId]: false }));
    }
  };

  const handleCategoryChange = (selectedOptions, setFieldValue, values) => {
    const ids = selectedOptions ? selectedOptions.map((opt) => opt.value) : [];
    setFieldValue("categories", ids);
    
    // Fetch subcategories for newly selected categories
    ids.forEach(categoryId => {
      if (!subcategoryOptions[categoryId]) {
        fetchSubcategories(categoryId);
      }
    });
    
    // Clear subcategories for deselected categories
    const currentSubcategories = values.subcategories || [];
    const validSubcategories = currentSubcategories.filter(subId => {
      // Check if this subcategory belongs to any selected category
      return Object.values(subcategoryOptions).some(subs => 
        subs.some(sub => sub.value === subId)
      );
    });
    if (validSubcategories.length !== currentSubcategories.length) {
      setFieldValue("subcategories", validSubcategories);
    }
  };

  const handleDocumentUpload = (field, file) => {
    if (file) {
      setDocumentFiles(prev => ({ ...prev, [field]: file }));
    }
  };

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

  const handleNextStep = async (validateForm, setTouched, touched, step, values) => {
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
      // PAN number and PAN document must be present before proceeding
      if (isHospitality) {
        if (!values.pan) {
          toast.error("PAN number is required");
          return;
        }
        if (!documentFiles.pan) {
          toast.error("PAN card upload is required");
          return;
        }
      }
    } else if (step === 3) {
      stepErrors = stepThreeFields.filter((field) => errors[field]);
      fieldsToTouch = stepThreeFields;
      const needsFssai = requiresFssaiForSelection(values?.categories || []);
      if (isHospitality && needsFssai) {
        if (!values.fssai) {
          toast.error("FSSAI number is required for selected categories");
          return;
        }
        if (!documentFiles.fssai) {
          toast.error("FSSAI document upload is required");
          return;
        }
      }
    } else if (step === 4) {
      stepErrors = stepFourFields.filter((field) => errors[field]);
      fieldsToTouch = stepFourFields;
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
    subcategories: [],
    hotels: [],
    gstin: "",
    pan: "",
    fssai: "",
    msme: "",
    bank_account_number: "",
    bank_name: "",
    ifsc_code: "",
    account_holder_name: "",
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
      if (isHospitality) {
        baseShape.subcategories = yup
          .array()
          .of(yup.number().nullable())
          .min(1, "Select at least one subcategory");
      }
    }

    if (includeHotels && isHospitality) {
      baseShape.hotels = yup
        .array()
        .of(yup.number().nullable())
        .min(1, "Select at least one hotel");
    }

    if (isHospitality) {
      baseShape.pan = yup
        .string()
        .required("PAN number is required")
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Please enter a valid PAN number");
      baseShape.bank_account_number = yup
        .string()
        .required("Bank account number is required")
        .matches(/^[0-9]{9,18}$/, "Please enter a valid bank account number (9-18 digits)");
      baseShape.bank_name = yup
        .string()
        .required("Bank name is required");
      baseShape.ifsc_code = yup
        .string()
        .required("IFSC code is required")
        .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Please enter a valid IFSC code");
      baseShape.account_holder_name = yup
        .string()
        .required("Account holder name is required");
    }

    return yup.object().shape(baseShape);
  };

  const registerSubmitHandler = async (values, resetForm) => {
    setloading(true);
    persistLocationDraft(values);

    const selectedCategories = values.categories || [];
    const selectedSubcategories = values.subcategories || [];
    const selectedHotels = values.hotels || [];

    const selectedCategoryNames = categoryOptions
      .filter((opt) => selectedCategories.includes(opt.value))
      .map((opt) => opt.label);

    const selectedSubcategoryNames = [];
    Object.values(subcategoryOptions).forEach(subs => {
      subs.forEach(sub => {
        if (selectedSubcategories.includes(sub.value)) {
          selectedSubcategoryNames.push(sub.label);
        }
      });
    });

    const selectedHotelNames = hotelOptions
      .filter((opt) => selectedHotels.includes(opt.value))
      .map((opt) => opt.label);
    const needsFssai = requiresFssaiForSelection(selectedCategories);

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
      subcategories: _subcategories,
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
      ...(subscription_plan ? { subscription_plan } : {subscription_plan: 0}),
      // Include categories and subcategories for hospitality vendors
      ...(isHospitality && selectedCategories.length > 0 && { categories: selectedCategories }),
      ...(isHospitality && selectedSubcategories.length > 0 && { subcategories: selectedSubcategories })
    };
    // Document/bank presence checks
    if (isHospitality) {
      if (!documentFiles.pan) {
        setloading(false);
        return toast.error("PAN upload is required");
      }
      if (updatedValues.gstin && !documentFiles.gst) {
        setloading(false);
        return toast.error("GST certificate upload is required when GST number is provided");
      }
      if (updatedValues.msme && !documentFiles.msme) {
        setloading(false);
        return toast.error("MSME certificate upload is required when MSME number is provided");
      }
      if (needsFssai && (!updatedValues.fssai || !documentFiles.fssai)) {
        setloading(false);
        return toast.error("FSSAI number and document are required for selected categories");
      }
      if (!documentFiles.cancelled_cheque) {
        setloading(false);
        return toast.error("Cancelled cheque upload is required");
      }
    }
    // Build multipart payload to send fields + files
    const fd = new FormData();
    Object.entries(updatedValues).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        fd.append(key, JSON.stringify(val));
      } else if (val !== undefined && val !== null) {
        fd.append(key, val);
      }
    });
    const regAs = (updatedValues.register_as || (registerAs == "vendor" ? "3" : "2")).toString();
    fd.set("register_as", regAs);
    fd.set("user_type", regAs);
    fd.set("is_hospitality", isHospitality ? "1" : "0");
    // Always send hotels, categories, and subcategories for hospitality vendors
    if (isHospitality) {
      fd.set("hotels", JSON.stringify(selectedHotels || []));
      fd.set("categories", JSON.stringify(selectedCategories || []));
      fd.set("subcategories", JSON.stringify(selectedSubcategories || []));
    } else {
      if (updatedValues.hotels) fd.set("hotels", JSON.stringify(values.hotels || []));
      if (updatedValues.categories) fd.set("categories", JSON.stringify(values.categories || []));
      if (updatedValues.subcategories) fd.set("subcategories", JSON.stringify(values.subcategories || []));
    }
    // Files
    if (documentFiles.pan) fd.append("pan", documentFiles.pan);
    if (documentFiles.gst) fd.append("gst", documentFiles.gst);
    if (documentFiles.msme) fd.append("msme", documentFiles.msme);
    if (documentFiles.fssai) fd.append("fssai", documentFiles.fssai);
    if (documentFiles.cancelled_cheque) fd.append("cancelled_cheque", documentFiles.cancelled_cheque);

    axiosFormData
      .post(`/users/company-registration`, fd)
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
            .then(async (loginResponse) => {
              // Handle both normal login and hospitality-pending login
              let userKey = loginResponse.user_key || null;
              if (
                !userKey &&
                loginResponse.status === 5 &&
                loginResponse.hospitality_user
              ) {
                userKey = loginResponse.hospitality_user.user_key;
              }

              const userData = {
                ...updatedValues,
                categories: selectedCategories,
                subcategories: selectedSubcategories,
                hotels: selectedHotels,
                categoryNames: selectedCategoryNames,
                subcategoryNames: selectedSubcategoryNames,
                hotelNames: selectedHotelNames,
                token: loginResponse.token,
                user_key: userKey,
              };

              onRegistrationSuccess(userData);
            })
            .catch(() => {
              // Even if auto-login fails, still call the callback
              onRegistrationSuccess({
                ...updatedValues,
                categories: selectedCategories,
                subcategories: selectedSubcategories,
                hotels: selectedHotels,
                categoryNames: selectedCategoryNames,
                subcategoryNames: selectedSubcategoryNames,
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
            currentStep === 2 || currentStep === 3 || currentStep === 4,
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
                        handleNextStep(validateForm, setTouched, touched, 1, values)
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
                        handleCategoryChange(selectedOptions, setFieldValue, values);
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

                  {values.categories && values.categories.length > 0 && (
                    <div className="form-group mt-3">
                      <label>
                        Select Subcategories {isHospitality && <sup>*</sup>}
                        {!isHospitality && <small className="text-muted">(Optional)</small>}
                      </label>
                      {values.categories.map(categoryId => {
                        const subs = subcategoryOptions[categoryId] || [];
                        const isLoading = loadingSubcategories[categoryId];
                        
                        if (isLoading) {
                          return (
                            <div key={categoryId} className="mb-2">
                              <small className="text-muted">Loading subcategories...</small>
                            </div>
                          );
                        }
                        
                        if (subs.length === 0) {
                          return null;
                        }
                        
                        const categoryName = categoryOptions.find(opt => opt.value === categoryId)?.label || 'Category';
                        const selectedSubs = (values.subcategories || []).filter(subId => 
                          subs.some(sub => sub.value === subId)
                        );
                        
                        return (
                          <div key={categoryId} className="mb-3">
                            <small className="text-muted d-block mb-1">{categoryName}</small>
                            <Select
                              isMulti
                              options={subs}
                              value={subs.filter(opt => selectedSubs.includes(opt.value))}
                              onChange={(selectedOptions) => {
                                const allSubs = values.subcategories || [];
                                const otherSubs = allSubs.filter(subId => 
                                  !subs.some(sub => sub.value === subId)
                                );
                                const newSubs = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                                setFieldValue("subcategories", [...otherSubs, ...newSubs]);
                              }}
                              placeholder={`Select ${categoryName} subcategories`}
                              isClearable
                              isSearchable
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isHospitality && (
                    <>
                      <div className="form-group mt-3">
                        <label htmlFor="gstin">
                          GSTIN <small className="text-muted">(Optional)</small>
                        </label>
                        <Field
                          type="text"
                          id="gstin"
                          name="gstin"
                          placeholder="Ex. 27AABCU9603R1ZX"
                          maxLength="15"
                        />
                        {touched.gstin && errors.gstin && (
                          <div className="form-error">{errors.gstin}</div>
                        )}
                      </div>

                      <div className="form-group">
                    <label htmlFor="pan">
                      PAN <sup>*</sup>
                    </label>
                        <Field
                          type="text"
                          id="pan"
                          name="pan"
                          placeholder="Ex. ABCDE1234F"
                          maxLength="10"
                          style={{ textTransform: "uppercase" }}
                        />
                        {touched.pan && errors.pan && (
                          <div className="form-error">{errors.pan}</div>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="fssai">
                          FSSAI License Number <small className="text-muted">(Optional, if applicable)</small>
                        </label>
                        <Field
                          type="text"
                          id="fssai"
                          name="fssai"
                          placeholder="Ex. 11234567000123"
                        />
                        {touched.fssai && errors.fssai && (
                          <div className="form-error">{errors.fssai}</div>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="msme">
                          MSME Certificate Number <small className="text-muted">(Optional)</small>
                        </label>
                        <Field
                          type="text"
                          id="msme"
                          name="msme"
                          placeholder="Ex. UDYAM-XX-XXXXXX-XXXXX"
                        />
                        {touched.msme && errors.msme && (
                          <div className="form-error">{errors.msme}</div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Business Documents <sup>*</sup></label>
                        <div className="row g-2">
                          {values.gstin && (
                            <div className="col-md-6">
                              <label className="small text-muted">GST Certificate <sup>*</sup></label>
                              <input
                                type="file"
                                className="form-control form-control-sm"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleDocumentUpload('gst', e.target.files[0])}
                              />
                              {documentFiles.gst && (
                                <small className="text-success d-block mt-1">
                                  {documentFiles.gst.name}
                                </small>
                              )}
                              {!documentFiles.gst && (
                                <small className="text-danger d-block mt-1">
                                  GST certificate required when GSTIN is provided
                                </small>
                              )}
                            </div>
                          )}
                          <div className="col-md-6">
                            <label className="small text-muted">PAN Card <sup>*</sup></label>
                            <input
                              type="file"
                              className="form-control form-control-sm"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleDocumentUpload('pan', e.target.files[0])}
                            />
                            {documentFiles.pan && (
                              <small className="text-success d-block mt-1">
                                {documentFiles.pan.name}
                              </small>
                            )}
                          </div>
                          {(values.fssai || requiresFssaiForSelection(values.categories || [])) && (
                            <div className="col-md-6">
                              <label className="small text-muted">FSSAI License <sup>*</sup></label>
                              <input
                                type="file"
                                className="form-control form-control-sm"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleDocumentUpload('fssai', e.target.files[0])}
                              />
                              {documentFiles.fssai && (
                                <small className="text-success d-block mt-1">
                                  {documentFiles.fssai.name}
                                </small>
                              )}
                              {!documentFiles.fssai && (
                                <small className="text-danger d-block mt-1">
                                  FSSAI document required
                                </small>
                              )}
                            </div>
                          )}
                          {values.msme && (
                            <div className="col-md-6">
                              <label className="small text-muted">MSME Certificate <sup>*</sup></label>
                              <input
                                type="file"
                                className="form-control form-control-sm"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleDocumentUpload('msme', e.target.files[0])}
                              />
                              {documentFiles.msme && (
                                <small className="text-success d-block mt-1">
                                  {documentFiles.msme.name}
                                </small>
                              )}
                              {!documentFiles.msme && (
                                <small className="text-danger d-block mt-1">
                                  MSME document required when MSME number is provided
                                </small>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {!isHospitality && registerAs === "vendor" && (
                    <div className="mt-3">
                      <label className="d-flex align-items-start mb-2">
                        <input
                          type="checkbox"
                          name="vendor_tnc"
                          checked={tncCheckned}
                          disabled
                          readOnly
                          className="me-2 mt-1"
                          style={{ cursor: 'not-allowed', pointerEvents: 'none' }}
                        />
                        <span>
                          I agree to the following terms and conditions
                        </span>
                      </label>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <a
                          href="/vendor-tnc"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: 500 }}
                        >
                          Terms & Conditions
                        </a>
                        <span style={{ color: '#666' }}>|</span>
                        <a
                          href="/vendor-coc"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: 500 }}
                        >
                          Ethical Code of Conduct
                        </a>
                      </div>
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
                        handleNextStep(validateForm, setTouched, touched, 2, values)
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
              ) : currentStep === 3 ? (
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
                          disabled
                          readOnly
                          className="me-2 mt-1"
                          style={{ cursor: 'not-allowed', pointerEvents: 'none' }}
                        />
                        <span>
                          I agree to the following terms and conditions
                        </span>
                      </label>
                      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <a
                          href="/vendor-tnc"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: 500 }}
                        >
                          Terms & Conditions
                        </a>
                        <span style={{ color: '#666' }}>|</span>
                        <a
                          href="/vendor-coc"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: 500 }}
                        >
                          Ethical Code of Conduct
                        </a>
                      </div>
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
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        handleNextStep(validateForm, setTouched, touched, 3, values)
                      }
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h4 className="mb-4">Bank Account Details</h4>
                  
                  <div className="form-group">
                    <label htmlFor="account_holder_name">
                      Account Holder Name <sup>*</sup>
                    </label>
                    <Field
                      type="text"
                      id="account_holder_name"
                      name="account_holder_name"
                      placeholder="Ex. John Doe"
                    />
                    {touched.account_holder_name && errors.account_holder_name && (
                      <div className="form-error">{errors.account_holder_name}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="bank_name">
                      Bank Name <sup>*</sup>
                    </label>
                    <Field
                      type="text"
                      id="bank_name"
                      name="bank_name"
                      placeholder="Ex. State Bank of India"
                    />
                    {touched.bank_name && errors.bank_name && (
                      <div className="form-error">{errors.bank_name}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="bank_account_number">
                      Bank Account Number <sup>*</sup>
                    </label>
                    <Field
                      type="text"
                      id="bank_account_number"
                      name="bank_account_number"
                      placeholder="Ex. 1234567890"
                    />
                    {touched.bank_account_number && errors.bank_account_number && (
                      <div className="form-error">{errors.bank_account_number}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="ifsc_code">
                      IFSC Code <sup>*</sup>
                    </label>
                    <Field
                      type="text"
                      id="ifsc_code"
                      name="ifsc_code"
                      placeholder="Ex. SBIN0001234"
                      style={{ textTransform: "uppercase" }}
                      maxLength="11"
                    />
                    {touched.ifsc_code && errors.ifsc_code && (
                      <div className="form-error">{errors.ifsc_code}</div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="cancelled_cheque_upload">
                      Cancelled Cheque Upload <sup>*</sup>
                    </label>
                    <input
                      type="file"
                      id="cancelled_cheque_upload"
                      className="form-control form-control-sm"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDocumentUpload('cancelled_cheque', e.target.files[0])}
                    />
                    {documentFiles.cancelled_cheque && (
                      <small className="text-success d-block mt-1">
                        {documentFiles.cancelled_cheque.name}
                      </small>
                    )}
                    {!documentFiles.cancelled_cheque && (
                      <small className="text-danger d-block mt-1">
                        Cancelled cheque upload is required
                      </small>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setCurrentStep(3);
                        if (onStepChange) {
                          onStepChange(3);
                        }
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      disabled={!documentFiles.cancelled_cheque || !documentFiles.pan}
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
