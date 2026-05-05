import { useRouter } from "next/router";
import React, { useEffect, useInsertionEffect, useRef, useState } from "react";
import Item from "./Item";
import Select from 'react-select';
import { createRfq, saveDraft, getTerms, vendorApproveList, getDraftData, getDraftById, getDraftRfqSheets, getDraftRfqSheetWise, processMagicSearchDraft, getVendorsForRFQProduct, vendorTypes, getVendorsForProduct, getTechEvalUsers, refreshVendors } from "@/services/rfq";
import { Form, Formik, Field } from "formik";
import { CreateRFQSchema } from "@/utils/schema";
import FormikField from "@/components/shared/FormikField";
import Loader from "@/components/shared/Loader";
import { useDispatch, useSelector } from "react-redux";
import {
  intializeRfq,
  clearRfqState,
  setOtherFormFields,
  setTermsData,
  setTermFiles,
  setAllTerms,
  setStoreLoading,
  removeRfqProduct,
} from "@/redux/slice";
import Link from "next/link";
import { toast } from "react-toastify";
import { getProjectTableDataById, getProjectsByHospitalityContext, getProjectHospitalityContext, getRfqFilters } from "@/services/project";
import { getMyHospitalityContexts } from "@/services/hospitality";
import { getDepartments } from "@/services/rbac";
import { getApprovalProcesses } from "@/services/process";
import HotelFilter from "@/components/shared/HotelFilter";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { extractfileName, handleFileUpload, formatISOToDateTimeLocal, getDataWithLoading, getEntityLabel } from "@/utils/sharedFunctions";
import { Accordion } from "react-bootstrap";
import { getCountryCodes } from "@/services/cms";
import axiosInstance from "@/lib/axios";
import ViewVendorModal from "../editRFQ/ViewVendorModal";
import { subscriptionTypes, vendorConditions } from "../../vendor/searchConfig";
import { getProductMakeList } from "@/services/products";
import CommonFormInput from "@/components/shared/CommonFormInput";
import AddVendorModal from "../editRFQ/AddVendorModal";

import { BusinessTypes } from "@/utils/constants";

import CreateRFQModal from "./CreateRFQModal";
import ValidationErrorsDisplay from "./ValidationErrorsDisplay";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { BsArrowRepeat } from "react-icons/bs";
import { faTimesCircle } from "@fortawesome/free-regular-svg-icons";
import useModulePermissions from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import ReadOnlyBanner from "@/components/shared/ReadOnlyBanner";


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

export function cleanUpdatableData(updatableData) {
    const deletableIds = updatableData.products.deletable.map(String); // convert to strings for matching

    const cleanedUpdatable = {};
    let cleanVendors = {};

    // Iterate over each section inside updatable (e.g., specs, comment, files, etc.)
    for (const sectionKey in updatableData.products.updatable) {
      const section = updatableData.products.updatable[sectionKey];

      // Filter out entries whose keys are in the deletable list
      const filteredSection = Object.fromEntries(
        Object.entries(section).filter(([id]) => !deletableIds.includes(id))
      );

      cleanedUpdatable[sectionKey] = filteredSection;
    }

    const filteredVendors = Object.fromEntries(
      Object.entries(updatableData.vendors).filter(
        ([id]) => !deletableIds.includes(id)
      )
    );

    cleanVendors = filteredVendors;

    // Return a new object with cleaned updatable section
    return {
      ...updatableData,
      products: {
        ...updatableData.products,
        updatable: cleanedUpdatable,
      },
      vendors: cleanVendors,
    };
  }

const CreateRFQ = () => {
  const router = useRouter();
  const { draft_id, view_only } = router.query;
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [mainLoading, setMainLoading] = useState(false);

  const userProfile = useSelector((state) => state.userProfile);
  const [vendorApprovedList, setVendorApprovedList] = useState([]);
  const [rfqProducts, setRfqProducts] = useState([]);
  const [draftRfqId, setDraftRfqId] = useState(draft_id ? parseInt(draft_id) : -1);

  // Changes by Agnij 2025-08-05 [Added sheet filter state for RFQs created from magic search]
  const [isMagicRfq, setIsMagicRfq] = useState(false);
  const [sheetNameList, setSheetNameList] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [selectedSheetsForRFQ, setSelectedSheetsForRFQ] = useState([]);
  
  // Hospitality context states
  const [hospitalityContexts, setHospitalityContexts] = useState([]);
  const [userHotelMappings, setUserHotelMappings] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [processes, setProcesses] = useState([]);

  const storeLoading = useSelector((data) => data.storeLoading);
  const rfqDetails = useSelector((data) => data.rfq_id);
  const rfqProductsFromStore = useSelector((data) => data.rfqProducts);
  const rfqFormDataFromStore = useSelector((data) => data.rfqFormData);
  const allTerms = useSelector((data) => data.allTerms);
  const selectedTerms = useSelector((data) => data.rfqFormData.terms);
  const termFiles = useSelector((state) => state.rfqFormData.term_and_condition_files || []);
  // View-only mode: when viewing someone else's draft (linked via view_only=true)
  // Also verified against created_by once draft loads
  const isViewOnlyDraft = view_only === 'true' && draft_id && userProfile &&
    rfqFormDataFromStore?.created_by && String(rfqFormDataFromStore.created_by) !== String(userProfile.id);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [countryCode , setCountryCode] = useState ([]);
  const [ onecountrycode ,setonecountrycode] = useState("");
  const [showCreateConfirmModal, setShowCreateConfirmModal] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState(null);
  const [refreshingVendors, setRefreshingVendors] = useState(false);
  const [showRemoveProductConfirmModal, setShowRemoveProductConfirmModal] = useState(false);
  const [pendingProductToRemove, setPendingProductToRemove] = useState(null);
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
  const [viewProductFilter, setViewProductFilter] = useState({});
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
    vendorTypes: BusinessTypes,
    approvedBy: [],
    productMakes: {},
  })
  const [finalRFQValues, setFinalRFQValues] = useState(null);
  const [showRFQModal, setShowRFQModal] = useState(false);

  const rfqProductsRef = useRef({});
  const rfqFormDataRef = useRef({});

  const [validationErrors, setValidationErrors] = useState({});
  const [errorProducts, setErrorProducts] = useState(new Set());
  const [rfqFilters, setRfqFilters] = useState([]);
  const [techEvalUsers, setTechEvalUsers] = useState([]);

  // Permission management - fetch permissions based on selected hotels
  // Dynamic module key based on is_tender field (1 = tender, 0 = rfq)
  const moduleKey = rfqFormDataFromStore?.is_tender === 1 ? "boq" : "rfq";
  const {
    canRead,
    canUpdate,
    canCreate,
    loading: permissionsLoading,
  } = useModulePermissions({
    moduleKey: moduleKey,
    hotelIds: selectedHotelIds,
    enabled: selectedHotelIds.length > 0,
  });

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
  const fetchRfqFilters = async () =>{
   getRfqFilters(draft_id)
   .then((res=>{setRfqFilters(res.data.data || [])}))
   .catch((error)=>{
    toast.error(error.message);
   })
  }


  useEffect(() => {
    if(draft_id){
      fetchRfqFilters();
    }
  }, [draft_id]);

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

  const fetchHospitalityContexts = async () => {
    try {
      // Read user hotel mappings from profile
      const mappings = (userProfile?.hospitality_mappings || []).filter(m => m.hospitality_hotel_id != null);
      setUserHotelMappings(mappings);

      // Also fetch contexts for the company/hotel hierarchy dropdown
      const res = await getMyHospitalityContexts();
      const companiesData = res?.data || [];
      if (companiesData.length > 0) {
        const contexts = [];
        companiesData.forEach((company) => {
          contexts.push({ 
            label: company.name, 
            value: `company_${company.id}`, 
            type: 'company', 
            id: company.id 
          });
          if (company.hotels && company.hotels.length > 0) {
            company.hotels.forEach((hotel) => {
              contexts.push({ 
                label: `  └ ${hotel.name}`, 
                value: `hotel_${hotel.id}`, 
                type: 'hotel', 
                id: hotel.id,
                company_id: company.id 
              });
            });
          }
        });
        setHospitalityContexts(contexts);
      }
    } catch (error) {
      console.error("Error fetching hospitality contexts:", error);
    }
  }

  const fetchDepartments = async (hotelId = null) => {
    try {
      const resource = rfqFormDataFromStore?.is_tender === 1 ? 'boq' : 'rfq';
      const params = hotelId ? { hotel_id: hotelId, resource } : {};
      const response = await getDepartments(params);
      const depts = (response?.data?.data || response?.data || []).map((d) => ({
        value: d.id,
        label: d.title || d.name
      }));
      setDepartments(depts);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchProcesses = async () => {
    try {
      const response = await getApprovalProcesses();
      const procs = (response?.data?.data || response?.data || []).map((p) => ({
        value: p.id,
        label: p.name,
      }));
      setProcesses(procs);
    } catch (error) {
      console.error("Error fetching processes:", error);
    }
  };

  const handleHotelSelectionChange = (hotelIds) => {
    setSelectedHotelIds(hotelIds);

    if (!hotelIds || hotelIds.length === 0) {
      dispatch(setOtherFormFields({ field_name: "hotel_id", value: null }));
      dispatch(setOtherFormFields({ field_name: "hospitality_company_id", value: null }));
    } else {
      // If single hotel selected, set the hotel_id and company_id
      if (hotelIds.length === 1) {
        const selectedHotel = userHotelMappings.find(h => h.hospitality_hotel_id === hotelIds[0]);
        if (selectedHotel) {
          dispatch(setOtherFormFields({ field_name: "hotel_id", value: selectedHotel.hospitality_hotel_id }));
          dispatch(setOtherFormFields({ field_name: "hospitality_company_id", value: selectedHotel.hospitality_company_id }));
        }
      }
    }

    // Clear department selection when hotel changes since available departments may differ
    // (departments are re-fetched by the selectedHotelIds useEffect)
    dispatch(setOtherFormFields({ field_name: "department_id", value: null }));
    dispatch(setOtherFormFields({ field_name: "project_id", value: -1 }));
    setHasUnsavedChanges(true);
  }

  const handleHospitalityContextChange = (selectedOption) => {
    if (!selectedOption) {
      dispatch(setOtherFormFields({ field_name: "hospitality_company_id", value: null }));
      dispatch(setOtherFormFields({ field_name: "hotel_id", value: null }));
      return;
    }
    if (selectedOption.type === 'company') {
      dispatch(setOtherFormFields({ field_name: "hospitality_company_id", value: selectedOption.id }));
      dispatch(setOtherFormFields({ field_name: "hotel_id", value: null }));
    } else if (selectedOption.type === 'hotel') {
      dispatch(setOtherFormFields({ field_name: "hospitality_company_id", value: selectedOption.company_id }));
      dispatch(setOtherFormFields({ field_name: "hotel_id", value: selectedOption.id }));
    }
    dispatch(setOtherFormFields({ field_name: "project_id", value: -1 }));
    setHasUnsavedChanges(true);
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

 

  const getMakesProductWise = async (rfqProductId, product_id) => {
    try {
      if(initialFilterOptions.productMakes?.[rfqProductId]) return;

      const productMakes = await getProductMakeList(product_id);
      setInitialFilterOptions(prev => ({
        ...prev,
        productMakes: { ...prev.productMakes, [rfqProductId]: productMakes ?? [] }
      }))
    } catch (error) {
      throw error;
    }
  };


  // Profile details now come from Redux selector (userProfile)

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

    if (name === 'ra_start_date' && value && currentFormData.reverse_auction) {
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
            error = 'Auction Start Date must be at least one day after the Quote Submission End Date.';
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
    } else if (name === 'vendor_clarification_date' && value) {
        // Vendor Clarification Date Validation
        const clarificationDate = new Date(value);
        const publishDate = currentFormData.tender_publish_date
          ? new Date(currentFormData.tender_publish_date) : null;

        // Rule 1: Must be at least 5 minutes after tender publish date
        if (publishDate && (clarificationDate - publishDate) < 5 * 60 * 1000) {
          error = 'Vendor Clarification End Date must be at least 5 minutes after the Publish Date & Time.';
        }

        // Rule 2: Quote Submission End Date must be at least 24 hours after Clarification
        if (!error && bidEndDate) {
          const diffInHours = (bidEndDate - clarificationDate) / (1000 * 60 * 60);
          if (diffInHours < 24) {
            error = 'Quote Submission End Date must be at least 24 hours after the Vendor Clarification End Date.';
          }
        }
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
      // Warn if existing clarification date becomes invalid
      if (value && rfqFormDataFromStore.vendor_clarification_date) {
        const bidEndDate = new Date(value);
        const clarificationDate = new Date(rfqFormDataFromStore.vendor_clarification_date);
        const diffInHours = (bidEndDate - clarificationDate) / (1000 * 60 * 60);
        if (diffInHours < 24) {
          toast.warning("Quote Submission End Date must be at least 24 hours after the Vendor Clarification End Date. Please update one of them.");
        }
      }
    }

    // Tender Publish Date validation
    if (name === "tender_publish_date" && value) {
      const publishDate = new Date(value);
      if ((publishDate - new Date()) < 5 * 60 * 1000) {
        toast.error("Publish Date & Time must be at least 5 minutes from now.");
        return;
      }
      // Warn if clarification date becomes invalid when tender publish date changes
      if (rfqFormDataFromStore.vendor_clarification_date) {
        const clarificationDate = new Date(rfqFormDataFromStore.vendor_clarification_date);
        if ((clarificationDate - publishDate) < 5 * 60 * 1000) {
          toast.warning("Vendor Clarification End Date is now invalid. Please update it.");
        }
      }
    }

    // Vendor Clarification Date validation
    if (name === "vendor_clarification_date" && value) {
      const clarificationDate = new Date(value);

      // Rule 1: Must be at least 5 minutes after tender publish date
      if (rfqFormDataFromStore.tender_publish_date) {
        const publishDate = new Date(rfqFormDataFromStore.tender_publish_date);
        if ((clarificationDate - publishDate) < 5 * 60 * 1000) {
          toast.error("Vendor Clarification End Date must be at least 5 minutes after the Publish Date & Time.");
          return;
        }
      }

      // Rule 2: Quote Submission End Date must be at least 24 hours after Clarification
      if (rfqFormDataFromStore.bid_end_date) {
        const bidEndDate = new Date(rfqFormDataFromStore.bid_end_date);
        const diffInHours = (bidEndDate - clarificationDate) / (1000 * 60 * 60);
        if (diffInHours < 24) {
          toast.error("Quote Submission End Date must be at least 24 hours after the Vendor Clarification End Date.");
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

    if (name === "is_tender") {
      value = parseInt(value);
    if (value === 0) {
      dispatch(setOtherFormFields({ field_name: "tender_fees", value: 0 }));
    }
    }

  if (name === "tender_fees") {
    const numericValue = parseFloat(value || 0);
    const paise = isNaN(numericValue) ? 0 : Math.max(0, Math.round(numericValue * 100));
    dispatch(setOtherFormFields({ field_name: "tender_fees", value: paise }));
    setHasUnsavedChanges(true);
    return;
  }

    // Handle datetime-local inputs for auction and tender dates
    if ((name === 'bid_end_date' || name === 'ra_start_date' || name === 'ra_end_date' || name === 'tender_publish_date' || name === 'vendor_clarification_date') && value) {
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
          dispatch(
            setOtherFormFields({
              field_name: "term_and_condition_files",
              value: projectData.files
                ? projectData.files
                    .filter((file) => file.file_type === "tc")
                    .map((file) => (file.file_url))
                : [],
            })
          );

        } else {
          console.error("Project data is empty or undefined.");
        }
      } catch (error) {
        console.error("Failed to handle project_id change:", error.message);
      }

      // Fetch tech eval users for the selected project
      try {
        const res = await getTechEvalUsers(value);
        setTechEvalUsers(res || []);
      } catch (err) {
        toast.error("Failed to fetch technical evaluation users");
        setTechEvalUsers([]);
      }
    }

    if (name === "project_id" && (value === -1 || value === "" || value === null)) {
      setTechEvalUsers([]);
    }

    dispatch(setOtherFormFields({ field_name: name, value }));
    setHasUnsavedChanges(true);
  };

  const handleTechEvalUserChange = (e) => {
    const value = e.target.value;
    const parsedValue = value ? Number(value) : null;
    setHasUnsavedChanges(true);
  };


//If the length of Term Files is greater than 0, set termFilesChanged to true or else false  
useEffect(() => {
  
  setTermFilesChanged(termFiles.length > 0);
}, [termFiles]);


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

  const validateRFQFields = (values) => {
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
        return false;
      }
      
      if (!formDataCopy.ra_end_date || formDataCopy.ra_end_date === '') {
        toast.error("Please set the Auction End Date & Time for reverse auction");
        setMainLoading(false);
        return false;
      }
    }

    // Project is optional - no validation needed

    // Department is required when departments are available
    if (departments.length > 0 && !formDataCopy.department_id) {
      toast.error("Please select a department");
      setMainLoading(false);
      return false;
    }

    // Process is required for RFQ creation
    if (!formDataCopy.process_id) {
      toast.error("Please select a process");
      setMainLoading(false);
      return false;
    }

    // Publish Date & Time is required and must be at least 5 minutes from now
    if (!formDataCopy.tender_publish_date) {
      toast.error("Please select Publish Date & Time");
      setMainLoading(false);
      return false;
    }
    const publishDate = new Date(formDataCopy.tender_publish_date);
    if ((publishDate - new Date()) < 5 * 60 * 1000) {
      toast.error("Publish Date & Time must be at least 5 minutes from now.");
      setMainLoading(false);
      return false;
    }

    // Vendor Clarification End Date is required and must be at least 5 minutes after publish
    if (!formDataCopy.vendor_clarification_date) {
      toast.error("Please select Vendor Clarification End Date");
      setMainLoading(false);
      return false;
    }
    const clarificationDate = new Date(formDataCopy.vendor_clarification_date);
    if ((clarificationDate - publishDate) < 5 * 60 * 1000) {
      toast.error("Vendor Clarification End Date must be at least 5 minutes after the Publish Date & Time.");
      setMainLoading(false);
      return false;
    }

    // Quote Submission End Date is required and must be at least 24 hours after clarification
    if (!formDataCopy.bid_end_date) {
      toast.error("Please select Quote Submission End Date");
      setMainLoading(false);
      return false;
    }
    const bidEndDate = new Date(formDataCopy.bid_end_date);
    if ((bidEndDate - clarificationDate) < 24 * 60 * 60 * 1000) {
      toast.error("Quote Submission End Date must be at least 24 hours after the Vendor Clarification End Date.");
      setMainLoading(false);
      return false;
    }

    return true
  }

  const handleCreateRFQ = (values) => {
    setErrorProducts(new Set());
    setMainLoading(true);
    setHasUnsavedChanges(false);

    // Use values from the form submission
    const mobileNumber = values.contact_number.trim().replace(/^0+/, "");
    const fullMobile = `${onecountrycode}-${mobileNumber}`;
    
    // Deep clone the form data to avoid direct mutation
    const formDataCopy = JSON.parse(JSON.stringify(rfqFormDataRef.current));

    // Remove spurious keys that are not expected by the backend
    delete formDataCopy.value;
    delete formDataCopy.created_by;

    // Ensure company_name is included from either form values, Redux store, or user profile
    formDataCopy.company_name = values.company_name || formDataCopy.company_name || userProfile?.company_name || "";

    // Ensure bid_end_date is in server expected format (YYYY-MM-DD HH:MM:SS)
    if (formDataCopy.bid_end_date && !formDataCopy.bid_end_date.includes(' ')) {
      if (formDataCopy.bid_end_date.includes('T')) {
        const [date, time] = formDataCopy.bid_end_date.split('T');
        formDataCopy.bid_end_date = `${date} ${time}`;
      }
    }

    // Changes by Agnij 2025-05-03 [Validate reverse auction dates without default values]
    if (formDataCopy.reverse_auction === 1) {
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
    
    // Handle tender-specific fields
    if (formDataCopy.is_tender === 0 || !formDataCopy.is_tender) {
      formDataCopy.tender_fees = 0;
      // tender_publish_date and vendor_clarification_date are now supported for both RFQs and tenders
    } else if (formDataCopy.is_tender === 1) {
      // Ensure entered tender_fees from store is used; use 0 when cleared (null)
      formDataCopy.tender_fees = rfqFormDataFromStore.tender_fees != null ? rfqFormDataFromStore.tender_fees : (formDataCopy.tender_fees ?? 0);
      // rfq_type (Firm/Budgetary) is not applicable for tenders
      delete formDataCopy.rfq_type;
    }
    
    // IMPORTANT: Normalize terms to ensure proper format for backend
    if (formDataCopy.terms && Array.isArray(formDataCopy.terms)) {
      formDataCopy.terms = formDataCopy.terms.map(term => ({
        id: Number(term.id), // Convert to number for backend
        name: term.name // Only include id and name
      }));
    }

    const filters = getRefinedFilters();
    const cleanedUpdatableData = cleanUpdatableData(updatableData);
    
    let payload = {
      rfq_id: rfqDetails,
      ...formDataCopy,
      project_id: formDataCopy.project_id || -1,
      contact_number: fullMobile,
      updatableData: cleanedUpdatableData,
      filters,
      termsChanged,
      termFilesChanged,
      hotel_ids: selectedHotelIds,
    };

    console.log("PAYLOAD:", payload);

    // Remove country_code if it exists
    if (payload.hasOwnProperty("country_code")) {
      delete payload.country_code;
    }

    if(selectedSheet && selectedSheet.value) {
      payload.sheet_id = selectedSheet.value;
    }

    setShowRFQModal(false);

    createRfq(payload)
      .then((res) => {
        setMainLoading(false);
        toast.success(
          <h6>
            <b>{getEntityLabel(rfqFormDataFromStore?.is_tender)} #{res.data.rfq_no}:</b> Successfully created!
          </h6>,
          { position: "top-right" }
        );
        setUpdatableData({
          products: {
            addable: [],
            deletable: [],
            updatable: {},
          },
          vendors: {},
        })
        setErrorProducts(new Set()); // Ensure cleared after create
        setHasUnsavedChanges(false);
        rfqProductsRef.current = [];
        rfqFormDataRef.current = {};

        router.push("/dashboard/buyer/rfq-management");
        dispatch(clearRfqState());
      })
      .catch((err) => {
        setMainLoading(false);
        setHasUnsavedChanges(true);
        
        const errorData = err?.message?.response?.data;
        const errorMessage = errorData?.message || `Failed to create ${getEntityLabel(rfqFormDataFromStore?.is_tender)}. Please check your form and try again.`;

        if (errorData?.status === 2 && Array.isArray(errorData.details)) {
          const missingVendorIds = errorData.details.map(d => d.rfqProductId);
          setErrorProducts(new Set(missingVendorIds));
          toast.error(errorMessage);
        } else {
          toast.error(errorMessage);
        }
      });
  };

  const handleCreateConfirm = () => {
    if (pendingFormValues) {
      handleCreateRFQ(pendingFormValues);
      setShowCreateConfirmModal(false);
      setPendingFormValues(null);
    }
  };

  const handleCreateCancel = () => {
    setShowCreateConfirmModal(false);
    setPendingFormValues(null);
  };

  const getRefinedFilters = () => {
    const filters = vendorFilters;

    let updatedFilters = {
      global: {},
      local: {},
    };

    if (filters) {
      Object.entries(filters.global).forEach(([filterKey, filter]) => {
        updatedFilters.global[filterKey] = Array.isArray(filter) ? filter.map(value => value.value) : filter;
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

  const refreshVendorCounts = async (productIds = []) => {
    if (!productIds || productIds.length === 0) return;
    try {
      await Promise.all(
        productIds.map((productId) => fetchVendorsForProduct(productId, true))
      );
    } catch (error) {
      console.error("Failed to refresh vendor counts:", error);
    }
  };

  // Generic helpers: get a spec field value (checks updatableData first, then product.spec(s), then direct prop)
  const getSpecFieldValue = (product, fieldName) => {
    // 1) updatableData (Item writes here)
    const specsUp = updatableData?.products?.updatable?.specs?.[product.id];
    if (specsUp) {
      // try several key variants
      const candidates = [fieldName, fieldName.toLowerCase(), fieldName.charAt(0).toUpperCase() + fieldName.slice(1)];
      for (const k of candidates) {
        if (Object.prototype.hasOwnProperty.call(specsUp, k)) return specsUp[k];
      }
      // also try any key that case-insensitively matches
      for (const k of Object.keys(specsUp)) {
        if (k.toLowerCase() === fieldName.toLowerCase()) return specsUp[k];
      }
    }

    // 2) product.spec or product.specs array of { title|label, value }
    const pSpecs = product?.spec || product?.specs;
    if (Array.isArray(pSpecs)) {
      const found = pSpecs.find((s) => ((s.title || s.label || "").toLowerCase() === fieldName.toLowerCase()));
      if (found) return found.value ?? found.val ?? "";
    }

    // 3) direct property on product (e.g., product.quantity or product.unit)
    const directKey = fieldName.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(product, directKey)) return product[directKey];

    return undefined;
  };

  const isSpecFieldEmpty = (product, fieldName) => {
    const v = getSpecFieldValue(product, fieldName);
    return v === undefined || v === null || v === "" || v === "NAN" || v === "NA" || v === "N/A";
  };

  // list any spec keys you want validated on Save Changes
  const specFieldsToValidate = ["quantity", "unit"]; 
  // highlight when Save Changes clicked and any *active* product has any specified empty field
  // skip products that are marked deletable (removed from RFQ)
  const hasEmptySpecFields = rfqProducts.some(
    (p) =>
      !updatableData.products.deletable.includes(p.id) &&
      specFieldsToValidate.some((f) => isSpecFieldEmpty(p, f))
  );

  const handleSaveDraft = async () => {
    setMainLoading(true);

    const contactNumber = rfqFormDataRef?.current?.contact_number?.trim();
    const parts = contactNumber?.includes('-') ? contactNumber?.split('-') : [contactNumber];
    const cleanedNumber = parts[parts.length - 1];    
    const fullMobile = `${onecountrycode}-${cleanedNumber}`;

    // Deep clone the form data to avoid direct mutation
    const formDataCopy = JSON.parse(JSON.stringify(rfqFormDataRef.current));

    // Remove spurious 'value' key that is not expected by the backend
    delete formDataCopy.value;

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
    // Ensure entered tender_fees from store is used when saving draft; use 0 when cleared (null)
    if (formDataCopy.is_tender === 1) {
      formDataCopy.tender_fees = rfqFormDataFromStore.tender_fees != null ? rfqFormDataFromStore.tender_fees : (formDataCopy.tender_fees ?? 0);
    }

    const filters = getRefinedFilters();
    const cleanedUpdatableData = cleanUpdatableData(updatableData);

    const payload = {
      ...formDataCopy, // Use the filtered copy
      rfq_id: rfqDetails,
      contact_number: fullMobile,
      sheet_id: selectedSheet?.value,
      updatableData: cleanedUpdatableData,
      filters,
      termsChanged,
      termFilesChanged,
      selectedSheets: selectedSheetsForRFQ,
      hotel_ids: selectedHotelIds || [],
    };
    const affectedVendorProductIds = Object.keys(
      updatableData?.vendors || {}
    );

    try {
      const res = await saveDraft(payload);
      setMainLoading(false);
      await getDraftInitialData();
      await refreshVendorCounts(affectedVendorProductIds);
      if(activeKey) {
        for(const key of activeKey) {
          const rfqProductId = key;
          await fetchVendorsForProduct(rfqProductId, true);
        }
      }
      setUpdatableData({
        products: {
          addable: [],
          deletable: [],
          updatable: {},
        },
        vendors: {},
      })
      toast.success(
        <h6>
          <b>{getEntityLabel(rfqFormDataFromStore?.is_tender)} Draft #{res.message?.rfq?.rfq_no}:</b> Changes saved successfully!
        </h6>,
        { position: "top-right" }
      );
      setErrorProducts(new Set());
      setHasUnsavedChanges(false);
      
      // Don't reload or redirect, just update the local state if needed
      if (res.message?.rfq_id && !rfqDetails) {
        // If this is a new draft and we got an ID back, update it locally
        dispatch(setOtherFormFields({ rfq_id: res.message.rfq_id }));
      }

      // 🔥 Reload the page after a short delay so the toast is visible
    setTimeout(() => {
      window.location.reload();
    }, 800);

    } catch (error) {
      setMainLoading(false);
      
      const errorData = error?.message?.response?.data;
      const errorMessage = errorData?.message || errorData?.errors?.message || "Failed to save draft. Please try again.";

      if (errorData?.errors?.details && Array.isArray(errorData.errors.details)) {
        const missingVendorIds = errorData.errors.details.map(d => d.rfqProductId);
        setErrorProducts(new Set(missingVendorIds));
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
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
            toast.error(`Failed to load sheet data for this ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`);
          }
        }
        
        if (sheetData && sheetData.length > 0) {
          const sheetOptions = sheetData.map(sheet => ({
            label: sheet.sheet_name,
            value: sheet.id,
            is_processed: sheet.is_processed,
            validation_errors: sheet.validation_errors,
          }));
          setSheetNameList(sheetOptions);
          
          // Set default selected sheet
          if (sheetData.length > 0) {
            const defaultSheet = sheetOptions[0];
            if(queryMeta.sheet_id) {
              const sheet = sheetOptions.find(sheet => sheet.value == queryMeta.sheet_id)
              setSelectedSheet(sheet);
            } else if (!selectedSheet)
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

          //  set selected hotel ids 
          const getSelectedHotelIds = draftRes?.data?.mappedHotels.map((item)=> item.hotel_id);
          setSelectedHotelIds(getSelectedHotelIds);
      
          setonecountrycode(extractedCountryCode);
        }
        dispatch(intializeRfq(draftRes.data));
        draftRes.data.rfq_products
          .map((product) => product.id)
          .forEach((productId) => {
            setViewProductFilter((prev) => ({
              ...prev,
              [productId]: false,
            }));
          });

        // Update document title
        document.title = `Edit Draft ${getEntityLabel(rfqFormDataFromStore?.is_tender)} #${id}`;
        
        // Set up other form-related data
        getTermsData();
      } else {
        console.error("No data found in draft response");
        toast.error(`Failed to load draft ${getEntityLabel(rfqFormDataFromStore?.is_tender)} data`);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error loading draft by ID:", error);
      // Changes by Agnij 2025-06-17 [Improved error message with specific details]
      toast.error(error.message || `Error loading draft ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`);
    } finally {
      dispatch(setStoreLoading(false));
    }
  };

  const getDraftInitialData = async () => {
    dispatch(clearRfqState());
    dispatch(setStoreLoading(true));
    try {
      // If a draft_id is provided in the URL, load that specific draft
      let draftRes;
      
      if (draftRfqId && draftRfqId !== -1) {
        draftRes = await getDraftById(draftRfqId, selectedSheet?.value);
        console.log("DRAFT PRODUCTS: ", draftRes.data.products)
        document.title = `Edit Draft ${getEntityLabel(rfqFormDataFromStore?.is_tender)} #${draftRfqId}`;

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
              toast.error(`Failed to load sheet data for this ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`);
            }
          }
          
          if (sheetData && sheetData.length > 0) {
            const sheetOptions = sheetData.map(sheet => ({
              label: sheet.sheet_name,
              value: sheet.id,
              validation_errors: sheet.validation_errors,
            }));
            setSheetNameList(sheetOptions);
            
            // Set default selected sheet
            if (sheetData.length > 0) {
              const defaultSheet = sheetOptions[0];
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
        document.title = `Create New ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`;
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

      // Fetch tech eval users if project is already selected
      const projectId = draftRes?.data?.rfq_form_data?.project_id;
      if (projectId && projectId !== -1 && projectId !== "") {
        try {
          const teRes = await getTechEvalUsers(projectId);
          setTechEvalUsers(teRes?.data || []);
        } catch (err) {
          toast.error("Failed to fetch technical evaluation users");
        }
      }

    } catch (error) {
      toast.error(error.message || `Error loading draft ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`);
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
    
    dispatch(clearRfqState());

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

  const handleRefreshVendors = async () => {
    if (!rfqDetails || rfqDetails === -1) return;
    try {
      setRefreshingVendors(true);
      const response = await refreshVendors(rfqDetails);
      const result = response?.data || response;

      const totalAdded = result?.data?.totalAdded || 0;
      if (totalAdded > 0) {
        toast.info(`${totalAdded} new vendor${totalAdded > 1 ? 's' : ''} found`);
      } else {
        toast.info('No additional vendors found');
      }

      if (result?.data?.productsWithNoVendors?.length > 0) {
        const names = result.data.productsWithNoVendors
          .map(p => p.product_name).filter(Boolean).join(', ');
        toast.warn(`Products without vendors: ${names || 'some products'}`);
      }

      // Clear stale error/vendor states before reloading
      setErrorProducts(new Set());
      setVendors({});

      await getDraftInitialData();
    } catch (error) {
      console.error("Error refreshing vendors:", error);
      toast.error("Failed to refresh vendors. Please try again.");
    } finally {
      setRefreshingVendors(false);
    }
  };

  const handleRemoveProduct = (product) => {
    if (
      updatableData.products.deletable.length + 1 ===
      rfqProducts?.length
    )
      toast.warning(
        `You cannot delete all products from ${getEntityLabel(rfqFormDataFromStore?.is_tender)}, at least one product is required`
      );
    else {
      setPendingProductToRemove(product);
      setShowRemoveProductConfirmModal(true);
    }
  };

  const handleRemoveProductConfirm = () => {
    if (!pendingProductToRemove) return;

    // If the product does NOT have a persisted RFQ product id yet,
    // remove it directly from the Redux rfqProducts list using product_id + variant.
    if (!pendingProductToRemove.id) {
      dispatch(
        removeRfqProduct({
          product_id: pendingProductToRemove.product_id,
          variant: pendingProductToRemove.variant,
        })
      );
    } else {
      // For existing RFQ products (with an id), mark them as deletable so
      // they are hidden in UI and sent to backend in updatableData.deletable.
      setUpdatableData((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          deletable: [
            ...(prev.products?.deletable ?? []),
            pendingProductToRemove.id,
          ],
        },
      }));
    }

    setHasUnsavedChanges(true);
    setShowRemoveProductConfirmModal(false);
    setPendingProductToRemove(null);
  };

  const handleRemoveProductCancel = () => {
    setShowRemoveProductConfirmModal(false);
    setPendingProductToRemove(null);
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
    setHasUnsavedChanges(true);
  };

  const fetchAvailableVendorsForProduct = async (searchTerm = null) => {
      if(!selectedProduct || !selectedProduct.product) return;

      const key = `${selectedProduct.product.id}`;
  
      try {
        const body = {
          productId: selectedProduct.product.product_id,
          excludeIds: vendors?.[key]?.map(vendor => vendor.user_id) ?? [],
          searchTerm,
        }
        const response = await getVendorsForProduct(body)
        setAddableVendors(response.data)
      } catch (error) {
        toast.error(error.message)
      }
    }

  const handleSyncApplyToOtherVariants = async () => {
    const sourceRfqProductId = selectedProduct.product.id?.toString();
    if (!sourceRfqProductId) return;

    const sourceVendorData = updatableData.vendors?.[sourceRfqProductId];

    const sourceDeletable = sourceVendorData?.deletable || [];
    const sourceAddable = sourceVendorData?.addable || [];
    const productId = selectedProduct.product?.product_id;

    // Ensure current vendors of source are loaded
    let sourceCurrentVendors = vendors[sourceRfqProductId];
    if (!sourceCurrentVendors) {
      sourceCurrentVendors = await fetchVendorsForProduct(sourceRfqProductId);
    }

    // Simulate updated source vendor list
    const updatedSourceVendors = [
      ...sourceCurrentVendors
        .filter(v => !sourceDeletable.includes(v.user_id)),
      ...sourceAddable.map(id => ({ user_id: id }))
    ];

    const updatedSourceVendorIds = updatedSourceVendors.map(v => v.user_id);

    for (const rfqProduct of rfqProducts) {
      if (
        rfqProduct.product_id === productId &&
        rfqProduct.id.toString() !== sourceRfqProductId
      ) {
        const otherRfqProductId = rfqProduct.id.toString();

        // Ensure current vendors of target loaded
        let currentVendors = vendors[otherRfqProductId];
        if (!currentVendors) {
          currentVendors = await fetchVendorsForProduct(otherRfqProductId);
        }

        const currentVendorIds = currentVendors.map(v => v.user_id);

        // Vendors that should be added to sync
        const syncAddable = updatedSourceVendorIds.filter(
          id => !currentVendorIds.includes(id)
        );

        // Vendors that should be removed to sync (those in current but not in updated source)
        const syncDeletable = currentVendorIds.filter(
          id => !updatedSourceVendorIds.includes(id)
        );

        // Ensure updatableData entry exists
        if (!updatableData.vendors[otherRfqProductId]) {
          updatableData.vendors[otherRfqProductId] = {
            product_id: rfqProduct.product_id,
            variant: rfqProduct.variant,
            deletable: [],
            addable: [],
          };
        }

        const otherVendorData = updatableData.vendors[otherRfqProductId];

        otherVendorData.deletable = [];
        otherVendorData.addable = [];

        otherVendorData.deletable = syncDeletable;
        otherVendorData.addable = syncAddable;
      }
    }
    toast.info("Success! The change has been applied across all product variants.");

  };


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
  // Vendor filters removed - vendors are auto-added for all modes
  const generateDynamicFilter = (product = null) => {
    return null;
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
        <div className="w-100 d-flex flex-column gap-2 align-items-end mb-3">
          {product && rfqFormDataFromStore?.is_tender !== 1 && (
            <button
              className="minimal-btn"
              style={{ width: "fit-content" }}
              onClick={() =>
                setViewProductFilter((prev) => ({
                  ...prev,
                  [product.id]: !prev[product.id],
                }))
              }
            >
              {viewProductFilter[product.id] ? "Close" : "Open"} Filter
            </button>
          )}
          {(!product || viewProductFilter[product.id]) && (
            <div className="w-100 mb-2">
              <div className=" d-flex justify-content-between align-items-end w-100">
                <div className="row g-3" style={{ width: "100%" }}>
                  <div className="col-md-3">
                    <CommonFormInput
                      id={`country_filter_${product ? product.id : 'global'}-vendor_filters-create_rfq_page`}
                      isMulti={true}
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
                      id={`state_filter_${product ? product.id : 'global'}-vendor_filters-create_rfq_page`}
                  disabled={
                        !getFilterValue("country") ||
                        getFilterValue("country").length <= 0
                      }
                      isMulti={true}
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
                      id={`city_filter_${product ? product.id : 'global'}-vendor_filters-create_rfq_page`}
                  disabled={
                        !getFilterValue("country") ||
                        getFilterValue("country").length <= 0
                      }
                      isMulti={true}
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
                      id={`my_vendors_filter_${product ? product.id : 'global'}-vendor_filters-create_rfq_page`}
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
                      id={`vendor_types_filter_${product ? product.id : 'global'}-vendor_filters-create_rfq_page`}
                  isMulti={true}
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
                      id={`previously_worked_filter_${product ? product.id : 'global'}-vendor_filters-create_rfq_page`}
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
                     id={`vendor_approved_by_filter_${product ? product.id : 'global'}-vendor_filters-create_rfq_page`}
                   isMulti={true}
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
                  <div className="col-md-3">
                    <div className="form-group mb-3">
                      <div className="d-flex gap-2">
                        <label
                          htmlFor="subscriptionType"
                          className="form-label"
                          style={{
                            fontWeight: 500
                          }}
                          >
                          Premium Vendors
                        </label>
                        {getFilterValue("subscription_type") != null && (
                          <Link
                            href="#"
                            className="clearFilter"
                            onClick={(e) => {e.preventDefault(); forwardFilterUpdate(null, { name: "subscription_type" })}}
                          >
                            <FontAwesomeIcon icon={faTimesCircle} /> clear
                          </Link>
                        )}
                      </div>
                      <div className="d-flex gap-1">
                        <input
                          type="radio"
                          style={{width: "fit-content", height: "fit-content", marginRight: "4px", marginTop: "4px"}}
                          name="subscriptionType"
                          id={`subscription-premium`}
                          value={"premium"}
                          checked={getFilterValue("subscription_type")?.value == "premium"}
                          onChange={(e) => {
                            const selectedValue = e.target.value;
                            const selected = subscriptionTypes.find(
                              (option) => option.value == selectedValue
                            );

                            if (selected) {
                              forwardFilterUpdate(selected, { name: "subscription_type" })
                            }
                          }}
                        />
                        <div className="d-flex flex-column">
                          <label
                            className="form-check-label"
                            htmlFor={`subscription-permium`}
                          >
                            Get Guaranteed Quote in 24 Hours
                          </label>
                          {/* <small className="text-muted">(in 24 Hours)</small> */}
                        </div>
                      </div>
                    </div>
                    {/* <CommonFormInput
                     id={`subscription_type_filter_${product ? product.id : 'global'}-vendor_filters-create_rfq_page`}
                      type="select"
                      options={subscriptionTypes}
                      name="subscription_type"
                      label="Subscription Type"
                      labelBold
                      placeholder="Select"
                      values={getFilterValue("subscription_type")}
                      onChange={(newVal, action) =>
                        forwardFilterUpdate(newVal, action)
                      }
                    /> */}
                  </div>
                  {!isGlobalFilter && (
                    <div className="col-md-3">
                      <CommonFormInput
                     id={`product_makes_filter_${product ? product.id : 'global'}-vendor_filters-create_rfq_page`}
                     isMulti={true}
                        type="multiselect"
                        options={
                          initialFilterOptions.productMakes?.[product.id]
                            ? initialFilterOptions.productMakes[product.id].map(
                                (item) => ({
                                  label: item.make_name,
                                  value: item.make_name,
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
          )}
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
      getVendorApproveList();
      fetchCountryCodes();
      fetchHospitalityContexts();
      fetchProcesses();
    } catch (error) {
      console.log("SOMETHING WENT WRONG DURING INITIAL FETCHING");
      toast.error(error.message)
    }
  }, []);

  // Fetch departments scoped to the selected hotel (covers manual selection, draft loading, auto-selection)
  // Skip when no hotel is selected — department dropdown won't show until hotel is chosen anyway
  useEffect(() => {
    if (selectedHotelIds && selectedHotelIds.length > 0) {
      fetchDepartments(selectedHotelIds[0]);
    }
  }, [selectedHotelIds]);
  // Watch for changes in the draft_id from URL
  useEffect(() => {
    // Changes by Agnij 2025-06-17 [Reset state when draft_id changes]
    // If no draft_id is present, clear state and force a fresh draft
    if (!draft_id) {
      dispatch(clearRfqState());
      // Create a fresh draft
      const loadFreshDraft = async () => {
        dispatch(setStoreLoading(true));
        try {
          const draftRes = await getDraftData(true);
          dispatch(intializeRfq(draftRes.data));
          document.title = `Create New ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`;
          getTermsData();
        } catch (error) {
          console.error("Error creating fresh draft:", error);
          toast.error(error.message || `Error creating fresh ${getEntityLabel(rfqFormDataFromStore?.is_tender)} draft`);
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
          
          dispatch(clearRfqState());
          
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

  useEffect(() => {
    if (selectedSheet) setSelectedSheetsForRFQ([selectedSheet.value]);
  }, [selectedSheet]);

  // Handle permission loading state
  if (permissionsLoading && selectedHotelIds.length > 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
        <Loader size="lg" />
        <span className="ms-2">Checking permissions...</span>
      </div>
    );
  }

  // Handle access denied (no create/update permission for drafts)
  // For new RFQs we check canCreate, for existing drafts we check canUpdate
  // View-only drafts (someone else's) are always read-only regardless of RBAC permissions
  const hasPermission = isViewOnlyDraft ? false : (draft_id ? (canUpdate || canCreate) : canCreate);
  if (!isViewOnlyDraft && selectedHotelIds.length > 0 && !permissionsLoading && !hasPermission && !canRead) {
    return (
      <AccessDeniedPage
        title="Access Denied"
        message="You do not have permission to create or edit this for the selected business units."
        backUrl="/dashboard/buyer/rfq-management"
        backLabel="Back to RFQ Management"
      />
    );
  }

  const formatLocalDateTime = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const minPublishDate = formatLocalDateTime(new Date(Date.now() + 5 * 60 * 1000));
  const minClarificationDate = rfqFormDataFromStore.tender_publish_date
    ? formatLocalDateTime(new Date(new Date(rfqFormDataFromStore.tender_publish_date).getTime() + 5 * 60 * 1000))
    : minPublishDate;
  const minBidEndDate = rfqFormDataFromStore.vendor_clarification_date
    ? formatLocalDateTime(new Date(new Date(rfqFormDataFromStore.vendor_clarification_date).getTime() + 24 * 60 * 60 * 1000))
    : minPublishDate;

  const STEPS = [
    { id: 1, label: 'Products' },
    { id: 2, label: 'Basics' },
    { id: 3, label: 'Contact' },
    { id: 4, label: 'Timeline' },
    { id: 5, label: 'Reverse Auction' },
    { id: 6, label: 'Delivery' },
    { id: 7, label: 'Terms' },
    { id: 8, label: 'Review' },
  ];

  return (
    <>
      {(mainLoading || storeLoading) && <Loader />}

      <div className="create-rfq-page">
        {/* Page header — "Create RFQ for [hotels]" */}
        <header className="rfq-page-header">
          <h1 className="rfq-page-header__title">
            Create {getEntityLabel(rfqFormDataFromStore.is_tender)}
            {selectedHotelIds.length > 0 && userHotelMappings.length > 0 && (
              <>
                {" for "}
                <span className="rfq-page-header__hotels">
                  {userHotelMappings
                    .filter(m => selectedHotelIds.includes(m.hospitality_hotel_id))
                    .map(m => m.hotel_name)
                    .join(", ")}
                </span>
              </>
            )}
          </h1>
          {userHotelMappings.length > 0 && selectedHotelIds.length === 0 && (
            <div className="rfq-page-header__hotel-picker">
              <label className="rfq-label">Business Units <span className="rfq-required">*</span></label>
              <Select
                id="select_hotels-create_rfq_page"
                isMulti
                options={userHotelMappings}
                value={[]}
                onChange={(selectedOptions) => {
                  const ids = selectedOptions ? selectedOptions.map(opt => opt.hospitality_hotel_id) : [];
                  handleHotelSelectionChange(ids);
                }}
                placeholder="Select Business Units..."
                closeMenuOnSelect={false}
                classNamePrefix="react-select"
                isClearable
                formatOptionLabel={(option) => (<div><span>{option.hotel_name}</span></div>)}
                getOptionValue={(option) => option.hospitality_hotel_id}
              />
            </div>
          )}
        </header>

        {/* Read-only banner - viewing someone else's draft */}
        {isViewOnlyDraft && (
          <ReadOnlyBanner
            title="View Only Mode"
            message="This draft was created by another user. You can view it but cannot make changes."
            noMarginTop
          />
        )}

        {/* Read-only banner - Show when user has read but not create/update permission */}
        {!isViewOnlyDraft && selectedHotelIds.length > 0 && !hasPermission && canRead && (
          <ReadOnlyBanner
            title="View Only Mode"
            message="You don't have create/edit permissions for the selected business units. Contact your administrator to request access."
            noMarginTop
          />
        )}

        <Formik
          enableReinitialize={true}
          validateOnMount={true}
          initialValues={{
            is_published: rfqFormDataFromStore.is_published,
            comment: rfqFormDataFromStore.comment,
            response_email: rfqFormDataFromStore.response_email,
            contact_name: rfqFormDataFromStore.contact_name,
            contact_number: rfqFormDataFromStore.contact_number.replace(/^\+\d{1,4}-/, ""),
            company_name: rfqFormDataFromStore.company_name || userProfile?.company_name || "",
            bid_end_date: rfqFormDataFromStore.bid_end_date,
            reverse_auction: rfqFormDataFromStore.reverse_auction,
            is_tender: rfqFormDataFromStore.is_tender || 0,
            tender_fees: rfqFormDataFromStore.tender_fees ? Number(rfqFormDataFromStore.tender_fees) / 100 : 0,
            tender_publish_date: rfqFormDataFromStore.tender_publish_date,
            vendor_clarification_date: rfqFormDataFromStore.vendor_clarification_date,
            location: rfqFormDataFromStore.location,
            countryCode: "+91",
            title: rfqFormDataFromStore.title || "",
          }}
          validationSchema={CreateRFQSchema}
          onSubmit={(values, { resetForm }) => {
            if (validateRFQFields(values)) {
              if (sheetNameList.length > 0) {
                setFinalRFQValues(values);
                setShowRFQModal(true);
              } else {
                setPendingFormValues(values);
                setShowCreateConfirmModal(true);
              }
            }
          }}
        >
          {({ errors, touched, isValid }) => {
            const isStepValid = (step) => {
              switch (step) {
                case 1: return rfqProducts.length > 0;
                case 2:
                  return Boolean(rfqFormDataFromStore.title) &&
                         (departments.length === 0 || rfqFormDataFromStore.department_id) &&
                         (processes.length === 0 || rfqFormDataFromStore.process_id);
                case 3:
                  return Boolean(
                    rfqFormDataFromStore.contact_name &&
                    rfqFormDataFromStore.response_email &&
                    rfqFormDataFromStore.contact_number
                  );
                case 4: {
                  // Gate is "all three set and chronologically ordered".
                  // Strict 5-min/24h windows are enforced at submit-time; the
                  // <input min=...> attributes plus that submit-time check are
                  // the source of truth — checking them again here would
                  // fail any user who picks the minimum (the relative gap
                  // shrinks by elapsed time between render and click).
                  const pd = rfqFormDataFromStore.tender_publish_date ? new Date(rfqFormDataFromStore.tender_publish_date) : null;
                  const cd = rfqFormDataFromStore.vendor_clarification_date ? new Date(rfqFormDataFromStore.vendor_clarification_date) : null;
                  const bd = rfqFormDataFromStore.bid_end_date ? new Date(rfqFormDataFromStore.bid_end_date) : null;
                  if (!pd || !cd || !bd) return false;
                  if (cd <= pd) return false;
                  if (bd <= cd) return false;
                  return true;
                }
                case 5:
                  if (rfqFormDataFromStore.reverse_auction !== 1) return true;
                  return Boolean(rfqFormDataFromStore.ra_start_date && rfqFormDataFromStore.ra_end_date);
                case 6: return true;
                case 7: return true;
                case 8: return true;
                default: return false;
              }
            };

            const goNext = () => {
              if (currentStep < STEPS.length && isStepValid(currentStep)) {
                setCurrentStep(currentStep + 1);
              }
            };
            const goPrev = () => setCurrentStep((s) => Math.max(1, s - 1));
            const goToStep = (n) => { if (n <= currentStep) setCurrentStep(n); };
            const formattedDate = (iso) => iso ? formatISOToDateTimeLocal(iso).replace('T', ' ') : "—";

            return (
              <Form className="rfq-form">
                {/* Stepper progress bar */}
                <div className="rfq-stepper-card">
                  <ol className="rfq-stepper" aria-label="Create RFQ steps">
                    {STEPS.map((s) => {
                      const status = s.id === currentStep ? 'active' : s.id < currentStep ? 'done' : 'locked';
                      const clickable = s.id <= currentStep;
                      return (
                        <li key={s.id} className={`rfq-step-pill rfq-step-pill--${status}`}>
                          <button
                            type="button"
                            className="rfq-step-pill__btn"
                            onClick={() => clickable && goToStep(s.id)}
                            disabled={!clickable}
                            aria-current={s.id === currentStep ? 'step' : undefined}
                          >
                            <span className="rfq-step-pill__num">
                              {s.id < currentStep ? '✓' : s.id}
                            </span>
                            <span className="rfq-step-pill__text">
                              <span className="rfq-step-pill__overline">Step {s.id}</span>
                              <span className="rfq-step-pill__label">{s.label}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
                <p className="rfq-stepper-mobile">Step {currentStep} of {STEPS.length} — {STEPS[currentStep-1]?.label}</p>

                <fieldset
                  className="rfq-fieldset"
                  disabled={(selectedHotelIds.length > 0 && !hasPermission) || isViewOnlyDraft}
                >
                  {/* STEP 1 — PRODUCTS */}
                  {currentStep === 1 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>1. Products</h3>
                        <p>Review the products and assigned vendors. You need at least one product before continuing.</p>
                      </header>

                      {!loading && rfqProducts.length === 0 ? (
                        <div className="rfq-products-empty">
                          <p className="rfq-products-empty__title">No products yet</p>
                          <p className="rfq-products-empty__hint">Add products from the catalog to start building this {getEntityLabel(rfqFormDataFromStore.is_tender)}.</p>
                          <Link
                            href={`/vendor/all${rfqDetails !== -1 ? `?rfq_id=${rfqDetails}` : ""}`}
                            className="rfq-btn rfq-btn--primary"
                            id="add_products-create_rfq_page"
                          >
                            Add Products
                          </Link>
                        </div>
                      ) : (
                        <>
                          {isMagicRfq && sheetNameList.length > 0 && (
                            <div className="rfq-field rfq-field--narrow">
                              <label className="rfq-label">Select Sheet</label>
                              <Select
                                id="select_sheet-create_rfq_page"
                                name="sheetName"
                                options={sheetNameList}
                                value={selectedSheet}
                                placeholder="Select Sheet"
                                onChange={handleSheetChange}
                                classNamePrefix="react-select"
                              />
                            </div>
                          )}

                          {rfqFormDataFromStore.is_tender !== 1 && (
                            <div className="rfq-dynamic-filter">
                              {generateDynamicFilter()}
                            </div>
                          )}

                          <div className="rfq-products-toolbar">
                            <h4 className="rfq-section__subhead">Review Products</h4>
                            <div className="rfq-products-toolbar__actions">
                              {rfqDetails && rfqDetails !== -1 && (
                                <button
                                  className="rfq-refresh-vendors-btn"
                                  onClick={handleRefreshVendors}
                                  disabled={refreshingVendors || (selectedHotelIds.length > 0 && !hasPermission)}
                                  title="Add any missing eligible vendors to all products"
                                  id="refresh_vendors-product_actions-create_rfq_page"
                                  type="button"
                                >
                                  <BsArrowRepeat className={refreshingVendors ? "spin-animation" : ""} size={14} />
                                  {refreshingVendors ? "Refreshing..." : "Refresh Vendors"}
                                </button>
                              )}
                              {!isViewOnlyDraft && (
                                <Link
                                  href={`/vendor/all${rfqDetails !== -1 ? `?rfq_id=${rfqDetails}${selectedSheet ? `&sheet_id=${selectedSheet.value}` : ``}` : ""}`}
                                  className="rfq-btn rfq-btn--primary rfq-btn--sm"
                                  id="add_more_products-create_rfq_page"
                                >
                                  + Add Products
                                </Link>
                              )}
                            </div>
                          </div>

                          <div
                            className="rfq-products-card"
                            style={{ borderColor: hasEmptySpecFields ? "#dc2626" : undefined }}
                          >
                            <div className="rfq-products-card__list">
                              <Accordion
                                flush
                                alwaysOpen
                                activeKey={activeKey}
                                onSelect={(k) => {
                                  setActiveKey(k);
                                  k?.forEach((key) => {
                                    const rfqProductId = key;
                                    fetchVendorsForProduct(rfqProductId);
                                    const rfqProduct = rfqProducts.find((product) => product.id == rfqProductId);
                                    if (rfqProduct) {
                                      getMakesProductWise(rfqProductId, rfqProduct.product_id);
                                    }
                                  });
                                }}
                              >
                                {rfqProducts && rfqProducts.length > 0 && rfqProducts.map((product) => {
                                  if (updatableData.products.deletable.includes(product.id)) {
                                    return null;
                                  }
                                  return (
                                    <Item
                                      is_tender={rfqFormDataFromStore?.is_tender}
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
                                      onSpecValueChange={(change) => handleSpecChange(product, change)}
                                      onFilesChange={(change) => handleFilesChange(product, change)}
                                      onCommentChange={(change) => handleCommentChange(product, change)}
                                      onClauseChange={(change) => handleClauseChange(product, change)}
                                      handleViewVendorInEdit={null}
                                      handleRemoveProductInEdit={() => handleRemoveProduct(product)}
                                      handleAddVendorInEdit={null}
                                      header={generateDynamicFilter}
                                      hasVendorError={errorProducts.has(product.id)}
                                      readOnly={selectedHotelIds.length > 0 && !hasPermission}
                                    />
                                  );
                                })}
                              </Accordion>
                            </div>
                          </div>

                          {loading && <Loader />}

                          {sheetNameList && sheetNameList.length > 0 && (
                            <ValidationErrorsDisplay
                              rfq_id={draft_id}
                              selectedSheet={selectedSheet}
                              refetchRFQ={getDraftInitialData}
                              setLoading={(loading => dispatch(setStoreLoading(loading)))}
                            />
                          )}
                        </>
                      )}
                    </section>
                  )}

                  {/* STEP 2 — BASICS */}
                  {currentStep === 2 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>2. Basics</h3>
                        <p>Give the {getEntityLabel(rfqFormDataFromStore.is_tender)} a clear title and assign a department and process.</p>
                      </header>
                      <div className="rfq-field">
                        <label className="rfq-label">{getEntityLabel(rfqFormDataFromStore.is_tender)} Title <span className="rfq-required">*</span></label>
                        <input
                          type="text"
                          id="title-input-create_rfq_page"
                          name="title"
                          className="rfq-input"
                          value={rfqFormDataFromStore.title || ""}
                          onChange={handleFormFieldChange}
                          placeholder={`Enter ${getEntityLabel(rfqFormDataFromStore.is_tender)} Title`}
                        />
                      </div>
                      <div className="rfq-grid-2">
                        {departments.length > 0 && (
                          <div className="rfq-field">
                            <label className="rfq-label">Department <span className="rfq-required">*</span></label>
                            <Select
                              id="select_department-create_rfq_page"
                              options={departments}
                              value={departments.find(d => d.value === rfqFormDataFromStore.department_id) || null}
                              onChange={(selected) => {
                                dispatch(setOtherFormFields({ field_name: "department_id", value: selected?.value || null }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Select Department"
                              classNamePrefix="react-select"
                              isClearable
                              isDisabled={isViewOnlyDraft}
                            />
                            {rfqFormDataFromStore.department_id && (
                              <small className="rfq-helper-text">
                                Approvers with this department scope or All Departments can approve
                              </small>
                            )}
                          </div>
                        )}
                        {processes.length > 0 && (
                          <div className="rfq-field">
                            <label className="rfq-label">Process <span className="rfq-required">*</span></label>
                            <Select
                              id="select_process-create_rfq_page"
                              options={processes}
                              value={processes.find(p => p.value === rfqFormDataFromStore.process_id) || null}
                              onChange={(selected) => {
                                dispatch(setOtherFormFields({ field_name: "process_id", value: selected?.value || null }));
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Select Process"
                              classNamePrefix="react-select"
                              isDisabled={isViewOnlyDraft}
                            />
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* STEP 3 — CONTACT */}
                  {currentStep === 3 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>3. Contact</h3>
                        <p>Vendors will use this contact info to reach you.</p>
                      </header>
                      <div className="rfq-grid-2">
                        <FormikField
                          id="contact_person_input-contact_info-create_rfq_page"
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
                        <FormikField
                          id="email_input-contact_info-create_rfq_page"
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
                      <div className="rfq-grid-2">
                        <div className="rfq-field">
                          <label className="rfq-label">Contact Number <span className="rfq-required">*</span></label>
                          <div className="rfq-phone-row">
                            <Field
                              id="country_code-dropdown-contact_info-create_rfq_page"
                              as="select"
                              name="countryCode"
                              className="rfq-input rfq-input--country"
                              value={onecountrycode}
                              onChange={(e) => setonecountrycode(e.target.value)}
                            >
                              <option value="countryCode">{selectedCountry?.country_code} ({selectedCountry?.phone_code})</option>
                              {countryCode.map((country) => (
                                <option key={country.id} value={country.phone_code}>
                                  {country.country_code} ({country.phone_code})
                                </option>
                              ))}
                            </Field>
                            <Field
                              id="contact_number-input-contact_info-create_rfq_page"
                              type="text"
                              name="contact_number"
                              className={`rfq-input ${touched.contact_number && errors.contact_number ? "rfq-input--invalid" : ""}`}
                              placeholder="Enter mobile number"
                              value={rfqFormDataFromStore.contact_number?.replace(/^\+\d{1,4}-/, "") || ""}
                              onChange={handleFormFieldChange}
                            />
                          </div>
                          {touched.contact_number && errors.contact_number && (
                            <div className="rfq-error">{errors.contact_number}</div>
                          )}
                        </div>
                        <div className="rfq-field">
                          <label className="rfq-label">Company Name</label>
                          <input
                            type="text"
                            className="rfq-input rfq-input--readonly"
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
                    </section>
                  )}

                  {/* STEP 4 — TIMELINE */}
                  {currentStep === 4 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>4. Timeline</h3>
                        <p>All three dates are required, and must follow this order: Publish → Vendor Clarification End → Quote Submission End.</p>
                      </header>
                      <div className="rfq-grid-3">
                        <div className="rfq-field">
                          <label className="rfq-label">Publish Date & Time <span className="rfq-required">*</span></label>
                          <input
                            id="tender_publish_date-rfq_details-create_rfq_page"
                            type="datetime-local"
                            name="tender_publish_date"
                            className="rfq-input"
                            min={minPublishDate}
                            value={rfqFormDataFromStore.tender_publish_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.tender_publish_date) : ""}
                            onChange={handleFormFieldChange}
                          />
                        </div>
                        <div className="rfq-field">
                          <label className="rfq-label">Vendor Clarification End Date <span className="rfq-required">*</span></label>
                          <input
                            id="vendor_clarification_date-rfq_details-create_rfq_page"
                            type="datetime-local"
                            name="vendor_clarification_date"
                            className="rfq-input"
                            min={minClarificationDate}
                            value={rfqFormDataFromStore.vendor_clarification_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.vendor_clarification_date) : ""}
                            onChange={handleFormFieldChange}
                          />
                          {validationErrors.vendor_clarification_date && (
                            <div className="rfq-error">{validationErrors.vendor_clarification_date}</div>
                          )}
                        </div>
                        <div className="rfq-field">
                          <label className="rfq-label">Quote Submission End Date <span className="rfq-required">*</span></label>
                          <input
                            id="procurement_end_date-rfq_details-create_rfq_page"
                            type="datetime-local"
                            name="bid_end_date"
                            className="rfq-input"
                            min={minBidEndDate}
                            value={rfqFormDataFromStore.bid_end_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.bid_end_date) : ""}
                            onChange={handleFormFieldChange}
                          />
                        </div>
                      </div>
                      {rfqFormDataFromStore.is_tender === 1 && (
                        <div className="rfq-field rfq-field--narrow">
                          <label className="rfq-label">Tender Fees (INR)</label>
                          <input
                            id="tender_fees-input-rfq_details-create_rfq_page"
                            type="number"
                            className="rfq-input"
                            value={rfqFormDataFromStore.tender_fees != null && rfqFormDataFromStore.tender_fees !== "" ? Number(rfqFormDataFromStore.tender_fees) / 100 : ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                dispatch(setOtherFormFields({ field_name: "tender_fees", value: null }));
                              } else {
                                const numericValue = parseFloat(raw);
                                const paise = isNaN(numericValue) ? 0 : Math.max(0, Math.round(numericValue * 100));
                                dispatch(setOtherFormFields({ field_name: "tender_fees", value: paise }));
                              }
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Enter fees in INR"
                            min="0"
                          />
                        </div>
                      )}
                    </section>
                  )}

                  {/* STEP 5 — REVERSE AUCTION */}
                  {currentStep === 5 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>5. Reverse Auction</h3>
                        <p>Optional — enable a live reverse-auction phase after the quote-submission window closes.</p>
                      </header>
                      <div className="rfq-field rfq-field--narrow">
                        <FormikField
                          id="reverse_auction-toggle-rfq_details-create_rfq_page"
                          label="Reverse Auction"
                          value={rfqFormDataFromStore.reverse_auction}
                          defaultValue={0}
                          enableHandleChange={true}
                          handleChange={handleFormFieldChange}
                          type="select"
                          selectOptions={[
                            { label: "Disable", value: 0 },
                            { label: "Enable", value: 1 },
                          ]}
                          isRequired={true}
                          name="reverse_auction"
                          touched={touched}
                          errors={errors}
                        />
                      </div>
                      {rfqFormDataFromStore.reverse_auction === 1 && (
                        <div className="rfq-grid-2">
                          <div className="rfq-field">
                            <label className="rfq-label">Auction Start Date & Time <span className="rfq-required">*</span></label>
                            <input
                              id="auction_start_date-rfq_details-create_rfq_page"
                              type="datetime-local"
                              name="ra_start_date"
                              className="rfq-input"
                              value={formatISOToDateTimeLocal(rfqFormDataFromStore.ra_start_date)}
                              onChange={handleFormFieldChange}
                              min={rfqFormDataFromStore.bid_end_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.bid_end_date) : new Date().toISOString().slice(0, 16)}
                            />
                            {validationErrors.ra_start_date && (<div className="rfq-error">{validationErrors.ra_start_date}</div>)}
                          </div>
                          <div className="rfq-field">
                            <label className="rfq-label">Auction End Date & Time <span className="rfq-required">*</span></label>
                            <input
                              id="auction_end_date-rfq_details-create_rfq_page"
                              type="datetime-local"
                              name="ra_end_date"
                              className="rfq-input"
                              value={formatISOToDateTimeLocal(rfqFormDataFromStore.ra_end_date)}
                              onChange={handleFormFieldChange}
                              min={rfqFormDataFromStore.ra_start_date ? formatISOToDateTimeLocal(rfqFormDataFromStore.ra_start_date) : ""}
                              disabled={!rfqFormDataFromStore.ra_start_date}
                            />
                            {validationErrors.ra_end_date && (<div className="rfq-error">{validationErrors.ra_end_date}</div>)}
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  {/* STEP 6 — DELIVERY */}
                  {currentStep === 6 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>6. Delivery</h3>
                        <p>Where should vendors deliver?</p>
                      </header>
                      <FormikField
                        id="delivery_location-rfq_details-create_rfq_page"
                        label="Delivery location"
                        value={rfqFormDataFromStore.location}
                        enableHandleChange={true}
                        handleChange={handleFormFieldChange}
                        type="text"
                        isRequired={false}
                        name="location"
                        touched={touched}
                        errors={errors}
                        showOptionalLabel={false}
                      />
                    </section>
                  )}

                  {/* STEP 7 — TERMS & CONDITIONS */}
                  {currentStep === 7 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>7. Terms & Conditions</h3>
                        <p>Pick from suggested terms, write your own, and attach any reference documents.</p>
                      </header>
                      {!loading && allTerms.length > 0 && (
                        <div className="rfq-terms-suggested">
                          <h4 className="rfq-section__subhead">Suggested Terms</h4>
                          <ol className="rfq-terms-list">
                            {allTerms.map((item) => {
                              const termContent =
                                item.term_content || item.name || item.term_text ||
                                (item.content && Array.isArray(item.content) && item.content[0]?.title) ||
                                `Term ${item.id}`;
                              const isSelected = selectedTerms?.some(
                                (term) => String(term.id || term.term_id) === String(item.id || item.term_id)
                              );
                              return (
                                <li key={`term-${item.id}`}>
                                  <label className="rfq-checkbox" htmlFor={`term-${item.id}`}>
                                    <input
                                      type="checkbox"
                                      id={`term-${item.id}`}
                                      checked={isSelected}
                                      disabled={isViewOnlyDraft}
                                      onChange={(e) => handleTermChange(e, item)}
                                    />
                                    <span>{termContent}</span>
                                  </label>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      )}
                      <FormikField
                        label="Add your own terms"
                        placeholder="You can mention your terms regarding Freight Charges, Payment Terms, Performance Bank Guarantee, Packing & Forwarding Charges, Delivery Period, Liquidated Damages, Transit Insurance and more"
                        type="editor"
                        rows="5"
                        name="comment"
                        touched={touched}
                        errors={errors}
                        enableHandleChange={true}
                        handleChange={(html) => {
                          dispatch(setOtherFormFields({ field_name: "comment", value: html }));
                          setHasUnsavedChanges(true);
                        }}
                        showOptionalLabel={false}
                        isDisabled={isViewOnlyDraft}
                      />
                      <div className="rfq-upload">
                        <label htmlFor="upload_terms-create_rfq_page" className="rfq-label">Upload Your Terms</label>
                        <input
                          id="upload_terms-create_rfq_page"
                          type="file"
                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                          className="rfq-input rfq-input--file"
                          multiple
                          onChange={(e) => handleTermFiles("add", e)}
                        />
                        {termFiles.length > 0 && (
                          <div className="rfq-upload-list">
                            {termFiles.map((term_file) => (
                              <a key={term_file} href={term_file} target="_blank" className="file-badge" type="button">
                                <span className="rfq-file-name">{extractfileName(term_file)}</span>
                                <FontAwesomeIcon
                                  icon={faClose}
                                  fontSize={15}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleTermFiles("remove", term_file);
                                  }}
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* STEP 8 — REVIEW & SUBMIT */}
                  {currentStep === 8 && (
                    <section className="rfq-section">
                      <header className="rfq-section__header">
                        <h3>8. Review & Submit</h3>
                        <p>Final check before sending this {getEntityLabel(rfqFormDataFromStore.is_tender)} to vendors.</p>
                      </header>
                      <div className="rfq-review">
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Products</h4>
                            <button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(1)}>Edit</button>
                          </div>
                          <p className="rfq-review-line">{rfqProducts.length} product{rfqProducts.length === 1 ? "" : "s"}</p>
                        </div>
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Basics</h4>
                            <button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(2)}>Edit</button>
                          </div>
                          <dl className="rfq-review-dl">
                            <dt>Title</dt><dd>{rfqFormDataFromStore.title || "—"}</dd>
                            <dt>Department</dt><dd>{departments.find(d => d.value === rfqFormDataFromStore.department_id)?.label || "—"}</dd>
                            <dt>Process</dt><dd>{processes.find(p => p.value === rfqFormDataFromStore.process_id)?.label || "—"}</dd>
                          </dl>
                        </div>
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Contact</h4>
                            <button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(3)}>Edit</button>
                          </div>
                          <dl className="rfq-review-dl">
                            <dt>Contact person</dt><dd>{rfqFormDataFromStore.contact_name || "—"}</dd>
                            <dt>Email</dt><dd>{rfqFormDataFromStore.response_email || "—"}</dd>
                            <dt>Phone</dt><dd>{rfqFormDataFromStore.contact_number || "—"}</dd>
                            <dt>Company</dt><dd>{rfqFormDataFromStore.company_name || userProfile?.company_name || "—"}</dd>
                          </dl>
                        </div>
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Timeline</h4>
                            <button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(4)}>Edit</button>
                          </div>
                          <dl className="rfq-review-dl">
                            <dt>Publish</dt><dd>{formattedDate(rfqFormDataFromStore.tender_publish_date)}</dd>
                            <dt>Vendor Clarification End</dt><dd>{formattedDate(rfqFormDataFromStore.vendor_clarification_date)}</dd>
                            <dt>Quote Submission End</dt><dd>{formattedDate(rfqFormDataFromStore.bid_end_date)}</dd>
                            {rfqFormDataFromStore.is_tender === 1 && (
                              <>
                                <dt>Tender Fees</dt>
                                <dd>{rfqFormDataFromStore.tender_fees != null ? `₹${(Number(rfqFormDataFromStore.tender_fees)/100).toFixed(2)}` : "—"}</dd>
                              </>
                            )}
                          </dl>
                        </div>
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Reverse Auction</h4>
                            <button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(5)}>Edit</button>
                          </div>
                          {rfqFormDataFromStore.reverse_auction === 1 ? (
                            <dl className="rfq-review-dl">
                              <dt>Start</dt><dd>{formattedDate(rfqFormDataFromStore.ra_start_date)}</dd>
                              <dt>End</dt><dd>{formattedDate(rfqFormDataFromStore.ra_end_date)}</dd>
                            </dl>
                          ) : (
                            <p className="rfq-review-line">Disabled</p>
                          )}
                        </div>
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Delivery</h4>
                            <button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(6)}>Edit</button>
                          </div>
                          <p className="rfq-review-line">{rfqFormDataFromStore.location || "—"}</p>
                        </div>
                        <div className="rfq-review-group">
                          <div className="rfq-review-group__head">
                            <h4>Terms & Conditions</h4>
                            <button type="button" className="rfq-review-edit" onClick={() => setCurrentStep(7)}>Edit</button>
                          </div>
                          <p className="rfq-review-line">
                            {selectedTerms?.length || 0} suggested term{(selectedTerms?.length || 0) === 1 ? "" : "s"} selected
                            {" · "}
                            {(rfqFormDataFromStore.comment && rfqFormDataFromStore.comment.replace(/<[^>]*>/g, "").trim()) ? "Custom terms added" : "No custom terms"}
                            {" · "}
                            {termFiles.length} file{termFiles.length === 1 ? "" : "s"} attached
                          </p>
                        </div>
                      </div>
                      {selectedHotelIds.length > 0 && !hasPermission ? (
                        <p className="rfq-readonly-msg">
                          This is a Read-Only {rfqFormDataFromStore?.is_tender === 1 ? "Tender" : "RFQ"}. You do not have permission to make changes.
                        </p>
                      ) : (
                        <p className="rfq-muted">
                          Submitting will send this {getEntityLabel(rfqFormDataFromStore?.is_tender)} to all selected vendors for the relevant products.
                        </p>
                      )}
                    </section>
                  )}
                </fieldset>

                {/* Sticky action bar */}
                <div className="rfq-actions-bar">
                  <button
                    type="button"
                    className="rfq-btn rfq-btn--ghost"
                    onClick={goPrev}
                    disabled={currentStep === 1}
                  >
                    ← Previous
                  </button>
                  <div className="rfq-actions-bar__right">
                    {!isViewOnlyDraft && (
                      <button
                        type="button"
                        className="rfq-btn rfq-btn--secondary"
                        onClick={handleSaveDraft}
                        disabled={selectedHotelIds.length > 0 && !hasPermission}
                        id="save_draft-rfq_actions-create_rfq_page"
                        title={selectedHotelIds.length > 0 && !hasPermission ? "You don't have permission to save changes" : ""}
                      >
                        Save Changes
                      </button>
                    )}
                    {currentStep < STEPS.length && (
                      <button
                        type="button"
                        className="rfq-btn rfq-btn--primary"
                        onClick={goNext}
                        disabled={!isStepValid(currentStep)}
                      >
                        Next →
                      </button>
                    )}
                    {currentStep === STEPS.length && !isViewOnlyDraft && (
                      <button
                        type="submit"
                        className="rfq-btn rfq-btn--success"
                        disabled={!isValid || (selectedHotelIds.length > 0 && !hasPermission)}
                        id="create_rfq-rfq_actions-create_rfq_page"
                        title={selectedHotelIds.length > 0 && !hasPermission ? "You don't have permission to create RFQ/Tender" : ""}
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              </Form>
            );
          }}
        </Formik>
      </div>

      {/* Modals */}
      <ViewVendorModal
        productData={selectedProduct}
        updatableData={updatableData}
        isOpen={showModal.vendorModal}
        applyToOtherVariants={handleSyncApplyToOtherVariants}
        onClose={() =>
          setShowModal((prev) => ({
            ...prev,
            vendorModal: false,
          }))
        }
        onSelectAll={(isChecked) => {
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
                  ...(isChecked ? selectedProduct.vendors.map(vendor => vendor.user_id) : [])
                ],
              },
            },
          }));
        }}
        onAdd={(item) => {
          const key = `${selectedProduct.product.id}`;
          const totalVendors = vendors?.[key]?.length ?? 0;

          const deletableVendors =
            (
              updatableData.vendors?.[selectedProduct.product.id]?.deletable ??
              []
            ).length + 1;
          const addableVendors = (
            updatableData.vendors?.[selectedProduct.product.id]?.addable ?? []
          ).length;

          if (totalVendors + addableVendors - deletableVendors <= 0) {
            toast.error("At least one vendor is required for the product");
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
                  ...(prev.vendors?.[selectedProduct.product.id]?.deletable ??
                    []),
                  item.user_id,
                ],
              },
            },
          }));
        }}
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
                  prev.vendors?.[selectedProduct.product.id]?.deletable ?? []
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
        applyToOtherVariants={handleSyncApplyToOtherVariants}
        isOpen={showModal.addVendorModal}
        onClose={() => {
          setShowModal((prev) => ({ ...prev, addVendorModal: false }));
          setAddableVendors([]);
        }}
        addedVendorsList={
          updatableData?.vendors?.[selectedProduct?.product?.id]?.addable ?? []
        }
        fetchVendors={fetchAvailableVendorsForProduct}
        onSelectAll={(isChecked) => {
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
                  ...(isChecked ? addableVendors.map(vendor => vendor.id) : [])
                ],
              },
            },
          }));
        }}
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
          }));
        }}
        onRemove={(item) => {
          const key = `${selectedProduct.product.id}`;
          const totalVendors = vendors?.[key]?.length ?? 0;

          const deletableVendors = (
            updatableData.vendors?.[selectedProduct.product.id]?.deletable ?? []
          ).length;
          const addableVendors =
            (updatableData.vendors?.[selectedProduct.product.id]?.addable ?? [])
              .length - 1;

          if (totalVendors + addableVendors - deletableVendors <= 0) {
            toast.error("At least one vendor is required for the product");
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
          }));
        }}
      />

      <CreateRFQModal
        show={showRFQModal}
        onHide={() => setShowRFQModal(false)}
        onConfirm={() => handleCreateRFQ(finalRFQValues)}
        sheets={sheetNameList}
        selectedSheets={selectedSheetsForRFQ}
        setSelectedSheets={setSelectedSheetsForRFQ}
        is_tender={rfqFormDataFromStore?.is_tender}
      />

      {/* Submit RFQ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCreateConfirmModal}
        onClose={handleCreateCancel}
        onConfirm={handleCreateConfirm}
        title={`Submit ${getEntityLabel(rfqFormDataFromStore?.is_tender)}`}
        description={`Are you sure you want to submit this ${getEntityLabel(rfqFormDataFromStore?.is_tender)}?\nThis action will send the ${getEntityLabel(rfqFormDataFromStore?.is_tender)} to selected vendors.`}
        confirmButtonColor="success"
        confirmButtonText="Submit"
        cancelButtonText="Cancel"
      />

      {/* Remove Product Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveProductConfirmModal}
        onClose={handleRemoveProductCancel}
        onConfirm={handleRemoveProductConfirm}
        title="Remove Product"
        description={`Are you sure you want to remove this product from the ${getEntityLabel(rfqFormDataFromStore?.is_tender)}?\nThis action will remove the product and all its associated data.`}
        confirmButtonColor="danger"
        confirmButtonText="Remove"
        cancelButtonText="Cancel"
      />
      <style jsx>{`
        .refresh-vendors-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: 1px solid #000080;
          border-radius: var(--border-radius, 6px);
          background: #fff;
          color: #000080;
          font-weight: 500;
          font-size: 14px;
          line-height: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .refresh-vendors-btn:hover:not(:disabled) {
          background: #000080;
          color: #fff;
        }
        .refresh-vendors-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};


export default CreateRFQ;