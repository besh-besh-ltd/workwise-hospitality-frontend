import { useRouter } from "next/router";
import React, { useEffect, useInsertionEffect, useRef, useState } from "react";
import Item from "./Item";
import Select from 'react-select';
import { createRfq, saveDraft, getTerms, vendorApproveList, getDraftData, getDraftById, getDraftRfqSheets, getDraftRfqSheetWise, processMagicSearchDraft, getVendorsForRFQProduct, vendorTypes, getVendorsForProduct } from "@/services/rfq";
import { Form, Formik, Field } from "formik";
import { CreateRFQSchema } from "@/utils/schema";
import FormikField from "@/components/shared/FormikField";
import { getProfile } from "@/services/Auth";
import Loader from "@/components/shared/Loader";
import { useDispatch, useSelector } from "react-redux";
import {
  intializeRfq,
  clearState,
  setOtherFormFields,
  setTermsData,
  setTermFiles,
  setAllTerms,
  setStoreLoading,
} from "@/redux/slice";
import Link from "next/link";
import { toast } from "react-toastify";
import { getProjectList, getProjectTableDataById } from "@/services/project";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { extractfileName, handleFileUpload, formatISOToDateTimeLocal, getDataWithLoading } from "@/utils/sharedFunctions";
import { Accordion } from "react-bootstrap";
import { getCities, getCountries, getCountryCodes, getStates } from "@/services/cms";
import axiosInstance from "@/lib/axios";
import ViewVendorModal from "../editRFQ/ViewVendorModal";
import { vendorConditions } from "../../vendor/search";
import { getProductMakeList } from "@/services/products";
import CommonFormInput from "@/components/shared/CommonFormInput";
import AddVendorModal from "../editRFQ/AddVendorModal";

const myVendorOptions = [
  { label: "All Vendors", value: null },
  {
    label: "Private Vendors",
    value: "is_private",
  },
  {
    label: "Public Vendors",
    value: "is_public",
  },
  {
    label: "Both Vendors",
    value: "both",
  },
];

const CreateRFQ = () => {
  const router = useRouter();
  const { draft_id } = router.query;
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [mainLoading, setMainLoading] = useState(false);

  const [userProfile, setuserProfile] = useState(null);
  const [vendorApprovedList, setVendorApprovedList] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rfqProducts, setRfqProducts] = useState([]);
  const [draftRfqId, setDraftRfqId] = useState(draft_id ? parseInt(draft_id) : -1);

  // Changes by Agnij 2025-08-05 [Added sheet filter state for RFQs created from magic search]
  const [isMagicRfq, setIsMagicRfq] = useState(false);
  const [sheetNameList, setSheetNameList] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);

  const storeLoading = useSelector((data) => data.storeLoading);
  const rfqDetails = useSelector((data) => data.rfq_id);
  const rfqProductsFromStore = useSelector((data) => data.rfqProducts);
  const rfqFormDataFromStore = useSelector((data) => data.rfqFormData);
  const allTerms = useSelector((data) => data.allTerms);
  const selectedTerms = useSelector((data) => data.rfqFormData.terms);
  const termFiles = useSelector((data) => data.rfqFormData.term_and_condition_files);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [countryCode , setCountryCode] = useState ([]);
  const [ onecountrycode ,setonecountrycode] = useState("");
  const [queryMeta, setQueryMeta] = useState({
    draft_id: null,
    sheet_id: null,
  })
  const [updatableData, setUpdatableData] = useState({
    products: {
      addable: [],
      deletable: [],
      updatable: {},
    },
    vendors: {},
  })
  const [vendors, setVendors] = useState({});
  const [addableVendors, setAddableVendors] = useState([]);
  const [termsChanged, setTermsChanged] = useState(false);
  const [termFilesChanged, setTermFilesChanged] = useState(false);
  const [activeKey, setActiveKey] = useState(null);
  const [showModal, setShowModal] = useState({
    vendorModal: false,
    addVendorModal: false
  })
  const [selectedProduct, setSelectedProduct] = useState({});
  const [vendorFilters, setVendorFilters] = useState({
    global: {},
    local: {},
  })
  const [initialFilterOptions, setInitialFilterOptions] = useState({
    countries: [],
    states: [],
    cities: [],
    vendorTypes: [],
    approvedBy: [],
    productMakes: {},
  })

  const rfqProductsRef = useRef({});
  const rfqFormDataRef = useRef({});

  const [validationErrors, setValidationErrors] = useState({});

  const fetchVendorsForProduct = async (rfqProductId, refetch = false) => {
    try {
      if(!rfqProductId) return;

      const key = `${rfqProductId}`;
      if(!refetch && vendors?.[key] && vendors[key].length > 0) return;

      const filters = vendorFilters.local?.[rfqProductId] ?? vendorFilters.global;

      let updatedFilters = {};

      if (filters) {
        Object.keys(filters).forEach((filterKey) => {
          const filter = filters[filterKey];

          if (Array.isArray(filter)) {
            updatedFilters[filterKey] = filter
              .map((singleFilter) => singleFilter?.value ?? null)
              .filter(Boolean);
            return;
          }
          updatedFilters[filterKey] = filter?.value ?? null;
        });
      }

      const vendorRes = await getVendorsForRFQProduct(draftRfqId, rfqProductId, updatedFilters);
      const vendorsData = vendorRes.data;

      setVendors(prev => ({
        ...prev,
        [key]: vendorsData
      }))

      return vendorsData
    } catch (error) {
      console.error("ERROR IN `fetchVendorsForProduct` => ", error);
      toast.error(error.message);
    }
  }

  const fetchCountryCodes = () => {
      getCountryCodes()
        .then((response) => {
          if (response?.data) {
            setCountryCode(response.data);
          } else {
            setCountryCode([]);
          }
        })
        .catch((error) => {
          toast.error(error.message);
          setCountryCode([]);
        });
    };

  const getAllProjects = () => {
    getProjectList()
      .then((res) => {
        let d = [];
        res.data.map((item) => {
          d.push({ label: item.name, value: item.id });
        });
        setProjects(d);
      })
      .catch((error) => {
        toast.error(error.message);
      })
  }

  const getVendorApproveList = async () => {
    try {
      const approvedBy = await getDataWithLoading(vendorApproveList, setLoading);
      setInitialFilterOptions(prev => ({
        ...prev,
        approvedBy: approvedBy.data,
      }))
    } catch (error) {
      throw error;
    }
  };

  const getVendorTypes = async () => {
    try {
      const approvedBy = await getDataWithLoading(vendorTypes, setLoading);
      setInitialFilterOptions(prev => ({
        ...prev,
        vendorTypes: approvedBy.data,
      }))
    } catch (error) {
      throw error;
    }
  };

  const getMakesProductWise = async (product_id) => {
    try {
      if(initialFilterOptions.productMakes?.[product_id]) return;

      const productMakes = await getProductMakeList(product_id);
      setInitialFilterOptions(prev => ({
        ...prev,
        productMakes: { ...prev.productMakes, [product_id]: productMakes?.data ?? [] }
      }))
    } catch (error) {
      throw error;
    }
  };

  const getAllCountries = async () => {
    try {
      const approvedBy = await getDataWithLoading(getCountries, setLoading);
      setInitialFilterOptions(prev => ({
        ...prev,
        countries: approvedBy.data,
      }))
    } catch (error) {
      throw error;
    }
  };

  const getAllStates = async () => {
    try {
      const approvedBy = await getDataWithLoading(getStates, setLoading);
      setInitialFilterOptions(prev => ({
        ...prev,
        states: approvedBy.data,
      }))
    } catch (error) {
      throw error;
    }
  };

  const getAllCities = async () => {
    try {
      const approvedBy = await getDataWithLoading(getCities, setLoading);
      setInitialFilterOptions(prev => ({
        ...prev,
        cities: approvedBy.data,
      }))
    } catch (error) {
      throw error;
    }
  };

  const getProfileDetails = () => {
    setLoading(true);
    getProfile().then((res) => {
      setLoading(false);
      setuserProfile(res.data);
    });
  };

  const getTermsData = () => {
    getTerms()
      .then((res) => {
        // Normalize terms to ensure consistent structure before adding to Redux
        if (res.data && Array.isArray(res.data)) {
          const normalizedTerms = res.data.map(term => {
            // Extract term ID with fallback
            const termId = String(term.id || term.term_id);
            
            // Extract term content with fallbacks
            const termContent = term.term_content || term.name || term.term_text || 
                             (term.content && term.content[0] ? term.content[0].title : null) ||
                             `Term ${termId}`;
            
            // Return normalized term with consistent properties
            return {
              ...term, // Keep all original properties
              id: termId, // Always have id as string
              term_id: termId, // Add term_id for compatibility
              term_content: termContent, // Ensure term_content exists
              name: termContent // Ensure name exists
            };
          });
          
          dispatch(setAllTerms(normalizedTerms));
        } else {
          toast.error("Something went wrong fetching terms, please refresh the page.");
          dispatch(setAllTerms([]));
        }
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  const handleTermChange = (e, item) => {
    try {
      setTermsChanged(true);
      const isChecked = e.target.checked;
      // Always convert ID to string for consistent comparison
      const termId = String(item.id || item.term_id);
      
      // Extract term content with fallbacks
      const termName = item.term_content || item.name || item.term_text || 
                     (item.content && item.content[0] ? item.content[0].title : null) ||
                     `Term ${termId}`;
      
      // Clone the current terms array to avoid direct state mutation
      let updatedTerms = [...(selectedTerms || [])];
      
      if (isChecked) {
        // Make sure term isn't already selected (checking both id and term_id)
        const existingTerm = updatedTerms.find(term => 
          String(term.id) === termId || String(term.term_id) === termId
        );
        
        if (!existingTerm) {
          // IMPORTANT: Only store id and name as required by backend
          updatedTerms.push({
            id: Number(termId), // Convert to number as required by backend
            name: termName
          });
        }
      } else {
        updatedTerms = updatedTerms.filter(term => {
          const cond = term.id != termId
          return cond
        })
      }
      
      // Update Redux with the new terms array
      dispatch(setTermsData(updatedTerms));
      setHasUnsavedChanges(true);
      setTermsChanged(true);
    } catch (error) {
      console.error("Error handling term change:", error);
      toast.error("An error occurred while updating terms. Please try again.");
    }
  };

  const getProjectData = async (projectId) => {
    try {
      const res = await getProjectTableDataById(projectId);
      const projectData = res.data[0];
      return projectData;
    } catch (error) {
      console.error("Error fetching project data:", error.message);
      throw error;
    }
  };

  const validateDates = (name, value, currentFormData) => {
    let error = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for date-only comparisons if needed

    const bidEndDate = currentFormData.bid_end_date ? new Date(currentFormData.bid_end_date) : null;
    const raStartDate = currentFormData.ra_start_date ? new Date(currentFormData.ra_start_date) : null;
    const raEndDate = currentFormData.ra_end_date ? new Date(currentFormData.ra_end_date) : null;

    if (name === 'bid_end_date' && value) {
      const selectedDate = new Date(value);
      if (selectedDate < today) {
        error = 'Bid End Date cannot be in the past.';
      }
      // Changes by Agnij 2025-05-03 [Removed bid end must be before RA start constraint]
      // No constraint between bid end date and reverse auction start
    } else if (name === 'ra_start_date' && value && currentFormData.reverse_auction) {
        const selectedStartDate = new Date(value);
        // Changes by Agnij 2025-05-03 [Removed RA must be after bid end constraint]
        // Removed constraint that RA start must be after bid end date

        // mukul 04/may/2025: Ensure RA start date is strictly one day after bid end date
        if (selectedStartDate && bidEndDate) {
          const bidEndDateOnly = new Date(bidEndDate);
          bidEndDateOnly.setHours(0, 0, 0, 0);
        
          const raStartDateOnly = new Date(selectedStartDate);
          raStartDateOnly.setHours(0, 0, 0, 0);
        
          const diffInDays = (raStartDateOnly - bidEndDateOnly) / (1000 * 60 * 60 * 24);
        
          if (diffInDays < 1) {
            error = 'Auction Start Date must be at least one day after the Procurement End Date.';
          } else if (selectedStartDate < today) {
            error = 'Auction Start Date/Time cannot be in the past.';
        }}
    } else if (name === 'ra_end_date' && value && currentFormData.reverse_auction) {
        const selectedEndDate = new Date(value);
        // Changes by Agnij 2025-05-03 [Removed RA end must be after bid end constraint]
        // Removed constraint that RA end must be after bid end date
        
        // mukul - 04/may/2025: Ensure RA end date is on or after RA start date and have 60min gap
        if (raStartDate) {
          const timeDifference = selectedEndDate - raStartDate; // in ms
          if (timeDifference < 60 * 60 * 1000) {
            error = 'Reverse Auction End Time must be at least 60 minutes after the Start Time.';
        }}
    } else if (name === 'reverse_auction' && !value) {
      // If disabling RA, clear potential errors for RA dates
      setValidationErrors(prev => ({ ...prev, ra_start_date: '', ra_end_date: '' }));
    } else if (name === 'reverse_auction' && value) {
       // If enabling RA, re-validate existing dates
       const startError = validateDates('ra_start_date', raStartDate, currentFormData);
       const endError = validateDates('ra_end_date', raEndDate, currentFormData);
       const bidEndError = validateDates('bid_end_date', bidEndDate, currentFormData);
       setValidationErrors(prev => ({ ...prev, ra_start_date: startError, ra_end_date: endError, bid_end_date: bidEndError }));
    }

    return error;
  };

  const handleFormFieldChange = async (e, selectedOption, actionMeta) => {
    let name = e?.target?.name || actionMeta?.name;
    let value = e?.target?.value || selectedOption?.value || "";

    if (name === "bid_end_date"){
      const today = new Date();
      if(value){
        const selectedDate = new Date(value);
        if (selectedDate <= today) {
            toast.error(`Project procurement end date must be greater than ${today.toISOString().slice(0, 10)}`);;
            return;
        }
      }
    }

    if (name === "reverse_auction") {
      value = parseInt(value);

      if (value === 0) {
        // Clear reverse auction dates when disabled
        dispatch(setOtherFormFields({ field_name: "ra_start_date", value: null }));
        dispatch(setOtherFormFields({ field_name: "ra_end_date", value: null }));
      } else if (value === 1) {
        // Changes by Agnij 2025-05-03 [Removed default date setting for reverse auction]
        // Display a toast message to inform the user to set auction dates
        toast.info("Please set the Auction Start Date & Time and End Date & Time for reverse auction");
      }
    }

    // Handle datetime-local inputs for auction dates
    if ((name === 'ra_start_date' || name === 'ra_end_date') && value) {
      // Changes by Agnij 2025-05-03 [Fixed timestamp format issue]
      // Convert from datetime-local format to server expected format
      // This preserves the exact time without timezone adjustments
      const [datePart, timePart] = value.split('T');
      value = `${datePart} ${timePart}`; // Don't add the extra :00 as it's causing database errors
    }

    if (name === "project_id" && value !== -1) {
      try {
        const projectData = await getProjectData(value);

        if (projectData) {
          dispatch(setOtherFormFields({ field_name: "rfq_type", value: projectData.rfq_type || "" }));
          dispatch(
            setOtherFormFields({
              field_name: "reverse_auction",
              value: projectData.reverse_auction !== undefined ? projectData.reverse_auction : 1,
            })
          );
          dispatch(
            setOtherFormFields({
              field_name: "bid_end_date",
              value: projectData.ended_at ? new Date(projectData.ended_at).toISOString().split("T")[0] : "",
            })
          );
          dispatch(setOtherFormFields({ field_name: "location", value: projectData.location || "" }));
        } else {
          console.error("Project data is empty or undefined.");
        }
      } catch (error) {
        console.error("Failed to handle project_id change:", error.message);
      }
    }

    dispatch(setOtherFormFields({ field_name: name, value }));
    setHasUnsavedChanges(true);
  };

  const handleTermFiles = async (type, dynamicParam) => {
    if (type === "add") {
      try {
        const filePath = await handleFileUpload(dynamicParam);
        dispatch(setTermFiles({ type, value: filePath }))

      } catch (error) {
        let message = error.message;
        toast.error(message);
      }
    } else {
      dispatch(setTermFiles({ type, value: dynamicParam }))
    }
    setHasUnsavedChanges(true);
    setTermFilesChanged(true);
  };

  const handleCreateRFQ = (values, resetForm) => {
    setMainLoading(true);
    setHasUnsavedChanges(false);


    // Use values from the form submission
    const mobileNumber = values.contact_number.trim().replace(/^0+/, "");
    const fullMobile = `${onecountrycode}-${mobileNumber}`;
    
    // Deep clone the form data to avoid direct mutation
    const formDataCopy = JSON.parse(JSON.stringify(rfqFormDataRef.current));
    
    // Ensure company_name is included from either form values, Redux store, or user profile
    formDataCopy.company_name = values.company_name || formDataCopy.company_name || userProfile?.company_name || "";
    
    // Changes by Agnij 2025-05-03 [Validate reverse auction dates without default values]
    if (formDataCopy.reverse_auction === 1) {
      // Check if the reverse auction dates are empty
      if (!formDataCopy.ra_start_date || formDataCopy.ra_start_date === '') {
        toast.error("Please set the Auction Start Date & Time for reverse auction");
        setMainLoading(false);
        return;
      }
      
      if (!formDataCopy.ra_end_date || formDataCopy.ra_end_date === '') {
        toast.error("Please set the Auction End Date & Time for reverse auction");
        setMainLoading(false);
        return;
      }
      
      // Ensure dates are in server expected format (YYYY-MM-DD HH:MM:SS)
      if (formDataCopy.ra_start_date && !formDataCopy.ra_start_date.includes(' ')) {
        if (formDataCopy.ra_start_date.includes('T')) {
          const [date, time] = formDataCopy.ra_start_date.split('T');
          formDataCopy.ra_start_date = `${date} ${time}`; // Changes by Agnij 2025-05-03 [Fixed timestamp format]
        }
      }
      
      if (formDataCopy.ra_end_date && !formDataCopy.ra_end_date.includes(' ')) {
        if (formDataCopy.ra_end_date.includes('T')) {
          const [date, time] = formDataCopy.ra_end_date.split('T');
          formDataCopy.ra_end_date = `${date} ${time}`; // Changes by Agnij 2025-05-03 [Fixed timestamp format]
        }
      }
    } else if (formDataCopy.reverse_auction === 0) {
      // If reverse auction is disabled, explicitly set dates to null
      formDataCopy.ra_start_date = null;
      formDataCopy.ra_end_date = null;
    }
    
    // IMPORTANT: Normalize terms to ensure proper format for backend
    if (formDataCopy.terms && Array.isArray(formDataCopy.terms)) {
      formDataCopy.terms = formDataCopy.terms.map(term => ({
        id: Number(term.id), // Convert to number for backend
        name: term.name // Only include id and name
      }));
    }

    const filters = getRefinedFilters();
    
    let payload = {
      rfq_id: rfqDetails,
      ...formDataCopy,
      project_id: formDataCopy.project_id || -1,
      contact_number: fullMobile,
      updatableData,
      filters,
      termsChanged,
      termFilesChanged,
    };

    // Remove country_code if it exists
    if (payload.hasOwnProperty("country_code")) {
      delete payload.country_code;
    }

    if(selectedSheet && selectedSheet.value) {
      payload.sheet_id = selectedSheet.value;
    }

    createRfq(payload)
      .then((res) => {
        setMainLoading(false);
        toast.success(
          <h6>
            <b>RFQ #{res.data.rfq_no}:</b> Successfully created!
          </h6>,
          { position: "top-right" }
        );
        setHasUnsavedChanges(false);
        rfqProductsRef.current = [];
        rfqFormDataRef.current = {};

        router.push("/dashboard/buyer/rfq-management");
        dispatch(clearState());
        if (typeof resetForm === 'function') {
          resetForm();
        }
      })
      .catch((err) => {
        console.error("Error creating RFQ:", err);
        setMainLoading(false);
        setHasUnsavedChanges(true);
        toast.error("Failed to create RFQ. Please check your form and try again.");
      });
  };

  const getRefinedFilters = () => {
    const filters = vendorFilters;

    let updatedFilters = {
      global: {},
      local: {},
    };

    if (filters) {
      Object.keys(filters.global).forEach((filterKey) => {
        const filter = filters.global[filterKey];

        updatedFilters.global[filterKey] = filter?.value ?? null;
      });

      Object.keys(filters.local).forEach((id) => {
        const productFilters = filters.local[id];

        if(productFilters)
          Object.keys(productFilters).forEach(filterKey => {
            if(!updatedFilters.local?.[id]) {
              updatedFilters.local[id] = {};
            }
            const filter = productFilters[filterKey];

            if (Array.isArray(filter)) {
              updatedFilters.local[id][filterKey] = filter
                .map((singleFilter) => singleFilter?.value ?? null)
                .filter(Boolean);
              return;
            }
            updatedFilters.local[id][filterKey] = filter?.value ?? null;
          })
      });
    }

    return updatedFilters;
  }

  const handleSaveDraft = async () => {
    setMainLoading(true);

    const contactNumber = rfqFormDataRef?.current?.contact_number?.trim();
    const parts = contactNumber?.includes('-') ? contactNumber?.split('-') : [contactNumber];
    const cleanedNumber = parts[parts.length - 1];    
    const fullMobile = `${onecountrycode}-${cleanedNumber}`;

    // Deep clone the form data to avoid direct mutation
    const formDataCopy = JSON.parse(JSON.stringify(rfqFormDataRef.current));
    
    // IMPORTANT: Filter terms to only include id and name to prevent validation errors
    if (formDataCopy.terms && Array.isArray(formDataCopy.terms)) {
      formDataCopy.terms = formDataCopy.terms.map(term => ({
        id: Number(term.id || term.term_id), // Convert to number for backend
        name: term.name || term.term_content || `Term ${term.id}`
      }));
      
    }
    // Make sure we maintain the rfq_added_from flag if this is a magic search RFQ
    if (isMagicRfq && !formDataCopy.rfq_added_from) {
      formDataCopy.rfq_added_from = 'magic';
    }

    const filters = getRefinedFilters();

    const payload = {
      ...formDataCopy, // Use the filtered copy
      rfq_id: rfqDetails,
      contact_number: fullMobile,
      sheet_id: selectedSheet?.value,
      updatableData,
      filters,
      termsChanged,
      termFilesChanged,
    };
    try {
      const res = await saveDraft(payload);
      setMainLoading(false);
      toast.success(
        <h6>
          <b>RFQ Draft #{res.message?.rfq?.rfq_no}:</b> Changes saved successfully!
        </h6>,
        { position: "top-right" }
      );
      setHasUnsavedChanges(false);
      
      // Don't reload or redirect, just update the local state if needed
      if (res.message?.rfq_id && !rfqDetails) {
        // If this is a new draft and we got an ID back, update it locally
        dispatch(setOtherFormFields({ rfq_id: res.message.rfq_id }));
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      setMainLoading(false);
      toast.error("Failed to save draft. Please try again.");
    }
  };

  const loadDraft = async (id, sheet_id = queryMeta.sheet_id) => {
    dispatch(setStoreLoading(true));
    try {
      const draftRes = await getDraftById(id, sheet_id);
      const rfqFormData = draftRes?.data?.rfq_form_data || {};
      const isMagicRfqFromFlag = rfqFormData?.rfq_added_from === 'magic';
      const hasMagicSheets = draftRes?.data?.sheets && Array.isArray(draftRes.data.sheets) && draftRes.data.sheets.length > 0;
                  
      if (isMagicRfqFromFlag || hasMagicSheets) {
        setIsMagicRfq(true);
        
        let sheetData = [];
        
        if (hasMagicSheets) {
          sheetData = draftRes.data.sheets;
        } else {
          try {
            const sheetsResponse = await getDraftRfqSheets(id);
            if (sheetsResponse?.data?.sheets && Array.isArray(sheetsResponse.data.sheets)) {
              sheetData = sheetsResponse.data.sheets;                      
            } else {
              console.warn('No sheets found in API response:', sheetsResponse?.data);
            }
          } catch (error) {
            console.error("Error fetching magic search sheets:", error);
            toast.error("Failed to load sheet data for this RFQ");
          }
        }
        
        if (sheetData && sheetData.length > 0) {
          const sheetOptions = sheetData.map(sheet => ({
            label: sheet.sheet_name,
            value: sheet.id
          }));
          setSheetNameList(sheetOptions);
          
          // Set default selected sheet
          if (sheetData.length > 0) {
            const defaultSheet = {
              label: sheetData[0].sheet_name,
              value: sheetData[0].id
            };
            if(queryMeta.sheet_id) {
              const sheet = sheetOptions.find(sheet => sheet.value == queryMeta.sheet_id)
              setSelectedSheet(sheet);
            } else if(!selectedSheet)
              setSelectedSheet(defaultSheet);
          }
        } else {
          console.warn("No sheets found for Magic RFQ ID:", id);
        }
      }
      
      if (draftRes?.data) {
        if (draftRes.data.rfq_form_data?.contact_number) {
          let fullContactNumber = draftRes.data.rfq_form_data.contact_number.trim();
          let extractedCountryCode = "";
          let extractedContactNumber = fullContactNumber;
    
          if (fullContactNumber?.includes('-')) {
            const parts = fullContactNumber.split('-');  
            extractedCountryCode = parts[0].replace("-", "").trim();
            extractedContactNumber = parts.slice(1).join("").trim();
          }
    
          draftRes.data.rfq_form_data.contact_number = extractedContactNumber;
          draftRes.data.rfq_form_data.country_code = extractedCountryCode;
      
          setonecountrycode(extractedCountryCode);
        }
        dispatch(intializeRfq(draftRes.data));
        
        // Update document title
        document.title = `Edit Draft RFQ #${id}`;
        
        // Set up other form-related data
        getTermsData();
      } else {
        console.error("No data found in draft response");
        toast.error("Failed to load draft RFQ data");
      }
    } catch (error) {
      console.error("Error loading draft by ID:", error);
      // Changes by Agnij 2025-06-17 [Improved error message with specific details]
      toast.error(error.message || "Error loading draft RFQ");
    } finally {
      dispatch(setStoreLoading(false));
    }
  };

  const getDraftInitialData = async () => {
    dispatch(clearState());
    dispatch(setStoreLoading(true));
    try {
      // If a draft_id is provided in the URL, load that specific draft
      let draftRes;
      
      if (draftRfqId && draftRfqId !== -1) {
        draftRes = await getDraftById(draftRfqId);
        document.title = `Edit Draft RFQ #${draftRfqId}`;

        const isMagicRfqFromFlag = draftRes?.data?.rfq_form_data?.rfq_added_from === 'magic';
        const hasMagicSheets = draftRes?.data?.sheets && Array.isArray(draftRes.data.sheets) && draftRes.data.sheets.length > 0;
        if (isMagicRfqFromFlag || hasMagicSheets) {
          setIsMagicRfq(true);
          
          let sheetData = [];
          
          if (hasMagicSheets) {
            sheetData = draftRes.data.sheets;
          } else {
            try {
              const sheetsResponse = await getDraftRfqSheets(draftRfqId);              
              if (sheetsResponse?.data?.sheets && Array.isArray(sheetsResponse.data.sheets)) {
                sheetData = sheetsResponse.data.sheets;
              } else {
              }
            } catch (error) {
              toast.error("Failed to load sheet data for this RFQ");
            }
          }
          
          if (sheetData && sheetData.length > 0) {
            const sheetOptions = sheetData.map(sheet => ({
              label: sheet.sheet_name,
              value: sheet.id
            }));
            setSheetNameList(sheetOptions);
            
            // Set default selected sheet
            if (sheetData.length > 0) {
              const defaultSheet = {
                label: sheetData[0].sheet_name,
                value: sheetData[0].id
              };
              if(queryMeta.sheet_id) {
                const sheet = sheetOptions.find(sheet => sheet.value == queryMeta.sheet_id)
                setSelectedSheet(sheet);
              } else if(!selectedSheet)
                setSelectedSheet(defaultSheet);
            }
          } else {
            console.warn("No sheets found for Magic RFQ ID:", draftRfqId);
          }
        }
      } else {
        // Changes by Agnij 2025-06-17 [Using fresh=true to always create a new RFQ when opening the Create RFQ page]
        draftRes = await getDraftData(true);
        document.title = "Create New RFQ";
      }

      if (draftRes?.data?.rfq_form_data?.contact_number) {
        let fullContactNumber = draftRes?.data?.rfq_form_data?.contact_number?.trim();
        let extractedCountryCode = "";
        let extractedContactNumber = fullContactNumber;
  
        if (fullContactNumber?.includes('-')) {
          const parts = fullContactNumber?.split('-');  
          extractedCountryCode = parts[0]?.replace("-", "")?.trim(); // Remove "+" and trim spaces
          extractedContactNumber = parts?.slice(1)?.join("")?.trim(); // Remove "-" and trim spaces
        }
  
        // **Modify `draftRes` before passing it to another function**
        draftRes.data.rfq_form_data.contact_number = extractedContactNumber;
        draftRes.data.rfq_form_data.country_code = extractedCountryCode; // Add extracted country code
    
        // **Pass modified draftRes to the function that sets RFQ data**
        dispatch(intializeRfq(draftRes.data));
        setonecountrycode(extractedCountryCode);
      }
      else{
        dispatch(intializeRfq(draftRes.data));
      }
      getTermsData();

    } catch (error) {
      toast.error(error.message || "Error loading draft RFQ");
    } finally {
      dispatch(setStoreLoading(false));
    }
  }

  const resetUpdatableData = () => {
    setUpdatableData({
      products: {
        addable: [],
        deletable: [],
        updatable: {},
      },
      vendors: {},
    })
  }

  // Changes by Agnij 2025-08-05 [Added handler for sheet selection]
  const handleSheetChange = async (selectedOption) => {
    if (!selectedOption || !draftRfqId) return;
    
    dispatch(clearState());

    setSelectedSheet(selectedOption);
    setMainLoading(true);
    dispatch(setStoreLoading(true));
    if(hasUnsavedChanges) {
      await handleSaveDraft();
      resetUpdatableData();
    }

    await loadDraft(draftRfqId, selectedOption.value)

    setMainLoading(false);
    dispatch(setStoreLoading(false));
  };

  const handleSpecChange = (product, change) => {
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          specs: {
            ...(prev.products.updatable?.specs ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.specs?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              [change.title]: change.value,
            },
          },
        },
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleFilesChange = (product, change) => {
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          files: {
            ...(prev.products.updatable?.files ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.files?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              [change.type]: change?.value.length > 0 ? change.value : "rm",
            },
          },
        },
      },
    }));
    setHasUnsavedChanges(true)
  };

  const handleCommentChange = (product, change) => {
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          comment: {
            ...(prev.products.updatable?.comment ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.comment?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              comment: change.value,
            },
          },
        },
      },
    }));
    setHasUnsavedChanges(true)
  };

  const handleClauseChange = (product, change) => {
    setUpdatableData((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        updatable: {
          ...prev.products.updatable,
          techEval: {
            ...(prev.products.updatable?.techEval ?? {}),
            [product.id]: {
              ...(prev.products.updatable?.techEval?.[product.id] ?? {
                product_id: product.product_id,
                variant: product.variant,
              }),
              techEval: [
                ...(prev.products.updatable?.techEval?.[product.id]?.techEval ??
                  []),
                change.action,
              ],
            },
          },
        },
      },
    }));
    setHasUnsavedChanges(true)
  };

  const handleRemoveProduct = (product) => {
    if (
      updatableData.products.deletable.length + 1 ===
      rfqProducts?.length
    )
      toast.warning(
        "You cannot delete all products from RFQ, at least one product is required"
      );
    else {
      setUpdatableData((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          deletable: [...(prev.products?.deletable ?? []), product.id],
        },
      }));
      setHasUnsavedChanges(true)
    }
  };

  const handleShowModalWithProduct = (modalKey, product) => {
    const key = `${product.id}`;
    setShowModal((prev) => ({
      ...prev,
      [modalKey]: true,
    }));
    setSelectedProduct({
      product,
      vendors: vendors[key],
    });
  };

  const handleRouteChange = async (url) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        "You have unsaved changes. Do you want to save them before leaving?"
      );
      if (confirmLeave) {
        await handleSaveDraft();
      } else {
        // Prevent navigation
        router.events.emit("routeChangeError");
        throw "Route change aborted by user."; // Suppress Next.js warning
      }
    }
  };

  const populateVendorFilters = (newProducts) => {
    if(!newProducts || !Array.isArray(newProducts) || newProducts.length <= 0) return;

    setVendorFilters(prev => {
      const updatableFilters = { ...prev };

      let localFilters = { ...updatableFilters.local };

      newProducts.forEach(product => {
        if(localFilters?.[product.id]) return;

        localFilters[product.id] = {};
      })

      return { ...updatableFilters, local: { ...localFilters } };
    })
  }

  const handleFilterUpdate = (isGlobal, product = null, data) => {
    if (!isGlobal && !product)
      throw new Error("Local filter updation requires a product");

    setVendorFilters((prev) => {
      let updatedFilters = { ...prev };

      const dataKeys = Object.keys(data)

      if(dataKeys.includes('country')) {
        data.state = [];
        data.city = [];
      }

      if(dataKeys.includes('state')) {
        data.city = [];
      }

      if (isGlobal) {
        // Update global
        updatedFilters.global = {
          ...updatedFilters.global,
          ...data,
        };

        // Reflect changes in all local filters
        const updatedLocal = {};

        Object.keys(updatedFilters.local || {}).forEach((productId) => {
          const existingLocal = updatedFilters.local[productId] ?? {};

          // Override global keys with global values, but preserve other local keys
          const merged = {
            ...existingLocal,
            ...data, // this will override the global filters only
          };

          updatedLocal[productId] = merged;
        });

        updatedFilters.local = updatedLocal;

        setVendors({})
      } else {
        // Local update for a specific product
        const productId = product.id;
        updatedFilters.local = {
          ...updatedFilters.local,
          [productId]: {
            ...(updatedFilters.local?.[productId] ?? {}),
            ...data,
          },
        };
      }

      return updatedFilters;
    });
  };

  const fetchAvailableVendorsForProduct = async () => {
      if(!selectedProduct || !selectedProduct.product) return;

      const key = `${selectedProduct.product.id}`;
  
      try {
        const body = {
          productId: selectedProduct.product.product_id,
          excludeIds: vendors?.[key]?.map(vendor => vendor.user_id) ?? []
        }
        const response = await getVendorsForProduct(body)
        setAddableVendors(response.data)
      } catch (error) {
        toast.error(error.message)
      }
    }

  useEffect(() => {
    if(activeKey) {
      activeKey?.forEach((key) => {
        const rfqProductId = key;
        fetchVendorsForProduct(rfqProductId, true);
      });
    }
  }, [vendorFilters.local])

  useEffect(() => {
      fetchAvailableVendorsForProduct();
    }, [selectedProduct])

  // Dynamic filters inside Single RFQ Product Item
  const generateDynamicFilter = (product = null) => {
    const isGlobalFilter = !product;

    const getFilterValue = (key) => isGlobalFilter ? vendorFilters.global?.[key] : vendorFilters.local?.[product.id]?.[key]

    const forwardFilterUpdate = (newVal, action) => {
      const param = {
        [action.name]: newVal,
      };

      handleFilterUpdate(isGlobalFilter, product, param);
    }

    const getFilteredStates = () => {
      const globalCountries = getFilterValue('country')
      if(!globalCountries || globalCountries <= 0) return initialFilterOptions.states;

      let filteredStates = initialFilterOptions.states;
      filteredStates = filteredStates.filter(state => globalCountries.some(country => country.value == state.country_id))

      return filteredStates;
    }

    const getFilteredCities = () => {
      const globalCountries = getFilterValue('country')
      const globalStates = getFilterValue('state')

      if((!globalCountries || globalCountries <= 0) && (!globalStates || globalStates <= 0)) return initialFilterOptions.cities;

      let filteredCities = initialFilterOptions.cities;
      if(globalCountries && globalCountries.length > 0)
        filteredCities = filteredCities.filter(city => globalCountries.some(country => country.value == city.country_id))

      if(globalStates && globalStates.length > 0)
        filteredCities = filteredCities.filter(city => globalStates.some(state => state.value == city.state_id))

      return filteredCities;
    }

    return (
      <>
        <div className="w-100 mb-2">
          <div className=" d-flex justify-content-between align-items-end w-100">
            <div className="row g-3" style={{ width: "100%" }}>
              <div className="col-md-3">
                <CommonFormInput
                  isMulti = {true} 
                  type="multiselect"
                  options={initialFilterOptions.countries.map((item) => ({
                    label: item.country_name,
                    value: item.id,
                  }))}
                  name="country"
                  label="Country"
                  labelBold
                  placeholder="Select"
                  values={getFilterValue("country")}
                  onChange={(newVal, action) =>
                    forwardFilterUpdate(newVal, action)
                  }
                />
              </div>
              <div className="col-md-3">
                <CommonFormInput
                  disabled={
                    !getFilterValue("country") ||
                    getFilterValue("country").length <= 0
                  }
                  isMulti = {true} 
                  type="multiselect"
                  options={getFilteredStates().map((item) => ({
                    label: item.state_name,
                    value: item.id,
                  }))}
                  name="state"
                  label="State"
                  labelBold
                  placeholder="Select"
                  values={getFilterValue("state")}
                  onChange={(newVal, action) =>
                    forwardFilterUpdate(newVal, action)
                  }
                />
              </div>
              <div className="col-md-3">
                <CommonFormInput
                  disabled={
                    !getFilterValue("country") ||
                    getFilterValue("country").length <= 0
                  }
                   isMulti = {true} 
                  type="multiselect"
                  options={getFilteredCities().map((item) => ({
                    label: item.city_name,
                    value: item.id,
                  }))}
                  name="city"
                  label="City"
                  labelBold
                  placeholder="Select"
                  values={getFilterValue("city")}
                  onChange={(newVal, action) =>
                    forwardFilterUpdate(newVal, action)
                  }
                />
              </div>
              <div className="col-md-3">
                <CommonFormInput
                  type="multiselect"
                  options={myVendorOptions}
                  name="vendor_info"
                  label="My Vendors"
                  labelBold
                  placeholder="Select"
                  values={getFilterValue("vendor_info")}
                  onChange={(newVal, action) =>
                    forwardFilterUpdate(newVal, action)
                  }
                />
              </div>
            </div>
          </div>
          <div className=" d-flex justify-content-between align-items-end w-100">
            <div className="row g-3" style={{ width: "100%" }}>
              <div className="col-md-3">
                <CommonFormInput
                  isMulti = {true} 
                  type="multiselect"
                  options={initialFilterOptions.vendorTypes}
                  name="vendor_type"
                  label="Vendor Types"
                  labelBold
                  placeholder="Select"
                  values={getFilterValue("vendor_type")}
                  onChange={(newVal, action) =>
                    forwardFilterUpdate(newVal, action)
                  }
                />
              </div>
              <div className="col-md-3">
                <CommonFormInput
                  type="multiselect"
                  options={vendorConditions}
                  name="prev_worked_with"
                  label="Previously Worked With"
                  labelBold
                  placeholder="Select"
                  values={getFilterValue("prev_worked_with")}
                  onChange={(newVal, action) =>
                    forwardFilterUpdate(newVal, action)
                  }
                />
              </div>
              <div className="col-md-3">
                <CommonFormInput
                   isMulti = {true} 
                  type="multiselect"
                  options={initialFilterOptions.approvedBy.map((item) => ({
                    label: item.vendor_approve,
                    value: item.id,
                  }))}
                  name="vendor_approved_by"
                  label="Vendor Approved By"
                  labelBold
                  placeholder="Select"
                  values={getFilterValue("vendor_approved_by")}
                  onChange={(newVal, action) =>
                    forwardFilterUpdate(newVal, action)
                  }
                />
              </div>
              {!isGlobalFilter && (
                <div className="col-md-3">
                  <CommonFormInput
                     isMulti = {true} 
                    type="multiselect"
                    options={
                      initialFilterOptions.productMakes?.[product.id]
                        ? initialFilterOptions.productMakes[product.id].map(
                            (item) => ({
                              label: item.vendor_approve,
                              value: item.id,
                            })
                          )
                        : []
                    }
                    name="productMakes"
                    label="Product Makes"
                    labelBold
                    placeholder="Select"
                    values={getFilterValue("productMakes")}
                    onChange={(newVal, action) =>
                      forwardFilterUpdate(newVal, action)
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  useEffect(() => {
    const { draft_id, sheet_id } = router.query;
    setQueryMeta({
      draft_id,
      sheet_id,
    })
  }, [router.query])

  useEffect(() => {
    try {
      getProfileDetails();
      getVendorApproveList();
      getVendorTypes();
      getAllCountries();
      getAllStates();
      getAllCities();
      getAllProjects();
      fetchCountryCodes();
    } catch (error) {
      console.log("SOMETHING WENT WRONG DURING INITIAL FETCHING");
      toast.error(error.message)
    }
  }, []);
  // Watch for changes in the draft_id from URL
  useEffect(() => {
    // Changes by Agnij 2025-06-17 [Reset state when draft_id changes]
    // If no draft_id is present, clear state and force a fresh draft
    if (!draft_id) {
      dispatch(clearState());
      // Create a fresh draft
      const loadFreshDraft = async () => {
        dispatch(setStoreLoading(true));
        try {
          const draftRes = await getDraftData(true);
          dispatch(intializeRfq(draftRes.data));
          document.title = "Create New RFQ";
          getTermsData();
        } catch (error) {
          console.error("Error creating fresh draft:", error);
          toast.error(error.message || "Error creating fresh RFQ draft");
        } finally {
          dispatch(setStoreLoading(false));
        }
      };
      
      loadFreshDraft();
      return;
    }
    
    // If draft_id is present, load that specific draft
    if (draft_id) {
      try {
        const id = parseInt(draft_id);
        if (!isNaN(id) && id > 0) {
          setDraftRfqId(id);
          
          dispatch(clearState());
          
          loadDraft(id);
        }
      } catch (error) {
        console.error("Error processing draft_id:", error);
      }
    }
  }, [draft_id]);

  // Add a useEffect to set the company name in the store when userProfile is loaded
  useEffect(() => {
    if (userProfile && userProfile.company_name) {
      // If we have a company name in the user profile and none in the form data, set it
      if (!rfqFormDataFromStore.company_name || rfqFormDataFromStore.company_name === '') {
        dispatch(setOtherFormFields({ 
          field_name: 'company_name', 
          value: userProfile.company_name 
        }));
      }
    }
  }, [userProfile]);

  // Changes by Agnij 2025-09-04 [Fixed duplicate products issue and handling of undefined state]
  useEffect(() => {
    // Handle the case where rfqProductsFromStore might be undefined
    if (!rfqProductsFromStore) {
      return;
    }
    
    // Only filter by vendor presence if not a magic search RFQ
    if (!isMagicRfq) {
      const validProducts = rfqProductsFromStore.filter(
        (prodItem) => prodItem);

      setRfqProducts(validProducts);
      rfqProductsRef.current = validProducts;
    } else if (selectedSheet) {
      // For magic search RFQs, also ensure products are filtered by the selected sheet
      
      const enhancedProducts = rfqProductsFromStore.map(product => {
        if (!product) return null;
        
        // Create a copy with the current sheet info
        const enhancedProduct = {...product};
        enhancedProduct.sheet_id = selectedSheet.value;
        enhancedProduct.sheet_name = selectedSheet.label;
        
        return enhancedProduct;
      }).filter(Boolean);
      
      setRfqProducts(enhancedProducts);
      rfqProductsRef.current = enhancedProducts;
    }
  }, [rfqProductsFromStore, isMagicRfq, selectedSheet])

  useEffect(() => {
    if (
      rfqProducts &&
      rfqProducts.some(
        (product) =>
          !Object.keys(vendorFilters.local)
            .map((key) => parseInt(key))
            .includes(product.id)
      )
    ) {
      populateVendorFilters(rfqProducts);
    }
  }, [rfqProducts])

  useEffect(() => {
    rfqFormDataRef.current = rfqFormDataFromStore;
  }, [rfqFormDataFromStore]);

  useEffect(() => {
    // Debug terms selection state
    if (allTerms?.length > 0 && selectedTerms?.length > 0) {
      
    }
  }, [allTerms, selectedTerms]);

  useEffect(() => {
    // Listen to route change events
    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [hasUnsavedChanges, router, updatableData]);

  useEffect(() => {
    // Changes by Agnij 2025-05-03 [Removed auto-setting of default dates for reverse auction]
    // This effect has been intentionally disabled to ensure users explicitly set dates for reverse auction
    
    // Only validate the dates if both are provided
    if (
      rfqFormDataFromStore.reverse_auction === 1 &&
      rfqFormDataFromStore.ra_start_date && 
      rfqFormDataFromStore.ra_end_date
    ) {
      // Validate dates
      const startError = validateDates('ra_start_date', rfqFormDataFromStore.ra_start_date, rfqFormDataFromStore);
      const endError = validateDates('ra_end_date', rfqFormDataFromStore.ra_end_date, rfqFormDataFromStore);
      
      // Update validation errors
      setValidationErrors(prev => ({
        ...prev,
        ra_start_date: startError,
        ra_end_date: endError
      }));
    }
  }, [rfqFormDataFromStore.reverse_auction, rfqFormDataFromStore.bid_end_date]);
 
  const countryCodeMatch = rfqFormDataFromStore.contact_number.match(/^\+(\d{1,4})-/);
  const countryCode1 = countryCodeMatch ? countryCodeMatch[0].slice(0, -1) : null; // Extracting country code from contact number


  
  
  const selectedCountry = countryCode.find(
    (item) => item.phone_code === countryCode1
  );           // Getting selected country from country code list

  // Changes by Agnij 2025-05-25 [Fixed undefined rfqProductsFromStore error]
  useEffect(() => {
    // Guard against undefined rfqProductsFromStore
    if (!rfqProductsFromStore || !Array.isArray(rfqProductsFromStore)) {
      return;
    }

    if (isMagicRfq && selectedSheet && draftRfqId && rfqProductsFromStore.length > 0) {      
      // Force ALL products to be shown for Magic Search RFQs
      // This is a temporary fix until we can properly associate products with sheets
      const allProductsWithSheet = rfqProductsFromStore.map(product => {
        if (!product) return null;
        
        // Create a copy with the current sheet info
        const enhancedProduct = {...product};
        enhancedProduct.sheet_id = selectedSheet.value;
        enhancedProduct.sheet_name = selectedSheet.label;
        
        // Ensure product has vendors
        if (!enhancedProduct.vendors || !Array.isArray(enhancedProduct.vendors) || enhancedProduct.vendors.length === 0) {
          enhancedProduct.vendors = [{
            id: 1, 
            name: "Default Vendor", 
            company_name: "Auto-assigned Vendor"
          }];
        }
        
        return enhancedProduct;
      }).filter(Boolean);
      
      setRfqProducts(allProductsWithSheet);
      rfqProductsRef.current = allProductsWithSheet;
    }
  }, [selectedSheet, isMagicRfq, draftRfqId, rfqProductsFromStore]);

  return (
    <>
      {(mainLoading || storeLoading) && <Loader />}
      <div className="create-rfq-con">
        {/* If no active subscription is found */}
        {userProfile && !userProfile?.subscription_plan_id ? (
          <div class="subscription_required">
            <span>
              You need to purchase subscription to perform this action
            </span>
          </div>
        ) : (
          <>
            {/* Add Products Button */}
            <div className="details-table mt-0">
              {!loading && rfqProducts.length == 0 ? (
                <div className="text-center">
                  <Link
                    href={`/vendor/all${rfqDetails !== -1 ? `?rfq_id=${rfqDetails}` : ''}`}
                    className="btn btn-primary"
                  >
                    Add Products
                  </Link>
                </div>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-end mb-3">
                    <div className="col-md-3">
                      <h4>Select Project</h4>
                      <Select
                        options={projects}
                        value={projects.find(
                          (project) =>
                            project.value === rfqFormDataFromStore.project_id
                        )}
                        defaultValue={-1}
                        onChange={(selectedOption, actionMeta) =>
                          handleFormFieldChange(null, selectedOption, actionMeta)
                        }
                        name="project_id"
                        placeholder="Select"
                        isClearable
                      />
                    </div>

                    {/* Changes by Agnij 2025-08-08 [Simplified sheet selector UI] */}
                    {isMagicRfq && sheetNameList.length > 0 && (
                      <div className="col-md-3">
                        <h4>Select Sheet</h4>
                        <Select
                          name="sheetName"
                          options={sheetNameList}
                          value={selectedSheet}
                          placeholder="Select Sheet"
                          onChange={handleSheetChange}
                          className="sheet-selector"
                        />
                      </div>
                    )}
                  </div>

                  <div
                    className="d-flex flex-wrap justify-content-between align-items-start"
                    style={{ height: "fit-content" }}
                  >
                    {generateDynamicFilter()}
                  </div>

                  {/* RFQ Products Table */}
                  <h4>Review Products</h4>
                  <div
                    className=""
                    style={{
                      height: "fit-content",
                      background: "#ffffa",
                      border: "2px solid #CCCCCC",
                      borderRadius: "10px",
                      padding: "10px",
                    }}
                  >
                    <Accordion flush alwaysOpen activeKey={activeKey} onSelect={(k) => {
                        setActiveKey(k);
                      k?.forEach(key => {
                          const rfqProductId = key;
                          fetchVendorsForProduct(rfqProductId);

                        const rfqProduct = rfqProducts.find(product => product.id == rfqProductId)
                        if(rfqProduct) {
                            getMakesProductWise(rfqProduct.product_id);
                          }
                      })
                    }}>
                      {rfqProducts &&
                        rfqProducts.length > 0 &&
                        rfqProducts.filter(product => !updatableData.products.deletable.includes(product.id)).map(product => {
                            return (
                              <Item
                                activeKey={activeKey}
                                vendors={vendors?.[product.id] ?? []}
                                fetchVendors={async () => await fetchVendorsForProduct(product.id)}
                                updatableData={updatableData}
                                vendorApprovedList={vendorApprovedList}
                                data={product}
                                rfq_id={rfqDetails}
                                setHasUnsavedChanges={setHasUnsavedChanges}
                                getDraftInitialData={getDraftInitialData}
                                saveDraft={handleSaveDraft}
                                selectedSheet={selectedSheet}
                                onSpecValueChange={(change) =>
                                  handleSpecChange(product, change)
                                }
                                onFilesChange={(change) =>
                                  handleFilesChange(product, change)
                                }
                                onCommentChange={(change) =>
                                  handleCommentChange(product, change)
                                }
                                onClauseChange={(change) =>
                                  handleClauseChange(product, change)
                                }
                                handleViewVendorInEdit={() =>
                                  handleShowModalWithProduct(
                                    "vendorModal",
                                    product
                                  )
                                }
                                handleRemoveProductInEdit={() =>
                                  handleRemoveProduct(product)
                                }
                                handleAddVendorInEdit={() => handleShowModalWithProduct(
                                  "addVendorModal",
                                  product
                                )}
                                // Header
                                header={generateDynamicFilter}
                              />
                            );
                          })}
                    </Accordion>
                  </div>

                  <div className="float-end addmore mt-4 ">
                    <Link
                      href={`/vendor/all${rfqDetails !== -1 ? `?rfq_id=${rfqDetails}${selectedSheet ? `&sheet_id=${selectedSheet.value}` : ``}` : ''}`}
                      className="me-2"
                    >
                      Add More Products
                    </Link>
                  </div>

                  {loading && <Loader />}

                  {/* Terms Checkbox Section */}
                  <div className="create-rfq-con-2 sc-pt-50">
                    <div className="row">
                      {!loading && allTerms.length > 0 && (
                        <div className="col-md-8 createR-ffq-1">
                          <h4>Suggested Terms</h4>

                          <ol className="custom-ol">
                            {allTerms.map((item) => {
                              // Use consistent term content extraction
                              const termContent =
                                item.term_content ||
                                item.name ||
                                item.term_text ||
                                (item.content && Array.isArray(item.content) && item.content[0]?.title) ||
                                `Term ${item.id}`;

                              // Check if term is selected using consistent ID comparison
                              const isSelected = selectedTerms?.some(term => 
                                String(term.id || term.term_id) === String(item.id || item.term_id)
                              );

                              return (
                                <li key={`term-${item.id}`}>
                                  <div className="form-check">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      id={`term-${item.id}`}
                                      checked={isSelected}
                                      onChange={(e) => handleTermChange(e, item)}
                                    />
                                    <label className="form-check-label" htmlFor={`term-${item.id}`}>
                                      {termContent}
                                    </label>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      )}

                      {/* Other Form Field Section */}
                      <div className="col-md-8 createR-ffq-2">
                        <Formik
                          enableReinitialize={true}
                          validateOnMount={true}
                          initialValues={{
                            is_published: rfqFormDataFromStore.is_published,
                            comment: rfqFormDataFromStore.comment,
                            response_email: rfqFormDataFromStore.response_email,
                            contact_name: rfqFormDataFromStore.contact_name,
                            contact_number: rfqFormDataFromStore.contact_number.replace(/^\+\d{1,4}-/, ''),
                            company_name: rfqFormDataFromStore.company_name || userProfile?.company_name || "",
                            bid_end_date: rfqFormDataFromStore.bid_end_date,
                            rfq_type: rfqFormDataFromStore.rfq_type,
                            reverse_auction:
                              rfqFormDataFromStore.reverse_auction,
                            location: rfqFormDataFromStore.location,
                            countryCode:"+91"
                          }}
                          validationSchema={CreateRFQSchema}
                          onSubmit={(values, { resetForm }) => {
                            handleCreateRFQ(values, resetForm)
                          }
                          }
                        >
                          {({ errors, touched, isValid }) => (
                            <Form className="add-your-term-form">
                              <FormikField
                                label="Add your own terms"
                                placeholder="You can mention your terms regarding Freight Charges, Payment Terms, Performance Bank Guarantee, Packing & Forwarding Charges, Delivery Period, Liquidated Damages, Transit Insurance and more"
                                type="textarea"
                                rows="5"
                                name="comment"
                                touched={touched}
                                errors={errors}
                                enableHandleChange={true}
                                handleChange={handleFormFieldChange}
                              />

                              <div className="row mt-2">
                                <div className="custom-file">
                                  <label
                                    htmlFor="customFile"
                                    className="custom-file-label"
                                  >
                                    Upload Your Terms (Optional)
                                  </label>
                                  <input
                                    type="file"
                                    accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                                    className="custom-file-input"
                                    id="customFile"
                                    multiple
                                    onChange={(e) => handleTermFiles("add", e)}
                                  />
                                  {termFiles.length > 0 && (
                                    <div className="row mt-2">
                                      {termFiles.map((term_file) => (
                                        <div
                                          key={term_file}
                                          className="col-md-6 col-lg-4"
                                        >
                                          <a
                                            href={term_file}
                                            target="_blank"
                                            className="file-badge mb-2"
                                            type="button"
                                          >
                                            <span
                                              className="text-truncate me-3"
                                              style={{ maxWidth: "90%" }}
                                            >
                                              {extractfileName(term_file)}
                                            </span>
                                            <FontAwesomeIcon
                                              icon={faClose}
                                              fontSize={15}
                                              onClick={(e) => {
                                                e.preventDefault();
                                                handleTermFiles(
                                                  "remove",
                                                  term_file
                                                );
                                              }}
                                            />
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="row mt-2">
                                <div className="col-md-6">
                                  <FormikField
                                    label="Email"
                                    value={rfqFormDataFromStore.response_email}
                                    enableHandleChange={true}
                                    handleChange={handleFormFieldChange}
                                    type="email"
                                    isRequired={true}
                                    name="response_email"
                                    touched={touched}
                                    errors={errors}
                                  />
                                </div>
                                <div className="col-md-6">
                                  <FormikField
                                    label="Contact person"
                                    value={rfqFormDataFromStore.contact_name}
                                    enableHandleChange={true}
                                    handleChange={handleFormFieldChange}
                                    type="text"
                                    isRequired={true}
                                    name="contact_name"
                                    touched={touched}
                                    errors={errors}
                                  />
                                </div>
                                <div className="col-md-6">
                                  <label className="form-label">
                                    Contact Number{" "}
                                    <span className="text-danger">*</span>
                                  </label>

                                  <div className="d-flex">
                                    {/* Country Code Dropdown */}
                                    <Field
                                      as="select"
                                      name="countryCode"
                                      className="form-select"
                                      style={{
                                        maxWidth: "130px",
                                        marginRight: "6px",
                                        maxHeight: "44px",
                                      }}
                                      value={onecountrycode}
                                      onChange={(e) =>
                                        setonecountrycode(e.target.value)
                                      }
                                    >
                                      <option value="countryCode">{selectedCountry?.country_code} ({selectedCountry?.phone_code})</option>
                                      {countryCode.map((country) => (
                                        <option
                                          key={country.id}
                                          value={country.phone_code}
                                        >
                                          {country.country_code} (
                                          {country.phone_code})
                                        </option>
                                      ))}
                                    </Field>

                                    {/* Mobile Number Input */}
                                    <Field
                                      type="text"
                                      name="contact_number"
                                      className={`form-control ${
                                        touched.contact_number &&
                                        errors.contact_number
                                          ? "is-invalid"
                                          : ""
                                      }`}
                                      placeholder="Enter mobile number"
                                      value={
                                        rfqFormDataFromStore.contact_number?.replace(/^\+\d{1,4}-/, '') || ''
                                      }
                                      onChange={handleFormFieldChange}
                                      style={{ marginTop: "0px" }}
                                    />

                                    {touched.contact_number &&
                                      errors.contact_number && (
                                        <div className="invalid-feedback">
                                          {errors.contact_number}
                                        </div>
                                      )}
                                  </div>
                                </div>

                                <div className="col-md-6">
                                  {/* Company Name - Read Only */}
                                  <div className="mb-3">
                                  <label className="form-label fw-medium">Company Name</label>
                                    <input
                                      type="text"
                                      className="form-control bg-light"
                                    value={rfqFormDataFromStore.company_name || userProfile?.company_name || ""}
                                      disabled
                                    />
                                    <input
                                      type="hidden"
                                      name="company_name"
                                    value={rfqFormDataFromStore.company_name || userProfile?.company_name || ""}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="row mb-2">
                                <div className="col-md-4">
                                  <FormikField
                                    label="RFQ Type"
                                    value={rfqFormDataFromStore.rfq_type}
                                    enableHandleChange={true}
                                    handleChange={handleFormFieldChange}
                                    type="select"
                                    selectOptions={[
                                      { label: "Select RFQ Type", value: "" },
                                      {
                                        label: "Budgetary",
                                        value: "budgetary",
                                      },
                                      { label: "Firm", value: "firm" },
                                    ]}
                                    isRequired={false}
                                    name="rfq_type"
                                    touched={touched}
                                    errors={errors}
                                  />
                                </div>

                                <div className="col-md-4">
                                  <FormikField
                                    label="Procurement end date"
                                    value={rfqFormDataFromStore.bid_end_date}
                                    enableHandleChange={true}
                                    handleChange={handleFormFieldChange}
                                    type="date"
                                    isRequired={true}
                                    name="bid_end_date"
                                    touched={touched}
                                    errors={errors}
                                  />
                                </div>

                                <div className="col-md-4">
                                  <FormikField
                                    label="Reverse Auction"
                                    value={rfqFormDataFromStore.reverse_auction}
                                    defaultValue={0}
                                    enableHandleChange={true}
                                    handleChange={handleFormFieldChange}
                                    type="select"
                                    selectOptions={[
                                      { label: "Enable", value: 1 },
                                      { label: "Disable", value: 0 },
                                    ]}
                                    isRequired={true}
                                    name="reverse_auction"
                                    touched={touched}
                                    errors={errors}
                                  />
                                </div>

                                {rfqFormDataFromStore.reverse_auction === 1 && (
                                  <>
                                    <div className="col-md-6">
                                      <label className="form-label">
                                        Auction Start Date & Time <span className="text-danger">*</span>
                                      </label>
                                      <input
                                        type="datetime-local"
                                        name="ra_start_date"
                                        className="form-control"
                                        value={formatISOToDateTimeLocal(rfqFormDataFromStore.ra_start_date)}
                                        onChange={handleFormFieldChange}
                                        min={rfqFormDataFromStore.bid_end_date
                                               ? formatISOToDateTimeLocal(rfqFormDataFromStore.bid_end_date)
                                               : new Date().toISOString().slice(0, 16)
                                        }
                                      />
                                      {validationErrors.ra_start_date && (
                                          <div className="text-danger">{validationErrors.ra_start_date}</div>
                                      )}
                                    </div>
                                    <div className="col-md-6">
                                      <label className="form-label">
                                         Auction End Date & Time <span className="text-danger">*</span>
                                      </label>
                                      <input
                                        type="datetime-local"
                                        name="ra_end_date"
                                        className="form-control"
                                         value={formatISOToDateTimeLocal(rfqFormDataFromStore.ra_end_date)}
                                        onChange={handleFormFieldChange}
                                        min={
                                          rfqFormDataFromStore.ra_start_date
                                             ? formatISOToDateTimeLocal(rfqFormDataFromStore.ra_start_date)
                                            : ""
                                        }
                                         disabled={!rfqFormDataFromStore.ra_start_date}
                                      />
                                      {validationErrors.ra_end_date && (
                                         <div className="text-danger">{validationErrors.ra_end_date}</div>
                                      )}
                                    </div>
                                  </>
                                )}

                                <div className="col-md-12">
                                  <FormikField
                                    label="Delivery location"
                                    value={rfqFormDataFromStore.location}
                                    enableHandleChange={true}
                                    handleChange={handleFormFieldChange}
                                    type="text"
                                    isRequired={false}
                                    name="location"
                                    touched={touched}
                                    errors={errors}
                                  />
                                </div>
                              </div>

                              <button
                                type="submit"
                                className="btn btn-secondary mt-2 me-3"
                                disabled={!isValid}
                              >
                                Create RFQ
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary mt-2"
                                onClick={handleSaveDraft}
                                // fix here
                                // disabled={!isValid}
                              >
                                Save Changes
                              </button>
                            </Form>
                          )}
                        </Formik>
                        <p className="mt-2">
                          This action will send RFQs to all selected vendors for
                          the relevant product.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <ViewVendorModal
        productData={selectedProduct}
        updatableData={updatableData}
        isOpen={showModal.vendorModal}
          onClose={() => setShowModal(prev => ({
            ...prev,
            vendorModal: false,
          }))}
        onAdd={(item) => {
          const key = `${selectedProduct.product.id}`;
          const totalVendors = vendors?.[key]?.length ?? 0;
          
          const deletableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.deletable ?? []).length + 1;
          const addableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.addable ?? []).length;
          
          if (
            totalVendors + addableVendors - deletableVendors <= 0
          ) {
            toast.error(
              "At least one vendor is required for the product"
            );
            return;
          }
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                deletable: [
                    ...(prev.vendors?.[selectedProduct.product.id]
                      ?.deletable ?? []),
                  item.user_id,
                ],
              },
            },
            }))
          }
          }
        onRemove={(item) => {
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                deletable: (
                    prev.vendors?.[selectedProduct.product.id]?.deletable ??
                    []
                ).filter(
                  (deletableVendorId) => deletableVendorId != item.user_id
                ),
              },
            },
          }));
        }}
      />

      <AddVendorModal
        headerTitle={`Add Vendor in ${selectedProduct?.product?.name}`}
        vendors={addableVendors}
        productData={selectedProduct}
        updatableData={updatableData}
        isOpen={showModal.addVendorModal}
        onClose={() => {
          setShowModal(prev => ({...prev, addVendorModal: false}))
          setAddableVendors([]);
        }}
        addedVendorsList={(updatableData?.vendors?.[
          selectedProduct?.product?.id
        ]?.addable) ?? []}
        onAdd={(item) => {
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                addable: [
                  ...(prev.vendors?.[selectedProduct.product.id]?.addable ??
                    []),
                  item.id,
                ],
              },
            },
          }))
        }
        }
        onRemove={(item) => {
          const key = `${selectedProduct.product.id}`;
          const totalVendors = vendors?.[key]?.length ?? 0;
          
          const deletableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.deletable ?? []).length;
          const addableVendors = (updatableData.vendors?.[selectedProduct.product.id]?.addable ?? []).length - 1;
          
          if (
            totalVendors + addableVendors - deletableVendors <= 0
          ) {
            toast.error(
              "At least one vendor is required for the product"
            );
            return;
          }
          setUpdatableData((prev) => ({
            ...prev,
            vendors: {
              ...prev.vendors,
              [selectedProduct.product.id]: {
                ...(prev.vendors?.[selectedProduct.product.id] ?? {
                  product_id: selectedProduct.product.product_id,
                  variant: selectedProduct.product.variant,
                }),
                addable: (
                  prev.vendors?.[selectedProduct.product.id]?.addable ?? []
                ).filter((deletableVendorId) => deletableVendorId != item.id),
              },
            },
          }))
        }
        }
      />
    </>
  );
};


export default CreateRFQ;