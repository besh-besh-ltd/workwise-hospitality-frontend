import React, { useEffect, useState } from "react";
import Link from "next/link";
import AsyncSelect from "react-select/async";
import { useRouter } from "next/router";
import { fetchTechEvaluationRfqList, fetchVendorSelectionOption } from "@/services/rfq";
import { getProfile } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import ClauseProductItem from "./ClauseProductItem";



const BuyerTechnicalEvaluation = () => {
  const router = useRouter();
  const { rfq_id } = router.query;
  const [loading, setLoading] = useState(false);
  const [currentUserProfile, setcurrentUserProfile] = useState(null);
  const [rfqList, setRfqList] = useState([]);
  const [currentRfq, setcurrentRfq] = useState(null);
  const [vendorMap, setVendorMap] = useState(null);


  const getUserDetails = async () => {
    try {
      const res = await getProfile();
      return res.data;
    } catch (error) {
      console.error("Error fetching user details:", error);
      return null;
    }
  };

  const getTechEvaluationRFQsByUser = async (user_id) => {
    try {
      const res = await fetchTechEvaluationRfqList(user_id);
      return res.data || [];
    } catch (error) {
      console.error("Error fetching technical evaluation RFQs:", error);
      return [];
    }
  };

  const getVendorSelectionOption = async (rfq_product_id) => {
    if (!rfq_product_id) return [];
    const payload = {
      rfq_id,
      rfq_product_id
    };

    try {
      const res = await fetchVendorSelectionOption(payload);
      return res.data.map((vendor) => ({
        value: vendor.vendor_id,
        label: vendor.company_name || vendor.organization_name || vendor.vendor_name,
      }));
    } catch (error) {
      console.error("Error fetching vendor options:", error);
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userDetails = await getUserDetails();
        if (userDetails) {
          const rfqs = await getTechEvaluationRFQsByUser(userDetails.id);
          setcurrentUserProfile(userDetails);
          setRfqList(rfqs);
        }
      } catch (error) {
        console.error("Error in fetch process:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


  useEffect(() => {
    if (rfq_id && rfqList.length > 0) {
      const selectedRfq = rfqList.find((rfqItem) => rfqItem.id === parseInt(rfq_id));
      const vMap = new Map();
      selectedRfq.products.map((prodItem) => {
        vMap.set(prodItem.id, null)
      })
      setcurrentRfq(selectedRfq || null);
      setVendorMap(vMap);
    } else {
      setcurrentRfq(null);
    }
  }, [rfq_id, rfqList]);


  return (
    <>
      <section className="quote-common-header compare-received-quote sc-pt-80">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <h3 className="heading">Technical Evaluation</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="quote-edit-sec-1">
        <div className="container-fluid">
          <div className="row">

            {/* RFQ List */}
            <div className="col-md-2">
              <div className="hasFullLoader">
                <h5 className="title">List Of RFQ's</h5>

                {loading && <FullLoader />}
                {!loading && rfqList.length === 0 ? (
                  <p style={{ textAlign: "center" }}>No RFQs yet!</p>
                ) : (
                  <ul className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
                    {rfqList.map((item) => (
                      <li
                        className={item.id === currentRfq?.id ? "active" : ""}
                        key={`rfq_no_${item.rfq_no}`}
                      >
                        <Link
                          href={`/dashboard/buyer/technical-evaluation?rfq_id=${item.id}`}
                          className={
                            item.id === currentRfq?.id ? "text-white" : "text-dark"
                          }
                        >
                          RFQ #{item.rfq_no}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Main Container */}
            <div className="col-md-10">
              <div className="quote-sec-table quote-sec-tab">

                {/* RFQ Details */}
                {!loading && currentRfq &&
                  <div className="mb-3">
                    <h3 className="fs-5 mb-3">
                      <span className="fw-semibold">RFQ No : </span>{currentRfq.rfq_no}
                    </h3>
                    <hr />

                    <div className="row text-sm ">

                      <div className="col-md-6">
                        <p className="sub-heading mb-0">
                          <b>Company Name</b> :{" "}
                          {currentRfq.company_name}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Contact Person Name</b> :{" "}
                          {currentRfq.contact_name}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Response Email</b> :{" "}
                          {currentRfq.response_email}
                        </p>
                        <p className="sub-heading mb-0">
                          <b>Contact Number</b> :{" "}
                          {currentRfq.contact_number}
                        </p>
                        {currentRfq.location && currentRfq.location != "" &&
                          <p className="sub-heading mb-0">
                            <b>Delivery Location</b> :{" "}
                            {currentRfq.location}
                          </p>}
                      </div>

                      <div className="col-md-6">
                        {currentRfq.project_name && currentRfq.project_name != "" &&
                          <p className="sub-heading mb-0">
                            <b>Project Name</b> :{" "}
                            {currentRfq.project_name}
                          </p>}
                        <p className="sub-heading mb-0">
                          <b>Reverse Auction</b> :{" "}
                          {currentRfq.reverse_auction == 1 ? "Enabled" : "Disabled"}
                        </p>
                        {currentRfq.rfq_type && currentRfq.rfq_type != "" &&
                          <p className="sub-heading mb-0">
                            <b>RFQ Type</b> :{" "}
                            {currentRfq.rfq_type}
                          </p>}
                        <p className="sub-heading mb-0">
                          <b>Bid End Date</b> :{" "}
                          {currentRfq.bid_end_date}
                        </p>
                        {currentRfq.comment && currentRfq.comment != "" &&
                          <p className="sub-heading mb-0">
                            <b>Comment</b> :{" "}
                            {currentRfq.comment}
                          </p>}
                      </div>

                    </div>
                  </div>
                }

                <div className="quote-sec-main">
                  <>
                    {!loading && currentRfq &&
                      <>
                        <h3 className="fs-5 mb-2 mt-4">
                          <span className="fw-semibold">RFQ Products </span>
                        </h3>
                        <hr />
                      </>}

                    {currentRfq &&
                      currentRfq.products.map((product) => (
                        <div className="quote-sec-table-sub pt-2" key={`product_${product.id}`}>
                          <div className="row">
                            <div className="col-12">

                              <div className="d-flex justify-content-between">
                                {/* Product Details */}
                                <div className="d-flex-flex-column">
                                  <p className="sub-heading mb-0">
                                    <b>Product</b>: {product.product_details[0]?.name}
                                  </p>
                                  <p className="sub-heading mb-0">
                                    <b>Product Specification</b>:{" "}
                                    {product.product_specs?.find((spec) => spec.title === "Spec" && spec.value)?.value || "N/A"}
                                  </p>
                                </div>

                                {/* Vendor Selection */}
                                <div className="col-md-3 col-lg-3 text-sm">
                                  <label>Select Vendor</label>
                                  <AsyncSelect
                                    cacheOptions
                                    loadOptions={() => getVendorSelectionOption(product.id)}
                                    defaultOptions
                                    placeholder="Select"
                                    isClearable
                                    onChange={(selectedOption) => {
                                      const updatedVendorMap = new Map(vendorMap);
                                      updatedVendorMap.set(product.id, selectedOption ? selectedOption : null);
                                      setVendorMap(updatedVendorMap);
                                    }}
                                    noOptionsMessage={() => "No vendors responded"}
                                  />
                                </div>
                              </div>

                              <ClauseProductItem
                                type={"buyer"}
                                rfq_id={rfq_id}
                                product={product}
                                currentUserProfile={currentUserProfile}
                                selectedVendor={vendorMap.get(product.id)}
                                currentRfq={currentRfq}
                              />

                            </div>
                          </div>
                        </div>
                      ))}
                  </>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BuyerTechnicalEvaluation;
