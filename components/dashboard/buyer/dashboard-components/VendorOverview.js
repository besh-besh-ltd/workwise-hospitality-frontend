import FullLoader from '@/components/shared/FullLoader';
import { getTopVendorsandProducts, searchVendorByName } from '@/services/rfq';
import { faBuildingUser, faCartShopping, faInfoCircle, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Link from 'next/link';
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify';

const VendorOverview = () => {
    const [topLists, setTopLists] = useState(null);
    const [vendorSearchList, setVendorSearchList] = useState([]);
    const [listLoading, setListLoading] = useState(false);
    const [vendorSearchLoading, setVendorSearchLoading] = useState(false);
    const [vendorSearchKey, setVendorSearchKey] = useState("");
    const [debouncedVendorName,setDebouncedVendorName] = useState(vendorSearchKey);


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
                        {/* Search Input */}
                        <div className="input-group mb-3">
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
                        <div className="flex-grow-1 overflow-auto">
                            {vendorSearchLoading ? <FullLoader/>
                                : vendorSearchList && vendorSearchList.length > 0 ? (
                                <table className="table table-sm table-borderless">
                                    <tbody>
                                        {vendorSearchList.map((vendorItem) => (
                                            <tr key={`vendor_${vendorItem.vendor_id}`} className="border-bottom">
                                                <td className="d-flex justify-content-between align-items-center py-3">
                                                    <div>
                                                        <span className="d-block fw-medium">
                                                            {vendorItem.company_name || vendorItem.vendor_name}
                                                        </span>
                                                        <span className="d-block text-muted small">
                                                            {vendorItem.address || '---'}
                                                        </span>
                                                    </div>
                                                    <Link
                                                        href={`/dashboard/buyer/rfq-management-vendor/vendor-profile?id=${vendorItem.vendor_id}`}
                                                        className="text-primary"
                                                        aria-label="View Vendor Profile"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <FontAwesomeIcon icon={faInfoCircle} size="lg"/>
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
                                    <h3 className="fs-6">Search Vendors to see their available Products.</h3>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {/* Top Vendors List */}
                <div className="overview-container col-md-4 pe-2">
                    <div className="rounded-2 shadow p-4 h-100 hasFullLoader d-flex flex-column">
                        {listLoading && <FullLoader />}
                        <h2 className="fs-4 fw-medium">Top Vendors</h2>
                        <hr className="my-1" />

                        {topLists?.vendorData ? (
                            topLists.vendorData.length > 0 ? (
                                <table className="table table-sm table-borderless flex-grow-1" style={{ maxHeight: "450px", overflowY: "auto" }}>
                                    <tbody>
                                        {topLists.vendorData.map((vendorItem) => (
                                            <tr key={`vendor_${vendorItem.user_id}`} className="border-bottom">
                                                <td className="d-flex justify-content-between align-items-center py-2">
                                                    <div>
                                                        <span className="d-block">{vendorItem.name}</span>
                                                        <span className="d-block text-sm">{vendorItem.address || '---'}</span>
                                                    </div>
                                                    <span className="border border-primary text-primary text-sm text-nowrap px-3 py-1 rounded-3 text-center">
                                                        {vendorItem.product_count} Products
                                                    </span>
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


                {/* Top Products List */}
                <div className="overview-container col-md-4 pe-2">
                    <div className="rounded-2 shadow p-4 h-100 hasFullLoader d-flex flex-column">
                        {listLoading && <FullLoader />}
                        <h2 className="fs-4 fw-medium">Top Products</h2>
                        <hr className="my-1" />

                        {topLists && topLists.productData ? (
                            topLists.productData.length > 0 ? (
                                <table className="table table-sm table-borderless flex-grow-1">
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
                                                    <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                                        {prodItem.vendor_count} Vendors
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
        </section>
    )
}

export default VendorOverview
