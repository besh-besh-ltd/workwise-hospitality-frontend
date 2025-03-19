import { faCloudArrowUp, faDownload, faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { toast } from "react-toastify";
import { faFileExcel } from "@fortawesome/free-regular-svg-icons";
import { getFuturedate, handleFileUpload, extractfileName } from "@/utils/sharedFunctions";
import { getProjectList, getProjectTableDataById } from "@/services/project";
import { createRfq, getMagicRFQPreview } from "@/services/rfq";
import ReviewProducts from "./ReviewProducts";
import FullLoader from "@/components/shared/FullLoader";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import Select from 'react-select';
import { getCities, getCountryCodes, getStates } from "@/services/cms";
import ProductSearchModal from "../../../modal/ProductSearchModal";


const initialFormData = {
    file: null,
    comment: '',
    reverse_auction: 1,
    rfq_type: '',
    bid_end_date: getFuturedate(),
    location: '',
    project_id: -1,
    response_email: '',
    contact_name: '',
    contact_number: '',
    company_name: '',
}


const MagicSearchPage = () => {
    const tableRef = useRef(null);
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [reviewData, setReviewData] = useState(null);
    const [validationErrors, setValidationErrors] = useState(null);
    const [formData, setFormData] = useState(initialFormData);

    const [projects, setProjects] = useState([]);
    const [termList, setTermList] = useState(null);
    const [termFiles, setTermFiles] = useState([]);

    const [loading, setLoading] = useState(false);
    const [termsLoading, setTermsLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [apiData, setApiData] = useState(null)

    const [fileUploadMessageIndex, setFileUploadMessageIndex] = useState(0);
    const [fileUploadMessagesDisplayed, setFileUploadMessagesDisplayed] = useState(false);

    const [submitMessageIndex, setSubmitMessageIndex] = useState(0);
    const [submitMessagesDisplayed, setSubmitMessagesDisplayed] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingRemoval, setPendingRemoval] = useState(null);

    const [cities, setCities] = useState(null);
    const [states, setStates] = useState(null);
    const [globalFilters, setGlobalFilters] = useState({
        city: null,
        state: null,
        is_private: { label: "All Vendors", value: 0 }
    });
    const [vendorMap, setVendorMap] = useState(new Map());
    const [countryCodes , setCountryCodes] = useState([]);


    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Tomorrow's date

    const defaultEndDate = new Date(today);
    defaultEndDate.setDate(today.getDate() + 30); // Default to 30 days ahead


    // Array of messages to display during loading
    const fileUploadMessage = [
        'Workwise AI is scanning your BOQ… Extracting all product details.',
        'Analyzing specifications, sizes, and quantities with precision…',
        'AI is matching products with the most relevant vendors…',
        'Identifying top vendors based on your specific requirements…',
    ];

    const submitMessage = [
        'Creating custom RFQs for each vendor—tailored to your needs…',
        'AI is sending RFQs directly to the selected vendors…',
        'Your AI-powered sourcing is underway… Sit back and relax!',
        'Almost done! Workwise AI has sent your enquiries. Expect responses soon.'
    ]

    const handleMagicFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileType = file.name.split('.').pop().toLowerCase();
            const validTypes = ['xlsx', 'xls'];
            if (!validTypes.includes(fileType)) {
                toast.error('Please upload a valid Excel file (xlsx, xls)');
            } else {
                setFileName(file.name);
                setFile(file);
                setFormData((prevState) => ({
                    ...prevState,
                    file
                }));
            }
        }
        // when we upload the same file again.
        event.target.value = null;
    };

    const uploadToServer = async () => {
        if (!file) {
            toast.error("Please select a file!");
            return;
        }

        try {
            setLoading(true);
            const response = await getMagicRFQPreview(file);
            setApiData(response)

            // Delay the state update until all messages are shown
            setTimeout(() => {
                setLoading(false);
                setFileName('');
            }, 2000 * (fileUploadMessage.length - fileUploadMessageIndex));

        } catch (error) {
            console.log(error)
            toast.error(error.message?.response?.data?.message);
            setLoading(false);
        } finally {
            setFile(null);
            setFileName('');
        }
    };

    const handleFormChange = async (e, type) => {
        const { name, value, checked, id } = e.target;
        
        if (type === "terms-checkbox") {
            const termId = parseInt(id.replace("term-item-", ""));
            const updatedTerms = termList.map((termItem) => {
                if (termItem.id === termId) {
                    return { ...termItem, selected: checked }; // Immutable update
                }
                return termItem;
            });
            setTermList(updatedTerms);
        } else if (name === "project_id" && value != -1) {
            try {
                const projectData = await getProjectData(value);
                if (projectData) {
                    setFormData((prevState) => ({
                        ...prevState,
                        project_id: value,
                        rfq_type: projectData.rfq_type || "",
                        reverse_auction: projectData.reverse_auction !== undefined ? projectData.reverse_auction : 1,
                        bid_end_date: projectData.ended_at 
                            ? new Date(projectData.ended_at).toISOString().split("T")[0] 
                            : "",
                        location: projectData.location || "",
                    }));
                } else {
                    console.error("Project data is empty or undefined.");
                }
            } catch (error) {
                console.error("Failed to handle project_id change:", error.message);
            }
        } else if (name === "country_code") {
            // Extract only the mobile number (remove old country code)
            const mobileNumber = formData?.contact_number.replace(/^\+\d{1,4}-?/, "") || "";
    
            setFormData((prevState) => ({
                ...prevState,
                contact_number: `${value}-${mobileNumber}`, // Add new country code with mobile
            }));
        } else if (name === "contact_number") {
            // Extract the current country code
            const existingCountryCode = formData?.contact_number.match(/^\+\d{1,4}/)?.[0] || "+91";
            
            // Ensure only digits are entered for the phone number
            const cleanedNumber = value.replace(/\D/g, "");
    
            setFormData((prevState) => ({
                ...prevState,
                contact_number: `${existingCountryCode}-${cleanedNumber}`, // Keep country code + valid number
            }));
        } else {
            setFormData((prevState) => ({
                ...prevState,
                [name]: name === "reverse_auction" ? parseInt(value) : value,
            }));
        }
    };
    

    const handleFilterChange = (selectedOption, actionMeta) => {
        setGlobalFilters((prevState) => ({
            ...prevState,
            [actionMeta.name]: selectedOption
        }))
    }

    const handleTermFiles = async (type, dynamicParam) => {
        try {
            if (type === "add") {
                const filePath = await handleFileUpload(dynamicParam);
                // Append the new file to the existing array
                setTermFiles(prevTermFiles => [...prevTermFiles, { type, value: filePath }]);
                dynamicParam.target.value = null;
            } else {
                // For other types, just add the dynamicParam as a new entry
                setTermFiles(prevTermFiles => [
                    ...prevTermFiles.filter(file => file.value !== dynamicParam)
                ]);
            }
        } catch (error) {
            let message = error.message;
            toast.error(message);
        }
    }


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

    const getAllStates = async () => {
        try {
            const res = await getStates();
            setStates(
                res.data.map((state) => ({
                    label: state.state_name,
                    value: state.id
                }))
            )
        } catch (error) {
            toast.error(error.message)
            return [];
        }
    };

    const getAllCities = async () => {
        try {
            const res = await getCities();
            setCities(
                res.data.map((city) => ({
                    label: city.city_name,
                    value: city.id
                }))
            )
        } catch (error) {
            toast.error(error.message)
            return [];
        }
    };

    const removeItem = (type, prodItem, vendor_id) => {
        let editedData = [];
        if (type === "product") {
            editedData = reviewData.products.filter((item) =>
                !(item.product_id === prodItem.product_id &&
                    item.variant === prodItem.variant)
            );
            toast.error(prodItem.name + " - Removed Successfully!");
        } else {
            editedData = reviewData.products.map((item) => {
                if (item.product_id === prodItem.product_id && item.variant === prodItem.variant) {
                    const remainingVendors = item.vendors.filter((vendorItem) =>
                        vendorItem.user_id !== vendor_id
                    );

                    if (remainingVendors.length === 0) {
                        setPendingRemoval({ prodItem });
                        setIsModalOpen(true);
                        return item;
                    } else {
                        item.vendors = remainingVendors;
                    }
                }
                return item;
            }).filter(item => item !== null);
        }


        if (editedData.length === 0) {
            setReviewData(null)
            setValidationErrors(null)
            setTermList(null);
        } else {
            setReviewData((prevData) => ({
                ...prevData,
                products: editedData
            }))
        }
    }

    // to handle the modal response
    const handleConfirm = () => {
        if (pendingRemoval) {
            const { prodItem } = pendingRemoval;
            setReviewData(prevData => ({
                ...prevData,
                products: prevData.products.filter(item =>
                    !(item.product_id === prodItem.product_id && item.variant === prodItem.variant)
                )
            }));
        }
        setIsModalOpen(false);
        setPendingRemoval(null);
        if (reviewData.length === 0) {
            setValidationErrors(null)
            setTermList(null);
        }
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setPendingRemoval(null);
    };

    const changeProductData = (type, e, prodItem) => {
        let editedData = [];
        const { name: fieldName, value: fieldValue } = e.target;
        editedData = reviewData.products.map((item) => {
            if (item.product_id === prodItem.product_id && item.variant === prodItem.variant) {
                if (type === "spec") {
                    item.spec = item.spec.map((specItem) =>
                        specItem.title === fieldName
                            ? { ...specItem, value: fieldValue }
                            : specItem
                    );
                } else if (type === "predefined_file") {
                    item[fieldName] = !item[fieldName]
                } else {
                    item[fieldName] = fieldValue
                }
            }
            return item;
        })

        setReviewData((prevData) => ({
            ...prevData,
            products: editedData
        }))
    }

    const handleFiles = async (type, e, prodItem, isRemove, fileLink) => {
        let editedData = [];
        if (isRemove) {
            editedData = reviewData.products.map((item) => {
                if (item.product_id === prodItem.product_id && item.variant === prodItem.variant) {
                    return {
                        ...item,
                        [type]: item[type].filter((file) => file !== fileLink)
                    };
                }
                return item;
            });
        } else {
            try {
                const filePath = await handleFileUpload(e);
                editedData = reviewData.products.map((item) => {
                    if (item.product_id === prodItem.product_id && item.variant === prodItem.variant) {
                        return {
                            ...item,
                            [type]: [...item[type], filePath]
                        };
                    }
                    return item;
                });
            } catch (error) {
                let message = error.message;
                toast.error(message);
                return;
            }
        }

        setReviewData((prevData) => ({
            ...prevData,
            products: editedData
        }))
    }

    const handleCreateRFQ = () => {
        const { file, ...formDataWithoutFile } = formData;
        const selectedTerms = termList.filter((term) => term.selected);
        const filesArray = termFiles.map(file => file.value);
        reviewData.term_and_condition_files = filesArray;
        const updatedProducts = [];

        for (const prodItem of reviewData.products) {
            const updatedVendors = vendorMap.get(`prod_${prodItem.product_id}_${prodItem.variant}`);
            if (updatedVendors.length === 0) {
                toast.error(`No Vendor is selected for ${prodItem.name}`);
                return;
            }
            const updatedProduct = {
                ...prodItem,
                vendors: updatedVendors.map(({ user_id, name }) => ({ user_id, name })),
            };
            updatedProducts.push(updatedProduct);
        }
        reviewData.products = updatedProducts;

        setSubmitLoading(true);
        createRfq({
            ...reviewData,
            ...formDataWithoutFile,
            terms: selectedTerms.map((item) => {
                return { id: item.id }
            })
        })
            .then((res) => {
                toast.success(
                    <h6><b>RFQ #{res.data.rfq_no}:</b> Successfully created!</h6>,
                    { position: "top-right" }
                );
                setFormData(initialFormData)
                setReviewData(null)
                setValidationErrors(null)
                setTermList(null);
            })
            .catch((error) => {
                console.log(error)
            })
            .finally(() => {
                setSubmitLoading(false)
            })
    }

    useEffect(() => {
        getAllProjects();
        // getTermsData();
        getAllCities();
        getAllStates();
    
        getCountryCodes()
            .then((res) => {
                setCountryCodes(res.data);
            })
            .catch((error) => {
                console.log(error);
            });
    
    }, []);
    

    // Display FileUploadMessages in a rotating fashion
    useEffect(() => {
        let fileMessageInterval;
        const fileMessageDisplayTime = 2000; // 2 seconds per message
        let fileMessageCount = 0;

        if (loading && !fileUploadMessagesDisplayed) {
            fileMessageInterval = setInterval(() => {
                setFileUploadMessageIndex((prevIndex) => (prevIndex + 1) % fileUploadMessage.length);
                if (fileMessageCount < fileUploadMessage.length) {
                    fileMessageCount++;
                } else {
                    setFileUploadMessagesDisplayed(true);
                    clearInterval(fileMessageInterval);
                }
            }, fileMessageDisplayTime);
        }

        return () => {
            clearInterval(fileMessageInterval);
        };
    }, [loading, fileUploadMessagesDisplayed]);


    // Display submitMessages in a rotating fashion
    useEffect(() => {
        let submitMessageInterval;
        const submitMessageDisplayTime = 2000; // 2 seconds per message
        let submitMessageCount = 0;

        if (submitLoading && !submitMessagesDisplayed) {
            submitMessageInterval = setInterval(() => {
                setSubmitMessageIndex((prevIndex) => (prevIndex + 1) % submitMessage.length);
                if (submitMessageCount < submitMessage.length) {
                    submitMessageCount++;
                } else {
                    setSubmitMessagesDisplayed(true);
                    clearInterval(submitMessageInterval);
                }
            }, submitMessageDisplayTime);
        }

        return () => {
            clearInterval(submitMessageInterval);
        };
    }, [submitLoading, submitMessagesDisplayed]);

    // Handle API response and state update after all messages are shown
    useEffect(() => {
        if (apiData) {
            const { status, validation_errors, data } = apiData;

            setTermFiles(data?.term_and_condition_files);
            setReviewData(data);
            setTermList(data?.terms.map(term => ({ ...term, selected: true })));
            setFormData((prevData) => ({
                ...prevData,
                response_email: data?.response_email,
                contact_name: data?.contact_name,
                contact_number: data?.contact_number,
                company_name: data?.company_name,
                bid_end_date: data?.bid_end_date ? data.bid_end_date : defaultEndDate.toISOString().slice(0, 10)
            }))

            // Handle successful response
            if (status === 1 && validation_errors?.length === 0) {
                toast.success("Review Your Products and submit");
            }

            // Handle partial validation errors
            if (validation_errors) {
                toast.warning("We are able to Partially add Products, please review and submit");
                setValidationErrors(validation_errors);
            }

            // Scroll to table if rendered
            setTimeout(() => {
                if (typeof window !== "undefined" && tableRef.current) {
                    tableRef.current.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                }
            }, 300);

            setApiData(null)
            setFileUploadMessagesDisplayed(false)
        }

    }, [fileUploadMessagesDisplayed, loading]);


    return (
      <>
        {loading && (
          <div
            style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'column',
              zIndex: 9999,
                        fontSize: '24px'
            }}
          >
            <p>{fileUploadMessage[fileUploadMessageIndex]}</p>
          </div>
        )}

        {submitLoading && (
          <div
            style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'column',
                        zIndex: 9999,
                        fontSize: '24px'
            }}
          >
            <p>{submitMessage[submitMessageIndex]}</p>
          </div>
        )}

        {/* Header Section */}
        <section className="vendor-common-header sc-pt-80">
          <div className="container-fluid text-center">
            <h1 className="heading">Magic Search</h1>
            {/* <Link href="/vendor/all" className="page-link backBtn">
                        <FontAwesomeIcon icon={faArrowLeft} /> Go back
                    </Link> */}
          </div>
        </section>

        {/* File Upload Section */}
        <section className="search-sec-1">
          <div className="container-fluid product-search">
            <div className="container bg-white rounded-4 p-5">
              {!reviewData ? (
                <>
                  <div className="col-md-8 mx-auto mt-2">
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <h2 className="title fs-6 mb-0 ">Step 1: </h2>
                      <a
                        title="Download this sample Excel and fill all the columns."
                        href="/Sample BOQ File Format.xlsx"
                        className="d-flex justify-content-between align-items-center "
                        style={{ cursor: "pointer" }}
                      >
                        <p
                          className="fw-semibold mb-0 me-2"
                          style={{ color: "var(--primary-color)" }}
                        >
                          Download, fill and upload the BOQ file for smooth RFQ
                          Creation
                        </p>
                        <FontAwesomeIcon
                          icon={faDownload}
                          style={{
                            fontSize: "16px",
                            color: "var(--primary-color",
                          }}
                        />
                      </a>
                    </div>
                  </div>
                  <div className="col-md-8 mx-auto">
                                    <h2 className="title fs-6 mb-2">Step 2: Upload Your File and other details.</h2>
                    <div
                      className="file-drop-area text-center rounded py-4"
                      style={{
                                            border: '2px dashed grey',
                                            cursor: 'pointer',
                                            backgroundColor: '#fff',
                                            color: 'green',
                      }}
                                        onClick={() => document.getElementById('fileInput').click()}
                    >
                                        <FontAwesomeIcon icon={fileName ? faFileExcel : faCloudArrowUp} style={{ fontSize: "45px" }} />
                                        <p className="fw-semibold ">{fileName || 'Upload / Drag and drop your excel file here'}</p>
                    </div>

                    {/* //{ Hidden File Input } */}
                    <input
                      id="fileInput"
                      type="file"
                      accept=".xlsx, .xls"
                      style={{ display: 'none' }}
                      onChange={handleMagicFileUpload}
                    />
                  </div>

                  {/* Download Sample Excel
                                <div className="col-md-8 mx-auto mt-2">
                                    <a
                                        title="Download this sample Excel and fill all the columns."
                                        href="/Sample BOQ File Format.xlsx"
                                        className="d-flex justify-content-end gap-2 "
                                        style={{ cursor: "pointer" }}>
                                        <p className="text-sm fw-semibold mb-0 " style={{ color: "var(--primary-color)" }}>Download, fill and upload the BOQ file for smooth RFQ Creation</p>
                                        <FontAwesomeIcon icon={faDownload} style={{ fontSize: "16px", color: "var(--primary-color" }} />
                                    </a>
                                </div> */}
                </>
              ) : (
                <div className="row">
                  <div className="col-md-3 mb-3">
                    <h3 className="h5 mb-3">Select Project</h3>
                    <select
                      name="project_id"
                      id="project_id"
                      className="form-control border border-dark-subtle"
                      value={formData.project_id}
                      onChange={handleFormChange}
                    >
                      <option value={-1}>Select Project</option>
                      {projects &&projects.length > 0 &&
                        projects.map((projectItem) => {
                          return (
                            <option
                              value={projectItem.value}
                              key={projectItem.value}
                            >
                              {projectItem.label}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div className="col-md-1 mb-3"></div>
                  <div className="col-md-8 mb-3">
                    <h3 className="h5 mb-3">Vendor Filters</h3>
                    <div className="row">
                      <div className="col-md-4">
                        <Select
                          name="city"
                          options={cities}
                          value={globalFilters.city}
                          placeholder="Select City"
                          isClearable
                          isSearchable
                          onChange={handleFilterChange}
                        />
                      </div>
                      <div className="col-md-4">
                        <Select
                          name="state"
                          options={states}
                          value={globalFilters.state}
                          placeholder="Select State"
                          isClearable
                          isSearchable
                          onChange={handleFilterChange}
                        />
                      </div>
                      <div className="col-md-4">
                        <Select
                          options={[
                            { label: "All Vendors", value: 0 },
                            { label: "Private Vendors", value: 1 },
                          ]}
                          value={globalFilters.is_private}
                          onChange={handleFilterChange}
                          name="is_private"
                          placeholder="Select"
                          isClearable={false}
                          isSearchable
                        />
                      </div>
                    </div>
                  </div>
                  {reviewData.products && reviewData.products.length > 0 && (
                    <>
                      <div className=" mb-4 mt-4 d-flex justify-content-between align-items-end w-100 px-3">
                        <h3 className="h5">Review Products</h3>
                        <ProductSearchModal
                          reviewData={reviewData}
                          setReviewData={setReviewData}
                        />
                      </div>

                      <ReviewProducts
                        data={reviewData.products}
                        changeProductData={changeProductData}
                        handleFiles={handleFiles}
                        removeItem={removeItem}
                        globalFilters={globalFilters}
                        vendorMap={vendorMap}
                        setVendorMap={setVendorMap}
                        cities={cities}
                        states={states}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Terms and Conditions check-box */}
              {termList && (
                <div className=" mt-4">
                  <h3 className="h5">Suggested Terms</h3>
                  {termsLoading ? (
                    <FullLoader />
                  ) : (
                    termList && (
                      <ul className="list-group">
                        {termList.map((item, index) => {
                          return (
                            <li
                              key={`term-item-${item.id}`}
                              className="list-group-item d-flex align-items-start border border-0"
                            >
                              <input
                                onChange={(e) =>
                                  handleFormChange(e, "terms-checkbox")
                                }
                                type="checkbox"
                                id={`term-item-${item.id}`}
                                className="form-check-input border border-dark-subtle me-2"
                                style={{ marginTop: ".15rem" }}
                                checked={item.selected}
                              />
                              <label
                                htmlFor={`term-item-${item.id}`}
                                className="form-check-label stretched-link text-sm"
                              >
                                {`${index + 1}. ${item?.name}`}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )
                  )}
                </div>
              )}

              {/* Terms and Conditions text-area */}
              {reviewData && (
                <div className="mx-auto mt-4">
                  <label className="form-label ">
                    Add your own terms (Optional)
                  </label>
                  <textarea
                    name="comment"
                    id="comment"
                    rows="3"
                    className="form-control border border-dark-subtle text-sm"
                    placeholder="Enter your own terms here..."
                    value={formData.comment}
                    onChange={handleFormChange}
                  />
                </div>
              )}

              {/* Contact information */}

              {reviewData && (
                <div className="mx-auto mt-4">
                  <div className="row mt-2">
                    <div className="custom-file">
                      <label htmlFor="customFile" className="form-label">
                        Upload Your Terms (Optional)
                      </label>
                      <input
                        type="file"
                        accept=".pdf, .docx, .doc, .xlsx, .xls, .csv, .png, .jpg, .jpeg"
                        className="form-control border border-dark-subtle"
                        id="customFile"
                        multiple
                        onChange={(e) => handleTermFiles("add", e)}
                      />

                      {termFiles?.length > 0 && (
                        <div className="row mt-2">
                          {termFiles?.map((term_file) => (
                            <div
                              key={term_file.value}
                              className="col-md-6 col-lg-4"
                            >
                              <a
                                href={term_file.value}
                                target="_blank"
                                className="file-badge mb-2"
                                type="button"
                              >
                                <span
                                  className="text-truncate me-3"
                                  style={{ maxWidth: "90%" }}
                                >
                                  {extractfileName(term_file?.value)}
                                </span>
                                <FontAwesomeIcon
                                  icon={faClose}
                                  style={{ fontSize: "20" }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleTermFiles("remove", term_file.value);
                                  }}
                                />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="h5 mt-5">Contact information</h3>
                  <div className="row">
                    <div className="col-md-6 mx-auto mt-2">
                      <label htmlFor="response_email" className="form-label">
                        Email
                      </label>
                      <input
                        type="text"
                        name="response_email"
                        id="response_email"
                        className="form-control border border-dark-subtle"
                        value={formData?.response_email}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="col-md-6 mx-auto mt-2">
                      <label htmlFor="contact_name" className="form-label">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        name="contact_name"
                        id="contact_name"
                        className="form-control border border-dark-subtle"
                        value={formData?.contact_name}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mx-auto mt-2">
                      <label htmlFor="contact_number" className="form-label">
                        Contact Number
                      </label>

                      {/* Flex container for country code dropdown and phone input */}
                      <div className="d-flex align-items-center gap-2">
                        {/* Country Code Dropdown */}
                        <select
                          name="country_code"
                          className="form-select border border-dark-subtle"
                          style={{ width: "30%" }}
                          value={
                            formData?.contact_number?.match(
                              /^\+\d{1,4}/
                            )?.[0] || "+91"
                          }
                          onChange={(e) => handleFormChange(e, "country_code")}
                        >
                          {/* Populate options from countryCodes state */}
                          {countryCodes.map((item) => (
                            <option
                              key={item.phone_code}
                              value={item.phone_code}
                            >
                              {item.country_code} ({item.phone_code})
                            </option>
                          ))}
                        </select>

                        {/* Phone Input Field */}
                        <input
                          type="text"
                          name="contact_number"
                          id="contact_number"
                          className="form-control border border-dark-subtle"
                          placeholder="Enter phone number"
                          value={
                            formData?.contact_number.replace(
                              /^\+\d{1,4}-?/,
                              ""
                            ) || ""
                          }
                          onChange={handleFormChange}
                        />
                      </div>
                    </div>

                    <div className="col-md-6 mx-auto mt-2">
                      <label htmlFor="company_name" className="form-label">
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        id="company_name"
                        className="form-control border border-dark-subtle"
                        value={formData?.company_name}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {reviewData && (
                <div className="mx-auto mt-2">
                  <div className="row">
                    <div className="col-md-4 mb-2">
                      <label htmlFor="rfq_type" className="form-label ">
                        RFQ Type (Optional)
                      </label>
                      <select
                        name="rfq_type"
                        id="rfq_type"
                        className="form-control border border-dark-subtle"
                        value={formData?.rfq_type}
                        onChange={handleFormChange}
                      >
                        <option value="">Select RFQ Type</option>
                        <option value="budgetary">Budgetary</option>
                        <option value="firm">Firm</option>
                      </select>
                    </div>

                    <div className="col-md-4 mb-2">
                      <label htmlFor="reverse_auction" className="form-label ">
                        Reverse Auction
                      </label>
                      <select
                        type="number"
                        name="reverse_auction"
                        id="reverse_auction"
                        className="form-control border border-dark-subtle"
                        value={formData?.reverse_auction}
                        onChange={handleFormChange}
                      >
                        <option value={1}>Enable</option>
                        <option value={0}>Disable</option>
                      </select>
                    </div>

                    <div className="col-md-4 mb-2">
                      <label htmlFor="bid_end_date" className="form-label ">
                        Procurement End Date
                      </label>
                      <input
                        type="date"
                        name="bid_end_date"
                        id="bid_end_date"
                        className="form-control border border-dark-subtle"
                        value={formData?.bid_end_date}
                        min={tomorrow.toISOString().slice(0, 10)}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="col-md-12 mb-2">
                      <label htmlFor="location" className="form-label ">
                        Delivery Location (Optional)
                      </label>
                      <input
                        type="text"
                        name="location"
                        id="location"
                        className="form-control border border-dark-subtle"
                        placeholder="Enter Delivery Location"
                        value={formData?.location}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mx-auto mt-4">
                <div className="row">
                  <div className="col-7"></div>
                  <div className="col-5 d-flex">
                    {reviewData ? (
                      <Button
                        variant="secondary"
                        className="ms-auto border-0"
                        style={{ width: "280px" }}
                        onClick={handleCreateRFQ}
                      >
                        Submit
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="ms-auto border-0"
                        style={{ width: "280px" }}
                        onClick={uploadToServer}
                      >
                        Automatically Generate RFQ's
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Defective Products */}
        {validationErrors && (
          <section className="search-sec-3 pb-4" ref={tableRef}>
            <div className="container-fluid col-md-8 mt-5 ">
              <h4 className="text-danger fw-semibold">
                RFQ hasn't been Created for this Products
              </h4>

              {validationErrors?.length > 0 && (
                <div className="details-table">
                  <div className="table-responsive">
                    <table className="table table-striped text-center ">
                      <thead>
                        <tr>
                          <th
                            style={{
                              backgroundColor: "var(--primary-color)",
                              color: "#fff",
                            }}
                          >
                            Sl. No.
                          </th>
                          <th
                            style={{
                              backgroundColor: "var(--primary-color)",
                              color: "#fff",
                            }}
                          >
                            Product Error
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationErrors?.map((item, index) => {
                          return (
                            <tr key={item?.row}>
                              <td>{index + 1}</td>
                              <td>
                                {item.errors?.product && (
                                  <p className="mb-0">{item.errors?.product}</p>
                                )}
                                {item.errors?.size && (
                                  <p className="mb-0">{item.errors?.size}</p>
                                )}
                                {item.errors?.specifications && (
                                  <p className="mb-0">
                                    {item.errors?.specifications}
                                  </p>
                                )}
                                {item.errors?.quantity && (
                                  <p className="mb-0">
                                    {item.errors?.quantity}
                                  </p>
                                )}
                                {item.errors?.unit && (
                                  <p className="mb-0">{item.errors?.unit}</p>
                                )}
                                {item.errors?.vendor && (
                                  <p className="mb-0">{item.errors?.vendor}</p>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          message={
            "This will remove all vendors for this product. Do you want to continue?"
          }
        />
      </>
    );
}

export default MagicSearchPage;