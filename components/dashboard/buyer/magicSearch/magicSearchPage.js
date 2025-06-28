import { faCloudArrowUp, faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { toast } from "react-toastify";
import { faFileExcel } from "@fortawesome/free-regular-svg-icons";
import { getFuturedate, formatISOToDateTimeLocal, handleFileUpload, extractfileName } from "@/utils/sharedFunctions";
import { getProjectList } from "@/services/project";
import { createRfq, getBOQexcelToJsonAI, getMagicRFQPreview, vendorApproveList, getDraftData, pollBOQResult } from "@/services/rfq";
import ReviewProducts from "./ReviewProducts";
import FullLoader from "@/components/shared/FullLoader";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import Select from 'react-select';
import { getCities, getCountries, getCountryCodes, getStates } from "@/services/cms";
import ProductSearchModal from "../../../modal/ProductSearchModal";
import { vendorConditions } from "../../vendor/search";
import axiosInstance from "@/lib/axios";
import MagicSearchDownloadModal from "@/components/modal/MagicSearchDownloadModal";
import { useRouter } from "next/router";


// mukul 18/05/2025 -- added sheetNameList select filter 

const initialFormData = {
    file: null,
    comment: '',
    reverse_auction: 1,
    rfq_type: '',
    bid_end_date: getFuturedate(),
    ra_start_date: '',
    ra_end_date: '',
    location: '',
    project_id: -1,
    response_email: '',
    contact_name: '',
    contact_number: '',
    company_name: '',
}


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

const MagicSearchPage = () => {
    const router = useRouter();
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
    const [submitLoading, setSubmitLoading] = useState(false);
    const [apiData, setApiData] = useState(null)

    const [fileUploadMessageIndex, setFileUploadMessageIndex] = useState(0);
    const [fileUploadMessagesDisplayed, setFileUploadMessagesDisplayed] = useState(false);

    const [submitMessageIndex, setSubmitMessageIndex] = useState(0);
    const [submitMessagesDisplayed, setSubmitMessagesDisplayed] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingRemoval, setPendingRemoval] = useState(null);
    const [vendorTypes, setVendorTypes] = useState([]);

    const [cities, setCities] = useState(null);
    const [states, setStates] = useState(null);
    const [countries, setCountries] = useState(null);
    const [ sheetNameList, setSheetNameList ] = useState(null);
    const [globalFilters, setGlobalFilters] = useState({
        city: null,
        state: null,
        country: null,
        vendor_info: null,
        vendor_type: null,
        from: "",
        to: "",
        prev_worked_with: null,
        vendor_approved_by: null,
        sheetName:null,
    });
    const [vendorMap, setVendorMap] = useState(new Map());
    const [countryCodes , setCountryCodes] = useState([]);
    const [approved_by, setApproved_by] = useState([]);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Tomorrow's date

    const defaultEndDate = new Date(today);
    defaultEndDate.setDate(today.getDate() + 30); // Default to 30 days ahead




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

    // Step 1: Start async task and get task_id
    const startResponse = await getBOQexcelToJsonAI(file);
    const taskId = startResponse?.data?.task_id;

    if (!taskId) {
      toast.error("Server did not return task ID.");
      return;
    }

    // Step 2: Poll for result
    const aiResponse = await pollBOQResult(taskId);

    const downloadUrl = aiResponse?.download_url;
    const availableSheets = aiResponse?.sheetwise_downloads;

            // const downloadUrl = "http://13.204.45.37:8000/download/json?file_hash=bd52a6dd0a11b7d8db438b1d77897f15d0c3b5764333337f6ed1b876d49086b4&stage=matched"
            // const availableSheets = [
            //   {
            //     sheet_name: "MONOMER_COLD_ROOM",
            //     download_url:
            //       "http://13.204.45.37:8000/download/sheet_json?file_hash=bd52a6dd0a11b7d8db438b1d77897f15d0c3b5764333337f6ed1b876d49086b4&sheet=MONOMER_COLD_ROOM",
            //   },
            //   {
            //     sheet_name: "PRE_TREATMENT_CHEMICAL_PTC_",
            //     download_url:
            //       "http://13.204.45.37:8000/download/sheet_json?file_hash=bd52a6dd0a11b7d8db438b1d77897f15d0c3b5764333337f6ed1b876d49086b4&sheet=PRE_TREATMENT_CHEMICAL_PTC_",
            //   },
            //   {
            //     sheet_name: "SOLVENT_PLANT",
            //     download_url:
            //       "http://13.204.45.37:8000/download/sheet_json?file_hash=bd52a6dd0a11b7d8db438b1d77897f15d0c3b5764333337f6ed1b876d49086b4&sheet=SOLVENT_PLANT",
            //   },
            // ];

    if (!downloadUrl) {
      toast.error("Failed to create RFQ: Please try after few minutes.");
      return;
    }

    // Step 3: Use the result to continue with your existing flow
    const response = await getMagicRFQPreview(downloadUrl, availableSheets);
    if (response.validation_errors && response.validation_errors.length > 0) {
      setApiData(response);
      setTimeout(() => {
        setLoading(false);
        setFileName('');
      }, 2000 * (fileUploadMessage.length - fileUploadMessageIndex));
    } else {
      const extractedId = response.savedRfq;
      const numericId = parseInt(extractedId);
      return router.push(`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${numericId}`);
    }

  } catch (error) {
    console.error(error);
    toast.error(error.message || "RFQ creation failed. Please try again later.");
  } finally {
    setLoading(false);
    setFile(null);
    setFileName('');
  }
};


    const handleFormChange = (e) => {
        const { name, value } = e.target;
        
        // Handle reverse auction toggle
        if (name === 'reverse_auction') {
            const newValue = parseInt(value);
            
            // Changes by Agnij 2025-05-03 [Removed auto-setting of default dates for reverse auction]
            if (newValue === 1) {
                // Just set reverse auction flag without setting default dates
                setFormData({
                    ...formData,
                    reverse_auction: newValue
                });
                
                // Show notification to inform the user to set auction dates
                toast.info("Please set the Auction Start Date & Time and End Date & Time for reverse auction");
                return;
            } else if (newValue === 0) {
                // Clear auction dates when disabling reverse auction
                setFormData({
                    ...formData,
                    reverse_auction: newValue,
                    ra_start_date: '',
                    ra_end_date: ''
                });
                return;
            }
        }
        
        // Handle bid end date change
        else if (name === 'bid_end_date' && formData.reverse_auction == 1) {
            // Changes by Agnij 2025-05-03 [Removed auto-setting of default dates for reverse auction]
            // When changing bid end date, we don't auto-update auction dates anymore
            setFormData({
                ...formData,
                [name]: value
            });
            
            // Notify user to set auction dates if they're not set
            if ((!formData.ra_start_date || formData.ra_start_date === '') || 
                (!formData.ra_end_date || formData.ra_end_date === '')) {
                toast.info("Don't forget to set the auction dates for reverse auction");
            }
            return;
        }
        
        // Handle datetime-local inputs for auction dates
        else if ((name === 'ra_start_date' || name === 'ra_end_date') && value) {
            // Changes by Agnij 2025-05-03 [Fixed timestamp format issue]
            // Convert from datetime-local string format to server format (YYYY-MM-DD HH:MM:SS)
            // This preserves the exact time without timezone adjustments
            const [datePart, timePart] = value.split('T');
            const serverFormatDate = `${datePart} ${timePart}`; // Don't add extra :00
            
            setFormData({
                ...formData,
                [name]: serverFormatDate
            });
            return;
        }
        
        setFormData({
            ...formData,
            [name]: value
        });
    };
    

    const handleFilterChange = (selectedOption, actionMeta, clearLocation = false) => {
      // Changes by Agnij 2024-10-22 [Fixed global filters]
      
      if(clearLocation) {
        if(actionMeta.name == 'country') {
          setGlobalFilters((prevState) => ({
            ...prevState,
            state: null,
            city: null,
            [actionMeta.name]: selectedOption
          }))
          return;
        } else if(actionMeta.name == 'state') {
          setGlobalFilters((prevState) => ({
            ...prevState,
            city: null,
            [actionMeta.name]: selectedOption
          }))
          return;
        }
      }
      
      
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
                console.error(error)
            })
    }


    const getAllCountries = async () => {
      try {
          const res = await getCountries();
          setCountries(
              res.data.map((country) => ({
                  label: country.country_name,
                  value: country.id
              }))
          )
      } catch (error) {
          toast.error(error.message)
          return [];
      }
  };

    const getAllStates = async () => {
        try {
            const res = await getStates();
            setStates(
                res.data.map((state) => ({
                    label: state.state_name,
                    value: state.id,
                    country_id: state.country_id,
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
                    value: city.id,
                    state_id: city.state_id,
                    country_id: city.country_id
                }))
            )
        } catch (error) {
            toast.error(error.message)
            return [];
        }
    };

    const getFilteredStates = () => {
      if(!globalFilters.country || globalFilters.country <= 0) return states;

      let filteredStates = states;
      filteredStates = filteredStates.filter(state => globalFilters.country.some(country => country.value == state.country_id))

      return filteredStates;
    }

    const getFilteredCities = () => {
      if((!globalFilters.country || globalFilters.country <= 0) && (!globalFilters.state || globalFilters.state <= 0)) return cities;

      let filteredCities = cities;
      if(globalFilters?.country && globalFilters.country.length > 0)
        filteredCities = filteredCities.filter(city => globalFilters.country.some(country => country.value == city.country_id))

      if(globalFilters?.state && globalFilters.state.length > 0)
        filteredCities = filteredCities.filter(city => globalFilters.state.some(state => state.value == city.state_id))

      return filteredCities;
    }

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
                if (item.variant_id === prodItem.variant_id && item.variant === prodItem.variant) {
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
                            [type]: [...(item?.[type] ?? []), filePath]
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

    const handleSeeMyRfq = () => {
      router.push(`/dashboard/buyer/rfq-management?tab=create-rfq&draft_id=${apiData.savedRfq}`)
    };

    const getVendorApprovedby = () => {
        // Changes by Agnij 2024-10-22 [Fixed vendor approved by filter]
        vendorApproveList()
            .then((rsp) => {
                if (rsp && rsp.data) {
                    setApproved_by(rsp.data);
                } else {
                    console.error("No vendor approved by data returned");
                }
            })
            .catch((error) => {
                console.error("Error fetching vendor approved by data:", error);
            });
    };


    // once user created unstructure to structure excel fuile, and click on next button, we will call this function to create RFQ, by uploading the same file user uploaded to unstructure to structure
  const handleUploadForRFQ = async (jsonUrl) => {
  if (!jsonUrl) {
    toast.error("Invalid BOQ URL");
    return;
  }
  try {
    setLoading(true);
    const response = await getMagicRFQPreview(jsonUrl);
    setApiData(response);
  } catch (error) {
    console.error("RFQ Preview fetch failed:", error);
    toast.error("Failed to generate RFQ preview.");
  } finally {
    setLoading(false);
  }
};



    useEffect(() => {
        getAllProjects();
        // getTermsData();
        getAllCities();
        getAllStates();
        getAllCountries();
        getVendorApprovedby();
    
        getCountryCodes()
            .then((res) => {
                setCountryCodes(res.data);
            })
            .catch((error) => {
                console.error(error);
            });
    
        axiosInstance.get('/rfq/vendor-types/').then(res => {
          const {data} = res;
          setVendorTypes(data)
        }).catch((e) => {
          console.error(e)
        })
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

              // Set sheet names
              const sheets = data?.sheetNameList || [];
              setSheetNameList(sheets);
      
              // Default to the first sheet if available
              if (sheets.length > 0) {
                  setGlobalFilters((prev) => ({
                      ...prev,
                      sheetName: { label: sheets[0], value: sheets[0] },
                  }));
              }

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
          </div>
        </section>

        {/* File Upload Section */}
        <section className="search-sec-1">
          <div className="container-fluid product-search">
            <div className="container bg-white rounded-4 p-5">
              {!reviewData ? (
                <>
                  <div className="col-md-8 mx-auto mt-2">
        
        <MagicSearchDownloadModal onUploadForRFQ={handleUploadForRFQ}  />

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
                </>
              ) : null}

              <div className="mx-auto">
                <div className="row">
                  <div className="col-7"></div>
                  <div className="col-5 d-flex">
                    {reviewData ? (
                      <Button
                        variant="secondary"
                        className="ms-auto border-0"
                        style={{ width: "180px" }}
                        onClick={handleSeeMyRfq}
                      >
                        Edit My RFQ
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="ms-auto border-0 mt-4"
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
                RFQ hasn't been Created for these Products
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
