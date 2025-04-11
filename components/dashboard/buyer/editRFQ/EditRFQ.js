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
} from "@/redux/slice";
import Link from "next/link";
import { toast } from "react-toastify";
import { getProjectList, getProjectTableDataById } from "@/services/project";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { extractfileName, handleFileUpload } from "@/utils/sharedFunctions";
import { getCountryCodes } from "@/services/cms";

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
  
  useEffect(() => {
    // Clear Redux store first
    dispatch(clearState());
    
    // Only start fetching when we have an ID
    if (router.query.id) {
      fetchInitialData();
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

  const fetchInitialData = async () => {
    try {
      setMainLoading(true);
      setRfqLoading(true);
      setDataFetchError(null);

      const id = router.query.id;
      if (!id) {
        throw new Error("No RFQ ID provided");
      }

      const rfqResponse = await getRFQById(id);
      if (!rfqResponse.data) {
        throw new Error("No data received from RFQ endpoint");
      }

      const rfqData = rfqResponse.data;
      setRfqData(rfqData);

      const [countriesResponse, projectsResponse, vendorsResponse, profileResponse, termsResponse] = 
        await Promise.all([
          getCountryCodes(),
          getProjectList(),
          vendorApproveList(),
          getProfile(),
          getTerms()
        ]);

      // Format the projects for select
      if (projectsResponse?.data) {
        const formattedProjects = projectsResponse.data.map(project => ({
          value: project.id,
          label: project.name || `Project #${project.id}`
        }));
        setProjects(formattedProjects);
      }

      if (termsResponse?.data) {
        dispatch(setAllTerms(termsResponse.data));
      }

      const storeData = {
        rfq_id: rfqData.id,
        rfq_form_data: {
          ...rfqData,
          terms: rfqData.terms || [],
          term_and_condition_files: rfqData.term_and_condition_files || []
        },
        rfq_products: rfqData.products || []
      };

      dispatch(intializeRfq(storeData));
      setInitialized(true);
      setInitialDataLoaded(true);
    } catch (error) {
      setDataFetchError(error.message || "Failed to load RFQ data");
      toast.error("Failed to load RFQ data. Please try again.");
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

  const handleTermChange = (e, item) => {
    try {
      console.log("Term change:", item, e.target.checked);
      
      let updatedTerms;
      if (e.target.checked) {
        // Add term using term_id for consistency
        updatedTerms = [...selectedTerms, { 
          id: item.term_id, 
          term_id: item.term_id,
          term_content: item.term_content || item.term_text 
        }];
      } else {
        // Remove term by filtering on term_id
        updatedTerms = selectedTerms.filter(termItem => termItem.term_id !== item.term_id);
      }
      
      console.log("Updated terms:", updatedTerms);
      dispatch(setTermsData(updatedTerms));
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Error handling term change:", error);
      toast.error("An error occurred while updating terms. Please try again.");
    }
  };

  const handleTermFiles = (action, param) => {
    try {
      setHasUnsavedChanges(true);
      
      if (action === "add") {
        const files = param.target.files;
        const filesArr = Array.from(files);
        
        if (filesArr.length <= 0) return;
        
        const formData = new FormData();
        
        for (let i = 0; i < filesArr.length; i++) {
          formData.append("files", filesArr[i]);
        }
        
        setLoading(true);
        
        uploadRFQFile(formData)
          .then((res) => {
            const filesUrl = res.data.imageNames;
            console.log("Upload response:", res.data);
            
            dispatch(setTermFiles({ type: "add", value: filesUrl }));
            setLoading(false);
            toast.success("Files uploaded successfully");
          })
          .catch((err) => {
            console.error("File upload error:", err);
            setLoading(false);
            toast.error("Failed to upload files. Please try again.");
          });
      } else if (action === "remove") {
        const fileUrl = param;
        console.log("Removing file:", fileUrl);
        
        dispatch(setTermFiles({ type: "remove", value: fileUrl }));
      }
    } catch (error) {
      console.error("Error handling term files:", error);
      setLoading(false);
      toast.error("An error occurred while processing files. Please try again.");
    }
  };

  const handleUpdateRFQ = (formValues) => {
    try {
      if (!rfqData || !rfqData.id) {
        toast.error("Original RFQ data not available");
        return;
      }
      
      setLoading(true);
      
      // Create basic payload with only fields that can be edited
      const dataToSend = {
        rfq_id: rfqData.id,
        company_name: formValues.company_name || rfqData.company_name,
        contact_name: formValues.contact_name || rfqData.contact_name,
        contact_number: (formValues.contact_number || rfqData.contact_number || "").replace(/\D/g, ''),
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

      // Format terms array as objects with id and name
      if (selectedTerms && selectedTerms.length > 0) {
        dataToSend.terms = selectedTerms
          .filter(term => term.term_id || term.id)
          .map(term => ({
            id: term.term_id || term.id,
            name: term.term_content || term.term_text || "Default Term"
        }));
      } else {
        dataToSend.terms = [];
      }

      // Submit the RFQ update
      updateRfq(dataToSend)
        .then((response) => {
          setLoading(false);
          // The updateRfq service returns response.data, not the full response object
          // So we need to check the response differently
          if (response && (response.success || response.status === 'success' || response.status === 200 || !response.error)) {
            toast.success("RFQ updated successfully!");
            
            // IMPORTANT: When updating rfqData, preserve the original rfq_type and reverse_auction
            // Create a copy of the original rfqData first
            const originalValues = {
              rfq_type: rfqData.rfq_type,
              reverse_auction: rfqData.reverse_auction
            };
            
            // Update only the editable fields, preserving the original values for read-only fields
            setRfqData(prevData => ({
              ...prevData,
              contact_name: formValues.contact_name || prevData.contact_name,
              contact_number: formValues.contact_number || prevData.contact_number,
              response_email: formValues.response_email || prevData.response_email,
              location: formValues.location || prevData.location,
              bid_end_date: formValues.bid_end_date || prevData.bid_end_date,
              comment: formValues.comment || prevData.comment,
              project_id: formValues.project_id || prevData.project_id,
              // Explicitly keep the original values for these fields
              rfq_type: originalValues.rfq_type,
              reverse_auction: originalValues.reverse_auction
            }));
            
            // Update Redux store with only the editable fields
            dispatch(
              setOtherFormFields({
                contact_name: formValues.contact_name,
                contact_number: formValues.contact_number,
                response_email: formValues.response_email,
                location: formValues.location,
                bid_end_date: formValues.bid_end_date,
                comment: formValues.comment,
                project_id: formValues.project_id
                // Don't include rfq_type or reverse_auction here
              })
            );
            
            // Add a slight delay before redirecting to ensure toast notification shows
            setTimeout(() => {
              router.push("/dashboard/buyer/rfq-management");
            }, 500);
          } else {
            console.error("Update response:", response);
            toast.error(response.message || "Failed to update RFQ");
          }
        })
        .catch((error) => {
          setLoading(false);
          console.error("Error updating RFQ:", error);
          
          if (error.response && error.response.data && error.response.data.message) {
            toast.error(error.response.data.message);
          } else {
            toast.error("Failed to update RFQ. Please check form fields and try again.");
          }
        });
    } catch (error) {
      setLoading(false);
      console.error("Error in handleUpdateRFQ:", error);
      toast.error("An error occurred while updating the RFQ");
    }
  };

  // Update terms effect to prevent hydration issues
  useEffect(() => {
    if (rfqData?.terms?.length > 0 && !selectedTerms?.length) {
      const mappedTerms = rfqData.terms.map(term => ({
        term_id: term.term_id,
        term_text: term.term_content || term.term_text || ""
      }));
      
      if (mappedTerms.length > 0) {
        dispatch(setTermsData(mappedTerms));
      }
    }
  }, [rfqData?.terms, dispatch]);

  const handleSaveDraft = () => {
    try {
      if (!rfqFormDataFromStore) {
        toast.error("RFQ form data is not initialized");
        return;
      }
      
      setLoading(true);
      
      // Prepare data for save draft
      const dataToSend = {
        id: rfqData.id,
        company_name: rfqFormDataFromStore.company_name,
        response_email: rfqFormDataFromStore.response_email,
        contact_name: rfqFormDataFromStore.contact_name,
        contact_number: onecountrycode 
          ? `${onecountrycode}-${rfqFormDataFromStore.contact_number}`
          : rfqFormDataFromStore.contact_number,
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

  // Auto-select terms when RFQ data is loaded
  useEffect(() => {
    if (rfqData?.terms?.length > 0 && allTerms?.length > 0 && !selectedTerms?.length) {
      console.log("Setting up initial terms from:", rfqData.terms);
      
      // Map to expected format
      const mappedTerms = rfqData.terms.map(term => ({
        id: term.term_id,
        term_id: term.term_id,
        term_content: term.term_content || term.term_text
      }));
      
      console.log("Mapped terms for Redux:", mappedTerms);
      
      if (mappedTerms.length > 0) {
        dispatch(setTermsData(mappedTerms));
      }
    }
  }, [rfqData?.terms, allTerms, dispatch, selectedTerms?.length]);

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
                              href={`http://localhost:8111/dashboard/buyer/rfq-management-vendor?type=buyer-view&vendors=${product.vendor_details.map(vendor => vendor.user_id).join(',')}&productid=${product.product_id}&variant=${product.variant}`}
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
              contact_number: rfqFormDataFromStore.contact_number || "",
              response_email: rfqFormDataFromStore.response_email || "",
              location: rfqFormDataFromStore.location || "",
              bid_end_date: rfqFormDataFromStore.bid_end_date || "",
              comment: rfqFormDataFromStore.comment || ""
            }}
            enableReinitialize={true}
            validate={(values) => {
              const errors = {};
              // Remove all required field checks
              return errors;
            }}
            onSubmit={(values) => {
              // Keep all the existing data from the store, just update what's in the form
              const updatedFormData = {
                ...rfqFormDataFromStore,
                company_name: values.company_name,
                contact_name: values.contact_name,
                contact_number: values.contact_number,
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
                    
                        {/* Contact Number */}
                    <div className="mb-3">
                          <label className="form-label fw-medium">Contact Number</label>
                          <input
                            type="text"
                            name="contact_number"
                            className="form-control"
                            value={values.contact_number}
                          onChange={(e) => {
                              handleChange(e);
                            handleFormFieldChange(e);
                          }}
                            onBlur={handleBlur}
                          />
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
                          <label className="form-label fw-medium">Delivery Location</label>
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
                            placeholder="Enter delivery location details..."
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
                            const isChecked = selectedTerms.some(term => 
                              term.id === item.term_id || 
                              term.term_id === item.term_id
                            );
                            const termKey = `term-${item.term_id || `index-${index}`}`;
                            
                            return (
                              <div className="form-check mb-2" key={termKey}>
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={termKey}
                                  checked={isChecked}
                                  onChange={(e) => handleTermChange(e, item)}
                                />
                                <label className="form-check-label" htmlFor={termKey}>
                                  {index + 1}. {item.term_content || item.term_text}
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