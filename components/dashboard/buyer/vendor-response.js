import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import VendorResponseTable from "@/components/dashboard/buyer/vendorResponseTable";
import Loader from "@/components/shared/Loader";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
const CompareVendorResponse = () => {
  const router = useRouter();
  const { rfq } = router.query;
  const [loading, setloading] = useState(false);
  const [quotesLoading, setquotesLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [closeRFqLoading, setcloseRFqLoading] = useState(false);
  const [finalizeLoading, setfinalizeLoading] = useState(false);
  const [page, setpage] = useState(1);
  const [totalRFQs, settotalRFQs] = useState(0);
  const [showing, setshowing] = useState(0);
  const [hasMoreQuotes, sethasMoreQuotes] = useState(true);

  const loadMoreRFQs = (e) => {
    e.preventDefault();
    if (hasMoreQuotes) {
      setpage((prevPage) => prevPage + 1);
    }
  };

  const [showVendorSelection, setShowVendorSelection] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const handleBadgeClick = () => {
    setShowVendorSelection(!showVendorSelection);
  };

  const vendorList = ["vendor 1","vendor 2","vendor 3"];

  const handleVendorSelect = (vendorIndex) => {
    setSelectedVendor(vendorList[vendorIndex]);
  };

  return (
    <>
      {finalizeLoading && <Loader />}
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">Compare Received Vendor Responses</h3>
            </div>
            
          </div>
        </div>
      </section>
      <section className="quote-edit-sec-1">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-2">
              <div className="hasFullLoader">
                <h5 className="title">Quotes Received</h5>
                <ul className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
                  <li className="active">
                    <Link href={`/dashboard/buyer/technical-evaluation`} className="text-white">
                      RFQ #1
                    </Link>
                  </li>
                  <li className="">
                    <Link href={`/dashboard/buyer/technical-evaluation`} className="text-dark">
                      RFQ #2
                    </Link>
                  </li>
                  <li className="">
                    <Link href={`/dashboard/buyer/technical-evaluation`} className="text-dark">
                      RFQ #3
                    </Link>
                  </li>
                  <li className="">
                    <Link href={`/dashboard/buyer/technical-evaluation`} className="text-dark">
                      RFQ #4
                    </Link>
                  </li>
                  <li className="">
                    <Link href={`/dashboard/buyer/technical-evaluation`} className="text-dark">
                      RFQ #5
                    </Link>
                  </li>

                  {hasMoreQuotes && !loading && (
                    <Link
                      href="#"
                      className="d-flex justify-content-end px-3 pe-auto"
                    >
                      <span className="link-primary">...Load More</span>
                    </Link>
                  )}
                </ul>
              </div>
            </div>

            <div className="col-md-10">
              <div className="quote-sec-table quote-sec-tab">
                <div className="quote-sec-main">
                  <div className="quote-sec-table-sub">
                    <div className="row">
                      <div className="col-12 position-relative">
                        <p className="sub-heading mb-0">
                          <b>Product</b> : Temperature (T) Instruments
                        </p>

                        {/* Dropdown for Vendor Selection */}
                        <div className="dropdown position-absolute top-0 end-0 mt-1 me-3">
                          <button
                            className="btn btn-outline-primary dropdown-toggle"
                            type="button"
                            id="vendorDropdown"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            onClick={() => handleBadgeClick()}
                          >
                            Select Vendor
                          </button>
                          <ul className="dropdown-menu" aria-labelledby="vendorDropdown">
                            {vendorList.map((vendor, index) => (
                              <li key={index}>
                                <a
                                  className="dropdown-item pointer"
                                  style={{cursor:'pointer'}}
                                  onClick={() => handleVendorSelect(index)}
                                >
                                  {vendor}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <p className="sub-heading mb-0">
                          <b>Product Specification</b> : Thin Wire
                        </p>
                      </div>

                      <div className="col-12">
                        <p className="sub-heading mb-0"><b>Last Purchase Details :</b></p>

                        <div className="sub-heading border rounded-3 p-2">
                          <div className="row fw-medium mx-2">
                            <div className="col-md-3 col-lg-2">
                              <span>Base Price </span>
                              <span className="d-block fw-medium text-muted"> ₹101.00</span>
                            </div>
                            <div className="col-md-3 col-lg-2">
                              <span>Freight Rate </span>
                              <span className="d-block fw-medium text-muted">3%</span>
                            </div>
                            <div className="col-md-3 col-lg-2">
                              <span>Packaging Rate </span>
                              <span className="d-block fw-medium text-muted">4%</span>
                            </div>
                            <div className="col-md-3 col-lg-2">
                              <span>Tax </span>
                              <span className="d-block fw-medium text-muted">18%</span>
                            </div>
                            <div className="col-md-3 col-lg-2">
                              <span>Quantity </span>
                              <span className="d-block fw-medium text-muted">21</span>
                            </div>
                            <div className="col-md-3 col-lg-2">
                              <span>Total Price </span>
                              <span className="d-block fw-medium text-muted">₹2500</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Display the table with selected vendor name */}
                    {selectedVendor && <VendorResponseTable  vendorName={selectedVendor} id="buyer"/>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default CompareVendorResponse;
