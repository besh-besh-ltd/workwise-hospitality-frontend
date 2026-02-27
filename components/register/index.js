import { RegisterService, LoginService, sendRegistrationOTP, verifyRegistrationOTP, uploadRegistrationFile } from "@/services/Auth";
import axiosInstance from "@/lib/axios";
import { Form, Formik, useFormikContext } from "formik";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import * as yup from "yup";
import { useRouter } from "next/router";
import { getCountryCodes, getCountries, getStates, getCities } from "@/services/cms";
import { nestedCategoryData } from "@/services/products";
import { getAllHotels } from "@/services/hospitality";

import useDraft from "./useDraft";
import StepIndicator from "./StepIndicator";
import DraftBanner from "./DraftBanner";
import PersonalInfoStep from "./steps/PersonalInfoStep";
import BusinessDetailsStep from "./steps/BusinessDetailsStep";
import BusinessUnitsStep from "./steps/BusinessUnitsStep";
import BankDetailsStep from "./steps/BankDetailsStep";
import styles from "./Register.module.css";

// ── AutoSave (renders inside Formik tree) ──────────
const AutoSave = ({ saveDraft, currentStep, saveFiles, documentFiles }) => {
  const { values } = useFormikContext();
  useEffect(() => {
    saveDraft(values, currentStep);
  }, [values, currentStep]);

  useEffect(() => {
    saveFiles(documentFiles);
  }, [documentFiles]);

  return null;
};

// ── Step definitions ───────────────────────────────
const HOSPITALITY_STEPS = [
  { key: 1, label: "About You" },
  { key: 2, label: "Business" },
  { key: 3, label: "Business Units" },
  { key: 4, label: "Banking" },
];

const STANDARD_STEPS = [
  { key: 1, label: "About You" },
  { key: 2, label: "Business" },
];

const stepOneFields = ["name", "email", "organization_name", "mobile", "password", "confirm_password"];
const stepTwoFields = ["country", "state", "city", "categories"];
const stepThreeFields = ["hotels"];
const stepFourFields = ["pan", "bank_account_number", "bank_name", "ifsc_code", "account_holder_name"];

// ── Component ──────────────────────────────────────
const Register = ({
  registerAs,
  onRegistrationSuccess,
  isPaidSubscription = false,
  isHospitality = false,
  source,
  subscription_plan,
  onStepChange,
}) => {
  const router = useRouter();
  const steps = isHospitality ? HOSPITALITY_STEPS : STANDARD_STEPS;

  // ── Draft persistence ──────────────────────────
  const { hasDraft, draft, draftAge, saveDraft, saveFiles, loadFiles, clearDraft } = useDraft(isHospitality);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftDecisionMade, setDraftDecisionMade] = useState(false);
  const [restoredValues, setRestoredValues] = useState(null);
  const [restoredStep, setRestoredStep] = useState(null);

  // ── Form state ─────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);
  const [countryCode, setCountryCode] = useState([]);
  const [tncAccepted, setTncAccepted] = useState(false);
  const [cocAccepted, setCocAccepted] = useState(false);
  const hasOpenedTnCRef = useRef(false);
  const hasOpenedCoCRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const [locationOptions, setLocationOptions] = useState({ countries: [], states: [], cities: [] });
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
    gst: null, pan: null, fssai: null, msme: null, cancelled_cheque: null, other: null,
  });

  // ── Initial values ─────────────────────────────
  const baseInitialValues = {
    name: "",
    email: "",
    mobile: "",
    organization_name: "",
    register_as: registerAs == "vendor" ? "3" : registerAs == "buyer" ? "2" : "",
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

  const resolvedInitialValues = restoredValues
    ? { ...baseInitialValues, ...restoredValues, password: "", confirm_password: "" }
    : baseInitialValues;

  // ── Draft handling ─────────────────────────────
  useEffect(() => {
    if (hasDraft && !draftDecisionMade) {
      setShowDraftBanner(true);
    }
  }, [hasDraft, draftDecisionMade]);

  const handleContinueDraft = useCallback(async () => {
    if (draft?.formValues) {
      setRestoredValues(draft.formValues);
      setRestoredStep(draft.currentStep || 1);
      setCurrentStep(draft.currentStep || 1);
      if (onStepChange) onStepChange(draft.currentStep || 1);

      // Restore location options if country/state were selected
      if (draft.formValues.country) {
        try {
          const statesRes = await getStates(Number(draft.formValues.country));
          setLocationOptions((prev) => ({ ...prev, states: statesRes?.data || [] }));
          if (draft.formValues.state) {
            const citiesRes = await getCities(Number(draft.formValues.state));
            setLocationOptions((prev) => ({ ...prev, cities: citiesRes?.data || [] }));
          }
        } catch { /* silent */ }
      }

      // Restore files from IndexedDB
      const files = await loadFiles();
      if (files) {
        setDocumentFiles((prev) => ({ ...prev, ...files }));
      }
    }
    setShowDraftBanner(false);
    setDraftDecisionMade(true);
  }, [draft, loadFiles, onStepChange]);

  const handleStartFresh = useCallback(() => {
    clearDraft();
    setShowDraftBanner(false);
    setDraftDecisionMade(true);
    setRestoredValues(null);
    setRestoredStep(null);
    setCurrentStep(1);
  }, [clearDraft]);

  // ── FSSAI check ────────────────────────────────
  const requiresFssaiForSelection = (categoryIds = []) => {
    if (!isHospitality || !Array.isArray(categoryIds)) return false;
    const lowered = categoryOptions
      .filter((c) => categoryIds.includes(c.value))
      .map((c) => (c.label || "").toLowerCase());
    return lowered.some((lbl) =>
      lbl.includes("f&b") || lbl.includes("fnb") || lbl.includes("food") ||
      lbl.includes("beverage") || lbl.includes("f and b")
    );
  };

  // ── Fetch metadata on mount ────────────────────
  useEffect(() => {
    const fetchFormMeta = async () => {
      try {
        const [codesRes, countriesRes, categoriesRes] = await Promise.all([
          getCountryCodes(),
          getCountries(),
          nestedCategoryData(0, "", false),
        ]);
        setCountryCode(codesRes?.data || []);
        setLocationOptions((prev) => ({ ...prev, countries: countriesRes?.data || [] }));
        const mapped = Array.isArray(categoriesRes?.data)
          ? categoriesRes.data.map((item) => ({ id: item.id, value: item.id, label: item.title || item.name || "Category" }))
          : [];
        setCategoryOptions(mapped);
      } catch (error) {
        console.error("Error fetching registration metadata:", error);
      }
    };
    fetchFormMeta();
  }, []);

  // Notify parent of step changes
  useEffect(() => {
    if (onStepChange) onStepChange(currentStep);
  }, [currentStep, onStepChange]);

  // ── T&C / CoC localStorage mechanism ───────────
  useEffect(() => {
    localStorage.removeItem("vendor_tnc_accepted");
    localStorage.removeItem("vendor_coc_accepted");
    setTncAccepted(false);
    setCocAccepted(false);
    hasOpenedTnCRef.current = false;
    hasOpenedCoCRef.current = false;
    isInitialMountRef.current = true;
  }, []);

  useEffect(() => {
    if (currentStep === 2 || currentStep === 3) {
      if (isInitialMountRef.current) {
        setTncAccepted(false);
        setCocAccepted(false);
        isInitialMountRef.current = false;
      } else {
        if (!hasOpenedTnCRef.current && !hasOpenedCoCRef.current) {
          setTncAccepted(false);
          setCocAccepted(false);
        }
      }
    }

    const checkAcceptances = () => {
      if ((hasOpenedTnCRef.current || hasOpenedCoCRef.current) && (currentStep === 2 || currentStep === 3)) {
        const tnc = localStorage.getItem("vendor_tnc_accepted") === "true";
        const coc = localStorage.getItem("vendor_coc_accepted") === "true";
        setTncAccepted(tnc);
        setCocAccepted(coc);
      }
    };

    const handleStorageChange = (e) => {
      if ((e.key === "vendor_tnc_accepted" || e.key === "vendor_coc_accepted" || e.key === null)
        && (currentStep === 2 || currentStep === 3)
        && (hasOpenedTnCRef.current || hasOpenedCoCRef.current)) {
        checkAcceptances();
      }
    };

    const handleTncEvent = () => { if (currentStep === 2 || currentStep === 3) checkAcceptances(); };
    const handleCocEvent = () => { if (currentStep === 2 || currentStep === 3) checkAcceptances(); };

    let focusTimeout;
    const handleFocus = () => {
      if ((currentStep === 2 || currentStep === 3) && (hasOpenedTnCRef.current || hasOpenedCoCRef.current)) {
        if (focusTimeout) clearTimeout(focusTimeout);
        focusTimeout = setTimeout(checkAcceptances, 150);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("vendorTncAccepted", handleTncEvent);
    window.addEventListener("vendorCocAccepted", handleCocEvent);

    return () => {
      if (focusTimeout) clearTimeout(focusTimeout);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("vendorTncAccepted", handleTncEvent);
      window.removeEventListener("vendorCocAccepted", handleCocEvent);
    };
  }, [currentStep]);

  const handleTnCClick = (e) => {
    e.preventDefault();
    hasOpenedTnCRef.current = true;
    window.open("/vendor-tnc", "_blank", "width=1200,height=800");
  };

  const handleCoCClick = (e) => {
    e.preventDefault();
    hasOpenedCoCRef.current = true;
    window.open("/vendor-coc", "_blank", "width=1200,height=800");
  };

  // ── Hotel fetching (step 3) ────────────────────
  useEffect(() => {
    const fetchHotels = async () => {
      if (isHospitality && currentStep === 3 && hotelOptions.length === 0) {
        try {
          setLoadingHotels(true);
          const response = await getAllHotels();
          const hotelsData = response?.data || [];
          const mapped = Array.isArray(hotelsData)
            ? hotelsData.map((hotel) => ({
                id: hotel.id, value: hotel.id, label: hotel.name,
                company_name: hotel.company_name || "", city: hotel.city || "",
              }))
            : [];
          setHotelOptions(mapped);
        } catch (error) {
          console.error("Error fetching hotels:", error);
          toast.error("Failed to load business units.");
        } finally {
          setLoadingHotels(false);
        }
      }
    };
    fetchHotels();
  }, [isHospitality, currentStep]);

  // ── Location cascading handlers ────────────────
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
      setLocationOptions((prev) => ({ ...prev, states: res?.data || [], cities: [] }));
    } catch {
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
      setLocationOptions((prev) => ({ ...prev, cities: res?.data || [] }));
    } catch {
      setLocationOptions((prev) => ({ ...prev, cities: [] }));
    }
  };

  // ── Category / Subcategory handlers ────────────
  const fetchSubcategories = async (categoryId) => {
    if (!categoryId || subcategoryOptions[categoryId]) return;
    setLoadingSubcategories((prev) => ({ ...prev, [categoryId]: true }));
    try {
      const response = await nestedCategoryData(categoryId, "", false);
      const subs = Array.isArray(response?.data) ? response.data : [];
      setSubcategoryOptions((prev) => ({
        ...prev,
        [categoryId]: subs.map((item) => ({ id: item.id, value: item.id, label: item.title || item.name || "Subcategory" })),
      }));
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    } finally {
      setLoadingSubcategories((prev) => ({ ...prev, [categoryId]: false }));
    }
  };

  const handleCategoryChange = (selectedOptions, setFieldValue, values) => {
    const ids = selectedOptions ? selectedOptions.map((opt) => opt.value) : [];
    setFieldValue("categories", ids);
    ids.forEach((catId) => { if (!subcategoryOptions[catId]) fetchSubcategories(catId); });
    const currentSubs = values.subcategories || [];
    const validSubs = currentSubs.filter((subId) =>
      Object.values(subcategoryOptions).some((subs) => subs.some((sub) => sub.value === subId))
    );
    if (validSubs.length !== currentSubs.length) setFieldValue("subcategories", validSubs);
  };

  // ── Document upload handler ────────────────────
  const handleDocumentUpload = (field, file) => {
    setDocumentFiles((prev) => ({ ...prev, [field]: file }));
  };

  // ── OTP handlers ───────────────────────────────
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
      toast.error(error?.message?.response?.data?.message || "Failed to send OTP");
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpValue || otpValue.length !== 6) { toast.error("Please enter a valid 6-digit OTP"); return; }
    if (!otpToken) { toast.error("Please request OTP first"); return; }
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
      toast.error(error?.message?.response?.data?.message || "Invalid OTP");
    } finally {
      setVerifyingOTP(false);
    }
  };

  // ── Step navigation ────────────────────────────
  const handleNextStep = async (validateForm, setTouched, touched, step, values) => {
    const errors = await validateForm();
    let stepErrors = [];
    let fieldsToTouch = [];

    if (step === 1) {
      stepErrors = stepOneFields.filter((f) => errors[f]);
      fieldsToTouch = stepOneFields;
      if (isHospitality && !emailVerified) {
        toast.error("Please verify your email before proceeding");
        return;
      }
    } else if (step === 2) {
      stepErrors = stepTwoFields.filter((f) => errors[f]);
      fieldsToTouch = stepTwoFields;
      if (isHospitality) {
        if (!values.pan) { toast.error("PAN number is required"); return; }
        if (!documentFiles.pan) { toast.error("PAN card upload is required"); return; }
      }
    } else if (step === 3) {
      stepErrors = stepThreeFields.filter((f) => errors[f]);
      fieldsToTouch = stepThreeFields;
      const needsFssai = requiresFssaiForSelection(values?.categories || []);
      if (isHospitality && needsFssai) {
        if (!values.fssai) { toast.error("FSSAI number is required for selected categories"); return; }
        if (!documentFiles.fssai) { toast.error("FSSAI document upload is required"); return; }
      }
    } else if (step === 4) {
      stepErrors = stepFourFields.filter((f) => errors[f]);
      fieldsToTouch = stepFourFields;
    }

    const updatedTouched = { ...touched };
    fieldsToTouch.forEach((f) => { updatedTouched[f] = true; });
    setTouched(updatedTouched);

    if (stepErrors.length === 0) {
      const newStep = step + 1;
      setCurrentStep(newStep);
    }
  };

  // ── Validation schema ──────────────────────────
  const buildValidationSchema = (includeLocation = false, includeHotels = false) => {
    const shape = {
      name: yup.string().required("Name is required").min(2, "Name not less than 2 characters short").max(50, "Name not more than 50 characters long"),
      email: yup.string().email().matches(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, "Please enter valid email address").required("Email is required"),
      mobile: yup.string().matches(/^[+]?[0-9\s-]{7,15}$/, "Please enter a valid mobile number (7-15 digits, optional +)").min(7, "Mobile number must be at least 7 digits long").max(15, "Mobile number must not be more than 15 digits long").required("Mobile number is required"),
      organization_name: yup.string().required("Organization name is required"),
      register_as: yup.string().required("Register as is required"),
      password: yup.string().required("Password is required").min(8, "Password must be 8 characters long").matches(/[0-9]/, "Password requires a number").matches(/[a-z]/, "Password requires a lowercase letter").matches(/[A-Z]/, "Password requires an uppercase letter").matches(/[^\w]/, "Password requires a symbol"),
      confirm_password: yup.string().required("Please re-type your password").oneOf([yup.ref("password")], "Passwords does not match"),
    };
    if (includeLocation) {
      shape.country = yup.string().required("Country is required");
      shape.state = yup.string().required("State is required");
      shape.city = yup.string().required("City is required");
      shape.categories = yup.array().of(yup.number().nullable()).min(1, "Select at least one category");
    }
    if (includeHotels && isHospitality) {
      shape.hotels = yup.array().of(yup.number().nullable()).min(1, "Select at least one business unit");
    }
    if (isHospitality) {
      shape.pan = yup.string().required("PAN number is required").matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Please enter a valid PAN number");
      shape.bank_account_number = yup.string().required("Bank account number is required").matches(/^[0-9]{9,18}$/, "Please enter a valid bank account number (9-18 digits)");
      shape.bank_name = yup.string().required("Bank name is required");
      shape.ifsc_code = yup.string().required("IFSC code is required").matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Please enter a valid IFSC code");
      shape.account_holder_name = yup.string().required("Account holder name is required");
    }
    return yup.object().shape(shape);
  };

  // ── Location draft persistence ─────────────────
  const persistLocationDraft = (values) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("hotelVendorRegistrationLocation", JSON.stringify({
        country: values.country, state: values.state, city: values.city,
        categories: values.categories, hotels: values.hotels,
      }));
    } catch { /* silent */ }
  };

  // ── Submit handler ─────────────────────────────
  const registerSubmitHandler = async (values, resetForm) => {
    setLoading(true);
    persistLocationDraft(values);

    const selectedCategories = values.categories || [];
    const selectedSubcategories = values.subcategories || [];
    const selectedHotels = values.hotels || [];

    const selectedCategoryNames = categoryOptions.filter((opt) => selectedCategories.includes(opt.value)).map((opt) => opt.label);
    const selectedSubcategoryNames = [];
    Object.values(subcategoryOptions).forEach((subs) => {
      subs.forEach((sub) => { if (selectedSubcategories.includes(sub.value)) selectedSubcategoryNames.push(sub.label); });
    });
    const selectedHotelNames = hotelOptions.filter((opt) => selectedHotels.includes(opt.value)).map((opt) => opt.label);
    const needsFssai = requiresFssaiForSelection(selectedCategories);

    const cleanMobile = values.mobile.trim().replace(/^0+/, "").replace(/^\+\d+\-/, "");
    const fullMobile = `${values.countryCode}-${cleanMobile}`.substring(0, 15);

    const { countryCode: _cc, confirm_password, country: _country, state: _state, city: _city, categories: _categories, subcategories: _subcategories, ...updatedValues } = {
      ...values,
      mobile: fullMobile,
      ...(isPaidSubscription && !isHospitality && { status: 1 }),
      ...(isHospitality && { is_hospitality: 1 }),
      ...(source ? { source } : { source: "self" }),
      ...(subscription_plan ? { subscription_plan } : { subscription_plan: 0 }),
      ...(isHospitality && selectedCategories.length > 0 && { categories: selectedCategories }),
      ...(isHospitality && selectedSubcategories.length > 0 && { subcategories: selectedSubcategories }),
    };

    // Document checks
    if (isHospitality) {
      if (!documentFiles.pan) { setLoading(false); return toast.error("PAN upload is required"); }
      if (updatedValues.gstin && !documentFiles.gst) { setLoading(false); return toast.error("GST certificate upload is required when GST number is provided"); }
      if (updatedValues.msme && !documentFiles.msme) { setLoading(false); return toast.error("MSME certificate upload is required when MSME number is provided"); }
      if (needsFssai && (!updatedValues.fssai || !documentFiles.fssai)) { setLoading(false); return toast.error("FSSAI number and document are required for selected categories"); }
      if (!documentFiles.cancelled_cheque) { setLoading(false); return toast.error("Cancelled cheque upload is required"); }
    }

    // Upload documents to S3 first, then send JSON
    const regAs = (updatedValues.register_as || (registerAs == "vendor" ? "3" : "2")).toString();
    const fileMap = [
      { key: "pan_doc", file: documentFiles.pan },
      { key: "gst_doc", file: documentFiles.gst },
      { key: "msme_doc", file: documentFiles.msme },
      { key: "fssai_doc", file: documentFiles.fssai },
      { key: "cancelled_cheque_doc", file: documentFiles.cancelled_cheque },
    ].filter((entry) => entry.file);

    let uploadedUrls = {};
    if (fileMap.length > 0) {
      try {
        const results = await Promise.all(fileMap.map((entry) => uploadRegistrationFile(entry.file)));
        results.forEach((res, i) => {
          const filePath = res?.data?.[0]?.file_path;
          if (filePath) uploadedUrls[fileMap[i].key] = filePath;
          else throw new Error(`Upload failed for ${fileMap[i].key}`);
        });
      } catch (error) {
        setLoading(false);
        toast.error("Failed to upload documents. Please try again.", { position: "top-center" });
        return;
      }
    }

    // Build JSON payload
    const payload = { ...updatedValues, register_as: regAs, user_type: regAs, is_hospitality: isHospitality ? "1" : "0", ...uploadedUrls };
    if (isHospitality) {
      payload.hotels = selectedHotels || [];
      payload.categories = selectedCategories || [];
      payload.subcategories = selectedSubcategories || [];
    } else {
      if (updatedValues.hotels) payload.hotels = values.hotels || [];
      if (updatedValues.categories) payload.categories = values.categories || [];
      if (updatedValues.subcategories) payload.subcategories = values.subcategories || [];
    }

    axiosInstance
      .post("/users/company-registration", payload)
      .then((response) => {
        setLoading(false);
        resetForm();
        clearDraft(); // Clear draft on success
        toast.success(response.message, { position: "top-center" });

        if (onRegistrationSuccess && typeof onRegistrationSuccess === "function") {
          const loginData = { email: updatedValues.email, password: updatedValues.password };
          LoginService(loginData, false)
            .then(async (loginResponse) => {
              let userKey = loginResponse.user_key || null;
              if (!userKey && loginResponse.status === 5 && loginResponse.hospitality_user) {
                userKey = loginResponse.hospitality_user.user_key;
              }
              onRegistrationSuccess({
                ...updatedValues,
                categories: selectedCategories, subcategories: selectedSubcategories,
                hotels: selectedHotels, categoryNames: selectedCategoryNames,
                subcategoryNames: selectedSubcategoryNames, hotelNames: selectedHotelNames,
                token: loginResponse.token, user_key: userKey,
              });
            })
            .catch(() => {
              onRegistrationSuccess({
                ...updatedValues,
                categories: selectedCategories, subcategories: selectedSubcategories,
                hotels: selectedHotels, categoryNames: selectedCategoryNames,
                subcategoryNames: selectedSubcategoryNames, hotelNames: selectedHotelNames,
              });
            });
        } else {
          setTimeout(() => { router.push({ pathname: "/", query: { user_registered: 1 } }); }, 1000);
        }
      })
      .catch((error) => {
        setLoading(false);
        if (error?.response?.data?.message) {
          toast.error(error.response.data.message, { position: "top-center" });
        } else if (error?.response?.data?.errors) {
          let msg = "";
          for (let x in error.response.data.errors) { msg = error.response.data.errors[x]; break; }
          toast.error(msg, { position: "top-center" });
        } else if (error?.message) {
          toast.error(error.message, { position: "top-center" });
        } else {
          toast.error("Registration failed. Please try again.", { position: "top-center" });
        }
      });
  };

  // ── Determine final step and T&C requirement ───
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps;
  const tncRequired = registerAs === "vendor";
  const tncStep = isHospitality ? 3 : 2; // T&C is on step 3 for hospitality, step 2 for non-hospitality
  const tncBlocked = tncRequired && currentStep === tncStep && !(tncAccepted && cocAccepted);

  // ── Render ─────────────────────────────────────
  return (
    <div className={styles.registerContainer}>
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
        </div>
      )}

      {showDraftBanner && (
        <DraftBanner
          draftAge={draftAge}
          onContinue={handleContinueDraft}
          onStartFresh={handleStartFresh}
        />
      )}

      <StepIndicator currentStep={currentStep} steps={steps} />

      <Formik
        initialValues={resolvedInitialValues}
        enableReinitialize
        validationSchema={buildValidationSchema(
          currentStep >= 2,
          currentStep >= 3 && isHospitality
        )}
        onSubmit={(values, { resetForm }) => registerSubmitHandler(values, resetForm)}
      >
        {({ errors, touched, setFieldValue, values, validateForm, setTouched, resetForm }) => (
          <Form>
            <AutoSave
              saveDraft={saveDraft}
              currentStep={currentStep}
              saveFiles={saveFiles}
              documentFiles={documentFiles}
            />

            {currentStep === 1 && (
              <PersonalInfoStep
                values={values} errors={errors} touched={touched} setFieldValue={setFieldValue}
                isHospitality={isHospitality} countryCode={countryCode}
                showPassword={showPassword} setShowPassword={setShowPassword}
                showCPassword={showCPassword} setShowCPassword={setShowCPassword}
                emailVerified={emailVerified} otpToken={otpToken} otpValue={otpValue}
                sendingOTP={sendingOTP} verifyingOTP={verifyingOTP}
                handleSendOTP={handleSendOTP} handleVerifyOTP={handleVerifyOTP}
                setOtpValue={setOtpValue} setEmailVerified={setEmailVerified} setOtpToken={setOtpToken}
              />
            )}

            {currentStep === 2 && (
              <BusinessDetailsStep
                values={values} errors={errors} touched={touched} setFieldValue={setFieldValue}
                isHospitality={isHospitality} registerAs={registerAs}
                locationOptions={locationOptions} categoryOptions={categoryOptions}
                subcategoryOptions={subcategoryOptions} loadingSubcategories={loadingSubcategories}
                handleCountrySelect={handleCountrySelect} handleStateSelect={handleStateSelect}
                handleCategoryChange={handleCategoryChange}
                documentFiles={documentFiles} handleDocumentUpload={handleDocumentUpload}
                tncAccepted={tncAccepted} cocAccepted={cocAccepted}
                handleTnCClick={handleTnCClick} handleCoCClick={handleCoCClick}
                requiresFssaiForSelection={requiresFssaiForSelection}
              />
            )}

            {currentStep === 3 && isHospitality && (
              <BusinessUnitsStep
                values={values} errors={errors} touched={touched} setFieldValue={setFieldValue}
                hotelOptions={hotelOptions} loadingHotels={loadingHotels} registerAs={registerAs}
                tncAccepted={tncAccepted} cocAccepted={cocAccepted}
                handleTnCClick={handleTnCClick} handleCoCClick={handleCoCClick}
              />
            )}

            {currentStep === 4 && isHospitality && (
              <BankDetailsStep
                values={values} errors={errors} touched={touched}
                documentFiles={documentFiles} handleDocumentUpload={handleDocumentUpload}
              />
            )}

            {/* Navigation footer */}
            <div className={styles.modalFooter} style={{ padding: 0, border: "none", background: "transparent", marginTop: 24 }}>
              {currentStep > 1 ? (
                <button
                  type="button"
                  className={styles.btnOutline}
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {isLastStep ? (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={
                    loading ||
                    (tncRequired && !(tncAccepted && cocAccepted)) ||
                    (isHospitality && (!documentFiles.cancelled_cheque || !documentFiles.pan))
                  }
                  onClick={async () => {
                    const formErrors = await validateForm();
                    const allTouched = {};
                    Object.keys(values).forEach((f) => { allTouched[f] = true; });
                    setTouched(allTouched);

                    if (Object.keys(formErrors).length === 0) {
                      registerSubmitHandler(values, resetForm);
                    } else {
                      // Navigate to the step containing the first error
                      const fieldStepMap = {
                        name: 1, email: 1, mobile: 1, organization_name: 1, password: 1, confirm_password: 1,
                        country: 2, state: 2, city: 2, categories: 2, subcategories: 2, pan: 2, gstin: 2, fssai: 2, msme: 2,
                        hotels: 3,
                        bank_account_number: 4, bank_name: 4, ifsc_code: 4, account_holder_name: 4,
                      };
                      const errorFields = Object.keys(formErrors);
                      const errorStep = fieldStepMap[errorFields[0]] || currentStep;
                      if (errorStep !== currentStep) setCurrentStep(errorStep);
                      const firstMsg = Object.values(formErrors).find((v) => typeof v === "string");
                      toast.error(firstMsg || "Please fix all errors before submitting");
                    }
                  }}
                >
                  {loading ? "Registering..." : "Register"}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={tncBlocked}
                  onClick={() => handleNextStep(validateForm, setTouched, touched, currentStep, values)}
                >
                  Next
                </button>
              )}
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default Register;
