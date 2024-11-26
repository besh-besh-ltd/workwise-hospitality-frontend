import React, { useEffect, useState } from "react";
import { getRFQById } from "@/services/rfq";
import { useRouter } from "next/router";
import VendorResponseTable from "./vendorResponseTable";
import { getProfile } from "@/services/Auth";
import Loader from "@/components/shared/Loader";

const VendorTechnicalEvaluation = () => {
    const router = useRouter();
    const { rfq_id, prod_id } = router.query;
    const [loading, setLoading] = useState(false);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [currentRfq, setCurrentRfq] = useState(null);


    // Fetch user details
    const getUserDetails = async () => {
        if (currentUserProfile) return currentUserProfile;
        try {
            const res = await getProfile();
            return res.data;
        } catch (error) {
            console.error("Error fetching user details:", error);
            return null;
        }
    };

    // Fetch RFQ Details
    const getRfqDetails = async () => {
        if (!rfq_id) return;
        try {
            const res = await getRFQById(rfq_id);
            return res.data || [];
        } catch (error) {
            console.error("Error fetching technical evaluation RFQs:", error);
            return [];
        }
    };

    // Initial data fetch
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const userDetails = await getUserDetails();
                if (userDetails) {
                    const rfqdata = await getRfqDetails(rfq_id);
                    setCurrentUserProfile(userDetails);
                    setCurrentRfq(rfqdata);
                    console.log("dataa rfqq", currentRfq)
                }
            } catch (error) {
                console.error("Error in fetch process:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [rfq_id]);


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

            {loading && <Loader />}
            <section className="quote-edit-sec-1">
                <div className="container-fluid">
                    <div className="row">                        

                        {/* RFQ Details */}
                        <div className="col-md-12">
                            <div className="quote-sec-table quote-sec-tab">
                                <div className="quote-sec-main">
                                    {currentRfq?.products?.length > 0 &&
                                        currentRfq?.products?.map((product, index) => {
                                            if (product.id == prod_id)
                                                return (
                                                    <div
                                                        className="quote-sec-table-sub"
                                                        key={`product_${index}`}
                                                    >
                                                        <div className="row">
                                                            <div className="col-12">
                                                                <p className="sub-heading mb-0">
                                                                    <b>Product</b>:{" "}
                                                                    {product?.product_details[0]?.name || "N/A"}
                                                                </p>
                                                                <p className="sub-heading mb-0">
                                                                    <b>Product Specification</b>:{" "}
                                                                    {product.product_specs?.find((spec) => spec.title === "Spec" && spec.value)?.value || "N/A"}
                                                                </p>
                                                                <VendorResponseTable
                                                                    product={product}
                                                                    type="vendor"
                                                                    rfq_id={rfq_id}
                                                                    currentUserProfile={currentUserProfile}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                        }
                                        )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default VendorTechnicalEvaluation;
