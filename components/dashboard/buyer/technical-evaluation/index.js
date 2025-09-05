import React, { useEffect, useState } from "react";
import Link from "next/link";
import AsyncSelect from "react-select/async";
import { useRouter } from "next/router";
import { getRfqs, fetchVendorSelectionOption, getAllClauses, getRFQById } from "@/services/rfq";
import { getProfile } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import ClauseProductItem from "./ClauseProductItem";
import { toast } from "react-toastify";
import { getProjectList } from '@/services/project';
import Select from 'react-select';



const BuyerTechnicalEvaluation = () => {
  const router = useRouter();
  const { rfq_id } = router.query;
  const [loading, setLoading] = useState(false);
  const [currentUserProfile, setcurrentUserProfile] = useState(null);
  const [rfqList, setRfqList] = useState([]);
  const [currentRfq, setcurrentRfq] = useState(null);
  const [vendorMap, setVendorMap] = useState(new Map());
  const [clauseMap, setClauseMap] = useState(null);
  const [rfqNo, setRfqNo] =useState(null);
  const [projects, setProjects] = useState(null);
  const [selectedproject, setSelectedproject] = useState(null);
  const [clauseInfo, setClauseInfo] = useState(null);
  const [selectedVendorsMap, setSelectedVendorsMap] = useState(new Map());

  const getAllProjects = () => {
    getProjectList()
        .then((res) => {
            let d = [];
            res.data.map((item) => {
                d.push({ label: item.name, value: item.id });
            });
            setProjects(d);
        })
        .catch((error) => {
            console.log(error)
        })
}

useEffect(() => {
  const handler = setTimeout(() => {
    getTechEvaluationRFQsByUser();
  }, 1000);

  return () => {
    clearTimeout(handler);
  };
}, [rfqNo,selectedproject]);

  const getUserDetails = async () => {
    try {
      const res = await getProfile();
      setcurrentUserProfile(res.data);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const getTechEvaluationRFQsByUser = async () => {
    try {
      setLoading(true);
      const res = await getRfqs({
        tech_eval: true,
        page: 1,
        limit: 100,
        project_id: selectedproject ? selectedproject : -1,
        rfq_no: rfqNo ? parseInt(rfqNo.replace('#','')) : null,
        sort: 'DESC'
      });
      const newData = Array.isArray(res) ? res : [];
      setRfqList(newData);
    } catch (error) {
      console.error("Error fetching technical evaluation RFQs:", error);
    } finally {
      setLoading(false);
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

  const listProducts = async () => {
    try {
      const res = await getAllClauses(rfq_id);
      setClauseInfo(res?.data ?? null);

      // Get full RFQ details with products from the detailed API
      const rfqDetailsRes = await getRFQById(rfq_id);
      const selectedRfq = Array.isArray(rfqDetailsRes.data) ? rfqDetailsRes.data[0] : rfqDetailsRes.data;

      if (!selectedRfq) {
        console.error('No RFQ found for ID:', rfq_id);
        return;
      }
      const vMap = new Map();
      selectedRfq?.products?.map((prodItem) => {
        vMap.set(prodItem.id, null)
      })

      let c_map = new Map();
      selectedRfq?.products?.map((pItem) => {
        c_map.set(pItem.id, false);
      })

      res.data?.map((pItem) => {
        c_map.set(pItem.rfq_product_id, true);
      })
      setcurrentRfq(selectedRfq || null);
      setVendorMap(vMap);
      setClauseMap(c_map);

    } catch (error) {
      console.log(error)
      toast.error(error.message);
    }
  }

  useEffect(() => {
    getUserDetails();
    getTechEvaluationRFQsByUser();
    getAllProjects();
  }, []);


  useEffect(() => {
    if (rfq_id && rfqList.length > 0) {
      listProducts();
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

                <div className="py-1">
                    <label>Search RFQ No.</label>
                    <input
                        className="form-control react-select" 
                        style={{ borderRadius: '0.25rem', borderColor: '#ced4da', boxShadow: 'none' }}
                        value={rfqNo}
                        onChange={(e)=> setRfqNo(e.target.value)}
                        name="rfq_type"
                        placeholder="Ex. 123456"
                        isClearable
                    />
                </div>
                <div className="py-2">
                    <label>Select Project</label>
                    <Select
                        options={projects}
                        onChange={(selectedOption,actionMeta)=> setSelectedproject(selectedOption?.value ? selectedOption.value : -1)}
                        // value={selectedproject}
                        name="project_id"
                        placeholder="Select"
                        isClearable
                    />
                </div>

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
                          {item.project_name && item.project_name != "" &&
                            <b className="d-block fw-semibold" style={{ fontSize: "14px" }}>
                              {item.project_name}
                            </b>}
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
                    <h3 className="fs-5 mb-1">
                      <span className="fw-semibold">RFQ No : </span>{currentRfq.rfq_no}
                    </h3>
                    {currentRfq.project_name && currentRfq.project_name != "" &&
                      <p className="sub-heading fs-6 mb-2">
                        {currentRfq.project_name}
                      </p>}
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
                        <p className="sub-heading mb-0">
                          <b>Reverse Auction</b> :{" "}
                          {currentRfq.reverse_auction == 1 ? "Enabled" : "Disabled"}
                        </p>
                        {currentRfq.reverse_auction == 1 && (
                          <>
                            <p className="sub-heading mb-0">
                              <b>Auction Start Date</b> :{" "}
                              {currentRfq.ra_start_date || "Not specified"}
                            </p>
                            <p className="sub-heading mb-0">
                              <b>Auction End Date</b> :{" "}
                              {currentRfq.ra_end_date || "Not specified"}
                            </p>
                          </>
                        )}
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

                    {currentRfq && clauseInfo &&
                      clauseInfo.map((rfqProduct) => {
                        if (clauseMap.get(rfqProduct.rfq_product_id)) {
                          const product = currentRfq.products.find(product => product.id == rfqProduct.rfq_product_id)
                          if(!product) return null;
                          const productSelectedVendors = selectedVendorsMap.get(product.id) || [];
                          return (
                            <div className="quote-sec-table-sub pt-0" key={`product_${product.id}`}>
                              <div className="row">
                                <div className="col-12">

                                  <div className="d-flex justify-content-between gap-2">
                                    {/* Product Details */}
                                    <div className="d-flex-flex-column mt-3">
                                      <p className="sub-heading mb-0">
                                        <b>Product</b>: {product.product_details[0]?.name}
                                      </p>
                                      <p className="sub-heading mb-0">
                                        <b>Product Specification</b>:{" "}
                                        {product.product_specs?.find((spec) => spec.title === "Spec" && spec.value)?.value || "N/A"}
                                      </p>
                                    </div>

                                    {/* Vendor Selection */}
                                    <div className="col-md-3 col-lg-3 text-sm mb-2">
                                      <label>Select Vendor</label>
                                      <AsyncSelect
                                        isMulti
                                        cacheOptions
                                        loadOptions={() => getVendorSelectionOption(product.id)}
                                        defaultOptions
                                        placeholder="Select"
                                        isClearable
                                        value={productSelectedVendors}
                                        onChange={(selectedOptions) => {
                                          setSelectedVendorsMap(prev => new Map(prev).set(product.id, selectedOptions || []));
                                          // Also update vendorMap for single vendor selection
                                          if (selectedOptions && selectedOptions.length > 0) {
                                            setVendorMap(prev => new Map(prev).set(product.id, selectedOptions[0]));
                                          } else {
                                            setVendorMap(prev => {
                                              const newMap = new Map(prev);
                                              newMap.delete(product.id);
                                              return newMap;
                                            });
                                          }
                                        }}
                                        noOptionsMessage={() => "No vendors responded"}
                                      />
                                    </div>
                                  </div>

                                  <ClauseProductItem
                                    type={"buyer"}
                                    rfq_id={rfq_id}
                                    product={{
                                      ...product,
                                      tbl_rfq_product_tech_evaluation_id: rfqProduct.evaluation_id
                                    }}
                                    currentUserProfile={currentUserProfile}
                                    currentRfq={currentRfq}
                                    getVendors={async () => await getVendorSelectionOption(product.id)}
                                    clauseInfo={rfqProduct?.clauses ?? []}
                                    vendors={rfqProduct?.vendors ?? []}
                                    refetch={listProducts}
                                    selectedVendor={vendorMap.get(product.id)}
                                    selectedVendors={productSelectedVendors.map(vendor => vendor.value)}
                                  />

                                </div>
                              </div>
                            </div>
                          )
                        }
                      }
                      )}
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