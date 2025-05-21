import { faCloudArrowUp, faClose } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { toast } from "react-toastify";
import { faFileExcel } from "@fortawesome/free-regular-svg-icons";
import { getFuturedate, formatISOToDateTimeLocal } from "@/utils/sharedFunctions";
import { getProjectList } from "@/services/project";
import { createRfq, getBOQexcelToJsonAI, getMagicRFQPreview, vendorApproveList } from "@/services/rfq";
import ReviewProducts from "./ReviewProducts";
import FullLoader from "@/components/shared/FullLoader";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import Select from 'react-select';
import { getCities, getCountries, getCountryCodes, getStates } from "@/services/cms";
import ProductSearchModal from "../../../modal/ProductSearchModal";
import { vendorConditions } from "../../vendor/search";
import axiosInstance from "@/lib/axios";
import MagicSearchDownloadModal from "@/components/modal/MagicSearchDownloadModal";


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
            
            //  upload boq file to ai server
            const aiResponse = await getBOQexcelToJsonAI(file);

            const downloadUrl = aiResponse?.data?.download_url;

            // const downloadUrl = "http://test.letsworkwise.com/download/json?file_hash=0b3f06af64f1ac699827a2ac33f430ab47eb243e91d22d1501eb85564d1150b5&stage=matched"

              if (!downloadUrl) {
                toast.error("Failed to create RFQ: Please try after few minutes.");
                setLoading(false);
                return;
              }

            // further process json data get from ai server, to fetch vendor list and display data on ui
            const response = await getMagicRFQPreview(downloadUrl);

            setApiData(response)

            // Delay the state update until all messages are shown
            setTimeout(() => {
                setLoading(false);
                setFileName('');
            }, 2000 * (fileUploadMessage.length - fileUploadMessageIndex));

        } catch (error) {
            console.error(error)
            toast.error(error.message?.response?.data?.message || "not able to create RFQ: Please try after few minutes");
            setLoading(false);
        } finally {
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
            if (!updatedVendors || updatedVendors.length === 0) {
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

        // Make a copy to ensure we don't mutate original data
        const rfqPayload = {
            ...reviewData,
            ...formDataWithoutFile,
            terms: selectedTerms.map((item) => ({
                id: Number(item.id),
                name: item.name || item.term_content || `Term ${item.id}`
            }))
        };
        
        // Ensure dates are in correct format
        if (rfqPayload.reverse_auction === 1) {
            // Changes by Agnij 2025-05-03 [Added validation for reverse auction dates]
            // Validate that reverse auction dates exist and are in proper format
            if (!rfqPayload.ra_start_date || rfqPayload.ra_start_date === '') {
                toast.error("Please set the Auction Start Date & Time for reverse auction");
                return;
            }
            
            if (!rfqPayload.ra_end_date || rfqPayload.ra_end_date === '') {
                toast.error("Please set the Auction End Date & Time for reverse auction");
                return;
            }
            
            // Ensure dates are in server expected format (YYYY-MM-DD HH:MM:SS)
            if (rfqPayload.ra_start_date && !rfqPayload.ra_start_date.includes(' ')) {
                if (rfqPayload.ra_start_date.includes('T')) {
                    const [date, time] = rfqPayload.ra_start_date.split('T');
                    rfqPayload.ra_start_date = `${date} ${time}`; // Changes by Agnij 2025-05-03 [Fixed timestamp format]
                } else {
                    // If only date, add default time
                    rfqPayload.ra_start_date = `${rfqPayload.ra_start_date} 08:00`; // Changes by Agnij 2025-05-03 [Fixed timestamp format]
                }
            }
            
            if (rfqPayload.ra_end_date && !rfqPayload.ra_end_date.includes(' ')) {
                if (rfqPayload.ra_end_date.includes('T')) {
                    const [date, time] = rfqPayload.ra_end_date.split('T');
                    rfqPayload.ra_end_date = `${date} ${time}`; // Changes by Agnij 2025-05-03 [Fixed timestamp format]
                } else {
                    // If only date, add default time
                    rfqPayload.ra_end_date = `${rfqPayload.ra_end_date} 17:00`; // Changes by Agnij 2025-05-03 [Fixed timestamp format]
                }
            }
        } else if (rfqPayload.reverse_auction === 0) {
            // If reverse auction is disabled, explicitly set dates to null
            rfqPayload.ra_start_date = null;
            rfqPayload.ra_end_date = null;
        }


        setSubmitLoading(true);
        const modifiedPayload = { ...rfqPayload };

        if (modifiedPayload.country_code && modifiedPayload.contact_number) {
          modifiedPayload.contact_number = `${modifiedPayload.country_code}-${modifiedPayload.contact_number}`;
        }
        delete modifiedPayload.country_code;

        createRfq(modifiedPayload)
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
                console.error(error)
                toast.error("Failed to create RFQ. Please check your form and try again.");
            })
            .finally(() => {
                setSubmitLoading(false)
            })
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
          </div>
        </section>

        {/* File Upload Section */}
        <section className="search-sec-1">
          <div className="container-fluid product-search">
            <div className="container bg-white rounded-4 p-5">
              {!reviewData ? (
                <>
                  <div className="col-md-8 mx-auto mt-2">
        
        <MagicSearchDownloadModal />

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
              ) : (
                <div className="row">

                  <div className="mb-2">
  
                    <div className=" d-flex justify-content-between align-items-end w-100 mb-3">
                       <h3 className="h5 mb-2">Vendor Filters</h3>
                    
                    
                      <div style={{ width: "auto", minWidth: "260px" }}>
                        <label className="form-label fw-medium mb-1">Select Subsheet</label>
                        <Select
                          name="sheetName"
                          options={sheetNameList?.map(name => ({ value: name, label: name })) || []}
                          value={globalFilters.sheetName}
                          placeholder="Sheet Name"
                          // isClearable
                          // isSearchable
                          onChange={(newValue, action) => {
                            handleFilterChange(newValue, { name: 'sheetName' }, false);
                          }}
                        />
                      </div>
                    </div>

                    <div className="row g-2">
                      <div className="col-md-3">
                        <div>
                          <p className="fw-medium mb-1">Country</p>
                            <Select
                              isMulti
                              name="country"
                              options={countries}
                              value={globalFilters.country}
                              placeholder="Country"
                              isClearable
                              isSearchable
                              onChange={(newValue, action) => {
                                handleFilterChange(newValue, action, true)
                              }}
                            />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div>
                          <p className="fw-medium mb-1">State</p>
                          <Select
                            isDisabled={!globalFilters.country || globalFilters.country.length <= 0}
                            isMulti
                            name="state"
                            options={getFilteredStates()}
                            value={globalFilters.state}
                            placeholder="State"
                            isClearable
                            isSearchable
                            onChange={(newValue, action) => {
                              handleFilterChange(newValue, action, true)
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div>
                          <p className="fw-medium mb-1">City</p>
                          <Select
                            isDisabled={!globalFilters.country || globalFilters.country.length <= 0}
                            isMulti
                            name="city"
                            options={getFilteredCities()}
                            value={globalFilters.city}
                            placeholder="City"
                            isClearable
                            isSearchable
                            onChange={(newValue, action) => {
                              handleFilterChange(newValue, action, true)
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div>
                          <p className="fw-medium mb-1">My Vendors</p>
                          <Select
                            options={[
                              { label: "All Vendors", value: null },
                              { label: "Private Vendors", value: { is_private: 1, is_linked_with_buyer: 1 } },
                              { label: "Public Vendors", value: { is_private: 0, is_linked_with_buyer: 1 } },
                              { label: "Both Vendors", value: { is_private: null, is_linked_with_buyer: 1 } },
                            ]}
                            value={globalFilters.vendor_info}
                            onChange={handleFilterChange}
                            name="vendor_info"
                            placeholder="Select"
                            isClearable
                            isSearchable
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row g-2 mt-2">
                      <div className="col-md-3">
                        <div>
                          <p className="fw-medium mb-1">Vendor Type</p>
                          <Select
                            isMulti
                            options={vendorTypes}
                            value={globalFilters.vendor_type}
                            onChange={handleFilterChange}
                            name="vendor_type"
                            placeholder="Select"
                            isClearable
                            isSearchable
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div>
                          <p className="fw-medium mb-1">Previously Worked With</p>
                          <Select
                            options={vendorConditions}
                            value={globalFilters.prev_worked_with}
                            onChange={handleFilterChange}
                            name="prev_worked_with"
                            placeholder="Select"
                            isClearable
                            isSearchable
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        {/* <div>
                          <p className="fw-medium mb-1">Vendor Approved By</p>
                          <Select
                            options={approved_by ? approved_by.map(item => ({
                              label: item.vendor_approve,
                              value: item.id
                            })) : []}
                            isMulti
                            value={globalFilters.vendor_approved_by}
                            onChange={handleFilterChange}
                            name="vendor_approved_by"
                            placeholder="Select"
                            isClearable
                            isSearchable
                          />
                        </div> */}
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
                          formData={formData}
                          sheetName={globalFilters?.sheetName?.value}
                          handleFormChange={handleFormChange}
                          projects={projects}
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
                        countries={countries}
                        vendorTypes={vendorTypes}
                        approved_by={approved_by}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Terms and Conditions check-box */}
              {termList && (
                <div className=" mt-4">
                  <h3 className="h5">Suggested Terms</h3>

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
                            formData?.country_code?.match(
                              /^\+\d{1,4}/
                            )?.[0] || "+91"
                          }
                          onChange={handleFormChange}
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
                        disabled
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

              {/* Add auction date fields when reverse auction is enabled */}
              {formData?.reverse_auction == 1 && (
                <>
                    <div className="col-md-4 mb-2">
                    <label htmlFor="ra_start_date" className="form-label">
                      RA Start Date & Time
                      </label>
                      <input
                      type="datetime-local"
                      name="ra_start_date"
                      id="ra_start_date"
                        className="form-control border border-dark-subtle"
                      value={formatISOToDateTimeLocal(formData?.ra_start_date)}
                        onChange={handleFormChange}
                       min={formData.bid_end_date 
                              ? formatISOToDateTimeLocal(formData.bid_end_date)
                              : new Date().toISOString().slice(0, 16)
                          }
                      />
                    </div>
                  <div className="col-md-4 mb-2">
                    <label htmlFor="ra_end_date" className="form-label">
                      RA End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="ra_end_date"
                      id="ra_end_date"
                      className="form-control border border-dark-subtle"
                      value={formatISOToDateTimeLocal(formData?.ra_end_date)}
                      onChange={handleFormChange}
                      min={
                        formData.ra_start_date
                          ? formatISOToDateTimeLocal(formData.ra_start_date)
                          : ""
                      }
                      disabled={!formData.ra_start_date}
                    />
                  </div>
                </>
              )}

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
