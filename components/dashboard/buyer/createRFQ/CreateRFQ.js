import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Item from "./Item";
import Select from 'react-select';
import { createRfq, saveDraft, getTerms, vendorApproveList, getDraftData, getDraftById, getDraftRfqSheets, getDraftRfqSheetWise, processMagicSearchDraft } from "@/services/rfq";
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
import { extractfileName, handleFileUpload, formatISOToDateTimeLocal } from "@/utils/sharedFunctions";
import { Accordion } from "react-bootstrap";
import { getCountryCodes } from "@/services/cms";
import axiosInstance from "@/lib/axios";

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

  const rfqProductsRef = useRef({});
  const rfqFormDataRef = useRef({});

  const [validationErrors, setValidationErrors] = useState({});

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
          console.log("Error fetching countries:", error);
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
        console.log(error)
      })
  }

  const getVendorApproveList = () => {
    setLoading(true);
    vendorApproveList().then((res) => {
      setLoading(false);
      setVendorApprovedList(res.data);
    });
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
          
          console.log("Terms fetched and normalized:", normalizedTerms.length);
          dispatch(setAllTerms(normalizedTerms));
        } else {
          console.log("No terms found or invalid format");
          dispatch(setAllTerms([]));
        }
      })
      .catch((err) => {
        console.error("Error fetching terms:", err);
      });
  };

  const handleTermChange = (e, item) => {
    try {
      const isChecked = e.target.checked;
      // Always convert ID to string for consistent comparison
      const termId = String(item.id || item.term_id);
      
      // Extract term content with fallbacks
      const termName = item.term_content || item.name || item.term_text || 
                     (item.content && item.content[0] ? item.content[0].title : null) ||
                     `Term ${termId}`;
      
      console.log(`Term change: ${termName} (ID: ${termId}) -> ${isChecked ? 'CHECKED' : 'UNCHECKED'}`);
      
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
          
          console.log(`Added term: ${termName} (ID: ${termId})`);
        } else {
          console.log(`Term already selected: ${termName} (ID: ${termId})`);
        }
      } else {
        // Filter out the term with matching ID - check both id and term_id
        const previousLength = updatedTerms.length;
        updatedTerms = updatedTerms.filter(term => 
          String(term.id) !== termId && String(term.term_id || '') !== termId
        );
        
        if (previousLength !== updatedTerms.length) {
          console.log(`Removed term: ${termName} (ID: ${termId})`);
        } else {
          console.log(`Term not found for removal: ${termName} (ID: ${termId})`);
        }
      }
      
      // Update Redux with the new terms array
      dispatch(setTermsData(updatedTerms));
      setHasUnsavedChanges(true);
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
    
    let payload = {
      rfq_id: rfqDetails,
      products: rfqProductsRef.current,
      ...formDataCopy,
      project_id: formDataCopy.project_id || -1,
      contact_number: fullMobile
    };

    // Remove country_code if it exists
    if (payload.hasOwnProperty("country_code")) {
      delete payload.country_code;
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
      
      console.log("Terms filtered for draft save:", formDataCopy.terms);
    }
    // Make sure we maintain the rfq_added_from flag if this is a magic search RFQ
    if (isMagicRfq && !formDataCopy.rfq_added_from) {
      formDataCopy.rfq_added_from = 'magic';
    }

    const payload = {
      ...formDataCopy, // Use the filtered copy
      rfq_id: rfqDetails,
      products: rfqProductsRef.current,
      is_published: 0,
      contact_number: fullMobile
    };
    try {
      const res = await saveDraft(payload);
      setMainLoading(false);
      toast.success(
        <h6>
          <b>RFQ Draft #{res.message?.rfq_id}:</b> Changes saved successfully!
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

  const getDraftInitialData = async () => {
    dispatch(clearState());
    dispatch(setStoreLoading(true));
    try {
      // If a draft_id is provided in the URL, load that specific draft
      let draftRes;
      
      if (draftRfqId && draftRfqId !== -1) {
        draftRes = await getDraftById(draftRfqId);
        // Set the title to indicate we're editing a draft
        document.title = `Edit Draft RFQ #${draftRfqId}`;

        // Check if this is a Magic RFQ
        const isMagicRfqFromFlag = draftRes?.data?.rfq_form_data?.rfq_added_from === 'magic';
        const hasMagicSheets = draftRes?.data?.sheets && Array.isArray(draftRes.data.sheets) && draftRes.data.sheets.length > 0;
        if (isMagicRfqFromFlag || hasMagicSheets) {
          setIsMagicRfq(true);
          
          // Get sheet data for this RFQ - either from the response or make a new request
          let sheetData = [];
          
          if (hasMagicSheets) {
            // Use sheets from the response
            sheetData = draftRes.data.sheets;
          } else {
            // Make a separate API call to get sheets
            try {
              // Use the dedicated API method instead of raw axios call
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
              setSelectedSheet(defaultSheet);
            }
          } else {
            console.warn("No sheets found for Magic RFQ ID:", draftRfqId);
          }
        }
      } else {
        // Changes by Agnij 2025-06-17 [Using fresh=true to always create a new RFQ when opening the Create RFQ page]
        draftRes = await getDraftData(true);
        // Set the title to indicate we're creating a new RFQ
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

  // Changes by Agnij 2025-08-05 [Added handler for sheet selection]
  const handleSheetChange = async (selectedOption) => {
    if (!selectedOption || !draftRfqId) return;
    
    setSelectedSheet(selectedOption);
    setMainLoading(true);
    
    try {
      // Use the dedicated API method instead of raw axios call
      const response = await getDraftRfqSheetWise(draftRfqId, selectedOption.value);      
      // Check if we need to process the sheet
      if (!response?.data?.success || response?.data?.status === 0 || 
          !response?.data?.data || response?.data?.data.length === 0) {
        await processUnprocessedSheet(draftRfqId, selectedOption.value);
        return; // The processUnprocessedSheet function will handle the rest
      }
      
      // Process the response data 
      const sheetData = response?.data?.data[0]; // Get the first item from data array
      if (sheetData) {        
        // Prepare form data from sheet data
        const formData = {
          ...rfqFormDataFromStore, // Keep existing form data
          response_email: sheetData.response_email || rfqFormDataFromStore.response_email,
          contact_name: sheetData.contact_name || rfqFormDataFromStore.contact_name,
          contact_number: sheetData.contact_number || rfqFormDataFromStore.contact_number,
          company_name: sheetData.company_name || rfqFormDataFromStore.company_name,
          rfq_added_from: 'magic', // Ensure we keep the magic flag
        };
        
        // Check if products array exists and has data
        if (sheetData.products && Array.isArray(sheetData.products)) {
          // Filter products that belong to this sheet and have valid vendors
          const validProducts = sheetData.products.filter(product => 
            product && 
            product.vendors && 
            Array.isArray(product.vendors) && 
            product.vendors.length > 0 &&
            // Only include products with matching sheet_name or sheet_id
            (product.sheet_name === selectedOption.label || 
             product.sheet_id === selectedOption.value)
          );
          
          if (validProducts.length > 0) {
            console.log(`Found ${validProducts.length} valid products for sheet ${selectedOption.label} (ID: ${selectedOption.value})`);
            
            // Update the Redux store with new data
            dispatch(intializeRfq({
              rfq_form_data: formData,
              rfqProducts: validProducts,
              rfq_id: draftRfqId
            }));
            
            // Update local state to trigger UI refresh
            setRfqProducts(validProducts);
            
            toast.success(`Loaded ${validProducts.length} products from sheet: ${selectedOption.label}`);
          } else {
            console.warn(`No valid products found for sheet ${selectedOption.label} (ID: ${selectedOption.value})`);
            toast.warning(`No valid products found in sheet: ${selectedOption.label}`);
            
            // Clear products if none found for this sheet
            dispatch(intializeRfq({
              rfq_form_data: formData,
              rfqProducts: [],
              rfq_id: draftRfqId
            }));
            
            setRfqProducts([]);
          }
        } else {
          console.warn('No products array found in sheet data:', sheetData);
          toast.warning(`No products found in sheet: ${selectedOption.label}`);
        }
      } else {
        console.warn('Invalid sheet data format:', response?.data);
        toast.warning(`Could not process data from sheet: ${selectedOption.label}`);
      }
    } catch (error) {
      console.error("Error fetching sheet data:", error);
      toast.error("Failed to load products for selected sheet");
    } finally {
      setMainLoading(false);
    }
  };
  const processUnprocessedSheet = async (rfqId, sheetId) => {
    try {
      setMainLoading(true);
      
      // Get the current sheet name from the selected sheet
      const sheetName = selectedSheet?.label || 
        sheetNameList.find(sheet => sheet.value === sheetId)?.label || 
        `Sheet ${sheetId}`;
      
      // Call the API to process the sheet using the dedicated method
      const response = await processMagicSearchDraft(rfqId, sheetId);
      // Check for success status and that we don't have an explicit false success flag
      if (response?.data?.status === 1 && response?.data?.success !== false) {
        toast.success('Sheet processed successfully');
        
        // Try to use the data directly from the processing response if it contains products
        if (response?.data?.data && response?.data?.data.products && 
            Array.isArray(response?.data?.data.products)) {
          const processedData = response?.data?.data;
          
          // Prepare form data from processed data
          const formData = {
            ...rfqFormDataFromStore, // Keep existing form data
            response_email: processedData.response_email || rfqFormDataFromStore.response_email,
            contact_name: processedData.contact_name || rfqFormDataFromStore.contact_name,
            contact_number: processedData.contact_number || rfqFormDataFromStore.contact_number,
            company_name: processedData.company_name || rfqFormDataFromStore.company_name,
            rfq_added_from: 'magic' // Ensure we keep the magic flag
          };
          
          // Filter products for this specific sheet and that have valid vendors
          const validProducts = processedData.products.filter(product => 
            product && 
            product.vendors && 
            Array.isArray(product.vendors) && 
            product.vendors.length > 0 &&
            // Filter by sheet_id or sheet_name if available, or include all if not specified
            (product.sheet_id === sheetId || 
             product.sheet_name === sheetName || 
             !product.sheet_id) // Include products without sheet_id in case the backend didn't add it
          );
          
          if (validProducts.length > 0) {
            console.log(`Found ${validProducts.length} valid products for sheet ID ${sheetId}`);
            
            // Update the Redux store with new data
            dispatch(intializeRfq({
              rfq_form_data: formData,
              rfqProducts: validProducts,
              rfq_id: rfqId
            }));
            
            // Update local state to trigger UI refresh
            setRfqProducts(validProducts);
            
            toast.success(`Loaded ${validProducts.length} products from processed sheet`);
            return; // Exit early since we've handled the data
          } else {
            console.warn(`No valid products found for sheet ID ${sheetId} in direct response`);
          }
        }
        
        // If we couldn't use the data directly, make a new request to get the sheet data
        try {
          const updatedResponse = await getDraftRfqSheetWise(rfqId, sheetId);          
          if (updatedResponse?.data?.status === 1 && 
              updatedResponse?.data?.data && 
              updatedResponse?.data?.data.length > 0) {
            
            const sheetData = updatedResponse?.data?.data[0];
            
            // Prepare form data
            const formData = {
              ...rfqFormDataFromStore,
              response_email: sheetData.response_email || rfqFormDataFromStore.response_email,
              contact_name: sheetData.contact_name || rfqFormDataFromStore.contact_name,
              contact_number: sheetData.contact_number || rfqFormDataFromStore.contact_number,
              company_name: sheetData.company_name || rfqFormDataFromStore.company_name,
              rfq_added_from: 'magic'
            };
            
            if (sheetData.products && Array.isArray(sheetData.products)) {
              // Filter valid products for this specific sheet
              const validProducts = sheetData.products.filter(product => 
                product && 
                product.vendors && 
                Array.isArray(product.vendors) && 
                product.vendors.length > 0 &&
                // Filter by sheet_id or sheet_name if available
                (product.sheet_id === sheetId || 
                 product.sheet_name === sheetName || 
                 !product.sheet_id) // Include products without sheet_id in case the backend didn't add it
              );
              
              if (validProducts.length > 0) {                
                dispatch(intializeRfq({
                  rfq_form_data: formData,
                  rfqProducts: validProducts,
                  rfq_id: rfqId
                }));
                
                // Update local state to trigger UI refresh
                setRfqProducts(validProducts);
                
                toast.success(`Loaded ${validProducts.length} products from processed sheet`);
              } else {
                console.warn(`No valid products found for sheet ID ${sheetId} in follow-up request`);
                toast.warning('No valid products found in processed sheet');
                
                // Clear products if none found for this sheet
                dispatch(intializeRfq({
                  rfq_form_data: formData,
                  rfqProducts: [],
                  rfq_id: rfqId
                }));
                
                setRfqProducts([]);
              }
            } else {
              console.warn('Processed sheet has no products array');
              toast.warning('Processed sheet has no products array');
              
              // Clear products
              dispatch(intializeRfq({
                rfq_form_data: formData,
                rfqProducts: [],
                rfq_id: rfqId
              }));
              
              setRfqProducts([]);
            }
          } else {
            console.warn('Processed sheet returned no valid data:', updatedResponse?.data);
            toast.warning('Processed sheet returned no valid data');
          }
        } catch (error) {
          console.error("Error fetching processed sheet data:", error);
          toast.error("Sheet was processed but could not load the data. Please try refreshing.");
        }
      } else {
        console.error('Failed to process sheet:', response?.data);
        toast.error('Failed to process sheet. Please check the server logs.');
      }
    } catch (error) {
      console.error("Error processing sheet:", error);
      toast.error("Failed to process sheet. Please try again.");
    } finally {
      setMainLoading(false);
    }
  };

  useEffect(() => {
    getProfileDetails();
    getVendorApproveList();
    getAllProjects();
    fetchCountryCodes();
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
          
          // Clear existing state before loading the draft
          dispatch(clearState());
          
          // Explicitly load this draft by ID
          const loadDraft = async () => {
            dispatch(setStoreLoading(true));
            try {
              console.log("Loading specific draft with ID:", id);
              const draftRes = await getDraftById(id);
              console.log("Draft data received:", draftRes);
              // Check if this is a Magic RFQ
              const rfqFormData = draftRes?.data?.rfq_form_data || {};
              const isMagicRfqFromFlag = rfqFormData?.rfq_added_from === 'magic';
              const hasMagicSheets = draftRes?.data?.sheets && Array.isArray(draftRes.data.sheets) && draftRes.data.sheets.length > 0;
                          
              if (isMagicRfqFromFlag || hasMagicSheets) {
                setIsMagicRfq(true);
                
                // Get sheet data for this RFQ - either from the response or make a new request
                let sheetData = [];
                
                if (hasMagicSheets) {
                  // Use sheets from the response
                  sheetData = draftRes.data.sheets;
                } else {
                  // Make a separate API call to get sheets
                  try {
                    // Use the dedicated API method instead of raw axios call
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
              
                  dispatch(intializeRfq(draftRes.data));
                  setonecountrycode(extractedCountryCode);
                } else {
                  dispatch(intializeRfq(draftRes.data));
                }
                
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
          
          loadDraft();
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

  useEffect(() => {
    const validProducts = rfqProductsFromStore.filter(
      (prodItem) => prodItem.vendors?.length > 0);
    setRfqProducts(validProducts);
    rfqProductsRef.current = validProducts;
  }, [rfqProductsFromStore])

  useEffect(() => {
    rfqFormDataRef.current = rfqFormDataFromStore;
  }, [rfqFormDataFromStore]);

  useEffect(() => {
    // Debug terms selection state
    if (allTerms?.length > 0 && selectedTerms?.length > 0) {
      console.log("Terms Selection Debug:", {
        allTermsCount: allTerms.length,
        selectedTermsCount: selectedTerms.length,
        selectedTermIds: selectedTerms.map(t => t.id),
        firstFewAllTerms: allTerms.slice(0, 3).map(t => ({ 
          id: t.id, 
          name: t.term_content || t.name 
        }))
      });
    }
  }, [allTerms, selectedTerms]);

  useEffect(() => {
    const handleRouteChange = async (url) => {
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm(
          "You have unsaved changes. Do you want to save them before leaving?"
        );
        if (confirmLeave) {
          handleSaveDraft();
        } else {
          // Prevent navigation
          router.events.emit("routeChangeError");
          throw "Route change aborted by user."; // Suppress Next.js warning
        }
      }
    };

    // Listen to route change events
    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [hasUnsavedChanges, router]);

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

  // Make sure products are filtered when the selected sheet changes
  useEffect(() => {
    if (isMagicRfq && selectedSheet && draftRfqId && rfqProductsFromStore.length > 0) {
      // Filter products that belong to this sheet
      const filteredProducts = rfqProductsFromStore.filter(product => 
        product && 
        product.vendors && 
        Array.isArray(product.vendors) && 
        product.vendors.length > 0 &&
        // Only include products with matching sheet_name or sheet_id
        (product.sheet_name === selectedSheet.label || 
         product.sheet_id === selectedSheet.value)
      );
      // Update the products display without affecting the Redux store
      setRfqProducts(filteredProducts);
    }
  }, [selectedSheet, isMagicRfq, draftRfqId]);

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
                    <Accordion flush defaultActiveKey="">
                      {rfqProducts &&
                        rfqProducts.length > 0 &&
                        rfqProducts.map((product) => {
                          return (
                            <Item
                              vendorApprovedList={vendorApprovedList}
                              data={product}
                              rfq_id={rfqDetails}
                              setHasUnsavedChanges={setHasUnsavedChanges}
                              getDraftInitialData={getDraftInitialData}
                              saveDraft={handleSaveDraft}
                            />
                          );
                        })}
                    </Accordion>
                  </div>

                  <div className="float-end addmore mt-4 ">
                    <Link
                      href={`/vendor/all${rfqDetails !== -1 ? `?rfq_id=${rfqDetails}` : ''}`}
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
                          onSubmit={(values, { resetForm }) =>
                            handleCreateRFQ(values, resetForm)
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
    </>
  );
};


export default CreateRFQ;