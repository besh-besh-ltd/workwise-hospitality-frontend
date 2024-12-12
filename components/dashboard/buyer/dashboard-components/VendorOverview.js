import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'

const VendorOverview = () => {
    return (
        <section className='hasFullloader mb-3'>
            <div className="row mb-3 align-items-stretch">

                {/* Search Vendor */}
                <div className="overview-container col-md-4 pe-2">
                    <div className="rounded-2 shadow p-4 h-100">
                        <div className="input-group mb-3">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by Vendor Name"
                                aria-label="Recipient's username"
                                aria-describedby="vendor_search"
                            />
                            <span className="input-group-text" id="vendor_search">
                                <FontAwesomeIcon icon={faMagnifyingGlass} />
                            </span>
                        </div>

                        <div className="text-center mt-5">
                            Search Vendors to see their available Products and Product categories.
                        </div>
                    </div>
                </div>

                {/* Top Vendors List */}
                <div className="overview-container col-md-4 pe-2">
                    <div className="rounded-2 shadow p-4 h-100">
                        <h2 className="fs-4 fw-medium ">Top Vendors</h2>
                        <hr className="my-1" />

                        <table className="table table-sm table-hover table-borderless">
                            <tbody>
                                <tr className="border-bottom ">
                                    <td className="py-2">
                                        <span className="d-block">Pacific Industrial Limited</span>
                                        <span className="d-block text-sm">Mumbai, Maharastra </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            53 Products
                                        </span>
                                    </td>
                                </tr>
                                <tr className="border-bottom ">
                                    <td className="py-2">
                                        <span className="d-block">De's Techniqo Pvt. Ltd.</span>
                                        <span className="d-block text-sm">Kolkata, West Bengal </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            46 Products
                                        </span>
                                    </td>
                                </tr>
                                <tr className="border-bottom ">
                                    <td className="py-2">
                                        <span className="d-block">Perfect Marketings Pvt. Ltd</span>
                                        <span className="d-block text-sm">Bengaluru, Karnataka </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            32 Products
                                        </span>
                                    </td>
                                </tr>
                                <tr className="border-bottom ">
                                    <td className="py-2">
                                        <span className="d-block">Presidency Rubber and Mills</span>
                                        <span className="d-block text-sm">Kolkata, West Bengal </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            28 Products
                                        </span>
                                    </td>
                                </tr>
                                <tr className="border-bottom ">
                                    <td className="py-2">
                                        <span className="d-block">Shib Das and Sons</span>
                                        <span className="d-block text-sm">Kolkata, West Bengal </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            24 Products
                                        </span>
                                    </td>
                                </tr>
                                <tr className="border-bottom ">
                                    <td className="py-2">
                                        <span className="d-block">Maharastra Pipes and Steel</span>
                                        <span className="d-block text-sm">Mumbai, Maharastra </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            12 Products
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Products List */}
                <div className="overview-container col-md-4 pe-2">
                    <div className="rounded-2 shadow p-4 h-100">
                        <h2 className="fs-4 fw-medium ">Top Products</h2>
                        <hr className="my-1" />

                        <table className="table table-sm table-hover table-borderless">
                            <tbody>
                                <tr className="border-bottom ">
                                    <td className="py-2">
                                        <span className="d-block">Pipe Low/Temp Steel</span>
                                        <span className="d-block text-sm">Civil | Piping | Pipes </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            76 Vendors
                                        </span>
                                    </td>
                                </tr>
                                <tr className="border-bottom">
                                    <td className="py-2">
                                        <span className="d-block">Temperature (t) Instruments</span>
                                        <span className="d-block text-sm">Civil | Piping | Pipes </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            51 Vendors
                                        </span>
                                    </td>
                                </tr>
                                <tr className="border-bottom">
                                    <td className="py-2">
                                        <span className="d-block">Mechanical Pipe</span>
                                        <span className="d-block text-sm">Civil | Piping | Pipes </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            37 Vendors
                                        </span>
                                    </td>
                                </tr>
                                <tr className="border-bottom">
                                    <td className="py-2">
                                        <span className="d-block">Flanges</span>
                                        <span className="d-block text-sm">Civil | Piping | Pipes </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            35 Vendors
                                        </span>
                                    </td>
                                </tr>
                                <tr className="border-bottom">
                                    <td className="py-2">
                                        <span className="d-block">PC and Cabinet</span>
                                        <span className="d-block text-sm">Civil | Piping | Pipes </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            28 Vendors
                                        </span>
                                    </td>
                                </tr>
                                <tr className="border-bottom">
                                    <td className="py-2">
                                        <span className="d-block">Carbon Steel Pipe</span>
                                        <span className="d-block text-sm">Civil | Piping | Pipes </span>
                                    </td>
                                    <td className="py-2">
                                        <span className="border border-primary text-primary text-sm px-3 py-1 rounded-3 text-center">
                                            23 Vendors
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </section>
    )
}

export default VendorOverview
