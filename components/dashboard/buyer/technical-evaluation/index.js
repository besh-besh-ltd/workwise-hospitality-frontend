import React, { useEffect, useState } from "react";
import Link from "next/link";
import AsyncSelect from "react-select/async";
import VendorResponseTable from "./vendorResponseTable";
import { useRouter } from "next/router";
import { addToTA, fetchTechEvaluationRfqList, fetchVendorAgreement, fetchVendorSelectionOption } from "@/services/rfq";
import { getProfile } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";
import { toast } from "react-toastify";
import NotTA from "./NotTA";


const BuyerTechnicalEvaluation = () => {
  const router = useRouter();
  const { rfq_id } = router.query;
  const [loading, setLoading] = useState(false);
  const [currentUserProfile, setcurrentUserProfile] = useState(null);
  const [rfqList, setRfqList] = useState([]);
  const [currentRfq, setCurrentRfq] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);


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
      rfq_id:currentRfq.rfq_id,
      rfq_product_id,
    };
    console.log("payloaad = ",payload);

    try {
      const res = await fetchVendorSelectionOption(payload);
      console.log("vendor names response = ",res.data)
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
      const selectedRfq = rfqList.find((rfqItem) => rfqItem.rfq_id === parseInt(rfq_id));
      console.log("selected RFQ = ",selectedRfq);
      setCurrentRfq(selectedRfq || null);
    } else {
      setCurrentRfq(null);
    }
  }, [rfq_id, rfqList]);

  const addToTechnicallyAccepted = async () => {
    const payload = {
      vendor_id:selectedVendor,
      rfq_product_tech_evaluation_id:currentRfq.products[0].tbl_rfq_product_tech_evaluation_id,
      status:1,
      reject_message:null
    }
    console.log("selected vendor = ",selectedVendor);
    console.log("padyload of TAA = ",payload);
    try{
      const res = await addToTA(payload);
      if(res.status == 1){
        console.log("successfully added to TA");
      }
      toast.success("Congratulations, this Vendor is technically Accepted!!")

    }catch(error){
      console.error("Error in the process:", error);
    }
  }
  const handleTechnicallyAccepted = () =>{
    addToTechnicallyAccepted();
    setEvaluationStatus('accepted')
  }
  const handleTechnicallyNotAccepted = () => {
    setTechnicallyAccepted(false);
    setShowModel(true);
  }
  const handleCloseModal = () => {
    setShowModel(false);
  }
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
                        className={item.rfq_id === currentRfq?.rfq_id ? "active" : ""}
                        key={`rfq_no_${item.rfq_no}`}
                      >
                        <Link
                          href={`/dashboard/buyer/technical-evaluation?rfq_id=${item.rfq_id}`}
                          className={
                            item.rfq_id === currentRfq?.rfq_id ? "text-white" : "text-dark"
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

            {/* RFQ Details */}
            <div className="col-md-10">
              <div className="quote-sec-table quote-sec-tab">
                <div className="quote-sec-main">
                  {currentRfq &&
                    currentRfq.products.map((product, index) => (
                      <div className="quote-sec-table-sub" key={`product_${index}`}>
                        <div className="row">
                          <div className="col-12">

                            <div className="d-flex justify-content-between">
                              {/* Product Details */}
                              <div className="d-flex-flex-column">
                                <p className="sub-heading mb-0">
                                  <b>Product</b>: {product.product_name}
                                </p>
                                <p className="sub-heading mb-0">
                                  <b>Product Specification</b>:{" "}
                                  {product.specs?.find((spec) => spec.title === "Spec" && spec.value)?.value || "N/A"}
                                </p>
                              </div>

                              {/* Vendor Selection */}
                              <div className="col-md-3 col-lg-3 text-sm">
                                <label>Select Vendor</label>
                                <AsyncSelect
                                  cacheOptions
                                  loadOptions={() => getVendorSelectionOption(product.rfq_product_id)}
                                  defaultOptions
                                  placeholder="Select"
                                  isClearable
                                  onChange={(selectedOption) =>
                                    setSelectedVendor(selectedOption ? selectedOption.value : null)
                                  }
                                />
                              </div>
                            </div>

                            {selectedVendor && <VendorResponseTable type={"buyer"} data={product} rfq_id={rfq_id} currentUserProfile={currentUserProfile} selectedVendor={selectedVendor} currentRfq={currentRfq}/>}

                          </div>
                        </div>
                      </div>
                    ))}
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
