import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Item from "./Item";
import Select from 'react-select';
import { createRfq, saveDraft, getTerms, vendorApproveList, getDraftData } from "@/services/rfq";
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
import { extractfileName, handleFileUpload } from "@/utils/sharedFunctions";
import { Accordion } from "react-bootstrap";
import { getCountryCodes } from "@/services/cms";


const CreateRFQ = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [mainLoading, setMainLoading] = useState(false);

  const [userProfile, setuserProfile] = useState(null);
  const [vendorApprovedList, setVendorApprovedList] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rfqProducts, setRfqProducts] = useState([]);

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
          // IMPORTANT: Only store minimal properties to prevent validation errors
          // The backend only expects id and name
          updatedTerms.push({
            id: termId,
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
    
    // IMPORTANT: Filter terms to only include id and name to prevent validation errors
    if (formDataCopy.terms && Array.isArray(formDataCopy.terms)) {
      formDataCopy.terms = formDataCopy.terms.map(term => ({
        id: Number(term.id || term.term_id), // Convert to number for backend
        name: term.name || term.term_content || `Term ${term.id}`
      }));
      
      console.log("Terms filtered for backend validation:", formDataCopy.terms);
    }
    
    let payload = {
      rfq_id: rfqDetails,
      products: rfqProductsRef.current,
      ...formDataCopy, // Use the filtered copy
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
      getDraftInitialData();
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
      const draftRes = await getDraftData();

      
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
      console.log(error)
    } finally {
      dispatch(setStoreLoading(false));
    }
  }

  useEffect(() => {
    getProfileDetails();
    getVendorApproveList();
    getAllProjects();
    getDraftInitialData();
    fetchCountryCodes();

  }, []);

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
 
  const countryCodeMatch = rfqFormDataFromStore.contact_number.match(/^\+(\d{1,4})-/);
  const countryCode1 = countryCodeMatch ? countryCodeMatch[0].slice(0, -1) : null; // Extracting country code from contact number


  
  
  const selectedCountry = countryCode.find(
    (item) => item.phone_code === countryCode1
  );           // Getting selected country from country code list

 
  

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
                  <Link href="/vendor/all" className="btn btn-primary">
                    Add Products
                  </Link>
                </div>
              ) : (
                <>
                  <div className="col-md-3 mb-3">
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
                    <Link href="/vendor/all" className="me-2">
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
                              // Use the same robust selection logic as in EditRFQ
                              const isSelected = selectedTerms && selectedTerms.some(term => {
                                // Convert both IDs to strings and try both id and term_id properties
                                const itemId = String(item.id || item.term_id);
                                const termId = String(term.id || term.term_id);
                                return itemId === termId;
                              });
                              
                              // Extract term content with consistent fallbacks
                              const termContent = item.term_content || item.name || item.term_text || 
                                                (item.content && Array.isArray(item.content) && item.content[0]?.title) ||
                                                `Term ${item.id}`;
                              
                              return (
                                <li key={`term-item-${item.id}`}>
                                  <input
                                    type="checkbox"
                                    id={`term-item-${item.id}`}
                                    checked={isSelected}
                                    onChange={(e) => handleTermChange(e, item)}
                                  />
                                  <label htmlFor={`term-item-${item.id}`}>
                                    {termContent}
                                  </label>
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
                            company_name: rfqFormDataFromStore.company_name,
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
                                  <FormikField
                                    className="selection-dropdown"
                                    isDisabled
                                    label="Company Name"
                                    value={rfqFormDataFromStore.company_name}
                                    // enableHandleChange={true}
                                    // handleChange={handleFormFieldChange}
                                    type="text"
                                    name="company_name"
                                    touched={touched}
                                    errors={errors}
                                  />
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