import { faCloudArrowUp, faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { toast } from "react-toastify";
import { faFileExcel } from "@fortawesome/free-regular-svg-icons";
import { getFuturedate, handleFileUpload } from "@/utils/sharedFunctions";
import { getProjectList } from "@/services/project";
import { createRfq, getMagicRFQPreview, getTerms } from "@/services/rfq";
import ReviewProducts from "./ReviewProducts";
import Loader from "@/components/shared/Loader";
import FullLoader from "@/components/shared/FullLoader";


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
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [reviewData, setReviewData] = useState(null);
    const [validationErrors, setValidationErrors] = useState(null);
    const [formData, setFormData] = useState(initialFormData);

    const [projects, setProjects] = useState([]);
    const [termList, setTermList] = useState(null);

    const [loading, setLoading] = useState(false);
    const [termsLoading, setTermsLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [messagesDisplayed, setMessagesDisplayed] = useState(false);

    const tableRef = useRef(null);
    const apiDataRef = useRef(null);

    // Message rotation state for loading UI
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    // Array of messages to display during loading
    const messages = [
        'Workwise AI is scanning your BOQ… Extracting all product details.',
        'Analyzing specifications, sizes, and quantities with precision…',
        'AI is matching products with the most relevant vendors…',
        'Identifying top vendors based on your specific requirements…',
        'Creating custom RFQs for each vendor—tailored to your needs…',
        'AI is sending RFQs directly to the selected vendors…',
        'Your AI-powered sourcing is underway… Sit back and relax!',
        'Almost done! Workwise AI has sent your enquiries. Expect responses soon.'
    ];

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
    };

    const uploadToServer = async () => {
        if (!file) {
            toast.error("Please select a file!");
            return;
        }

        try {
            setLoading(true);
            const response = await getMagicRFQPreview(file);
            apiDataRef.current = response;

            // Delay the state update until all messages are shown
            setTimeout(() => {
                setLoading(false);
                setFileName('');
            }, 2000 * (messages.length - currentMessageIndex));

        } catch (error) {
            console.log(error)
            toast.error(error.message);
            setLoading(false);
        } finally {
            setFile(null);
            setFileName('');
        }
    };

    const handleFormChange = (e, type) => {
        const { name, value, checked, id } = e.target;

        if (type === "terms-checkbox") {
            const termId = parseInt(id.replace("term-item-", ""));
            const updatedTerms = termList.map((termItem) => {
                if (termItem.id === termId)
                    termItem.selected = checked
                return termItem
            })
            setTermList(updatedTerms);
        } else {
            setFormData((prevState) => ({
                ...prevState,
                [name]: value
            }));
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

    const getTermsData = () => {
        setTermsLoading(true);
        getTerms()
            .then((res) => {
                const terms = res.data?.map((item) => {
                    return {
                        ...item,
                        selected: true
                    };
                })
                setTermList(terms);
            })
            .catch((err) => {
                console.error(err);
            })
            .finally(() => setTermsLoading(false));
    };

    const removeItem = (type, prodItem, vendor_id) => {
        let editedData = [];
        if (type === "product") {
            editedData = reviewData.products.filter((item) =>
                !(item.product_id === prodItem.product_id &&
                    item.variant === prodItem.variant)
            );
        } else {
            editedData = reviewData.products.map((item) => {
                if (item.product_id === prodItem.product_id && item.variant === prodItem.variant) {
                    let updatedVendors = item.vendors.filter((vendorItem) =>
                        vendorItem.user_id !== vendor_id
                    );
                    item.vendors = updatedVendors;
                }
                return item;
            });
        }

        if (editedData.length === 0) {
            setReviewData(null)
            setValidationErrors(null)
        } else {
            setReviewData((prevData) => ({
                ...prevData,
                products: editedData
            }))
        }
    }

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
    }, []);

    // Display messages in a rotating fashion
    useEffect(() => {
        let messageInterval;
        let messageDisplayTime = 2000; // 2 seconds per message
        let messageCount = 0;

        if (loading && !messagesDisplayed) {
            messageInterval = setInterval(() => {
                setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
                if (messageCount < messages.length) {
                    messageCount++;
                } else {
                    setMessagesDisplayed(true);
                    clearInterval(messageInterval);
                }
            }, messageDisplayTime);
        }

        return () => {
            clearInterval(messageInterval);
        };
    }, [loading, messagesDisplayed]);

    // Handle API response and state update after all messages are shown
    useEffect(() => {
        if (messagesDisplayed && !loading && apiDataRef.current) {
            const { status, validation_errors, data } = apiDataRef.current;
            setReviewData(data);
            setTermList(data?.terms);
            formData.response_email= data?.response_email
            formData.contact_name= data?.contact_name
            formData.contact_number= data?.contact_number
            formData.company_name= data?.company_name
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

            apiDataRef.current = null;
            setMessagesDisplayed(false); // Reset the state for future uploads
        }
    }, [messagesDisplayed, loading]);

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
                    <p>{messages[currentMessageIndex]}</p>
                </div>
            )}

            {submitLoading && <Loader />}

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

                        {!reviewData ?
                            <>
                            <div className="col-md-8 mx-auto mt-2">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <h2 className="title fs-6 mb-0 ">Step 1: </h2>
                                <a
                                    title="Download this sample Excel and fill all the columns."
                                    href="/Sample Bulk Add Vendors Format.xlsx"
                                    className="d-flex justify-content-between align-items-center "
                                    style={{ cursor: "pointer" }}>
                                    <p className="fw-semibold mb-0 me-2" style={{ color: "var(--primary-color)" }}>Download, fill and upload the BOQ file for smooth RFQ Creation</p>
                                    <FontAwesomeIcon icon={faDownload} style={{ fontSize: "16px", color: "var(--primary-color" }} />
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
                            : <>
                                {reviewData.products && reviewData.products.length > 0 &&
                                    <>
                                        <h2 className="h4 mb-3">Review Products</h2>
                                        <ReviewProducts
                                            data={reviewData.products}
                                            changeProductData={changeProductData}
                                            handleFiles={handleFiles}
                                            removeItem={removeItem}
                                        />
                                    </>
                                }
                            </>
                        }

                        {/* Terms and Conditions check-box */}
                        {termList && <div className=" mt-4">
                            <h3 className="h5">Suggested Terms</h3>
                            {termsLoading ? <FullLoader />
                                : (termList &&
                                    <ul className="list-group">
                                        {termList.map((item, index) => {
                                            return (
                                                <li key={`term-item-${item.id}`} className="list-group-item d-flex align-items-start border border-0">
                                                    <input
                                                        onChange={(e) => handleFormChange(e, "terms-checkbox")}
                                                        type="checkbox"
                                                        id={`term-item-${item.id}`}
                                                        className="form-check-input border border-dark-subtle me-2"
                                                        style={{ marginTop: ".15rem" }}
                                                        checked={item.selected}
                                                    />
                                                    <label htmlFor={`term-item-${item.id}`} className="form-check-label stretched-link text-sm">
                                                        {`${index + 1}. ${item?.name}`}
                                                    </label>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                        </div>}


                        {/* Terms and Conditions text-area */}
                        {reviewData && <div className="mx-auto mt-4">
                            <label className="form-label ">Enter Terms and Conditions for Vendors</label>
                            <textarea
                                name="comment"
                                id="comment"
                                rows="3"
                                className="form-control border border-dark-subtle text-sm"
                                placeholder="Enter your own terms here..."
                                value={formData.comment}
                                onChange={handleFormChange} />
                        </div>}

                        {/* Contact information */}
                        
                        {reviewData && <div className="mx-auto mt-4">
                            <h3 className="h5">Contact information</h3>
                            <div className="row">
                                <div className="col-md-6 mx-auto mt-2">
                                    <label htmlFor="response_email" className="form-label">Email</label>
                                    <input
                                        type="text"
                                        name="response_email"
                                        id="response_email"
                                        className="form-control border border-dark-subtle"
                                        value={formData?.response_email}
                                        onChange={handleFormChange} />
                                </div>

                                <div className="col-md-6 mx-auto mt-2">
                                    <label htmlFor="contact_name" className="form-label">Contact Name</label>
                                    <input
                                        type="text"
                                        name="contact_name"
                                        id="contact_name"
                                        className="form-control border border-dark-subtle"
                                        value={formData?.contact_name}
                                        onChange={handleFormChange} />
                                </div>
                            </div>
                            <div className="row">
                            <div className="col-md-6 mx-auto mt-2">
                                    <label htmlFor="contact_number" className="form-label">Contact Number</label>
                                    <input
                                        type="text"
                                        name="contact_number"
                                        id="contact_number"
                                        className="form-control border border-dark-subtle"
                                        value={formData?.contact_number}
                                        onChange={handleFormChange} />
                                </div>
                                <div className="col-md-6 mx-auto mt-2">
                                    <label htmlFor="company_name" className="form-label">Company Name</label>
                                    <input
                                        type="text"
                                        name="company_name"
                                        id="company_name"
                                        className="form-control border border-dark-subtle"
                                        value={formData?.company_name}
                                        onChange={handleFormChange} />
                                </div>
                            </div>
                        </div>}

                        {reviewData && <div className="mx-auto mt-2">
                            <div className="row">

                                <div className="col-md-4 mb-2">
                                    <label htmlFor="reverse_auction" className="form-label ">Reverse Auction</label>
                                    <select
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
                                    <label htmlFor="rfq_type" className="form-label ">RFQ Type</label>
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
                                    <label htmlFor="bid_end_date" className="form-label ">Bid End Date</label>
                                    <input
                                        type="date"
                                        name="bid_end_date"
                                        id="bid_end_date"
                                        className="form-control border border-dark-subtle"
                                        value={formData?.bid_end_date}
                                        onChange={handleFormChange} />
                                </div>

                                <div className="col-md-4 mb-2">
                                    <label htmlFor="bid_end_date" className="form-label ">Project Name</label>
                                    <select
                                        name="project_id"
                                        id="project_id"
                                        className="form-control border border-dark-subtle"
                                        value={formData.project_id}
                                        onChange={handleFormChange}
                                    >
                                        <option value={-1}>Select Project</option>
                                        {projects && projects.length > 0 &&
                                            projects.map((projectItem) => {
                                                return (
                                                    <option value={projectItem.value}>{projectItem.label}</option>
                                                )
                                            })
                                        }
                                    </select>
                                </div>

                                <div className="col-md-8 mb-2">
                                    <label htmlFor="location" className="form-label ">Delivery Location</label>
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
                        </div>}

                        <div className="mx-auto mt-4">
                            <div className="row">
                                <div className="col-7"></div>
                                <div className="col-5 d-flex">
                                    {reviewData ?
                                        <Button
                                            variant="secondary"
                                            className="ms-auto border-0"
                                            style={{ width: "280px" }}
                                            onClick={handleCreateRFQ}
                                        >
                                            Submit
                                        </Button>
                                        : <Button
                                            variant="secondary"
                                            className="ms-auto border-0"
                                            style={{ width: "280px" }}
                                            onClick={uploadToServer}
                                        >
                                            Automatically Generate RFQ's
                                        </Button>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Defective Products */}
            {validationErrors &&
                <section className="search-sec-3 pb-4" ref={tableRef}>
                    <div className="container-fluid col-md-8 mt-5 ">
                        <h4 className="text-danger fw-semibold">RFQ hasn't been Created for this Products</h4>

                        {validationErrors?.length > 0 &&
                            <div className="details-table">
                                <div className="table-responsive">
                                    <table className="table table-striped text-center ">
                                        <thead>
                                            <tr>
                                                <th style={{ backgroundColor: "var(--primary-color)", color: "#fff" }}>Sl. No.</th>
                                                <th style={{ backgroundColor: "var(--primary-color)", color: "#fff" }}>Excel Row No.</th>
                                                <th style={{ backgroundColor: "var(--primary-color)", color: "#fff" }}>Product Error</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                validationErrors?.map((item, index) => {
                                                    return (
                                                        <tr key={item?.row}>
                                                            <td>{index + 1}</td>
                                                            <td>{item?.row}</td>
                                                            <td>

                                                                {item.errors?.product && <p className="mb-0">No Matching Product Found</p>}
                                                                {item.errors?.size && <p className="mb-0">{item.errors?.size}</p>}
                                                                {item.errors?.specifications && <p className="mb-0">{item.errors?.specifications}</p>}
                                                                {item.errors?.quantity && <p className="mb-0">{item.errors?.quantity}</p>}
                                                                {item.errors?.unit && <p className="mb-0">{item.errors?.unit}</p>}
                                                                {item.errors?.vendor && <p className="mb-0">No vendor Found for this Product</p>}

                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        }

                    </div>
                </section>
            }

        </>
    );
}

export default MagicSearchPage;
