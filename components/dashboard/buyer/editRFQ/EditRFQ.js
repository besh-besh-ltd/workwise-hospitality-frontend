import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Select from 'react-select';
import { updateRfq, saveDraft, getTerms, vendorApproveList, getRFQById, uploadRFQFile } from "@/services/rfq";
import { Form, Formik } from "formik";
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
  setRfqId,
  setRfqProducts,
  setRfqFormData,
  setProjects,
} from "@/redux/slice";
import Link from "next/link";
import { toast } from "react-toastify";
import { getProjectList, getProjectTableDataById } from "@/services/project";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { extractfileName, handleFileUpload } from "@/utils/sharedFunctions";
import { getCountryCodes } from "@/services/cms";
import * as Yup from "yup";

// Add validation schema
const EditRFQSchema = Yup.object().shape({
  contact_number: Yup.string()
    .matches(/^\d+$/, "Please enter only numbers without country code or special characters")
    .min(10, "Contact number must be at least 10 digits")
    .max(15, "Contact number must not exceed 15 digits")
    .required("Contact number is required"),
  response_email: Yup.string()
    .email("Invalid email format")
    .required("Response email is required"),
  contact_name: Yup.string()
    .required("Contact name is required")
    .min(2, "Contact name must be at least 2 characters")
    .max(50, "Contact name must not exceed 50 characters"),
  location: Yup.string()
    .optional(),
  // Modified to accept date that could be today or in the future
  bid_end_date: Yup.date()
    .required("Procurement end date is required")
    .test('valid-date', 'End date must be today or in the future', function(value) {
      if (!value) return true;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const inputDate = new Date(value);
      inputDate.setHours(0, 0, 0, 0);
      
      return inputDate >= today;
    }),
});

const EditRFQ = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [mainLoading, setMainLoading] = useState(true);
  const [rfqLoading, setRfqLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const [userProfile, setuserProfile] = useState(null);
  const [vendorApprovedList, setVendorApprovedList] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rfqProducts, setRfqProducts] = useState([]);
  const [rfqData, setRfqData] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [dataFetchError, setDataFetchError] = useState(null);

  // Add a ref to track if we've already refreshed terms to avoid infinite loop
  const termRefreshCompletedRef = useRef(false);

  const storeLoading = useSelector((state) => state.storeLoading);
  const rfqDetails = useSelector((state) => state.rfq_id);
  const rfqProductsFromStore = useSelector((state) => state.rfqProducts || []);
  const rfqFormDataFromStore = useSelector((state) => state.rfqFormData || {});
  const allTerms = useSelector((state) => state.allTerms || []);
  const selectedTerms = useSelector((state) => state.rfqFormData?.terms || []);
  const termFiles = useSelector((state) => state.rfqFormData?.term_and_condition_files || []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [countryCode, setCountryCode] = useState([]);
  const [onecountrycode, setonecountrycode] = useState("");

  const rfqProductsRef = useRef({});
  const rfqFormDataRef = useRef({});

  // Log current Redux state - for debugging
  const reduxState = useSelector((state) => state);
  
  // Add a ref to track if terms have been initialized
  const termsInitializedRef = useRef(false);

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
  
  useEffect(() => {
    // Clear Redux store first
    dispatch(clearState());
    
    // Reset refs for a fresh start
    termRefreshCompletedRef.current = false;
    termsInitializedRef.current = false;
    
    // Only start fetching when we have an ID
    if (router.query.id) {
      fetchInitialData();
      fetchCountryCodes();
    }
    
    // Handle beforeunload event
    const handleBeforeUnload = (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router.query.id, dispatch]);

  // Add additional effect to ensure rfq_type and reverse_auction are preserved
  useEffect(() => {
    if (rfqData) {
      // Store the original values in a ref to ensure they remain unchanged
      const originalRfqType = rfqData.rfq_type;
      const originalReverseAuction = rfqData.reverse_auction;
      
      // This ensures that even if rfqData changes, we always reference the original values
      Object.defineProperty(rfqData, 'rfq_type', {
        get: function() { return originalRfqType; }
      });
      
      Object.defineProperty(rfqData, 'reverse_auction', {
        get: function() { return originalReverseAuction; }
      });
    }
  }, [rfqData?.id]);

  // This will log whenever the redux state changes
  useEffect(() => {
    console.log("Redux State Updated:", {
      rfqId: rfqDetails,
      productsCount: rfqProductsFromStore?.length || 0,
      formData: rfqFormDataFromStore,
      hasTerms: selectedTerms?.length || 0,
    });
    
    // Log full redux state for debugging
    console.log("Full Redux State:", reduxState);
    
    // Debug RFQ Type and Reverse Auction values
    if (rfqData) {
      console.log("IMPORTANT - RFQ Values:", {
        "rfq_id": rfqData.id,
        "rfq_type (original)": rfqData.rfq_type,
        "reverse_auction (original)": rfqData.reverse_auction,
        "rfq_type (display)": (() => {
          const type = rfqData.rfq_type;
          if (type === "firm") return "Firm";
          if (type === "budgetary") return "Budgetary";
          return type || "Not specified";
        })(),
        "reverse_auction (display)": (() => {
          const ra = rfqData.reverse_auction;
          return (ra === 1 || ra === true || ra === "1") ? "Enabled" : "Disabled";
        })()
      });
    }
  }, [rfqDetails, rfqProductsFromStore, rfqFormDataFromStore, selectedTerms, reduxState, rfqData]);

  // Log when the products list changes
  useEffect(() => {
    if (rfqProductsFromStore?.length > 0) {
      console.log("Products from store:", rfqProductsFromStore);
    }
  }, [rfqProductsFromStore]);

  // Log when terms change
  useEffect(() => {
    if (selectedTerms?.length > 0) {
      console.log("Selected terms:", selectedTerms);
    }
    if (allTerms?.length > 0) {
      console.log("All terms:", allTerms);
    }
  }, [selectedTerms, allTerms]);

  // Add a useEffect to debug term selection to help track issues
  useEffect(() => {
    if (allTerms?.length > 0 && selectedTerms?.length > 0) {
      console.log("Term Selection Debug:", {
        allTermsCount: allTerms.length,
        selectedTermsCount: selectedTerms.length,
        selectedTermIds: selectedTerms.map(t => t.id),
        firstFewAllTerms: allTerms.slice(0, 3).map(t => ({ id: t.id, name: t.term_content || t.name }))
      });
    }
  }, [allTerms, selectedTerms]);

  // Add useEffect to force term reselection after component mounts
  useEffect(() => {
    // Only run this once when the component has loaded and allTerms are available
    // Use the ref to ensure we only do this operation ONCE
    if (allTerms?.length > 0 && selectedTerms?.length > 0 && initialDataLoaded && !termRefreshCompletedRef.current) {
      console.log("Force refreshing terms selection status (one-time operation)...");
      
      // Mark that we've completed this refresh to prevent infinite loops
      termRefreshCompletedRef.current = true;
      
      // We'll deliberately dispatch the same terms to trigger UI updates
      const refreshedTerms = [...selectedTerms];
      dispatch(setTermsData(refreshedTerms));
    }
  }, [allTerms, initialDataLoaded, selectedTerms]);

  const fetchInitialData = async () => {
    try {
      // If we're re-fetching after an update, don't show loading indicators
      const isRefetch = initialized;
      
      if (!isRefetch) {
        setMainLoading(true);
        setRfqLoading(true);
      }
      
      setDataFetchError(null);

      const id = router.query.id;
      if (!id) {
        throw new Error("No RFQ ID provided");
      }

      // First get all the terms
      const termsResponse = await getTerms();
      
      // Set all available terms first so they're available for matching
      if (termsResponse?.data) {
        console.log("All available terms loaded:", termsResponse.data.length);
        
        // IMPORTANT: Keep the original IDs from the database intact
        // Do not modify or normalize them - this was causing the selection issue
        dispatch(setAllTerms(termsResponse.data));
      }

      const rfqResponse = await getRFQById(id);
      if (!rfqResponse.data) {
        throw new Error("No data received from RFQ endpoint");
      }

      const rfqData = rfqResponse.data;
      setRfqData(rfqData);

      console.log("RFQ data loaded with terms:", rfqData.terms);

      // CRITICAL FINAL FIX: Map API terms to UI terms by content
      if (rfqData.terms && rfqData.terms.length > 0 && termsResponse?.data) {
        console.log("Original API terms:", rfqData.terms);
        
        // First, get both ID and content from API terms
        const apiTerms = rfqData.terms.map(term => {
          // Get all possible content from API term
          let content = '';
          let termId = term.id;
          let name = '';
          
          if (term.content && term.content[0] && term.content[0].title) {
            content = term.content[0].title.trim();
            name = content;
          } else {
            content = (term.name || term.term_content || term.term_text || '').trim();
            name = content;
          }
          
          // Handle "Term 8018" format from view page
          // This helps match terms by ID format when displayed differently
          if (content.startsWith("Term ") && /^\d+$/.test(content.substring(5))) {
            termId = parseInt(content.substring(5));
          }
          
          return { 
            id: termId,
            content: content,
            name: name
          };
        });
        
        console.log("Parsed API terms:", apiTerms);
        
        // Check if we have any "Term XXXX" style terms
        const hasTermNumberFormat = apiTerms.some(t => 
          t.content.startsWith("Term ") && /^\d+$/.test(t.content.substring(5))
        );
        
        // Create selected terms array
        const selectedUITerms = [];
        
        // We'll try multiple matching strategies
        termsResponse.data.forEach(uiTerm => {
          const uiTermId = Number(uiTerm.id);
          const uiContent = (uiTerm.term_content || uiTerm.name || '').trim();
          
          // For each UI term, test against all API terms
          let matched = false;
          
          // First, try direct ID match (if we have Term XXXX format)
          if (hasTermNumberFormat) {
            matched = apiTerms.some(apiTerm => {
              // Check if either the term ID matches directly
              return Number(apiTerm.id) === uiTermId;
            });
          }
          
          // If no ID match, try content matching
          if (!matched) {
            matched = apiTerms.some(apiTerm => {
              const apiContent = apiTerm.content;
              
              // Start with exact match
              if (apiContent === uiContent) {
                return true;
              }
              
              // Try prefix matching (first 70 chars)
              if (apiContent && uiContent && 
                  (uiContent.substring(0, 70) === apiContent.substring(0, 70) ||
                   apiContent.includes(uiContent.substring(0, 70)) ||
                   uiContent.includes(apiContent.substring(0, 70)))) {
                return true;
              }
              
              return false;
            });
          }
          
          // If this term should be selected, add it
          if (matched) {
            selectedUITerms.push({
              id: uiTerm.id,
              name: uiTerm.term_content || uiTerm.name || ''
            });
          }
        });
        
        console.log("Selected UI terms after matching:", selectedUITerms);
        
        // Set terms in Redux state
        dispatch(setTermsData(selectedUITerms));
      } else {
        dispatch(setTermsData([]));
      }

      // Add this right after retrieving RFQ data
      console.log("Original RFQ Terms from API (before normalization):", 
        rfqData.terms ? rfqData.terms.map(t => ({
          id: t.id || t.term_id || 'undefined',
          term_id: t.terms_id || 'undefined',  // Check for terms_id which might be used in the map table
          name: t.name || t.term_text || t.term_content || 'undefined',
          allKeys: Object.keys(t)
        })) : 'No terms found'
      );

      // Also log the allTerms when they're fetched
      console.log("All available terms:", 
        termsResponse?.data ? termsResponse.data.map(t => ({
          id: t.id || 'undefined',
          term_content: (t.term_content || '').substring(0, 50) + '...',
          allKeys: Object.keys(t)
        })) : 'No terms available'
      );

      // Extract country code and number from contact_number
      if (rfqData.contact_number) {
        let fullContactNumber = rfqData.contact_number.trim();
        
        // Extract using exact format: "+91-8583848726"
        const match = fullContactNumber.match(/^\+(\d+)-(\d+)$/);
        if (match) {
          const countryCode = match[1];  // "91"
          const phoneNumber = match[2];   // "8583848726"
          
          // Set the values exactly like View RFQ
          rfqData.contact_number = phoneNumber; // Store only the number part
          setonecountrycode(countryCode);
          
          console.log("Extracted phone parts:", { countryCode, phoneNumber });
        } else {
          // If no match, try to clean the number
          rfqData.contact_number = fullContactNumber.replace(/[^0-9]/g, "");
        }
      }

      const [countriesResponse, projectsResponse, vendorsResponse, profileResponse] = 
        await Promise.all([
          getCountryCodes(),
          getProjectList(),
          vendorApproveList(),
          getProfile()
        ]);

      // Format the projects for select
      if (projectsResponse?.data) {
        const formattedProjects = projectsResponse.data.map(project => ({
          value: project.id,
          label: project.name || `Project #${project.id}`
        }));
        setProjects(formattedProjects);
      }

      const storeData = {
        rfq_id: rfqData.id,
        rfq_form_data: {
          ...rfqData,
          term_and_condition_files: rfqData.term_and_condition_files || []
        },
        rfq_products: rfqData.products || []
      };

      // Initialize the RFQ in Redux
      dispatch(intializeRfq(storeData));
      
      // Set terms initialized flag
      termsInitializedRef.current = true;
      console.log("Terms initialization complete. InitializedRef =", termsInitializedRef.current);

      if (!isRefetch) {
        setInitialized(true);
        setInitialDataLoaded(true);
      }
    } catch (error) {
      setDataFetchError(error.message || "Failed to load RFQ data");
      toast.error("Failed to load RFQ data. Please try again.");
      console.error("Error loading RFQ data:", error);
    } finally {
      setRfqLoading(false);
      setMainLoading(false);
    }
  };

  const handleFormFieldChange = (e, selectedOption, actionMeta = null) => {
    try {
      setHasUnsavedChanges(true);
      
      // For dropdown select
      if (actionMeta && actionMeta.name && selectedOption) {
        dispatch(
          setOtherFormFields({
            [actionMeta.name]: selectedOption.value,
          })
        );
        return;
      }
      
      if (e && e.target) {
        let fieldName = e.target.name;
        let fieldValue = e.target.value;
        
        // Update store with the new value using the new format
        dispatch(
          setOtherFormFields({
            [fieldName]: fieldValue,
          })
        );
      }
    } catch (error) {
      console.error("Error updating form field:", error);
      toast.error("Failed to update field. Please try again.");
    }
  };

  // Improved term change handler to handle selection properly
  const handleTermChange = (e, item) => {
    try {
      const isChecked = e.target.checked;
      const termId = item.id;
      const termContent = (item.term_content || item.name || '').trim();
      
      console.log(`Term change: ${termContent.substring(0, 50)}... (ID: ${termId}) -> ${isChecked ? 'CHECKED' : 'UNCHECKED'}`);
      
      // Clone the current terms array to avoid direct state mutation
      let updatedTerms = [...(selectedTerms || [])];
      
      if (isChecked) {
        // Only add if not already in the selection list (check by both ID and content)
        const alreadySelected = updatedTerms.some(term => 
          String(term.id) === String(termId) || 
          ((term.name || term.term_content || '').trim() === termContent)
        );
        
        if (!alreadySelected) {
          // Add the term with exact UI details to ensure proper rendering
          updatedTerms.push({
            id: termId,
            name: termContent
          });
          console.log(`Added term: ${termContent.substring(0, 50)}... (ID: ${termId})`);
        } else {
          console.log(`Term already in selection: ${termContent.substring(0, 50)}... (ID: ${termId})`);
        }
      } else {
        // Remove by both ID and content matching to ensure it's fully removed
        const initialLength = updatedTerms.length;
        
        // First try to remove by ID
        updatedTerms = updatedTerms.filter(term => String(term.id) !== String(termId));
        
        // If that didn't remove anything, try content matching
        if (updatedTerms.length === initialLength) {
          updatedTerms = updatedTerms.filter(term => {
            const existingContent = (term.name || term.term_content || '').trim();
            return existingContent !== termContent;
          });
        }
        
        console.log(`Removed term: ${termContent.substring(0, 50)}... (ID: ${termId})`);
      }
      
      // Update Redux with the new terms array
      dispatch(setTermsData(updatedTerms));
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error handling term change:", error);
      toast.error("An error occurred while updating terms. Please try again.");
    }
  };

  const handleTermFiles = async (action, param) => {
    try {
      setHasUnsavedChanges(true);
      
      if (action === "add") {
        try {
          const filePath = await handleFileUpload(param);
          dispatch(setTermFiles({ type: "add", value: filePath }));
          toast.success("File uploaded successfully");
        } catch (error) {
          console.error("File upload error:", error);
          toast.error(error.message || "Failed to upload file. Please try again.");
        }
      } else if (action === "remove") {
        const fileUrl = param;
        console.log("Removing file:", fileUrl);
        dispatch(setTermFiles({ type: "remove", value: fileUrl }));
      }
    } catch (error) {
      console.error("Error handling term files:", error);
      toast.error("An error occurred while processing files. Please try again.");
    }
  };

  // Create a new function to fetch and process terms with fresh content
  const fetchTermsForUpdate = async () => {
    try {
      // Get fresh terms from API
      const termsResponse = await getTerms();
      if (!termsResponse?.data) {
        console.error("Failed to fetch terms for update");
        return null;
      }
      
      return termsResponse.data;
    } catch (error) {
      console.error("Error fetching terms for update:", error);
      return null;
    }
  };

  const handleUpdateRFQ = async (formValues) => {
    try {
      if (!rfqData || !rfqData.id) {
        toast.error("Original RFQ data not available");
        return;
      }
      
      setLoading(true);
      
      // CRITICAL FIX: Fetch fresh terms to ensure we have full content
      const freshTerms = await fetchTermsForUpdate();
      
      // Clean the number - get ONLY digits for backend validation
      let cleanNumber = formValues.contact_number
        ? formValues.contact_number
            .replace(/[^0-9]/g, "") // Remove all non-numeric characters
            .replace(/^0+/, "") // Remove leading zeros
        : "";
      
      // Additional check to prevent country code duplication
      // Common country codes that might be at the start of the number
      const countryCodes = ['91', '1', '44', '61', '86', '7', '49', '33', '81', '82', '62', '55', '234', '27', '966', '65', '60', '52', '972'];
      
      // If the number starts with the selected country code, remove it
      if (onecountrycode && cleanNumber.startsWith(onecountrycode)) {
        cleanNumber = cleanNumber.substring(onecountrycode.length);
      }
      
      // Check for any country code at the beginning
      for (const code of countryCodes) {
        if (cleanNumber.startsWith(code) && code.length <= 4) {
          cleanNumber = cleanNumber.substring(code.length);
          break;
        }
      }
      
      // For display/store purposes, use the formatted version like View RFQ
      const displayContactNumber = onecountrycode 
        ? `+${onecountrycode}-${cleanNumber}`
        : cleanNumber;
      
      // Create basic payload with only fields that can be edited
      const dataToSend = {
        rfq_id: rfqData.id,
        company_name: formValues.company_name || rfqData.company_name,
        contact_name: formValues.contact_name || rfqData.contact_name,
        // IMPORTANT: Send ONLY digits to backend - exactly how CreateRFQ works
        contact_number: cleanNumber,
        response_email: formValues.response_email || rfqData.response_email,
        location: formValues.location || rfqData.location || "Not Specified",
        bid_end_date: formValues.bid_end_date || rfqData.bid_end_date || "",
        comment: formValues.comment || rfqData.comment || "",
        is_published: 1,
        // Ensure we preserve the original values
        rfq_type: rfqData.rfq_type,  
        reverse_auction: rfqData.reverse_auction
      };

      // Only include project_id if it exists and is a valid number
      if (formValues.project_id && !isNaN(formValues.project_id)) {
        dataToSend.project_id = parseInt(formValues.project_id);
      } else if (rfqData.project_id) {
        // Preserve the original project_id if no new one is selected
        dataToSend.project_id = parseInt(rfqData.project_id);
      }
      
      console.log("Sending update data:", dataToSend);
      
      // Format products to match EXACTLY what the backend expects for updates
      if (rfqData.products && rfqData.products.length > 0) {
        dataToSend.products = rfqData.products.map(product => {
          // Extract only the fields expected by backend validation
          return {
            product_id: product.product_id,
            variant: product.variant || 0,
            
            // Ensure these match the exact format expected
            vendors: Array.isArray(product.vendors) ? product.vendors : 
                    (Array.isArray(product.vendor_details) ? 
                      product.vendor_details.map(v => ({ user_id: v.user_id })) : 
                      []),
            
            // Ensure spec is properly formatted
            spec: Array.isArray(product.spec) ? product.spec : 
                 (Array.isArray(product.product_specs) ? 
                  product.product_specs.map(s => ({ title: s.title, value: s.value })) : 
                  [
                    { title: 'Size', value: 'Standard' },
                    { title: 'Spec', value: 'Standard' },
                    { title: 'Quantity', value: '1' },
                    { title: 'Unit', value: 'Pcs' }
                  ]),
            
            // Include these fields as expected by backend
            comment: product.comment || "",
            datasheet: product.datasheet || "",
            qap: product.qap || "",
            
            // Ensure file fields are arrays
            datasheet_file: Array.isArray(product.datasheet_file) ? product.datasheet_file : [],
            spec_file: Array.isArray(product.spec_file) ? product.spec_file : [],
            qap_file: Array.isArray(product.qap_file) ? product.qap_file : []
          };
        });
      }

      // Update the terms handling in handleUpdateRFQ
      if (selectedTerms && selectedTerms.length > 0) {
        console.log("Terms before processing for update:", selectedTerms);
        
        // CRITICAL FIX: Ensure we use fresh terms with full content
        const fullTerms = [];
        
        if (freshTerms && freshTerms.length > 0) {
          // Get IDs of selected terms
          const selectedTermIds = selectedTerms.map(term => 
            String(term.id || term.term_id)
          );
          
          console.log("Selected term IDs:", selectedTermIds);
          
          // For each API term, check if it's in our selected terms
          freshTerms.forEach(apiTerm => {
            const apiTermId = String(apiTerm.id || apiTerm.term_id);
            
            if (selectedTermIds.includes(apiTermId)) {
              // Get the full content
              const termContent = apiTerm.term_content || 
                                 apiTerm.name || 
                                 (apiTerm.content && apiTerm.content[0] ? apiTerm.content[0].title : null);
              
              // Only add terms with actual content (not "Term XXXX")
              if (termContent && !termContent.startsWith("Term ")) {
                fullTerms.push({
                  id: Number(apiTermId),
                  name: termContent
                });
                
                console.log(`Added term with full content: ID=${apiTermId}, Content="${termContent.substring(0, 50)}..."`);
              } else {
                // If we can't find content, try to get it from allTerms
                const matchingTerm = allTerms.find(t => String(t.id) === apiTermId);
                if (matchingTerm && matchingTerm.term_content) {
                  fullTerms.push({
                    id: Number(apiTermId),
                    name: matchingTerm.term_content
                  });
                  
                  console.log(`Added term from allTerms: ID=${apiTermId}, Content="${matchingTerm.term_content.substring(0, 50)}..."`);
                } else {
                  // Last resort - use a descriptive name
                  fullTerms.push({
                    id: Number(apiTermId),
                    name: `Full content for term ${apiTermId}`
                  });
                  
                  console.log(`Added term with placeholder content: ID=${apiTermId}`);
                }
              }
            }
          });
        } else {
          // Fallback if fresh terms couldn't be fetched
          console.warn("Couldn't fetch fresh terms, using allTerms as fallback");
          
          selectedTerms.forEach(term => {
            const termId = String(term.id || term.term_id);
            const matchingTerm = allTerms.find(t => String(t.id) === termId);
            
            if (matchingTerm) {
              fullTerms.push({
                id: Number(termId),
                name: matchingTerm.term_content || matchingTerm.name || term.name
              });
            } else {
              fullTerms.push({
                id: Number(termId),
                name: term.name || `Full content for term ${termId}`
              });
            }
          });
        }
        
        // Use these full terms for the update
        dataToSend.terms = fullTerms;
        
        console.log("Terms with full content for backend:", dataToSend.terms);
      } else {
        // If no terms selected, send empty array
        dataToSend.terms = [];
        console.log("No terms selected, sending empty array");
      }

      // Also add explicit logging before sending terms to backend in handleUpdateRFQ
      console.log("Terms before processing for backend (raw from Redux):", selectedTerms);

      // And add this after creating the terms array for the API
      console.log("Final terms structure being sent to API:", dataToSend.terms);

      // Submit the RFQ update
      updateRfq(dataToSend)
        .then((response) => {
          console.log("Update response:", response);
          setLoading(false);
          
          // More flexible success detection
          const isSuccess = response && 
            (response.success === true || 
             response.status === 'success' || 
             response.status === 200 || 
             !response.error);
             
          if (isSuccess) {
            toast.success("RFQ updated successfully!");
            
            // Reset initialization flag so we'll re-initialize terms on fetch
            termsInitializedRef.current = false;
            
            // Update local state with the new values - use display format for UI
            setRfqData(prevData => ({
              ...prevData,
              contact_name: formValues.contact_name,
              // Store the FORMATTED version for display
              contact_number: displayContactNumber,
              response_email: formValues.response_email,
              location: formValues.location,
              bid_end_date: formValues.bid_end_date,
              comment: formValues.comment,
              project_id: formValues.project_id,
              // Keep original values
              rfq_type: prevData.rfq_type,
              reverse_auction: prevData.reverse_auction,
              // Preserve terms, but use the deduplicated version
              terms: dataToSend.terms || prevData.terms
            }));
            
            // Clear and update the terms in Redux to prevent duplication
            dispatch(clearState());
            
            // IMPORTANT: Update Redux store - use display format for UI
            dispatch(
              setOtherFormFields({
                contact_name: formValues.contact_name,
                // Store the FORMATTED version for display
                contact_number: displayContactNumber,
                response_email: formValues.response_email,
                location: formValues.location,
                bid_end_date: formValues.bid_end_date,
                comment: formValues.comment,
                project_id: formValues.project_id
              })
            );
            
            // Set the deduplicated terms
            if (dataToSend.terms && dataToSend.terms.length > 0) {
              dispatch(setTermsData(dataToSend.terms));
            }
            
            // Navigate after success (without refetch to avoid race conditions)
            setTimeout(() => {
              router.push("/dashboard/buyer/rfq-management");
            }, 500);
          } else {
            console.error("Update failed:", response);
            toast.error(response?.message || "Failed to update RFQ. Please check the form and try again.");
          }
        })
        .catch((error) => {
          console.error("Error updating RFQ:", error);
          setLoading(false);
          
          if (error.response && error.response.data && error.response.data.message) {
            toast.error(error.response.data.message);
          } else {
            toast.error("Failed to update RFQ. Please check form fields and try again.");
          }
        });
    } catch (error) {
      setLoading(false);
      console.error("Error in handleUpdateRFQ:", error);
      toast.error("An error occurred while updating the RFQ: " + (error.message || "Unknown error"));
    }
  };

  const handleSaveDraft = () => {
    try {
      if (!rfqFormDataFromStore) {
        toast.error("RFQ form data is not initialized");
        return;
      }
      
      setLoading(true);
      
      // Clean the number for backend validation - ONLY digits
      let cleanNumber = (rfqFormDataFromStore.contact_number || "")
        .replace(/[^0-9]/g, "") // Remove all non-numeric characters
        .replace(/^0+/, ""); // Remove leading zeros
      
      // Prepare data for save draft
      const dataToSend = {
        id: rfqData.id,
        company_name: rfqFormDataFromStore.company_name,
        response_email: rfqFormDataFromStore.response_email,
        contact_name: rfqFormDataFromStore.contact_name,
        contact_number: cleanNumber, // ONLY digits for backend
        location: rfqFormDataFromStore.location,
        bid_end_date: rfqFormDataFromStore.bid_end_date,
        rfq_type: rfqFormDataFromStore.rfq_type,
        reverse_auction: rfqFormDataFromStore.reverse_auction,
        project_id: rfqFormDataFromStore.project_id,
        terms: rfqFormDataFromStore.terms || [],
        term_and_condition_files: rfqFormDataFromStore.term_and_condition_files || [],
        comment: rfqFormDataFromStore.comment,
        is_published: 0, // Save as draft
      };
      
      console.log("Saving draft with data:", dataToSend);
      
      saveDraft(dataToSend)
        .then((res) => {
          setLoading(false);
          toast.success("Draft saved successfully");
          setHasUnsavedChanges(false);
        })
        .catch((err) => {
          console.error("Error saving draft:", err);
          setLoading(false);
          toast.error("Failed to save draft. Please try again.");
        });
    } catch (error) {
      console.error("Error in handleSaveDraft:", error);
      setLoading(false);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  // Render product table
  const renderProductTable = () => {
    console.log("Rendering product table with:", rfqProductsFromStore);
    
    if (!rfqProductsFromStore || rfqProductsFromStore.length === 0) {
      return (
        <div className="alert alert-info">
          No products found for this RFQ. Products cannot be added in edit mode.
        </div>
      );
    }
    
    return (
      <div className="details-table">
      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Name Of Product</th>
              <th>Size & Specifications</th>
              <th>Quantity</th>
              <th>Current Lowest</th>
              <th>TDS</th>
              <th>QAP</th>
              <th>Comments</th>
              <th>Selected Vendors</th>
            </tr>
          </thead>
          <tbody>
            {rfqProductsFromStore && rfqProductsFromStore.length > 0 ? (
              rfqProductsFromStore.map((product, index) => {
                return (
                  <tr key={`product-${index}`}>
                    <td>{product.product_details?.[0]?.name || "---"}</td>
                    <td>
                        <div className="size-specification">
                          Size: {product.size || "---"}<br />
                          Spec: {product.product_specs?.map(s => `${s.title}: ${s.value}`).join(", ") || "---"}
                        </div>
                    </td>
                    <td>
                      {(() => {
                        // Try to extract from the spec text that's visible in the UI
                        const specText = product.product_specs?.map(s => `${s.title}: ${s.value}`).join(", ") || "";
                        
                        // Look for Quantity: X pattern in the spec text
                        const quantityMatch = specText.match(/Quantity:\s*(\d+)/i);
                        const quantity = quantityMatch ? quantityMatch[1] : null;
                        
                        // Look for Unit: X pattern in the spec text
                        const unitMatch = specText.match(/Unit:\s*(\w+)/i);
                        const unit = unitMatch ? unitMatch[1] : "NB";
                        
                        // If we found quantity and unit in the text, use them
                        if (quantity && unit) {
                          return `${quantity}-${unit}`;
                        }
                                                    
                        // Try extracting from original spec array if available
                        const quantitySpec = product.spec?.find(s => s.title === "Quantity");
                        const unitSpec = product.spec?.find(s => s.title === "Unit");
                        
                        if (quantitySpec?.value && unitSpec?.value) {
                          return `${quantitySpec.value}-${unitSpec.value}`;
                        }
                        
                        // Fallback to product quantity and hardcoded unit if spec not available
                        return product.quantity ? `${product.quantity}-${product.unit || "NB"}` : "---";
                      })()}
                    </td>
                    <td>{product.lowest_price || "---"}</td>
                    <td>{product.datasheet_file?.length > 0 ? "Available" : "N/A"}</td>
                    <td>{product.qap_file?.length > 0 ? "Available" : "N/A"}</td>
                    <td>{product.comment || "---"}</td>
                    <td>
                      {product.vendor_details?.length > 0 ? (
                        <div className="view-selected-vendors">
                              <a 
                            href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/buyer/rfq-management-vendor?type=buyer-view&vendors=${product.vendor_details.map(vendor => vendor.user_id).join(',')}&productid=${product.product_id}&variant=${product.variant}`}
                            className="page-link"
                              >
                            View
                              </a>
                        </div>
                      ) : (
                          <span className="text-muted">None</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                  <td colSpan="8" className="text-center">No products found</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    );
  };

  // Handle loading state
  if (mainLoading || rfqLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
        <Loader size="lg" />
      </div>
    );
  }

  // Handle error state
  if (dataFetchError) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          <p><strong>Error loading RFQ data:</strong> {dataFetchError}</p>
          <button 
            className="btn btn-primary mt-3" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Make sure we have data before rendering the form
  if (!initialized || !rfqData) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">
          <p>Unable to load RFQ data. Please try again.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-dark-blue text-white p-3 mb-4">
        <div className="container-fluid">
          <h1 className="fs-4 m-0">Edit RFQ #{rfqData?.rfq_no}</h1>
        </div>
      </div>

      <div className="container-fluid mb-4">
        <div className="d-flex">
          <Link href="/dashboard/buyer/rfq-management" className="me-2 text-decoration-none text-muted">
            Manage RFQs
          </Link>
          <span className="text-primary">Edit RFQ</span>
        </div>
      </div>

      <div className="container-fluid">
        {/* Products table */}
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="mb-0">RFQ #{rfqData?.rfq_no} details</h5>
          </div>
          <div className="card-body p-0">
            {rfqLoading ? (
              <div className="text-center p-4">
                <Loader size="sm" />
                <p className="mt-2">Loading product details...</p>
              </div>
            ) : (
              renderProductTable()
            )}
          </div>
        </div>

        {initialDataLoaded ? (
          <Formik
            initialValues={{
              company_name: rfqFormDataFromStore.company_name || "",
              contact_name: rfqFormDataFromStore.contact_name || "",
              // Only use the number part, without country code (country code is in a separate dropdown)
              contact_number: rfqFormDataFromStore.contact_number || "",
              response_email: rfqFormDataFromStore.response_email || "",
              location: rfqFormDataFromStore.location || "",
              bid_end_date: rfqFormDataFromStore.bid_end_date || "",
              comment: rfqFormDataFromStore.comment || ""
            }}
            validationSchema={EditRFQSchema}
            enableReinitialize={true}
            onSubmit={(values) => {
              // Clean the number - get ONLY digits for backend validation
              let cleanNumber = values.contact_number
                .replace(/[^0-9]/g, "") // Remove all non-numeric characters
                .replace(/^0+/, ""); // Remove leading zeros
              
              // Additional check to prevent country code duplication
              // Common country codes that might be at the start of the number
              const countryCodes = ['91', '1', '44', '61', '86', '7', '49', '33', '81', '82', '62', '55', '234', '27', '966', '65', '60', '52', '972'];
              
              // If the number starts with the selected country code, remove it
              if (onecountrycode && cleanNumber.startsWith(onecountrycode)) {
                cleanNumber = cleanNumber.substring(onecountrycode.length);
              }
              
              // Check for any country code at the beginning
              for (const code of countryCodes) {
                if (cleanNumber.startsWith(code) && code.length <= 4) {
                  cleanNumber = cleanNumber.substring(code.length);
                  break;
                }
              }

              // Format exactly like View RFQ with + symbol
              const displayContactNumber = onecountrycode 
                ? `+${onecountrycode}-${cleanNumber}`
                : cleanNumber;

              const updatedFormData = {
                ...rfqFormDataFromStore,
                company_name: values.company_name,
                contact_name: values.contact_name,
                // IMPORTANT: Send ONLY digits to backend - exactly how View RFQ works
                contact_number: cleanNumber,
                response_email: values.response_email,
                location: values.location,
                bid_end_date: values.bid_end_date,
                comment: values.comment
              };
              handleUpdateRFQ(updatedFormData);
            }}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue }) => (
              <Form onSubmit={handleSubmit}>
                <div className="card mb-4">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">RFQ Information</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                  <div className="col-md-6">
                        {/* Company Name - Read Only */}
                    <div className="mb-3">
                          <label className="form-label fw-medium">Company Name (Read Only)</label>
                      <div className="input-group">
                            <input
                              type="text"
                              className="form-control bg-light"
                              value={rfqData.company_name || "Not specified"}
                              disabled
                            />
                          </div>
                          <small className="text-muted">Company name cannot be changed after creation</small>
                        </div>
                        
                        {/* Contact Name */}
                        <div className="mb-3">
                          <label className="form-label fw-medium">Contact Name</label>
                          <input
                            type="text"
                            name="contact_name"
                            className="form-control"
                            value={values.contact_name}
                          onChange={(e) => {
                              handleChange(e);
                            handleFormFieldChange(e);
                          }}
                            onBlur={handleBlur}
                          />
                    </div>
                    
                        {/* Contact Number with Country Code */}
                    <div className="mb-3">
                          <label className="form-label fw-medium">
                            Contact Number <span className="text-danger">*</span>
                          </label>
                          <div className="d-flex">
                            {/* Country Code Dropdown */}
                        <select
                              name="countryCode"
                          className="form-select"
                              style={{
                                maxWidth: "130px",
                                marginRight: "6px",
                                maxHeight: "44px",
                              }}
                              value={onecountrycode}
                          onChange={(e) => {
                                setonecountrycode(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                            >
                              {countryCode.map((country) => (
                                <option
                                  key={country.id}
                                  value={country.phone_code}
                                >
                                  {country.country_code} ({country.phone_code})
                                </option>
                              ))}
                        </select>

                            {/* Mobile Number Input */}
                            <input
                              type="text"
                              name="contact_number"
                              className={`form-control ${
                                touched.contact_number && errors.contact_number
                                  ? "is-invalid"
                                  : ""
                              }`}
                              placeholder="Enter mobile number"
                              value={values.contact_number}
                              onChange={(e) => {
                                // Only allow numeric input for phone number
                                const numericValue = e.target.value.replace(/[^0-9]/g, '');
                                setFieldValue('contact_number', numericValue);
                                
                                // Also update form data in Redux store
                                dispatch(
                                  setOtherFormFields({
                                    contact_number: numericValue
                                  })
                                );
                                
                                setHasUnsavedChanges(true);
                              }}
                              onBlur={handleBlur}
                            />
                      </div>
                          {touched.contact_number && errors.contact_number && (
                            <div className="invalid-feedback d-block">
                              {errors.contact_number}
                    </div>
                          )}
                          
                          {/* Preview of formatted number */}
                          {values.contact_number && onecountrycode && (
                            <div className="form-text text-muted">
                              Formatted: <strong>{onecountrycode.startsWith('+') ? '' : '+'}{onecountrycode}-{values.contact_number.replace(/^0+/, '')}</strong>
                            </div>
                          )}
                    </div>
                    
                        {/* Response Email */}
                    <div className="mb-3">
                          <label className="form-label fw-medium">Response Email</label>
                      <input
                            type="email"
                            name="response_email"
                        className="form-control"
                            value={values.response_email}
                        onChange={(e) => {
                          handleChange(e);
                          handleFormFieldChange(e);
                        }}
                        onBlur={handleBlur}
                      />
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                        {/* RFQ Type */}
                        <div className="mb-3">
                          <label className="form-label fw-medium">RFQ Type (Read Only)</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control bg-light"
                              value={
                                (() => {
                                  const type = rfqData?.rfq_type;
                                  if (type === "firm") return "Firm";
                                  if (type === "budgetary") return "Budgetary";
                                  return type || "Not specified";
                                })()
                              }
                              disabled
                            />
                          </div>
                          <small className="text-muted">RFQ Type cannot be changed after creation</small>
                        </div>

                    {/* Procurement End Date */}
                    <div className="mb-3">
                          <label className="form-label fw-medium">Procurement End Date</label>
                      <input
                        type="date"
                        name="bid_end_date"
                        className="form-control"
                        value={values.bid_end_date}
                        onChange={(e) => {
                          handleChange(e);
                          handleFormFieldChange(e);
                        }}
                        onBlur={handleBlur}
                      />
                    </div>
                    
                    {/* Select Project */}
                    <div className="mb-3">
                          <label className="form-label fw-medium">Select Project</label>
                      <Select
                            key={`project-select-${rfqFormDataFromStore.project_id || 'none'}`}
                        options={projects}
                            value={(() => {
                              if (!rfqFormDataFromStore.project_id) return null;
                              const projectId = parseInt(rfqFormDataFromStore.project_id);
                              const match = projects.find(p => parseInt(p.value) === projectId);
                              return match || null;
                            })()}
                            onChange={(selectedOption) => {
                              const projectId = selectedOption ? parseInt(selectedOption.value) : null;
                              dispatch(setOtherFormFields({ project_id: projectId }));
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Select Project"
                        className="basic-select"
                        classNamePrefix="select"
                        isClearable={true}
                      />
                    </div>

                        {/* Reverse Auction */}
                        <div className="mb-3">
                          <label className="form-label fw-medium">Reverse Auction (Read Only)</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control bg-light"
                              value={
                                (() => {
                                  const ra = rfqData?.reverse_auction;
                                  return (ra === 1 || ra === true || ra === "1") ? "Enabled" : "Disabled";
                                })()
                              }
                              disabled
                            />
                          </div>
                          <small className="text-muted">Reverse Auction setting cannot be changed after creation</small>
                        </div>
                      </div>

                      {/* Delivery Location - Full Width */}
                      <div className="col-12">
                        <div className="mb-3">
                          <label className="form-label fw-medium">Delivery Location (Optional)</label>
                          <textarea
                            name="location"
                            className="form-control"
                            rows="3"
                            value={values.location}
                            onChange={(e) => {
                              handleChange(e);
                              handleFormFieldChange(e);
                            }}
                            onBlur={handleBlur}
                            placeholder="Enter delivery location details (optional)..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Terms & Conditions */}
                <div className="card mb-4">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">Terms & Conditions</h5>
                  </div>
                  <div className="card-body">
                    <div className="mb-4">
                      <h6 className="mb-3 fw-medium">Suggested Terms</h6>
                      <div className="terms-list border rounded p-3">
                        {allTerms && allTerms.length > 0 ? (
                          allTerms.map((item, index) => {
                            // Get clean term content for UI display and comparison
                            const itemContent = (item.term_content || item.name || '').trim();
                            
                            // Try multiple approaches to determine if this term is selected:
                            
                            // 1. First check by ID
                            let isSelected = selectedTerms && selectedTerms.some(term => 
                              String(term.id) === String(item.id)
                            );
                            
                            // 2. If not found by ID, check by content matching
                            if (!isSelected && selectedTerms && selectedTerms.length > 0) {
                              isSelected = selectedTerms.some(term => {
                                const selectedTermContent = (term.name || term.term_content || '').trim();
                                
                                // Match if content beginnings are similar
                                return itemContent && selectedTermContent && (
                                  itemContent.substring(0, 70) === selectedTermContent.substring(0, 70) ||
                                  itemContent.includes(selectedTermContent.substring(0, 70)) ||
                                  selectedTermContent.includes(itemContent.substring(0, 70))
                                );
                              });
                            }
                            
                            // Log the selection state for debugging
                            console.log(`Term #${index} (ID: ${item.id}): ${itemContent.substring(0, 50)}... - Selected: ${isSelected}`);
                            
                            // Format the term content to match the view page
                            // Check if it's already in "Term XXXX" format
                            let displayContent = itemContent;
                            if (!displayContent.startsWith("Term ")) {
                              displayContent = `${index + 1}. ${itemContent}`;
                            }
                            
                            return (
                              <div className="form-check mb-2" key={`term-${item.id}`}>
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`term-${item.id}`}
                                  checked={isSelected}
                                  onChange={(e) => handleTermChange(e, item)}
                                />
                                <label className="form-check-label" htmlFor={`term-${item.id}`}>
                                  {displayContent}
                                </label>
                              </div>
                            );
                          })
                        ) : (
                          <div className="alert alert-info mb-0">No terms available</div>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h6 className="mb-3 fw-medium">Add your own terms (Optional)</h6>
                      <textarea
                        name="comment"
                        className="form-control"
                        rows="5"
                        placeholder="Enter your own terms here..."
                        value={values.comment}
                        onChange={(e) => {
                          handleChange(e);
                          handleFormFieldChange(e);
                        }}
                      ></textarea>
                    </div>

                    <div>
                      <h6 className="mb-3 fw-medium">Upload Your Terms (Optional)</h6>
                      <div className="custom-file mb-3">
                        <input
                          type="file"
                          accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                          className="form-control"
                          id="customFile"
                          multiple
                          onChange={(e) => handleTermFiles("add", e)}
                        />
                      </div>

                      {termFiles && termFiles.length > 0 && (
                        <div className="uploaded-files mt-3">
                          <h6 className="mb-3">Uploaded Files:</h6>
                          <div className="row g-2">
                            {termFiles.map((file) => (
                              <div key={file} className="col-md-4">
                                <div className="d-flex align-items-center border rounded p-2">
                                  <span className="text-truncate flex-grow-1 me-2">{extractfileName(file)}</span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleTermFiles("remove", file)}
                                  >
                                    <FontAwesomeIcon icon={faClose} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-between mb-4">
                  <button
                    type="submit" 
                    className="btn btn-success px-4" 
                    disabled={storeLoading || loading}
                    onClick={(e) => {
                      // Ensure form validation is triggered
                      if (Object.keys(errors).length > 0) {
                        console.log("Form has validation errors:", errors);
                        // Display validation errors to user
                        Object.keys(errors).forEach(key => {
                          toast.error(`${key}: ${errors[key]}`);
                        });
                        e.preventDefault();
                      }
                    }}
                  >
                    {storeLoading || loading ? "Updating..." : "Update RFQ"}
                  </button>
                    <button
                      type="button"
                    className="btn btn-danger px-4"
                    onClick={() => router.push("/dashboard/buyer/rfq-management")}
                  >
                    Cancel
                    </button>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <div className="alert alert-info">
            <p className="mb-2">Loading RFQ form data. Please wait...</p>
            <div className="progress">
              <div 
                className="progress-bar progress-bar-striped progress-bar-animated" 
                role="progressbar" 
                style={{width: "100%"}}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EditRFQ; 