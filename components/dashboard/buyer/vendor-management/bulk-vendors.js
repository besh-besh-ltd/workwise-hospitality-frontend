import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCloudArrowUp, faDownload } from "@fortawesome/free-solid-svg-icons";
import { faFileExcel } from "@fortawesome/free-regular-svg-icons";
import React, { useEffect, useRef, useState } from 'react'
import { Button } from 'react-bootstrap';
import Loader from '@/components/shared/Loader';
import { toast } from 'react-toastify';
import { addBulkPrivateVendors } from '@/services/privateVendors';


const initialFormData = {
    file: null,
    is_private: 0
}

const BulkVendors = () => {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);
    const [validationErrors, setValidationErrors] = useState(null);
    const tableRef = useRef(null);

    const uploadToServer = async () => {
        if (!file) {
            toast.error("Please select a file!");
            return;
        }

        try {
            setLoading(true);
            const response = await addBulkPrivateVendors(formData);
            setValidationErrors(response.addVendor)
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
            setFile(null);
            setFileName('');
            setFormData(initialFormData);
        }
    }

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
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
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value
        }));
    }

    useEffect(()=> {
        if (typeof window !== "undefined" && tableRef.current) {
            tableRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [validationErrors])

    return (
        <>
            {/* Header Section */}
            <section className="vendor-common-header sc-pt-80">
                <div className="container-fluid text-center">
                    <h1 className="heading">Add Bulk Vendors</h1>
                </div>
            </section>

            {loading && <Loader />}

            {/* File Upload Section */}
            <section className="search-sec-1">
                <div className="container-fluid product-search">
                    <div className="container bg-white rounded-4 p-5">

                        {/* Download Sample Excel */}
                        <div className="col-md-8 mx-auto mt-2">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <h2 className="title fs-6 mb-0 ">Step 1: </h2>
                                <a
                                    title="Download this sample Excel and fill all the columns."
                                    href="/Sample Bulk Add Vendors Format.xlsx"
                                    className="d-flex justify-content-between align-items-center "
                                    style={{ cursor: "pointer" }}>
                                    <p className="fw-semibold mb-0 me-2" style={{ color: "var(--primary-color)" }}>Download, fill and upload this Excel file for smooth vendor Addition</p>
                                    <FontAwesomeIcon icon={faDownload} style={{ fontSize: "16px", color: "var(--primary-color" }} />
                                </a>
                            </div>
                        </div>

                        {/* //{ Drag and Drop Area } */}
                        <div className="col-md-8 mx-auto ">
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
                                onChange={handleFileUpload}
                            />
                        </div>

                        <div className="col-md-8 mx-auto mt-3">
                            <div className="col-md-4">
                                <label htmlFor="is_private" className="form-label fw-semibold mb-2">Private / Public: </label>
                                <select
                                    name="is_private"
                                    id="is_private"
                                    className="form-control border border-black"
                                    value={formData?.is_private}
                                    onChange={handleChange}
                                >
                                    <option value={0}>Public</option>
                                    <option value={1}>Private</option>
                                </select>
                            </div>
                        </div>

                        <div className="col-md-8 mx-auto mt-4">
                            <div className="row">
                                <div className="col-7"></div>
                                <div className="col-5 d-flex">
                                    <Button variant="secondary" className="ms-auto border-0" style={{ width: "280px" }} onClick={uploadToServer} id="add_bulk_vendors-vendor_actions-bulk_vendors_page">Add Vendors</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Defective Vendors */}
            {validationErrors &&
                <section className="vendor-mngt-sec-1 bg-white" ref={tableRef}>
                    <div className="container-fluid mt-0">
                        <div className="row ">
                            <div className="col-md-10 mx-auto">
                                <div className="vendor-mngt-con px-0">
                                    <h4 className=" text-danger fw-semibold">These Vendors are not added in our Portal for this reasons.</h4>

                                    {validationErrors?.length > 0 &&
                                        <div className="details-table border-0">
                                            <div className="table-responsive">
                                                <table className="table table-striped mb-0">
                                                    <thead>
                                                        <tr>
                                                            <th scope="col" className="text-nowrap">Row No.</th>
                                                            <th scope="col" className="text-nowrap">Email</th>
                                                            <th scope="col" className="text-nowrap">Mobile</th>
                                                            <th scope="col" className="text-nowrap">Message</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            validationErrors?.map((item) => {
                                                                return (
                                                                    <tr key={item?.index}>
                                                                        <td>{item?.index}</td>
                                                                        <td>{item?.email || "---"}</td>
                                                                        <td>{item?.mobile || "---"}</td>
                                                                        <td>{item?.message || "---"}</td>
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
                            </div>
                        </div>
                    </div>
                </section>
            }
        </>
    )
}

export default BulkVendors
