import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import axiosFormData from "@/lib/axiosFormData";
import { toast } from "react-toastify";

function MagicSearchPage() {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(false); // Set true for loading UI
    const [receivedData, setReceivedData] = useState(null);
    const [validationErrors, setValidationErrors] = useState(null);

    // Message rotation state for loading UI
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    // Array of messages to display during loading
    const messages = [
        'Please wait...',
        'We are uploading your Excel file...',
        'Almost there...',
        'Finalizing upload...',
        'Hang tight!'
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
            }
        }
    };

    const uploadToServer = async () => {
        if (!file) {
            toast.error("Please select a file!");
            return;
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("comment", comments);

        setLoading(true);
        axiosFormData
            .post(
                `${process.env.NEXT_PUBLIC_API_URL}/rfq/magic-search-rfq-create`,
                formData
            )
            .then((response) => {
                if (response.status == 1)
                    toast.success("We have created your RFQ");
                setReceivedData(response.data);
                if (response.validation_errors)
                    setValidationErrors(response.validation_errors);
            })
            .catch((error) => {
                toast.error(error.message)
                console.error(error);
            })
            .finally(() => {
                setLoading(false);
                setFile(null);
                setFileName('');
            });
    };

    const handleCommentChange = (e) => {
        setComments(e.target.value);
    }


    // Rotating messages logic for loader
    useEffect(() => {
        let messageInterval;

        if (loading) {
            messageInterval = setInterval(() => {
                setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
            }, 1500); // Rotate every 1.5 seconds
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
                    <div className="col-md-8 mx-auto text-center">
                        {/* //{ Drag and Drop Area } */}
                        <div
                            className="file-drop-area border border-success rounded p-5"
                            style={{
                                border: '2px solid green',
                                cursor: 'pointer',
                                backgroundColor: '#fff',
                                color: 'green',
                            }}
                            onClick={() => document.getElementById('fileInput').click()}
                        >
                            <p>{fileName || 'Upload / Drag and drop your excel file here'}</p>
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
                </div>
            </section>

            {/* Text Area Section */}
            <section className="search-sec-2 pb-4">
                <div className="container-fluid col-md-8  ">
                    <h6 className="font-bold" > Add your comments </h6>
                    <textarea rows="3" className="form-control border border-success " placeholder="Enter any additional details here..." onChange={handleCommentChange} />
                </div>
                <div className="text-center mt-3">
                    <Button variant="secondary" className="mt-0 mb-0" onClick={uploadToServer}>Submit</Button>
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
                <section className="search-sec-3 pb-4">
                    <div className="container-fluid col-md-8 mt-5 ">
                        <h4>RFQ hasn't been Created for this Products</h4>

                        {validationErrors?.length > 0 &&
                            <div className="details-table">
                                <div className="table-responsive">
                                    <table className="table table-striped ">
                                        <thead>
                                            <tr>
                                            <th>SR.</th>
                                            <th>Excel Row No.</th>
                                                <th>Product Error</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                validationErrors?.map((item, index) => {
                                                    console.log(item)
                                                    return (
                                                        <tr key={item?.row}>
                                                            <td>{index+1}</td>
                                                            <td>{item?.row}</td>
                                                            <td>

                                                                {item.errors?.product && <p>No Matching Product Found</p>}
                                                                {item.errors?.size && <p>{item.errors?.size}</p>}
                                                                {item.errors?.specifications && <p>{item.errors?.specifications}</p>}
                                                                {item.errors?.quantity && <p>{item.errors?.quantity}</p>}
                                                                {item.errors?.unit && <p>{item.errors?.unit}</p>}
                                                                {item.errors?.vendor && <p>No vendor Found for this Product</p>}

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
