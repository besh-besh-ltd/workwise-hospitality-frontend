import DynamicFormModal from '@/components/modal/DynamicFormModal';
import Loader from '@/components/shared/Loader';
import Pagination from '@/components/shared/Pagination';
import { addPrivateVendor, privateVendorList } from '@/services/privateVendors';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react'
import { toast } from "react-toastify";

const VendorManagement = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalData, setTotalData] = useState(1);
    const [privateVendors, setPrivateVendors] = useState([]);
    const [enableBulkUpload, setEnableBulkUpload] = useState(false);
    const [file, setFile] = useState(null);
    const [uploadProgress, setuploadProgress] = useState(0);

    const [openAddVendorModal, setOpenAddVendorModal] = useState(false);


    useEffect(() => {
        const { newVendor } = router.query;
    
        // Update state based on the `newVendor` query value
        if (newVendor !== undefined) {
            setOpenAddVendorModal(newVendor === 'true'); // Set to true if value is 'true'
        }
      }, [router.query]);


    // const handleAddVendor = (values, resetForm) => {
    //     setLoading(true);
      
    //     let payload = values;
    //     payload.productDetails = productDetails;
    
    //     setOpenAddVendorModal(false);
        
        
    //     addPrivateVendor(payload)
    //         .then((res) => {
    //             toast.success(res.message, { position: "top-right", });
    //             getPrivateVendorList();
    //         })
    //         .catch((error) => {
    //             toast.error(error.message?.response?.data?.message, { position: "top-right", });
    //             console.log(error)
    //         })
    //         .finally(() => {
    //             resetForm();
    //             setLoading(false);
    //         })
    // }

    const handleAddVendor = (values, productDetails, resetForm) => {
        setLoading(true);
        let payload = values;
        payload.productDetails = productDetails;
    
        setOpenAddVendorModal(false);
        
        addPrivateVendor(payload)
            .then((res) => {
                toast.success(res.message, { position: "top-right", });
                getPrivateVendorList();
            })
            .catch((error) => {
                toast.error(error.message?.response?.data?.message, { position: "top-right", });
                console.log(error)
            })
            .finally(() => {
                resetForm();
                setLoading(false);
            })
    }
    
    const getPrivateVendorList = async () => {
        setLoading(true);
        privateVendorList(limit, page)
            .then((res) => {
                setLoading(false)
                let totalVendors = res.data?.length || 0;
                setTotalData(totalVendors);
                setPrivateVendors(res.data);

            })
            .catch((error) => {
                setLoading(false);
                console.log(error);
            })
    }

    useEffect(() => {
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
                                            <div className="col-md-7 col-lg-5">
                                                <div className="d-flex">
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary "
                                                        onClick={() => setOpenAddVendorModal(true)}
                                                    >
                                                        Add Single Vendor
                                                    </button>
                                                    {/* <Link 
                                                        href={`./vendor-management/bulk-vendors`}
                                                        className="btn btn-secondary"
                                                    >Add Bulk Vendors</Link> */}
                                                </div>

                                                {/* 
                                                <div className="row mt-1">
                                                    <div className="col"></div>
                                                    <a
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
                                                    </a>
                                                </div> */}


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
                                                    <th scope="col">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {privateVendors &&
                                                    privateVendors.map((item, index) => {
                                                        return (
                                                            <>
                                                                <tr key={item.id}>
                                                                    <td>{(page - 1) * 10 + index + 1}</td>
                                                                    <td>{item.name}</td>
                                                                    <td>{item.email}</td>
                                                                    <td>{item.mobile}</td>
                                                                    <td>
                                                                        <span className={`badge ${item.status == -1 ? "text-bg-warning"
                                                                            : item.status == 1 ? "text-bg-success"
                                                                                : item.status == 2 ? "text-bg-danger" : "text-bg-primary"}`}>
                                                                            {
                                                                                item.status == -1 ? "Pending"
                                                                                    : item.status == 1 ? "Approved"
                                                                                        : item.status == 2 ? "Rejected" : "Reviewed"
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

                                    <Pagination 
                                        page={page}
                                        setPage={setPage}
                                        limit={limit}
                                        setLimit={setLimit}
                                        totalData={totalData}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {openAddVendorModal &&
                    <DynamicFormModal
                        type="add-vendor"
                        openModal={openAddVendorModal}
                        closeModal={() => setOpenAddVendorModal(false)}
                        handleAddVendor={handleAddVendor}
                    />
                }
            </section>
        </>
    )
}

export default VendorManagement;
