import FullLoader from '@/components/shared/FullLoader';
import { getTopVendorsandProducts, searchVendorByName } from '@/services/rfq';
import { faBuildingUser, faCartShopping, faInfoCircle, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link';
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

const VendorOverview = () => {
    const [topLists, setTopLists] = useState(null);
    const [vendorSearchList, setVendorSearchList] = useState([]);
    const [listLoading, setListLoading] = useState(false);
    const [vendorSearchLoading, setVendorSearchLoading] = useState(false);
    const [vendorSearchKey, setVendorSearchKey] = useState("");
    const [debouncedVendorName, setDebouncedVendorName] = useState(vendorSearchKey);


    const getTopData = async () => {
        setListLoading(true);
        try {
            const res = await getTopVendorsandProducts();
            setTopLists(res.data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setListLoading(false);
        }
    }

    const getVendorsByName = async () => {
        setVendorSearchLoading(true);
        try {
            const res = await searchVendorByName(debouncedVendorName);
            setVendorSearchList(res.data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setVendorSearchLoading(false);
        }
    }

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedVendorName(vendorSearchKey), 500);
        return () => clearTimeout(handler);
    }, [vendorSearchKey]);

    useEffect(() => {
        getVendorsByName();
    }, [debouncedVendorName]);

    useEffect(() => {
        getTopData();
    }, [])


    return (
        <section className='hasFullloader mb-3'>
            <div className="row mb-3 align-items-stretch">

                {/* Search Vendor */}
                <div className="overview-container col-md-4 pe-2">
                    <div className="rounded-2 shadow p-4 h-100 d-flex flex-column">

                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h2 className="fs-4 fw-medium mb-0">Vendor Details</h2>
                            <OverlayTrigger
                                placement={'bottom-end'}
                                overlay={
                                    <Tooltip id={`tooltip-vendor-search`}>
                                        Vendor Details for Your Created RFQs
                                    </Tooltip>
                                }
                            >
                                <FontAwesomeIcon icon={faInfoCircle} fontSize={20} className="text-secondary" />
                            </OverlayTrigger>
                        </div>

                        {/* Search Input */}
                        <div className="input-group mt-1 mb-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by Vendor Name"
                                aria-label="Search by Vendor Name"
                                aria-describedby="vendor_search"
                                onChange={(e) => setVendorSearchKey(e.target.value)}
                            />
                        </div>

                        {/* Info Section */}
                        <div className="flex-grow-1 overflow-y-auto" style={{ maxHeight: "450px" }}>
                            {vendorSearchLoading ? <FullLoader />
                                : vendorSearchList && vendorSearchList.length > 0 ? (
                                    <table className="table table-sm table-borderless table-hover">
                                        <tbody>
                                            {vendorSearchList.map((vendorItem) => (
                                                <tr key={`vendor_${vendorItem.vendor_id}`} className="border-bottom">
                                                    <td>
                                                        <Link
                                                            href={`/vendor/vendor-profile?id=${vendorItem.vendor_id}`}
                                                            className="text-dark py-1"
                                                            aria-label="View Vendor Profile"
                                                            target='_blank'
                                                            rel="noopener noreferrer"
                                                        >
                                                            <span className="d-block fw-medium">
                                                                {vendorItem.company_name || vendorItem.vendor_name}
                                                            </span>
                                                            <span className="d-block text-muted small">
                                                                {vendorItem.address || '---'}
                                                            </span>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : vendorSearchKey && vendorSearchKey.length > 2 ? (
                                    <div className="d-flex flex-column justify-content-center align-items-center text-center h-100">
                                        <h3 className="fs-6">No such vendor found!</h3>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column justify-content-center align-items-center text-center h-100">
                                        <FontAwesomeIcon icon={faMagnifyingGlass} fontSize={64} className="opacity-25 mb-3" />
                                        <h3 className="fs-6">Search Vendors to see their Details.</h3>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>


                {/* Top Vendors List */}
                <div className="overview-container col-md-4 pe-2">
                    <div className="rounded-2 shadow p-4 h-100 hasFullLoader d-flex flex-column">
                        {listLoading && <FullLoader />}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h2 className="fs-4 fw-medium mb-0">Top Vendors</h2>
                            <OverlayTrigger
                                placement={'bottom-end'}
                                overlay={
                                    <Tooltip id={`tooltip-top-vendors`}>
                                        Top 10 Vendors Based on Your Created RFQs
                                    </Tooltip>
                                }
                            >
                                <FontAwesomeIcon icon={faInfoCircle} fontSize={20} className="text-secondary" />
                            </OverlayTrigger>
                        </div>
                        <hr className="my-1" />

                        <div className="flex-grow-1 overflow-y-auto" style={{ maxHeight: "450px" }}>
                            {topLists?.vendorData ? (
                                topLists.vendorData.length > 0 ? (
                                    <table className="table table-sm table-borderless table-hover flex-grow-1 overflow-y-auto" style={{ maxHeight: "450px" }}>
                                        <tbody>
                                            {topLists.vendorData.map((vendorItem) => (
                                                <tr key={`vendor_${vendorItem.user_id}`} className="border-bottom">
                                                    <td>
                                                        <Link
                                                            href={`/vendor/vendor-profile?id=${vendorItem.user_id}`}
                                                            className="d-flex justify-content-between align-items-center text-dark py-2"
                                                            aria-label="View Vendor Profile"
                                                            target='_blank'
                                                            rel="noopener noreferrer"
                                                        >
                                                            <div>
                                                                <span className="d-block">{vendorItem.company_name || vendorItem.organization_name || vendorItem.name}</span>
                                                                <span className="d-block text-sm">{vendorItem.address || '---'}</span>
                                                            </div>
                                                            <span className="border border-primary text-primary text-sm text-nowrap px-3 py-1 rounded-3 text-center">
                                                                {vendorItem.rfq_count} {vendorItem.rfq_count > 1 ? 'RFQs' : 'RFQ'}
                                                            </span>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center mt-3">
                                        <FontAwesomeIcon icon={faBuildingUser} fontSize={64} className="opacity-25 mb-4" />
                                        <h3 className="fs-6 text-center">
                                            You Haven't Finalized any Vendors Yet ...!
                                        </h3>
                                    </div>
                                )
                            ) : (
                                <p>No Data Found!</p>
                            )}
                        </div>
                    </div>
                </div>


                {/* Top Products List */}
                <div className="overview-container col-md-4 pe-2">
                    <div className="rounded-2 shadow p-4 h-100 hasFullLoader d-flex flex-column">
                        {listLoading && <FullLoader />}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h2 className="fs-4 fw-medium mb-0">Top Products</h2>
                            <OverlayTrigger
                                placement={'bottom-end'}
                                overlay={
                                    <Tooltip id={`tooltip-top-products`}>
                                        Top 10 Products Based on Your Created RFQs
                                    </Tooltip>
                                }
                            >
                                <FontAwesomeIcon icon={faInfoCircle} fontSize={20} className="text-secondary" />
                            </OverlayTrigger>
                        </div>
                        <hr className="my-1" />

                        <div className="flex-grow-1 overflow-y-auto" style={{ maxHeight: "450px" }}>
                            {topLists && topLists.productData ? (
                                topLists.productData.length > 0 ? (
                                    <table className="table table-sm table-borderless flex-grow-1 overflow-y-auto" style={{ maxHeight: "450px" }}>
                                        <tbody>
                                            {topLists.productData.map((prodItem) => (
                                                <tr key={`prod_item_${prodItem.product_id}`} className="border-bottom">
                                                    <td className="d-flex justify-content-between align-items-center py-2">
                                                        <div>
                                                            <span className="d-block">{prodItem.product_name}</span>
                                                            <span className="d-block text-sm">
                                                                {prodItem.product_categories?.map(category => category.category_name).join(" | ")}
                                                            </span>
                                                        </div>
                                                        <span className="border border-primary text-primary text-nowrap text-sm px-3 py-1 rounded-3 text-center">
                                                            {prodItem.rfq_count} {prodItem.rfq_count > 1 ? 'RFQs' : 'RFQ'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center mt-3">
                                        <FontAwesomeIcon icon={faCartShopping} fontSize={64} className="opacity-25 mb-4" />
                                        <h3 className="fs-6 text-center">You Haven't Finalized any Products Yet ...!</h3>
                                    </div>
                                )
                            ) : (
                                <p>No Data Found!</p>
                            )}
                        </div>
                    </div>
                </div>


            </div>
        </section>
    )
}

export default VendorOverview
