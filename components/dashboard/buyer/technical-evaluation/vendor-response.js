import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Loader from "@/components/shared/Loader";
import VendorResponseTable from "../../vendor/technical-evaluation/vendorResponseTable";
import FullLoader from "@/components/shared/FullLoader";
import PlaceholderLoading from "react-placeholder-loading";
import { formatPrice } from "@/utils/sharedFunctions";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import {
  closeRFQ,
  downloadQuotesDetails,
  finalizeQuotation,
  getQuotes,
  getRFQS,
  getVendorDetails,
  getVendorResponses
} from "@/services/rfq";

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
  const [currentRFQ, setcurrentRFQ] = useState(null);
  const [showVendorSelection, setShowVendorSelection] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState([]);
  const [limit, setlimit] = useState(100);
  const [myRFQs, setmyRFQs] = useState([]);
  const [quotes, setquotes] = useState([]);

  const [vendorListNew, setVendorList] = useState([]);
 const [vendorName,setVendorName] = useState(null);
  // const [payload,setPayload] = useState([]);
  const payload = {"rfq_id" : 111, "rfq_product_id" : 222};
  const handleBadgeClick = () => {
    setloading(true);
    setShowVendorSelection(!showVendorSelection);
    
    getVendorDetails(payload).then((res) => {
      console.log("response front end of get vendor names = ",res.data);
      setVendorList(res.data);
    })
  };

  const vendorList = [
    {
        "vendor_id": 263,
        "vendor_name": "gaurav",
        "company_name": "gaurav",
        "organization_name": "gaurav"
    },
    {
      "vendor_id": 264,
      "vendor_name": "Shoaib",
      // "company_name": "gaurav",
      "organization_name": "SAJ COmpany"
  }
]

  const handleVendorSelect = (vendorIndex,index) => {
    console.log("vendor id = ",vendorIndex);

    // setSelectedVendor(vendorList[vendorIndex]);
    payload.vendor_id = vendorIndex;
    getVendorResponses(payload).then((res) => {
      console.log("vendor response data select = ",res.data);
      setSelectedVendor(res.data);
      console.log("selected vendor = ",selectedVendor);

    })
    setVendorName(vendorListNew[index].company_name || vendorListNew[index].organization_name || vendorListNew[index].vendor_name);
    console.log("vendor name = ",vendorName);
  };

  useEffect(() => {
    if (rfq) {
      setcurrentRFQ(rfq);
      getRespectiveQuotes();
    } else {
      setcurrentRFQ(null);
    }
  }, [router]);

  useEffect(() => {
    getAllRFQs();
  }, [page]);

  const loadMoreRFQs = (e) => {
    e.preventDefault();
    if (hasMoreQuotes) {
      setpage((prevPage) => prevPage + 1);
    }
  };

  const getAllRFQs = () => {
    setloading(true);
    getRFQS({ page, sort: "DESC", project_id: -1, reverse_auction: '-1', rfq_type: "", limit })
      .then((res) => {
        setloading(false);
        const newData = res.data?.filter((rItem) => rItem?.quotes?.length > 0);
        setmyRFQs((prevRFQs) => [...prevRFQs, ...newData]);

        if (page >= Math.ceil(res.total_items / limit)) {
          sethasMoreQuotes(false);
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        setloading(false);
      })
  };

  const getRespectiveQuotes = () => {
    setquotesLoading(true);
    setquotes([]);
    getQuotes(rfq)
      .then((res) => {
        setquotes(res.data);
      })
      .catch((err) => {
      })
      .finally(() => {
        setquotesLoading(false);
      })
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
                {!loading && myRFQs && myRFQs.length == 0
                  ? <p style={{ textAlign: 'center' }}>No RFQs yet!</p>
                  :
                  <ul className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
                    {myRFQs.map((item) => {
                      return (
                        <li className={`${item.id == currentRFQ ? "active" : ""}`}>
                          <Link href={`/dashboard/buyer/quote-compare/?rfq=${item?.id}`} className={`${item.id == currentRFQ ? "text-white" : "text-dark"}`} > RFQ #{item?.rfq_no} </Link>
                        </li>
                      )
                    }
                    )}

                    {hasMoreQuotes && !loading &&
                      <Link href="#" className="d-flex justify-content-end px-3 pe-auto" onClick={loadMoreRFQs}>
                        <span className="link-primary">...Load More</span>
                      </Link>
                    }

                    {hasMoreQuotes && loading && (
                      <div className="d-flex justify-content-center align-items-center" >
                        Loading ...
                        <div className="spinner-border spinner-border-sm text-primary ms-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    )}
                  </ul>
                }
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
                            {vendorListNew.map((vendor, index) => (
                              <li key={vendor.vendor_id}>
                                <a
                                  className="dropdown-item pointer"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => handleVendorSelect(vendor.vendor_id, index)}
                                >
                                  {vendor.company_name || vendor.organization_name || vendor.vendor_name}
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
                    {selectedVendor && <VendorResponseTable vendor={selectedVendor} id="buyer" name = {vendorName} />}
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
