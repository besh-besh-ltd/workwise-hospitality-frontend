import { faArrowLeft, faCloudArrowUp, faDownload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import axiosFormData from "@/lib/axiosFormData";
import { toast } from "react-toastify";
import { getStates } from "@/services/cms";
import { faFileExcel } from "@fortawesome/free-regular-svg-icons";

const initialFormData = {
    file: null,
    comment: '',
    delivery_location: '',
    bid_end_date: ''
}

function MagicSearchPage() {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false); // Set true for loading UI
    const [receivedData, setReceivedData] = useState(null);
    const [validationErrors, setValidationErrors] = useState(null);
    const [states, setstates] = useState([]);
    const [formData, setFormData] = useState(initialFormData)
    const tableRef = useRef(null);

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

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const fileType = file.name.split('.').pop().toLowerCase();
            const validTypes = ['xlsx', 'xls'];
            if (!validTypes.includes(fileType)) {
                alert('Please upload a valid Excel file (xlsx, xls)');
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
        console.log(formData)
        
        try {
            setLoading(true);
            const response = await axiosFormData.post(
                `${process.env.NEXT_PUBLIC_API_URL}/rfq/magic-search-rfq-create`,
                formData
            )

            // Handle successful response
            if (response.status == 1 && response.validation_errors?.length == 0) {
                toast.success("We have Successfully created your RFQ");
            }
            setReceivedData(response.data);

            // Handle partial validation errors
            if (response.validation_errors) {
                toast.warning("We are able to Partially create your RFQ");
                setValidationErrors(response.validation_errors);
            }

            // Scroll to table if rendered
            setTimeout(() => {
                if (typeof window !== "undefined" && tableRef.current) {
                    tableRef.current.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                }
            }, 300)

        } catch (error) {
            console.log(error)
            toast.error(error.message)

        } finally {
            setLoading(false);
            setFileName('');
            setFormData(initialFormData);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value
        }));
    }

    const getAllStates = () => {
        getStates().then((res) => {
            let d = [];
            res.data.map((item) => {
                d.push({ label: item.state_name, value: item.id });
            });
            setstates(d);
        });
    };

    useEffect(() => {
        getAllStates();
    }, []);

    // Rotating messages logic for loader
    useEffect(() => {
        let messageInterval;

        if (loading) {
            messageInterval = setInterval(() => {
                setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
            }, 2000); // Rotate every 2 seconds
        }

        // Clean up interval on component unmount
        return () => {
            clearInterval(messageInterval);
        };
    }, [loading, messages.length]);


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


            {/* Header Section */}
            <section className="vendor-common-header sc-pt-80">
                <div className="container-fluid text-center">
                    <h1 className="heading">Magic Search</h1>
                    <Link href="/products" className="page-link backBtn">
                        <FontAwesomeIcon icon={faArrowLeft} /> Go back
                    </Link>
                </div>
            </section>

            {/* File Upload Section */}
            <section className="search-sec-1">
                <div className="container-fluid product-search">
                    <div className="container bg-white rounded-4 p-5">

                        {/* //{ Drag and Drop Area } */}
                        <div className="col-md-8 mx-auto text-center">
                            <div
                                className="file-drop-area rounded py-4"
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
                                onChange={handleFileUpload}
                            />
                        </div>

                        {/* Download Sample Excel */}
                        <div className="col-md-8 mx-auto mt-2">
                            <div className="d-flex justify-content-end gap-2 ">
                                <p className="text-sm fw-semibold mb-0 " style={{ color: "var(--primary-color)" }}>Download, fill and upload the BOQ file for smooth RFQ Creation</p>
                                <FontAwesomeIcon icon={faDownload} style={{ fontSize: "16px", color: "var(--primary-color" }} />
                            </div>
                        </div>

                        {/* Terms and Conditions text-area */}
                        <div className="col-md-8 mx-auto mt-4">
                            <p className="fw-semibold mb-2">Enter Terms and Conditions for Vendors</p>
                            <textarea
                                name="comment"
                                rows="3"
                                className="form-control border border-black "
                                placeholder="Enter your own terms here..."
                                onChange={handleChange} />
                        </div>

                        {/* Delivery location part */}
                        <div className="col-md-8 mx-auto mt-4">
                            <div className="row">
                                <div className="col-md-6">
                                    <label htmlFor="delivery_location" className="form-label fw-semibold mb-2">Delivery Location</label>
                                    <select
                                        className="form-control border border-black"
                                        id="delivery_location"
                                        name="delivery_location"
                                        value={formData?.location}
                                        onChange={handleChange}
                                        style={{ backgroundImage: "none !important" }}
                                    >
                                        <option value="" disabled selected>Select Location</option>
                                        {states.map((state) => (
                                            <option key={state.value} value={state.value}>
                                                {state.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label htmlFor="bid_end_date" className="form-label fw-semibold mb-2">Bid End Date</label>
                                    <input
                                        type="date"
                                        name="bid_end_date"
                                        id="bid_end_date"
                                        className="form-control border border-black"
                                        value={formData?.bid_end_date}
                                        onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div className="col-md-8 mx-auto mt-4">
                            <div className="row">
                                <div className="col-7"></div>
                                <div className="col-5 d-flex">
                                    <Button variant="secondary" className="ms-auto" style={{ width: "280px" }} onClick={uploadToServer}>Automatically Generate RFQ's</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* RFQ Products */}
            {/* {receivedData &&
                <section className="search-sec-3 pb-4">
                    <div className="container-fluid col-md-8 mt-5 ">
                        <h4>RFQ Created for this Products</h4>

                        {receivedData.otherDetails?.length > 0 &&
                            <div className="details-table">
                                <div className="table-responsive">
                                    <table className="table table-striped ">
                                        <thead>
                                            <tr>
                                                <th>Name of product</th>
                                                <th>Size & specifications</th>
                                                <th>Quantity & Unit</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                receivedData?.otherDetails?.map((item, index) => {
                                                    console.log(item)
                                                    return (
                                                        <tr key={`product_${item?.product_info?.product_id}_${item?.product_info?.variant}`}>
                                                            <td>{item?.product_info?.product_id}_{item?.product_info?.variant}</td>
                                                            <td>
                                                                <p className="mb-2"><b>Size: </b>{item?.spec_info[0]?.value}</p>
                                                                <p className="mb-0"><b>Spec: </b>{item?.spec_info[1]?.value}</p>
                                                            </td>
                                                            <td>{item?.spec_info[2]?.value}, {item?.spec_info[3]?.value}</td>
                                                            <td className="text-success">Success</td>
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
            } */}

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
                                                <th style={{backgroundColor: "var(--primary-color)", color: "#fff"}}>Sl. No.</th>
                                                <th style={{backgroundColor: "var(--primary-color)", color: "#fff"}}>Excel Row No.</th>
                                                <th style={{backgroundColor: "var(--primary-color)", color: "#fff"}}>Product Error</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                validationErrors?.map((item, index) => {
                                                    console.log(item)
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
