import AddVendorModal from '@/components/modal/AddVendorModal';
import Loader from '@/components/shared/Loader';
import { addPrivateVendor, privateVendorList } from '@/services/privateVendors';
import { faEdit } from '@fortawesome/free-regular-svg-icons';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react'
import { ToastContainer, toast } from "react-toastify";

const VendorManagement = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [privateVendors, setPrivateVendors] = useState([]);
    const [enableBulkUpload, setEnableBulkUpload] = useState(false);
    const [file, setFile] = useState(null);
    const [uploadProgress, setuploadProgress] = useState(0);

    const [openAddVendorModal, setOpenAddVendorModal] = useState(false);

    const handleAddVendor = (values, resetForm) => {
        setLoading(true);
        let payload = values;
        console.log(values);

        addPrivateVendor(payload)
            .then((res) => {        
                toast.success(res.message, { position: "top-right", });
                router.push("/dashboard/buyer/vendor-management");
            })
            .catch((error) => {
                toast.error(error.message?.response?.data?.message, { position: "top-right", });                      
                console.log(error)          
            })
            .finally(()=> {
                resetForm();
                setOpenAddVendorModal(false);
                setLoading(false);
            })     
    }

    const getPrivateVendorList = async ()=> {
        setLoading(true);
        privateVendorList(limit, page)
            .then((res)=> {
                setLoading(false)
                let totalVendors = res.data?.length || 0;
                setTotalPages(Math.ceil(totalVendors/limit));
                setPrivateVendors(res.data);

            })
            .catch((error)=> {
                setLoading(false);
                console.log(error);
            })
    }

    useEffect(()=> {
        getPrivateVendorList();
    }, []);

    return (
        <>
            <section className="vendor-common-header sc-pt-80">
                <div className="container-fluid">
                    <h1 className="heading">Vendor Management</h1>
                </div>
            </section>

            <section className="vendor-mngt-sec-1">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="vendor-mngt-con">
                                {/* Vendor add buttons */}
                                <span className="title">Add New Vendors</span>

                                <div className="filter">
                                    {!enableBulkUpload && (

                                        <div className="row ">
                                            <div className="col-5">
                                                <div className="d-flex">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary d-flex align-items-center justify-content-center "
                                                        onClick={() => setOpenAddVendorModal(true)}
                                                    >
                                                        Add Single Vendor
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary d-flex flex-column justify-content-center align-items-center"
                                                        onClick={() => {
                                                            setuploadProgress(0);
                                                            setEnableBulkUpload(!enableBulkUpload);
                                                        }}
                                                    >
                                                        Add Bulk Vendors
                                                        <span className="text-sm">(By Uploading Excel File)</span>
                                                    </button>
                                                </div>


                                                <div className="row mt-1">
                                                    <div className="col"></div>
                                                    <Link
                                                        title="Download this sample Excel and fill all the mandatory red columns."
                                                        className="col d-flex justify-content-center align-items-center gap-1 p-0 me-3 "
                                                        href={
                                                            "http://143.110.242.57:8112/user_document/1716462955635-82ae96ef-559e-4d17-82a6-16cbcf3d02fb.xlsx"
                                                        }
                                                    >
                                                        <span className="text-sm download-sample-excel-text">Download Sample Excel Format</span>
                                                        <span>
                                                            <Image
                                                                src="/assets/images/download-icon.png"
                                                                alt="Workwise"
                                                                width={13}
                                                                height={13}
                                                                priority={true}
                                                            />
                                                        </span>
                                                    </Link>
                                                </div>


                                            </div>
                                        </div>
                                    )}
                                    {enableBulkUpload && (
                                        <div className="row">
                                            <div className="col-md-8">
                                                <div className="input-group buyers-search">
                                                    <input
                                                        type="file"
                                                        className="form-control"
                                                        name="file"
                                                        accept=".xlsx"
                                                        onChange={uploadToClient}
                                                    />
                                                </div>
                                                <div className="d-flex mt-4 col-md-4">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary mr-2"
                                                        onClick={() => uploadToServer()}
                                                    >
                                                        Upload .xlsx
                                                    </button>
                                                    <div className="d-flex justify-content-end col-md-4">
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary mr-2"
                                                            onClick={() => {
                                                                setFile(null);
                                                                setuploadProgress(0);
                                                                setEnableBulkUpload(false);
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                                {file && (
                                                    <div
                                                        className={`progress mt-4 progress-${uploadProgress}`}
                                                    >
                                                        <div
                                                            className="progress-bar progress-bar-striped progress-bar-animated"
                                                            role="progressbar"
                                                            style={{ width: `${uploadProgress}%` }}
                                                            aria-valuenow={uploadProgress}
                                                            aria-valuemin="0"
                                                            aria-valuemax="100"
                                                        >{`${uploadProgress}%`}</div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-md-4"></div>
                                        </div>
                                    )}
                                </div>

                                <span className="title pt-5 pb-2">Your vendors List</span>
                                <div className="details-table p-4 ">
                                    {loading && <Loader />}

                                    <div className="table-responsive">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th scope='col'>Sl No.</th>
                                                    <th scope="col">Name of vendor</th>
                                                    <th scope="col">Email Id</th>
                                                    <th scope="col">Phone No.</th>
                                                    <th scope="col">Product List</th>
                                                    <th scope="col">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {privateVendors &&
                                                    privateVendors.map((item, index) => {
                                                        return (
                                                            <>
                                                                <tr key={item.id}>
                                                                    <td>{(page-1)*10 + index + 1}</td>
                                                                    <td>{item.vendor_name}</td>
                                                                    <td>{item.email}</td>
                                                                    <td>{item.phone}</td>
                                                                    <td>{item.product_list}</td>
                                                                    <td>
                                                                        <span className={`badge ${item.status === 0 ? 'badge-warning' : item.status === 1 ? 'badge-danger' : 'badge-success'}`}>
                                                                            {
                                                                                item.status === 0 ? "Pending"
                                                                                : item.status === 1 ? "Rejected"
                                                                                : "Reviewed"
                                                                            }
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        );
                                                    })}
                                                {privateVendors.length == 0 && (
                                                    <tr>
                                                        <td colSpan="6">No Private Vendors found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="pagination">
                                        {Math.ceil(totalPages / limit) > 1 && (
                                            <>
                                                <div
                                                    className="arrow-prev"
                                                    onClick={() => {
                                                        setPage((prevState) => {
                                                            return prevState - 1;
                                                        });
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={faChevronLeft} />
                                                </div>
                                                <div
                                                    className="arrow-next"
                                                    onClick={() => {
                                                        setPage((prevState) => {
                                                            return prevState + 1;
                                                        });
                                                    }}
                                                >
                                                    <FontAwesomeIcon icon={faChevronRight} />
                                                </div>
                                            </>
                                        )}

                                        <span>Page</span>
                                        <input type="number" min={1} max={totalPages} value={page} onChange={() => { }} />
                                        <span> of {totalPages}</span>
                                    </div>
                                    {/* <Pagination pageNo={page} totalPages={totalPages} /> */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {openAddVendorModal &&
                    <AddVendorModal
                        openAddVendorModal={openAddVendorModal}
                        closeModal={() => setOpenAddVendorModal(false)}
                        handleAddVendor={handleAddVendor}
                    />
                }
            </section>
            <ToastContainer />
        </>
    )
}

export default VendorManagement;
