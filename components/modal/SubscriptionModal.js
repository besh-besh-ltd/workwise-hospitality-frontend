import React, { useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { capitalize } from "../shared/TitleCase";

const SubscriptionModal = (props) => {
    const { selectedSubscription, proceedToBuy, onHide, show, applyCouponToPlan, appliedCouponData, handleCpuponCode, couponCode } = props;
    let getSubscriptionDuration = {
        "-1": "Lifetime",
        1: "Monthly",
        3: "Quarterly",
        12: "Yearly",
    };
    return (
        <Modal
            show={show}
            onHide={onHide}
            size="md"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title className="p-3">Subscription</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="">
                    <div className="d-flex flex-row justify-content-between align-items-center g-6">
                        <h5>{capitalize(selectedSubscription.plan?.plan_name)}<span className="fs-6 text-muted mx-1">(plan)</span></h5>
                        <h3>
                            {selectedSubscription.billingCycle?.plan_type == "f"
                                ? "FREE"
                                : `₹ ${selectedSubscription.billingCycle?.price} / ${getSubscriptionDuration[selectedSubscription.billingCycle?.duration]
                                }`}
                        </h3>
                    </div>

                    {selectedSubscription.billingCycle?.Offers?.length > 0 &&
                        <div className="d-flex flex-row justify-content-between align-items-center g-6">
                            <h5>{capitalize(selectedSubscription.billingCycle?.Offers[0]?.text)}<span className="fs-6 text-muted mx-1">(offer)</span></h5>
                            <h3>
                                {`₹ ${(parseInt(selectedSubscription.billingCycle?.discount_price)).toFixed(2)}`}
                            </h3>
                        </div>
                    }

                    {appliedCouponData && appliedCouponData?.length > 0 &&
                        <div className="d-flex flex-row justify-content-between align-items-center g-6">
                            <h5>Coupon</h5>
                            <h3>
                                {`₹ ${(parseInt(appliedCouponData[0]?.coupon_discount_price)).toFixed(2)}`}
                            </h3>
                        </div>
                    }
                    <div className="d-flex flex-row justify-content-between align-items-center g-6">
                        <input type="text" value={couponCode} disabled={appliedCouponData && appliedCouponData?.length > 0 ? true : false} className="form-control me-3 w-75" placeholder="coupon code" onChange={handleCpuponCode}/>
                        <button onClick={applyCouponToPlan} disabled={appliedCouponData && appliedCouponData?.length > 0 ? true : false} type="button" class="btn btn-outline-success btn-sm" id="apply_coupon-coupon_section-subscription_modal">{appliedCouponData && appliedCouponData?.length > 0 ? `Coupon Applied` : `Apply Coupon`}</button>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={proceedToBuy} id="proceed_subscription-subscription_actions-subscription_modal">
                    Proceed
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

export default SubscriptionModal