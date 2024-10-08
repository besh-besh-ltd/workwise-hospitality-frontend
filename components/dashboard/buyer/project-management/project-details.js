import AddVendorModal from '@/components/modal/AddVendorModal';
import Pagination from '@/components/shared/Pagination';
import { getProjectById } from '@/services/project';
import { faEdit } from '@fortawesome/free-regular-svg-icons';
import { faCloudArrowUp, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react'
import PlaceholderLoading from 'react-placeholder-loading'

const ProjectDetails = () => {
    const pathname = usePathname();

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalData, setTotalData] = useState(100);

    const [loading, setLoading] = useState(false);
    const [projectDetails, setProjectDetails] = useState(null);
    const [openEditProject, setOpenEditProject] = useState(false);

    const projectIdRef = useRef(null);


    const getProjectDetails = () => {
        setLoading(true)
        const payload = { page, limit };

        getProjectById(projectIdRef.current, payload)
            .then((res) => {
                setProjectDetails(res.data[0])
                setTotalData(res.data[0]?.rfqs?.length)
            })
            .catch((error) => {
                console.log(error)
            })
            .finally(() => {
                setLoading(false)
            });
    }

    const handleEditProject = (values, resetForm)=> {
        console.log(values)
    }

    useEffect(() => {
        const pathParts = pathname?.split('/');
        const pathLen = pathParts?.length;
        if (pathname && !isNaN(pathLen)) {
            const projectId = pathParts[pathLen - 1];
            if (projectId) {
                projectIdRef.current = projectId;
                getProjectDetails();
            }
        }
    }, [pathname, page, limit])


    return (
        <>
            <section className="vendor-common-header sc-pt-80">
                <div className="container-fluid">
                    <h1 className="heading">Project Details</h1>
                </div>
            </section>

            <section className="vendor-mngt-sec-1">
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-12">
                            <div className="vendor-mngt-con">

                                {/* Project Overview Section */}
                                <div className="d-flex justify-content-between">
                                    <span className="title mb-2">Project Overview</span>
                                    <button
                                        type="button"
                                        className="page-link backBtn btn btn-primary text-sm text-white px-2 m-0 "
                                        style={{ width: "100px", backgroundColor: "var(--primary-color)" }}
                                        onClick={() => setOpenEditProject(true)}
                                    >
                                        <FontAwesomeIcon icon={faEdit} className="me-2" />
                                        Edit
                                    </button>
                                </div>

                                <div className="details-table p-4 mb-4">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <p>
                                                <strong>Project Name : </strong>
                                                {projectDetails?.name || "---"}
                                            </p>
                                            <p>
                                                <strong>Total RFQs : </strong>
                                                {projectDetails?.total_rfqs || "---"}
                                            </p>
                                            <p>
                                                <strong>Open RFQs : </strong>
                                                {projectDetails?.open_rfqs || "---"}
                                            </p>
                                            <p>
                                                <strong>Closed RFQs : </strong>
                                                {projectDetails?.closed_rfqs || "---"}
                                            </p>
                                        </div>
                                        <div className="col-md-6">
                                            <p>
                                                <strong>Description : </strong>
                                                {projectDetails?.description || "---"}
                                            </p>
                                            <p>
                                                <strong>Location : </strong>
                                                {projectDetails?.location || "---"}
                                            </p>
                                            <p>
                                                <strong>Created Date : </strong>
                                                {projectDetails?.created_at?.slice(0, 10) || "---"}
                                            </p>
                                            <p>
                                                <strong>End Date : </strong>
                                                {projectDetails?.ended_at?.slice(0, 10) || "---"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* RFQ Details Table */}
                                <span className="title">RFQs for this Project</span>
                                <div className="details-table p-4 ">

                                    <div className="row">
                                        <div className="col-sm-4 col-md-6"></div>
                                        <div className="col-sm-8 col-md-6">
                                            <div className="d-flex justify-content-end">
                                                <button
                                                    type="button"
                                                    className="page-link backBtn btn btn-secondary text-sm text-white px-2 mt-0 "
                                                    style={{ flex: "0 0 250px" }}
                                                >
                                                    <FontAwesomeIcon icon={faCloudArrowUp} className="me-2" />
                                                    Upload your Vendors
                                                </button>
                                                <Link
                                                    href="/dashboard/buyer/magic-search"
                                                    className="page-link backBtn btn btn-secondary text-sm text-white px-2 mt-0 "
                                                    style={{ flex: "0 0 250px" }}
                                                >
                                                    {" "}
                                                    <FontAwesomeIcon icon={faWandMagicSparkles} className="me-2" /> Generate RFQ from BOQ
                                                </Link>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th scope='col'>Sl No.</th>
                                                    <th scope="col">RFQ Number</th>
                                                    <th scope="col">RFQ Type</th>
                                                    <th scope="col">Reverse Auction</th>
                                                    <th scope="col">Total Vendors</th>
                                                    <th scope="col">Quotes Recieved</th>
                                                    <th scope="col">Created Date</th>
                                                    <th scope="col">End Date</th>
                                                    <th scope="col">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading &&
                                                    <tr>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                        <td><PlaceholderLoading shape="rect" width={100} height={50} /></td>
                                                    </tr>
                                                }
                                                {!loading && projectDetails && projectDetails?.rfqs?.length > 0
                                                    && projectDetails?.rfqs?.map((rfqItem, index) => {
                                                        console.log(rfqItem)
                                                        return (
                                                            <tr key={`rfq_item_${rfqItem.id}`} >
                                                                <td>{index + 1}</td>
                                                                <td>{rfqItem.rfq?.rfq_no}</td>
                                                                <td>{rfqItem.rfq?.rfq_type}</td>
                                                                <td>{rfqItem.rfq?.reverse_auction == 1 ? "Enabled" : "Disabled"}</td>
                                                                <td>{rfqItem.vendors?.total_vendors}</td>
                                                                <td>{rfqItem.vendors?.quote_received}</td>
                                                                <td>{rfqItem.rfq?.timestamp.slice(0, 10)}</td>
                                                                <td>{rfqItem.rfq?.bid_end_date}</td>
                                                                <td>
                                                                    <Link
                                                                        href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${rfqItem?.rfq?.id}`}
                                                                        className="page-link"
                                                                    >
                                                                        View
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })
                                                }
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
            </section>
            {openEditProject &&
                <AddVendorModal
                    type={'edit-project'}
                    projectData={projectDetails}
                    openModal={openEditProject}
                    closeModal={() => setOpenEditProject(false)}
                    handleEditProject={handleEditProject}
                />
            }
        </>
    )
}

export default ProjectDetails
